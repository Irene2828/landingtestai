import { NextRequest, NextResponse } from "next/server";

import { isLikelyServiceBusiness } from "@/lib/business-type";
import { splitSentencesPreservingDomains } from "@/lib/sentence-utils";
import type {
  AnalysisSectionKey,
  AnalyzeApiResponse,
  ConfidenceLevel
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const FIRECRAWL_SCRAPE_URL =
  process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev/v2/scrape";
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";
const VALID_SECTIONS = ["FIRST IMPRESSION", "CALL TO ACTION", "TRUST & CREDIBILITY", "MESSAGING CLARITY", "CONVERSION FRICTION"] as const;
const PAGE_FETCH_TIMEOUT_MS = 15000;
const FIRECRAWL_RENDER_WAIT_MS = 3500;
const OPENAI_REQUEST_TIMEOUT_MS = 30000;
const OPENAI_MAX_ATTEMPTS = 2;
const OPENAI_RETRY_DELAY_MS = 500;
const HTML_PREVIEW_CHAR_LIMIT = 2500000;
const PROMPT_FIELD_CHAR_LIMIT = 2000;
const COMPETITOR_PROMPT_TEXT_LIMIT = 180;
const COMPETITOR_PROMPT_LIST_LIMIT = 2;
const TRUNCATED_TEXT_SUFFIX = " [truncated]";
const ANALYSIS_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0"
} as const;

type ValidSection = (typeof VALID_SECTIONS)[number];

type AnalyzeRequestBody = {
  url?: unknown;
  businessType?: unknown;
  goal?: unknown;
};

type ExtractedPageContent = {
  title: string;
  headline: string;
  headlineSource: "h1" | "hero-fallback" | "meta-description" | "title" | "none";
  heroEvidenceStatus: "clear" | "suspicious" | "missing";
  headings: string[];
  ctas: string[];
  description: string;
  trustSignals: string[];
};

type ExtractedCompetitorContent = {
  url: string;
  content: ExtractedPageContent;
};

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    html?: string;
    markdown?: string;
  };
};

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeSections(input: unknown): ValidSection[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input.filter((value): value is ValidSection => {
    return (
      typeof value === "string" &&
      VALID_SECTIONS.includes(value as ValidSection)
    );
  });

  return VALID_SECTIONS.filter((section) => normalized.includes(section));
}

function normalizeCompetitorUrls(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  const competitorUrls: string[] = [];

  for (const value of input) {
    if (typeof value !== "string") {
      continue;
    }

    const normalizedUrl = value.trim();

    if (!normalizedUrl || !isValidUrl(normalizedUrl)) {
      continue;
    }

    if (!competitorUrls.includes(normalizedUrl)) {
      competitorUrls.push(normalizedUrl);
    }
  }

  return competitorUrls;
}

function buildResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["overall_impression", "industry_modernity", "friction_audit"],
    properties: {
      overall_impression: {
        type: "object",
        additionalProperties: false,
        required: ["positioning", "ux_hierarchy", "cta_strategy"],
        properties: {
          positioning: { type: "string" },
          ux_hierarchy: { type: "string" },
          cta_strategy: { type: "string" }
        }
      },
      industry_modernity: { type: "string" },
      friction_audit: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["location", "current_text", "friction_analysis", "better_alternative"],
          properties: {
            location: { type: "string" },
            current_text: { type: "string" },
            friction_analysis: { type: "string" },
            better_alternative: { type: "string" }
          }
        }
      }
    }
  };
}

function isAnalyzeResponse(value: unknown): value is AnalyzeApiResponse {
  if (!value || typeof value !== "object") return false;
  const c = value as AnalyzeApiResponse;
  return (
    typeof c.industry_modernity === "string" &&
    typeof c.overall_impression === "object" &&
    c.overall_impression !== null &&
    typeof c.overall_impression.positioning === "string" &&
    typeof c.overall_impression.ux_hierarchy === "string" &&
    typeof c.overall_impression.cta_strategy === "string" &&
    Array.isArray(c.friction_audit) &&
    c.friction_audit.length === 3 &&
    c.friction_audit.every(
      s => typeof s?.location === "string" &&
           typeof s?.current_text === "string" &&
           typeof s?.friction_analysis === "string" &&
           typeof s?.better_alternative === "string"
    )
  );
}

function serializeForDebug(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function extractTextParts(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Record<string, unknown>;
  const type = candidate.type;
  const text = candidate.text;
  const parts: string[] = [];

  if (
    typeof text === "string" &&
    (type === "output_text" || type === "text" || type === "summary_text")
  ) {
    parts.push(text);
  }

  if (Array.isArray(candidate.content)) {
    for (const item of candidate.content) {
      parts.push(...extractTextParts(item));
    }
  }

  if (Array.isArray(candidate.output)) {
    for (const item of candidate.output) {
      parts.push(...extractTextParts(item));
    }
  }

  return parts;
}

function extractResponseText(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.output_text === "string" &&
    candidate.output_text.trim().length > 0
  ) {
    return candidate.output_text;
  }

  const extractedText = extractTextParts(candidate).join("").trim();

  return extractedText.length > 0 ? extractedText : null;
}

function parseStructuredOutput(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const fencedJsonMatch = text
      .trim()
      .match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

    if (!fencedJsonMatch) {
      throw new Error("Model returned invalid JSON output.");
    }

    return JSON.parse(fencedJsonMatch[1]);
  }
}

function createTimeoutSignal(timeoutMs: number) {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();

  setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return controller.signal;
}

function createAnalysisErrorResponse(details: string, status = 500) {
  return NextResponse.json(
    {
      error: "Analysis failed",
      details
    },
    {
      status,
      headers: ANALYSIS_RESPONSE_HEADERS
    }
  );
}

function createAnalysisJsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: ANALYSIS_RESPONSE_HEADERS
  });
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    if (error.cause instanceof Error) {
      return `${error.message}: ${error.cause.message}`;
    }

    if (typeof error.cause === "string") {
      return `${error.message}: ${error.cause}`;
    }

    return error.message;
  }

  return "Unknown error.";
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 10))
    );
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripLeadingNumberArtifact(value: string) {
  return value
    .replace(/^\s*(?:["“”'‘’]\s*)?\d{1,2}[.)]\s+(?=[A-Z"“”'‘’])/i, "")
    .replace(/^\s*\d+\s*\/\s*\d+\s+(?=[A-Z"“”'‘’])/i, "")
    .replace(/^\s*(?:slide|step)\s+\d+[:.)-]?\s*/i, "")
    .trim();
}

function collapseRepeatedPhraseRuns(value: string) {
  const normalized = normalizeWhitespace(value);
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length < 6) {
    return normalized;
  }

  for (
    let segmentLength = 3;
    segmentLength <= Math.floor(words.length / 2);
    segmentLength += 1
  ) {
    if (words.length % segmentLength !== 0) {
      continue;
    }

    const firstSegment = words.slice(0, segmentLength).join(" ");
    const repeats = words.length / segmentLength;

    if (repeats < 2) {
      continue;
    }

    const isRepeatedSegment = Array.from({ length: repeats }, (_, index) =>
      words.slice(index * segmentLength, (index + 1) * segmentLength).join(" ")
    ).every((segment) => segment === firstSegment);

    if (isRepeatedSegment) {
      return firstSegment;
    }
  }

  return normalized;
}

function normalizeExtractedText(value: string) {
  return collapseRepeatedPhraseRuns(
    decodeHtmlEntities(value.replace(/<[^>]+>/g, " ")).replace(/\u00a0/g, " ")
  );
}

function stripNonContentMarkup(value: string) {
  return value
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ");
}

function sanitizeExtractedText(value: string) {
  return stripLeadingNumberArtifact(
    normalizeExtractedText(stripNonContentMarkup(value))
  )
    .replace(/^[•\-–—]+\s*/, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function isDiscardableExtractedText(value: string) {
  return !value || /^\d{1,3}[.)]?$/.test(value) || /^[•\-–—]+$/.test(value);
}

function dedupeNonEmpty(values: string[], maxItems = 12) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = sanitizeExtractedText(value);

    if (isDiscardableExtractedText(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

const TRUST_SIGNAL_PATTERNS = [
  /\btrusted by\b/i,
  /\bused by\b/i,
  /\bcustomer(?:s| stories?)\b/i,
  /\btestimonials?\b/i,
  /\breviews?\b/i,
  /\bcase stud(?:y|ies)\b/i,
  /\blogos?\b/i,
  /\bg2\b/i,
  /\bcapterra\b/i,
  /\bsoc ?2\b/i,
  /\biso ?27001\b/i,
  /\bcertified\b/i,
  /\bcompliant\b/i,
  /\bsecurity\b/i,
  /\baward(?:s)?\b/i,
  /\bfortune \d+\b/i,
  /\b\d[\d,]*\+?\s+(customers|teams|companies|users|businesses)\b/i,
  /\b\d+(?:\.\d+)?\/5\b/i,
  /\b\d+(?:\.\d+)?\s*stars?\b/i
];

const CTA_KEYWORD_PATTERN =
  /\b(?:book|start|get|try|request|schedule|demo)\b/i;

const MISSING_INFORMATION_TEXT = "Not enough information available to verify";
const NO_CLEAR_EVIDENCE_TEXT =
  "Not captured by text extraction. Visual analysis (screenshots, logo detection, button positioning) coming in V2.";
const LEGACY_NO_CLEAR_EVIDENCE_TEXTS = [
  "Observation based on inferred page structure (Visual analysis coming in V2).",
  "Direct text evidence not captured in current crawl; observation based on inferred page structure",
  "No clear evidence found in extracted content",
  "Based on inferred site structure; direct text capture limited in V1 (Visual parsing in V2).",
  "Observation derived from DOM hierarchy analysis; full OCR/Vision analysis scheduled for V2.",
  "Contextual deduction based on known brand patterns; text extraction pending technical refinement."
] as const;

type EvidenceCoverage = "clear" | "partial" | "missing";

function formatEvidenceFallbacksForPrompt() {
  return `- "${NO_CLEAR_EVIDENCE_TEXT}"`;
}

function formatListForPrompt(values: string[]) {
  return values.length > 0
    ? values.map((value) => `- ${value}`).join("\n")
    : MISSING_INFORMATION_TEXT;
}

function formatInlineListForPrompt(values: string[]) {
  return values.length > 0 ? values.join(" | ") : MISSING_INFORMATION_TEXT;
}

function formatReadableList(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function getRandomMissingEvidenceText() {
  return NO_CLEAR_EVIDENCE_TEXT;
}

function formatTextForPrompt(value: string) {
  return value.trim() ? value.trim() : MISSING_INFORMATION_TEXT;
}

function formatHeadlineSourceForPrompt(
  source: ExtractedPageContent["headlineSource"]
) {
  switch (source) {
    case "meta-description":
      return "Meta Tags";
    case "hero-fallback":
      return "Hero-like DOM selector";
    case "h1":
      return "H1";
    case "title":
      return "Title Tag";
    default:
      return MISSING_INFORMATION_TEXT;
  }
}

function formatPageContentForPrompt(
  label: string,
  content?: ExtractedPageContent | null
) {
  if (!content) {
    return [
      `${label}:`,
      `Title: ${MISSING_INFORMATION_TEXT}`,
      `Headline: ${MISSING_INFORMATION_TEXT}`,
      `Headline Source: ${MISSING_INFORMATION_TEXT}`,
      `Headings: ${MISSING_INFORMATION_TEXT}`,
      `CTAs: ${MISSING_INFORMATION_TEXT}`,
      `Description: ${MISSING_INFORMATION_TEXT}`,
      `Trust Signals: ${MISSING_INFORMATION_TEXT}`
    ].join("\n");
  }

  return [
    `${label}:`,
    `Title: ${formatTextForPrompt(content.title)}`,
    `Headline: ${formatTextForPrompt(content.headline)}`,
    `Headline Source: ${formatHeadlineSourceForPrompt(content.headlineSource)}`,
    "Headings:",
    formatListForPrompt(content.headings),
    "CTAs:",
    formatListForPrompt(content.ctas),
    `Description: ${formatTextForPrompt(content.description)}`,
    "Trust Signals:",
    formatListForPrompt(content.trustSignals)
  ].join("\n");
}

function truncateTextForPrompt(value: string, maxLength: number) {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length <= maxLength) {
    return trimmed;
  }

  if (maxLength <= TRUNCATED_TEXT_SUFFIX.length) {
    return trimmed.slice(0, maxLength).trimEnd();
  }

  const clipLength = maxLength - TRUNCATED_TEXT_SUFFIX.length;
  let clipped = trimmed.slice(0, clipLength).trimEnd();
  const lastWhitespaceIndex = clipped.lastIndexOf(" ");

  if (lastWhitespaceIndex >= Math.floor(clipLength * 0.6)) {
    clipped = clipped.slice(0, lastWhitespaceIndex).trimEnd();
  }

  return `${clipped}${TRUNCATED_TEXT_SUFFIX}`;
}

function truncateTextGroupForPrompt(values: string[], maxLength: number) {
  const truncatedValues: string[] = [];
  let usedLength = 0;

  for (const value of values) {
    const trimmed = value.trim();

    if (!trimmed) {
      truncatedValues.push("");
      continue;
    }

    const remainingLength = maxLength - usedLength;

    if (remainingLength <= 0) {
      truncatedValues.push("");
      continue;
    }

    const truncatedValue = truncateTextForPrompt(trimmed, remainingLength);
    truncatedValues.push(truncatedValue);
    usedLength += truncatedValue.length;

    if (truncatedValue !== trimmed) {
      break;
    }
  }

  while (truncatedValues.length < values.length) {
    truncatedValues.push("");
  }

  return truncatedValues;
}

function truncatePageContentForPrompt(
  content: ExtractedPageContent
): ExtractedPageContent {
  const [title, headline, description, ...headings] = truncateTextGroupForPrompt(
    [content.title, content.headline, content.description, ...content.headings],
    PROMPT_FIELD_CHAR_LIMIT
  );

  return {
    title,
    headline,
    headlineSource: content.headlineSource,
    heroEvidenceStatus: content.heroEvidenceStatus,
    headings: headings.filter(Boolean),
    ctas: truncateTextGroupForPrompt(content.ctas, PROMPT_FIELD_CHAR_LIMIT).filter(
      Boolean
    ),
    description,
    trustSignals: truncateTextGroupForPrompt(
      content.trustSignals,
      PROMPT_FIELD_CHAR_LIMIT
    ).filter(Boolean)
  };
}

function truncateCompetitorContentForPrompt(
  competitorContent: ExtractedCompetitorContent[]
) {
  return competitorContent.map((competitor) => ({
    ...competitor,
    content: truncatePageContentForPrompt(competitor.content)
  }));
}

function createCompactPromptValues(values: string[], maxLength = COMPETITOR_PROMPT_TEXT_LIMIT) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, COMPETITOR_PROMPT_LIST_LIMIT)
    .map((value) => truncateTextForPrompt(value, maxLength));
}

function getCompetitorName(
  competitor: ExtractedCompetitorContent,
  index: number
) {
  return getBrandNameFromUrl(competitor.url, `Competitor ${String.fromCharCode(65 + index)}`);
}

const KNOWN_BRAND_NAME_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\/\/(?:www\.)?openai\.com\//i, name: "OpenAI" },
  { pattern: /\/\/(?:www\.)?deepmind\.google\//i, name: "Google DeepMind" },
  { pattern: /\/\/(?:www\.)?cohere\.com\//i, name: "Cohere" },
  { pattern: /\/\/(?:www\.)?anthropic\.com\//i, name: "Anthropic" },
  { pattern: /\/\/(?:www\.)?linear\.app\//i, name: "Linear" },
  { pattern: /\/\/(?:www\.)?notion\.com\//i, name: "Notion" },
  { pattern: /\/\/(?:www\.)?loom\.com\//i, name: "Loom" },
  { pattern: /\/\/(?:www\.)?monday\.com\//i, name: "Monday" },
  {
    pattern: /\/\/(?:www\.)?atlassian\.com\/software\/jira/i,
    name: "Jira"
  },
  { pattern: /\/\/(?:www\.)?asana\.com\//i, name: "Asana" },
  { pattern: /\/\/(?:www\.)?apollo\.io\//i, name: "Apollo" },
  { pattern: /\/\/(?:www\.)?outreach\.io\//i, name: "Outreach" },
  { pattern: /\/\/(?:www\.)?salesloft\.com\//i, name: "Salesloft" },
  { pattern: /\/\/(?:www\.)?zoominfo\.com\//i, name: "ZoomInfo" },
  { pattern: /\/\/(?:www\.)?hubspot\.com\//i, name: "HubSpot" },
  { pattern: /\/\/(?:www\.)?salesforce\.com\//i, name: "Salesforce" },
  {
    pattern: /\/\/business\.adobe\.com\/products\/marketo\//i,
    name: "Adobe Marketo"
  },
  {
    pattern: /\/\/(?:www\.)?activecampaign\.com\//i,
    name: "ActiveCampaign"
  }
];

function getBrandNameFromUrl(url: string, fallback: string) {
  const knownBrand = KNOWN_BRAND_NAME_PATTERNS.find(({ pattern }) =>
    pattern.test(url)
  );

  if (knownBrand) {
    return knownBrand.name;
  }

  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    const parts = hostname.split(".").filter(Boolean);
    const preferredPart =
      parts.find((part) => !["app", "web", "site", "co", "com", "io"].includes(part.toLowerCase())) ??
      parts[0];

    if (preferredPart) {
      return preferredPart
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  } catch {
    // Fall through to the generic label below.
  }

  return fallback;
}



async function extractPageContent(url: string): Promise<{ markdown: string; screenshot?: string }> {
  console.log("FIRECRAWL_API_KEY set:", !!process.env.FIRECRAWL_API_KEY);
  console.log("Fetching URL:", url);
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

  if (firecrawlApiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PAGE_FETCH_TIMEOUT_MS);
      const response = await fetch(FIRECRAWL_SCRAPE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlApiKey}`
        },
        body: JSON.stringify({ 
          url, 
          formats: ["markdown", "screenshot"]
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        console.log("Full Firecrawl response:", JSON.stringify(json).slice(0, 500));
        console.log("Firecrawl response status:", response.status);
        console.log("Firecrawl data keys:", Object.keys(json?.data || {}));
        console.log("Markdown length:", json?.data?.markdown?.length || 0);
        console.log("Screenshot URL exists:", !!json?.data?.screenshot);
        if (json && json.data) {
          return {
            markdown: typeof json.data.markdown === "string" ? json.data.markdown : "No text extracted.",
            screenshot: json.data.screenshot
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to basic fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGE_FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LandingAI/1.0)" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();
      return { markdown: sanitizeExtractedText(html) };
    }
  } catch {
    // Return empty on complete failure
  }

  return { markdown: "No text could be extracted from this page." };
}

async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error("Failed to convert image to base64:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, businessType, goal } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Invalid Request", details: "Target URL is required." },
        { status: 400 }
      );
    }

    const effectiveBusinessType = typeof businessType === "string" ? businessType : "B2B SaaS";
    const effectiveGoal = typeof goal === "string" ? goal : "More demo requests";

    const { markdown: extractedText, screenshot: screenshotUrl } = await extractPageContent(url);
    
    const is404 = (
      extractedText === "No text could be extracted from this page." ||
      (
        extractedText.length < 100 &&
        (
          extractedText.toLowerCase().includes("404") ||
          extractedText.toLowerCase().includes("page not found") ||
          extractedText.toLowerCase().includes("can't find that page")
        )
      )
    );

    if (is404) {
      return NextResponse.json(
        { 
          error: "Page Not Found", 
          details: "This URL returned an error or empty page. Please check the URL and try again with a working website address." 
        },
        { status: 422 }
      );
    }
    
    let imagePayload: any = null;
    if (screenshotUrl) {
      const base64 = await imageUrlToBase64(screenshotUrl);
      if (base64) {
        imagePayload = {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${base64}` }
        };
      }
    }

    const systemPrompt = `You are a blunt senior conversion strategist and visual designer reviewing a website for a web design agency pitch. You have access to both the extracted page text AND a screenshot of the actual page.

BUSINESS CONTEXT:
Type: ${effectiveBusinessType}
Goal: ${effectiveGoal}
URL: ${url}

YOUR DIRECTIVE:
You must return a JSON object strictly following the required schema. Your analysis should be highly critical, conversion-focused, and based entirely on the provided text and visual evidence.

THE PERSPECTIVE RULE (NON-NEGOTIABLE):
You must speak directly to the owner of the website. You MUST use pronouns like "you", "your", and "your site."
BAN LIST: You are strictly forbidden from using third-person pronouns to describe the business. NEVER use phrases like "It is a company that...", "They provide...", "The business...", or "Their site...".
Bad (Third-Person): "It’s a UI/UX design agency for complex B2B products. Their positioning is cluttered."
Good (Second-Person): "Your site positions you as a UI/UX design agency for complex B2B products. However, your positioning is cluttered."
Apply this strict perspective constraint to all generated text fields.

TONE RULE:
Write like a senior consultant presenting findings to a client — direct and confident but never condescending or snarky.

Banned phrases and words:
- "fluff" 
- "filler"
- "generic agency-speak"
- "motivational fluff"
- "polished filler"
- "dressed up as"
- "cookie-cutter"
- Any phrase that sounds like a Twitter roast

Instead use professional alternatives:
- "this doesn't communicate a clear next step"
- "this phrase doesn't differentiate you"  
- "visitors can't act on this"
- "this reads as a brand statement rather than a conversion prompt"

The goal is to sound like someone the client would pay £500/hour for — not someone dunking on them online.

BALANCE RULE:
Before critiquing something, ask: does this actually hurt the business goal, or is it just different from best practice?

If a design choice appears intentional and is working within the context of the business model, acknowledge the tradeoff instead of treating it as a failure.

For service businesses and agencies especially: relationship-led conversion is different from self-serve SaaS conversion. A longer page with more proof is often intentional, not a mistake. Frame it as: "This works for trust-building but may slow down high-intent visitors who already know what they want."

Never critique something just to fill the 3 friction points quota. If only 1-2 things genuinely hurt conversion, say so clearly and leave the third slot for the highest-impact positive recommendation instead.

JSON FIELDS:

1. overall_impression (object)
An object containing three macro-level evaluations (1-2 sentences each):
- positioning: An honest critique of how clearly your site communicates its core value and target audience.
- ux_hierarchy: An evaluation of your site's structural flow based on the Markdown headings (H1, H2, etc.). Does it tell a logical story or overwhelm the user?
- cta_strategy: An analysis of the primary and secondary calls to action. Are they clear, high-value, and strategically placed?

2. industry_modernity (string)
A single string evaluating the tone and relevance of the site's copy. Does your site sound like a modern, premium brand in its category, or is it relying on outdated corporate jargon and vague agency-speak?

3. friction_audit (array of EXACTLY 3 objects)
Identify the 3 biggest friction points on the site. Each object must contain:
- location: Where this occurs (e.g., "Hero Section", "Pricing Table", "Primary CTA")
- current_text: An EXACT, literal quote scraped from their site. Do not summarize.
- friction_analysis: A blunt, 1-2 sentence explanation of the psychological friction. Why does this create cognitive load, erode trust, or lower conversions? (e.g., "A generic 'Book a call' introduces high transactional friction. Adding 'free strategy' clarifies the value of your time.")
- better_alternative: A clean, high-converting rewrite of that text. The better_alternative must be meaningfully different from the current_text — not just a synonym or word swap. It must add something the original is missing: an outcome, a payoff, a specific benefit, or a reduction in perceived risk. If the rewrite sounds similar to the original, rewrite it again until it doesn't.

EXCLUSION RULE — never include these as friction points:
- Cookie consent banners or GDPR overlays
- Legal disclaimers or compliance notices
- Privacy policy popups
- Any element that is legally required

These are not design problems — they are legal requirements. Focus only on friction points that a web design agency could actually fix: copy, CTAs, layout, trust signals, messaging clarity.`;

    const userContent: any[] = [
      { type: "text", text: `Analyze this site: ${url}. Text content: ${extractedText}` }
    ];
    if (imagePayload) {
      userContent.push(imagePayload);
    }

    const openAiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.1,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "website_opportunity_analysis",
            schema: buildResponseSchema(),
            strict: true
          }
        }
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error("OpenAI API Error:", errorText);
      return NextResponse.json(
        { error: "Analysis Failed", details: "Could not generate analysis." },
        { status: 500 }
      );
    }

    const data = await openAiResponse.json();
    const parsedContent = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(parsedContent);

  } catch (error) {
    console.error("Analyze Error:", error);
    return NextResponse.json(
      {
        error: "Internal Error",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
