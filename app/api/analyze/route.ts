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

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const FIRECRAWL_SCRAPE_URL =
  process.env.FIRECRAWL_API_URL ?? "https://api.firecrawl.dev/v2/scrape";
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const VALID_SECTIONS = ["Hero", "CTA", "Social Proof"] as const;
const PAGE_FETCH_TIMEOUT_MS = 10000;
const FIRECRAWL_RENDER_WAIT_MS = 3500;
const OPENAI_REQUEST_TIMEOUT_MS = 20000;
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
  sections?: unknown;
  competitorUrls?: unknown;
};

type ExtractedPageContent = {
  title: string;
  headline: string;
  headlineSource: "h1" | "hero-fallback" | "meta-description" | "title" | "none";
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

function buildResponseSchema(selectedSections: ValidSection[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["sections", "summary"],
    properties: {
      sections: {
        type: "array",
        minItems: selectedSections.length,
        maxItems: selectedSections.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "title",
            "observation",
            "evidence",
            "recommendation",
            "confidence"
          ],
          properties: {
            name: {
              type: "string",
              enum: selectedSections
            },
            title: {
              type: "string"
            },
            observation: {
              type: "string"
            },
            evidence: {
              type: "string"
            },
            recommendation: {
              type: "string"
            },
            confidence: {
              type: "object",
              additionalProperties: false,
              required: ["level", "reason"],
              properties: {
                level: {
                  type: "string",
                  enum: ["HIGH", "LOW"]
                },
                reason: {
                  type: "string"
                }
              }
            }
          }
        }
      },
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["keyStrengths", "keyGaps", "topActions"],
        properties: {
          keyStrengths: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "string"
            }
          },
          keyGaps: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "string"
            }
          },
          topActions: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "string"
            }
          }
        }
      }
    }
  };
}

function isAnalyzeResponse(value: unknown): value is AnalyzeApiResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as AnalyzeApiResponse;

  return (
    Array.isArray(candidate.sections) &&
    candidate.sections.every(
      (section) =>
        typeof section?.name === "string" &&
        typeof section?.title === "string" &&
        typeof section?.observation === "string" &&
        typeof section?.evidence === "string" &&
        typeof section?.recommendation === "string" &&
        typeof section?.confidence?.level === "string" &&
        typeof section?.confidence?.reason === "string"
    ) &&
    Array.isArray(candidate.summary?.keyStrengths) &&
    Array.isArray(candidate.summary?.keyGaps) &&
    Array.isArray(candidate.summary?.topActions)
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

function formatCompetitorContentForPrompt(
  competitorContent: ExtractedCompetitorContent[],
  selectedSections: ValidSection[]
) {
  if (competitorContent.length === 0) {
    return formatPageContentForPrompt("Competitors", null);
  }

  return competitorContent
    .map((competitor, index) => {
      const lines = [`${getCompetitorName(competitor, index)}:`, `Source URL: ${competitor.url}`];

      if (selectedSections.includes("Hero")) {
        const heroValues = createCompactPromptValues([
          competitor.content.title,
          competitor.content.headline,
          competitor.content.description,
          ...competitor.content.headings
        ]);

        lines.push(`Hero: ${formatInlineListForPrompt(heroValues)}`);
      }

      if (selectedSections.includes("CTA")) {
        lines.push(
          `CTAs: ${formatInlineListForPrompt(
            createCompactPromptValues(competitor.content.ctas)
          )}`
        );
      }

      if (selectedSections.includes("Social Proof")) {
        lines.push(
          `Trust Signals: ${formatInlineListForPrompt(
            createCompactPromptValues(competitor.content.trustSignals)
          )}`
        );
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function extractTagText(
  html: string,
  tagName: "h1" | "h2" | "button" | "a",
  maxMatches = 120
) {
  const matches = html.matchAll(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi")
  );
  const values: string[] = [];

  for (const match of matches) {
    values.push(match[1] ?? "");

    if (values.length >= maxMatches) {
      break;
    }
  }

  return values;
}

function hasHeroLikeAttributes(attributes: string) {
  const normalized = attributes.toLowerCase();

  return (
    /\b(?:class|id|aria-label)\s*=\s*["'][^"']*(?:hero|headline|heading|title)[^"']*["']/.test(
      normalized
    ) ||
    /\bdata-[a-z0-9:_-]*(?:hero|headline|heading|title)[a-z0-9:_-]*\s*=\s*["'][^"']*["']/.test(
      normalized
    ) ||
    /\bdata-[a-z0-9:_-]+\s*=\s*["'][^"']*(?:hero|headline|heading|title)[^"']*["']/.test(
      normalized
    )
  );
}

function isLikelyHeroFallbackCandidate(value: string) {
  const normalized = sanitizeExtractedText(value);
  const words = normalized.split(/\s+/).filter(Boolean);

  if (isDiscardableExtractedText(normalized)) {
    return false;
  }

  if (normalized.length < 12 || words.length < 2 || words.length > 24) {
    return false;
  }

  if (isLikelyNavigationText(normalized) || isLikelyPromoBannerText(normalized)) {
    return false;
  }

  if (hasRepeatedSystemText(normalized)) {
    return false;
  }

  return true;
}

function extractHeadlineFallbackText(html: string, maxMatches = 24) {
  const matches = html.matchAll(
    /<(h2|h3|div|span|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  );
  const values: string[] = [];

  for (const match of matches) {
    const attributes = match[2] ?? "";
    const text = match[3] ?? "";

    if (!hasHeroLikeAttributes(attributes)) {
      continue;
    }

    if (!isLikelyHeroFallbackCandidate(text)) {
      continue;
    }

    values.push(text);

    if (values.length >= maxMatches) {
      break;
    }
  }

  return dedupeNonEmpty(values, maxMatches);
}

function extractTagTextList(html: string, tagNames: string[]) {
  return tagNames.flatMap((tagName) => {
    const matches = html.matchAll(
      new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi")
    );

    return Array.from(matches, (match) => match[1] ?? "");
  });
}

function extractAttributeValues(
  html: string,
  attributeName: "alt" | "aria-label",
  maxMatches = 120
) {
  const matches = html.matchAll(
    new RegExp(`${attributeName}=(["'])([\\s\\S]*?)\\1`, "gi")
  );

  const values: string[] = [];

  for (const match of matches) {
    values.push(match[2] ?? "");

    if (values.length >= maxMatches) {
      break;
    }
  }

  return values;
}

function extractAttributeValueFromTag(tag: string, attributeName: string) {
  const match = tag.match(
    new RegExp(`\\b${attributeName}=(["'])([\\s\\S]*?)\\1`, "i")
  );

  return match?.[2] ? normalizeExtractedText(match[2]) : "";
}

function matchesTrustSignal(value: string) {
  return TRUST_SIGNAL_PATTERNS.some((pattern) => pattern.test(value));
}

function createGlobalPattern(pattern: RegExp) {
  const flags = new Set(pattern.flags.split(""));

  flags.add("g");
  flags.add("i");

  return new RegExp(pattern.source, Array.from(flags).join(""));
}

function scoreTrustSignal(value: string) {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  let score = 0;

  if (/\btrusted by\b|\bused by\b/.test(lower)) {
    score += 4;
  }

  if (/\b\d[\d,]*\+?\s+(customers|teams|companies|users|businesses)\b/.test(lower)) {
    score += 4;
  }

  if (/\bg2\b|\bcapterra\b|\bsoc ?2\b|\biso ?27001\b|\bcertified\b|\bcompliant\b/.test(lower)) {
    score += 3;
  }

  if (/\breviews?\b|\btestimonial(?:s)?\b|\bcase stud(?:y|ies)\b/.test(lower)) {
    score += 2;
  }

  if (/\bsecurity\b|\baward(?:s)?\b|\bfortune \d+\b/.test(lower)) {
    score += 2;
  }

  if (normalized.length > 48) {
    score += 1;
  }

  if (/^[a-z0-9 .&+/-]{1,18}$/i.test(normalized) && normalized.split(/\s+/).length <= 2) {
    score -= 2;
  }

  return score;
}

function isLikelyTrustSignalContentNoise(value: string) {
  const normalized = sanitizeExtractedText(value);
  const lower = normalized.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const numberedFeatureMatches =
    normalized.match(/\b\d+\.\s*\d+\b/g) ?? [];

  if (!normalized) {
    return true;
  }

  if (normalized.length > 220 || words.length > 32) {
    return true;
  }

  if (numberedFeatureMatches.length >= 2) {
    return true;
  }

  if (
    /\b(?:import|export|return|const|function|interface|type|className|useState|useEffect|props)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /\b(?:src\/|screens\/|components\/|hooks\/|kinetic-ios|react-native|@components\/|@hooks\/|\.tsx\b|\.jsx\b|\.ts\b|\.js\b)\b/i.test(
      lower
    )
  ) {
    return true;
  }

  if (
    /\b(?:command menu|review prs?|understand code changes|structural diffs?|diffs \(coming soon\)|agent output|git automations?|linear mcp|github copilot|cursor agent|codex agent|coming soon)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  if (/=>|[{}[\]]/.test(normalized)) {
    return true;
  }

  if (
    /\b(?:issues?\s*\+|cycles?\s*\+|agents?\s*\+|review prs?\s+and agent output)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

function normalizeCtaText(value: string) {
  return sanitizeExtractedText(
    value
      .replace(/\\u[0-9a-f]{4}/gi, " ")
      .replace(/\\[nrt]/g, " ")
      .replace(/[→↗↘↙↖➜➝➞➔►▶★☆✓✔✕✖]/g, " ")
  )
    .replace(
      /\b(?:arrow_forward|north_east|open_in_new|chevron_right)\b/gi,
      " "
    )
    .replace(/^[^a-z0-9]+/i, "")
    .replace(/[^a-z0-9]+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyNavigationText(value: string) {
  return /\b(?:pricing|product|products|platform|solutions?|resources?|resource center|docs?|documentation|blog|careers|about|company|customers?|case studies|security|partners?|support|contact us|sign in|log in|login|home)\b/i.test(
    value
  );
}

function isLikelyPromoBannerText(value: string) {
  return (
    /\b(?:introducing|launch week|announcement|release|report|webinar|event|summit|read more|learn more|discover|explore)\b/i.test(
      value
    ) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(
      value
    ) ||
    /\b20\d{2}\b/.test(value)
  );
}

function hasRepeatedSystemText(value: string) {
  const words = value.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length < 6) {
    return false;
  }

  return new Set(words).size <= Math.ceil(words.length / 2.5);
}

function extractCtaSnippets(html: string) {
  const plainText = sanitizeExtractedText(html);
  const snippets: string[] = [];
  const globalPattern = createGlobalPattern(CTA_KEYWORD_PATTERN);
  let match: RegExpExecArray | null;

  while (snippets.length < 36 && (match = globalPattern.exec(plainText))) {
    const start = Math.max(0, match.index - 32);
    const end = Math.min(
      plainText.length,
      match.index + match[0].length + 40
    );

    snippets.push(plainText.slice(start, end));
  }

  return snippets;
}

function findSentenceStart(text: string, fromIndex: number) {
  const candidates = [
    text.lastIndexOf(". ", fromIndex),
    text.lastIndexOf("! ", fromIndex),
    text.lastIndexOf("? ", fromIndex),
    text.lastIndexOf(": ", fromIndex),
    text.lastIndexOf("; ", fromIndex)
  ];
  const boundary = Math.max(...candidates);

  return boundary >= 0 ? boundary + 2 : 0;
}

function findSentenceEnd(text: string, fromIndex: number) {
  const candidates = [
    text.indexOf(". ", fromIndex),
    text.indexOf("! ", fromIndex),
    text.indexOf("? ", fromIndex),
    text.indexOf(": ", fromIndex),
    text.indexOf("; ", fromIndex)
  ].filter((index) => index >= 0);

  if (candidates.length === 0) {
    return text.length;
  }

  return Math.min(...candidates) + 1;
}

function scoreCtaCandidate(
  value: string,
  source: "button" | "link" | "text" | "attribute"
) {
  const lower = value.toLowerCase();
  const keywordMatches = lower.match(
    /\b(?:book|start|get|try|request|schedule|demo)\b/g
  );

  if (!keywordMatches || keywordMatches.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  if (/[{}]|var\(--|\.css-[a-z0-9-]+/i.test(value)) {
    return Number.NEGATIVE_INFINITY;
  }

  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  let score = keywordMatches.length * 3;

  if (/^(book|start|get|try|request|schedule|demo)\b/.test(lower)) {
    score += 2;
  }

  if (
    /\b(book|request|schedule)\b[\s\w-]{0,24}\b(call|demo|meeting)\b/.test(
      lower
    )
  ) {
    score += 3;
  }

  if (/\b(get|start|try)\b[\s\w-]{0,24}\b(free|trial|started)\b/.test(lower)) {
    score += 2;
  }

  if (source === "button") {
    score += 3;
  } else if (source === "link") {
    score += 2;
  } else if (source === "attribute") {
    score += 1;
  }

  if (wordCount >= 2 && wordCount <= 6) {
    score += 2;
  } else if (wordCount === 1) {
    score -= 2;
  } else if (wordCount > 9) {
    score -= 3;
  }

  if (/^(book|start|get|try|request|schedule|demo)$/i.test(value)) {
    score -= 2;
  }

  if (isLikelyNavigationText(value)) {
    score -= 5;
  }

  if (isLikelyPromoBannerText(value)) {
    score -= 6;
  }

  if (hasRepeatedSystemText(value)) {
    score -= 4;
  }

  if (source === "text" && wordCount > 7) {
    score -= 5;
  }

  return score;
}

function extractCallToActionsFromHtml(html: string) {
  const candidates = [
    ...extractTagText(html, "button", 80).map((value) => ({
      value,
      source: "button" as const
    })),
    ...extractTagText(html, "a", 180).map((value) => ({
      value,
      source: "link" as const
    })),
    ...extractAttributeValues(html, "aria-label", 80).map((value) => ({
      value,
      source: "attribute" as const
    })),
    ...extractCtaSnippets(html).map((value) => ({
      value,
      source: "text" as const
    }))
  ];

  const rankedCandidates = candidates
    .map((candidate, index) => {
      const normalizedValue = normalizeCtaText(candidate.value);

      return {
        value: normalizedValue,
        score: scoreCtaCandidate(normalizedValue, candidate.source),
        index
      };
    })
    .filter(
      (candidate) =>
        candidate.value.length > 0 &&
        candidate.value.length <= 56 &&
        Number.isFinite(candidate.score) &&
        candidate.score >= 2
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    });

  return dedupeNonEmpty(
    rankedCandidates.map((candidate) => candidate.value),
    3
  );
}

function extractTrustSignalSnippets(html: string) {
  const plainText = sanitizeExtractedText(html);
  const snippets: string[] = [];

  for (const pattern of TRUST_SIGNAL_PATTERNS) {
    const globalPattern = createGlobalPattern(pattern);
    let match: RegExpExecArray | null;
    let matchesForPattern = 0;

    while (
      matchesForPattern < 3 &&
      snippets.length < 36 &&
      (match = globalPattern.exec(plainText))
    ) {
      const roughStart = Math.max(0, match.index - 120);
      const roughEnd = Math.min(
        plainText.length,
        match.index + match[0].length + 180
      );
      const start = findSentenceStart(plainText, roughStart);
      const end = findSentenceEnd(plainText, roughEnd);
      const snippet = plainText.slice(start, end);

      snippets.push(snippet);
      matchesForPattern += 1;
    }
  }

  return snippets;
}

function isLikelyTrustNavigationNoise(value: string) {
  return /\b(?:products?|platform|solutions?|resources?|docs?|developers?|api|pricing|company|research|blog|careers|learn|build and learn|introducing|features?|integrations?|claude code)\b/i.test(
    value
  );
}

function extractTrustSignalsFromHtml(
  html: string,
  seedValues: string[]
): string[] {
  const candidateValues = dedupeNonEmpty(
    [
      ...seedValues,
      ...extractTagTextList(html, ["h1", "h2", "strong", "small"]),
      ...extractAttributeValues(html, "alt"),
      ...extractAttributeValues(html, "aria-label"),
      ...extractTrustSignalSnippets(html)
    ],
    400
  );

  return candidateValues
    .map((value, index) => ({
      value,
      index,
      score: matchesTrustSignal(value) ? scoreTrustSignal(value) : 0
    }))
    .filter(
      (candidate) =>
        candidate.score >= 3 &&
        !isLikelyTrustNavigationNoise(candidate.value) &&
        !isLikelyTrustSignalContentNoise(candidate.value)
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .map((candidate) => candidate.value)
    .slice(0, 10);
}

function extractMetaDescription(html: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const name = extractAttributeValueFromTag(tag, "name").toLowerCase();
    const property = extractAttributeValueFromTag(tag, "property").toLowerCase();

    if (name !== "description" && property !== "og:description") {
      continue;
    }

    const content = extractAttributeValueFromTag(tag, "content");

    if (content) {
      return content;
    }
  }

  return "";
}

function isLikelyDecorativeTitleText(value: string) {
  const normalized = sanitizeExtractedText(value);

  if (!normalized) {
    return true;
  }

  return (
    /\blogo\b/i.test(normalized) &&
    /\b(?:full|color|mark|lockup|brand)\b/i.test(normalized)
  );
}

function isBrokenHeroHeadline(value: string) {
  if (!value) {
    return false;
  }

  const words = value.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length < 6) {
    return false;
  }

  const rotatingActionWords = words.filter((word) =>
    new Set(["grow", "scale", "close", "retain", "convert", "engage"]).has(
      word
    )
  );

  const hasRepeatedWord = new Set(words).size < words.length;
  const looksLikeWordSoup = rotatingActionWords.length >= 3 && hasRepeatedWord;

  return looksLikeWordSoup;
}

function getHeroFallbackHeadline(
  description: string,
  h2Text: string[],
  title: string
) {
  if (description) {
    return {
      text: description,
      source: "meta-description" as const
    };
  }

  const firstUsefulHeading = dedupeNonEmpty(h2Text, 4).find(
    (heading) =>
      !isLikelyNavigationText(heading) &&
      !isLikelyPromoBannerText(heading) &&
      !isBrokenHeroHeadline(heading)
  );

  if (firstUsefulHeading) {
    return {
      text: firstUsefulHeading,
      source: "hero-fallback" as const
    };
  }

  if (title) {
    return {
      text: title,
      source: "title" as const
    };
  }

  return {
    text: "",
    source: "none" as const
  };
}

function extractPageContentFromHtml(
  html: string,
  sections: ValidSection[]
): ExtractedPageContent {
  const needsHeroContent = sections.includes("Hero");
  const needsCtaContent = sections.includes("CTA");
  const needsTrustContent = sections.includes("Social Proof");
  const needsHeroLikeText = needsHeroContent || needsTrustContent;
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const extractedTitle = titleMatch?.[1] ? normalizeExtractedText(titleMatch[1]) : "";
  const title = isLikelyDecorativeTitleText(extractedTitle) ? "" : extractedTitle;
  const nativeH1Text = needsHeroLikeText ? extractTagText(html, "h1") : [];
  const h2Text =
    needsHeroLikeText ? extractTagText(html, "h2") : [];
  let h1Text = nativeH1Text;

  if (h1Text.length === 0 && needsHeroLikeText) {
    h1Text = dedupeNonEmpty([
      ...extractHeadlineFallbackText(html),
      ...h2Text
    ], 1);
  }

  const ctas = needsCtaContent ? extractCallToActionsFromHtml(html) : [];
  const description = extractMetaDescription(html);
  const rawHeadline = h1Text[0] ? normalizeExtractedText(h1Text[0]) : "";
  const useFallbackHeadline = !rawHeadline || isBrokenHeroHeadline(rawHeadline);
  const fallbackHeadline = useFallbackHeadline
    ? getHeroFallbackHeadline(description, h2Text, title)
    : null;
  const headline = useFallbackHeadline
    ? fallbackHeadline?.text ?? ""
    : rawHeadline;
  const headlineSource: ExtractedPageContent["headlineSource"] =
    useFallbackHeadline
      ? fallbackHeadline?.source ?? "none"
      : nativeH1Text.length > 0
        ? "h1"
        : "hero-fallback";
  const heroHeadings = useFallbackHeadline ? h2Text : [...h1Text, ...h2Text];

  return {
    title,
    headline,
    headlineSource,
    headings: dedupeNonEmpty(heroHeadings),
    ctas,
    description,
    trustSignals: needsTrustContent
      ? extractTrustSignalsFromHtml(html, [
          title,
          headline,
          description,
          ...heroHeadings
        ])
      : []
  };
}

async function fetchPageHtmlDirect(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; CompetitiveLandingPageAnalyzer/0.1)"
    },
    redirect: "follow",
    cache: "no-store",
    signal: createTimeoutSignal(PAGE_FETCH_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`Page fetch failed with status ${response.status}.`);
  }

  if (!response.body) {
    const html = await response.text();

    return html.slice(0, HTML_PREVIEW_CHAR_LIMIT);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let streamCompleted = false;

  while (html.length < HTML_PREVIEW_CHAR_LIMIT) {
    const { done, value } = await reader.read();

    if (done) {
      streamCompleted = true;
      break;
    }

    if (value) {
      html += decoder.decode(value, { stream: true });
    }
  }

  html += decoder.decode();

  if (!streamCompleted) {
    void reader.cancel().catch(() => undefined);
  }

  return html.slice(0, HTML_PREVIEW_CHAR_LIMIT);
}

async function fetchPageHtmlWithFirecrawl(url: string, apiKey: string) {
  const response = await fetch(FIRECRAWL_SCRAPE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    cache: "no-store",
    signal: createTimeoutSignal(PAGE_FETCH_TIMEOUT_MS),
    body: JSON.stringify({
      url,
      waitFor: FIRECRAWL_RENDER_WAIT_MS,
      formats: ["markdown", "html"],
      onlyMainContent: true
    })
  });

  if (!response.ok) {
    throw new Error(`Firecrawl scrape failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as FirecrawlScrapeResponse;
  const html = typeof payload.data?.html === "string" ? payload.data.html : "";

  if (!html.trim()) {
    throw new Error("Firecrawl scrape returned empty HTML.");
  }

  return html.slice(0, HTML_PREVIEW_CHAR_LIMIT);
}

async function fetchPageHtml(url: string) {
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

  if (firecrawlApiKey) {
    try {
      return await fetchPageHtmlWithFirecrawl(url, firecrawlApiKey);
    } catch (error) {
      console.error("Firecrawl scrape failed, falling back to direct fetch", {
        url,
        error: getErrorDetails(error)
      });
    }
  }

  return fetchPageHtmlDirect(url);
}

async function extractPageContentFromUrl(
  url: string,
  sections: ValidSection[]
) {
  const html = await fetchPageHtml(url);
  const content = extractPageContentFromHtml(html, sections);

  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname === "linear.app") {
      console.log(
        "Linear parser debug",
        JSON.stringify(
          {
            url,
            sections,
            headlineSource: content.headlineSource,
            headline: content.headline,
            ctas: content.ctas,
            trustSignals: content.trustSignals
          },
          null,
          2
        )
      );
    }
  } catch {
    // Ignore URL parsing issues in debug logging.
  }

  return content;
}

function createEmptyPageContent(): ExtractedPageContent {
  return {
    title: "",
    headline: "",
    headlineSource: "none",
    headings: [],
    ctas: [],
    description: "",
    trustSignals: []
  };
}

function buildSectionRules(selectedSections: ValidSection[]) {
  const rules: string[] = [];

  if (selectedSections.includes("Hero")) {
    rules.push(
      "- Hero: before forming any critique, review all available hero content together, including the title, H1 headline, H2 or supporting lines, headings, and meta description.",
      "- Hero: treat the meta description as supporting hero text when it clarifies the product, category, or user outcome.",
      "- Hero: do not ignore supporting lines if they clarify what the product does, the category, or the user outcome.",
      "- Hero: use ALL available hero-related text to determine what the page communicates, not just the H1.",
      "- Hero: compare what the page says, what changes for the user, and whether the first screen shows one clear next step using the full hero context, not just the main headline.",
      "- Hero: before calling a broader promise a weakness, consider whether it reflects deliberate brand-level or category-level positioning. If it does, explain the tradeoff against more specific competitor framing.",
      '- Hero: if the recommendation sharpens the user result or payoff framing, call it "outcome-led" and reuse that exact term in any matching summary action.'
    );
  }

  if (selectedSections.includes("CTA")) {
    rules.push(
      "- CTA: compare CTA wording, what happens next, and whether one action leads using extracted button text and button-like links.",
      "- CTA: do not treat a short CTA such as 'Try X' or 'Get started' as automatically unclear. First evaluate whether it supports product-led growth or low-friction entry.",
      "- CTA: if the CTA is intentionally simple, explain the tradeoff between low friction and how clearly the first step or outcome is described."
    );
  }

  if (selectedSections.includes("Social Proof")) {
    rules.push(
      "- Social Proof: compare customer proof, logos, reviews, certifications, and quantified credibility language using extracted trust-signal text, headings, and meta description.",
      "- Social Proof: if explicit proof is limited, check whether the page leans on brand authority, research positioning, technical expertise, or reputation instead.",
      "- Social Proof: when that authority-led pattern is present, describe the page as relying on brand authority rather than explicit proof, not as an automatic weakness.",
      '- Social Proof: if the recommendation is to consolidate proof elements into one clearer proof system, call it a "trust stack" and reuse that exact term in any matching summary action.'
    );
  }

  return rules.join("\n");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableOpenAiError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { name?: unknown };
  return candidate.name === "AbortError";
}

function isRetryableOpenAiResponse(status: number, bodyText: string) {
  if (status >= 500) {
    return true;
  }

  return /"type"\s*:\s*"server_error"/i.test(bodyText);
}

const COMPARISON_VERB_PATTERN =
  /\b(?:is|are|was|were|has|have|shows?|uses?|offers?|creates?|keeps?|gives?|feels?|reads?|stays?|remains?|adds?|leans?|positions?|leads?|explains?|communicates?|frames?|pairs?|ties?|surfaces?|makes?)\b/i;
const COMPARISON_SENTENCE_PREFIX_PATTERN =
  /^(?:Compared (?:to|with)|Unlike|Whereas|Versus|In contrast to|While competitors?)\b/i;

function sanitizeSentenceLikeText(value: string) {
  return stripLeadingNumberArtifact(
    normalizeWhitespace(value)
      .replace(/\u2026|\.{3,}/g, "")
      .replace(/^[•\-–—]+\s*/, "")
      .replace(/\s+([,.;:!?])/g, "$1")
  )
    .replace(
      /\s+(?:and|or|because|with|to|for|across|than|which|while|that)\s*$/i,
      ""
    )
    .replace(/,\s*$/g, "")
    .trim();
}

function isIncompleteComparisonSentence(value: string) {
  if (!COMPARISON_SENTENCE_PREFIX_PATTERN.test(value)) {
    return false;
  }

  return !COMPARISON_VERB_PATTERN.test(value);
}

function isIncompleteInsightSentence(value: string) {
  const sanitized = sanitizeSentenceLikeText(value);

  if (!sanitized) {
    return true;
  }

  if (/^(?:["“][^"”]+["”]|['‘][^'’]+['’])[,;:]?$/i.test(sanitized)) {
    return true;
  }

  if (isIncompleteComparisonSentence(sanitized)) {
    return true;
  }

  return false;
}

function sanitizeBulletBlock(value: string) {
  const rawLines = value
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  const sanitizedLines = dedupeNonEmpty(
    rawLines
      .map((line) => sanitizeSentenceLikeText(line))
      .filter((line) => !isIncompleteInsightSentence(line)),
    2
  );

  if (sanitizedLines.length === 0) {
    return MISSING_INFORMATION_TEXT;
  }

  return sanitizedLines
    .map((line) => (/[.!?]$/.test(line) ? `- ${line}` : `- ${line}.`))
    .join("\n");
}

function isMissingEvidenceText(value: string) {
  const normalized = sanitizeSentenceLikeText(value).toLowerCase();

  return (
    normalized.includes(MISSING_INFORMATION_TEXT.toLowerCase()) ||
    normalized.includes(NO_CLEAR_EVIDENCE_TEXT.toLowerCase()) ||
    LEGACY_NO_CLEAR_EVIDENCE_TEXTS.some((text) =>
      normalized.includes(text.toLowerCase())
    )
  );
}

function isNumericOnlyEvidenceLine(value: string) {
  const evidenceBody = value
    .replace(/^[A-Za-z][A-Za-z\s]+:\s*/i, "")
    .trim();

  if (!evidenceBody || !/\d/.test(evidenceBody)) {
    return false;
  }

  const normalizedBody = evidenceBody
    .replace(/["“”'‘’]/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?(?:%|x|k\+?|m\+?|b\+?)?\b/gi, " ")
    .replace(/[|/,.;:+\-–—()]/g, " ")
    .trim();

  return !/\b[a-z]{3,}\b/i.test(normalizedBody);
}

function sanitizeEvidenceBlock(value: string): {
  text: string;
  coverage: EvidenceCoverage;
} {
  const rawLines = value
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  let hadMissingEvidenceMarker = false;

  const sanitizedLines = dedupeNonEmpty(
    rawLines
      .map((line) => sanitizeSentenceLikeText(line))
      .filter((line) => {
        if (!line || isIncompleteInsightSentence(line)) {
          return false;
        }

        if (isNumericOnlyEvidenceLine(line)) {
          return false;
        }

        if (isMissingEvidenceText(line)) {
          hadMissingEvidenceMarker = true;
          return false;
        }

        return true;
      }),
    2
  );

  if (sanitizedLines.length === 0) {
    return {
      text: NO_CLEAR_EVIDENCE_TEXT,
      coverage: "missing"
    };
  }

  return {
    text: sanitizedLines
      .map((line) => (/[.!?]$/.test(line) ? `- ${line}` : `- ${line}.`))
      .join("\n"),
    coverage: hadMissingEvidenceMarker ? "partial" : "clear"
  };
}

function quoteForEvidence(value: string) {
  return `“${sanitizeSentenceLikeText(value)}”`;
}

function getExtractedEvidenceFallback(
  sectionName: ValidSection,
  pageContent: ExtractedPageContent
): string | null {
  if (sectionName === "Hero") {
    const lines = [
      pageContent.title ? `- Title: ${quoteForEvidence(pageContent.title)}.` : "",
      pageContent.headline
        ? `- Headline: ${quoteForEvidence(pageContent.headline)}.`
        : "",
      pageContent.description &&
      pageContent.description !== pageContent.headline &&
      pageContent.description !== pageContent.title
        ? `- Description: ${quoteForEvidence(pageContent.description)}.`
        : ""
    ].filter(Boolean);

    return lines.length > 0 ? lines.slice(0, 2).join("\n") : null;
  }

  if (sectionName === "CTA" && pageContent.ctas.length > 0) {
    return `- CTAs: ${pageContent.ctas
      .slice(0, 3)
      .map((cta) => quoteForEvidence(cta))
      .join(" | ")}.`;
  }

  if (sectionName === "Social Proof" && pageContent.trustSignals.length > 0) {
    return `- Trust Signals: ${pageContent.trustSignals
      .slice(0, 2)
      .map((signal) => quoteForEvidence(signal))
      .join(" | ")}.`;
  }

  return null;
}

const SUMMARY_SECTION_PATTERNS: Record<AnalysisSectionKey, RegExp> = {
  Hero:
    /\b(?:hero|headline|promise|positioning|framing|outcome|first read|first-screen|first screen|brand-led|systems-led|mission-led)\b/i,
  CTA:
    /\b(?:cta|next step|click|button|entry|path|trial|demo|get started|schedule|post-click|action)\b/i,
  "Social Proof":
    /\b(?:trust|proof|validation|authority|credibility|customer|logos?|adoption|reputation|social proof|trust stack|proof stack|scale)\b/i
};

function getMissingEvidenceTitle(sectionName: AnalysisSectionKey) {
  switch (sectionName) {
    case "Hero":
      return "Hero not captured (text-only V1)";
    case "CTA":
      return "CTA not captured (text-only V1)";
    case "Social Proof":
      return "Trust signals not captured (text-only V1)";
  }
}

function getMissingEvidenceObservation(sectionName: AnalysisSectionKey) {
  switch (sectionName) {
    case "Hero":
      return "Supporting visuals like product screenshots, interface previews, and hero imagery are typically visual and were not captured by text extraction. Check whether the first screen shows the product in use and whether the visual reinforces the promise before scroll.";
    case "CTA":
      return "Button styling, placement, and visual hierarchy are typically visual and were not captured by text extraction. Check whether the primary CTA is the most prominent element on screen and whether secondary actions compete with it.";
    case "Social Proof":
      return "Logos, badges, review widgets, and proof rails are typically visual and were not captured by text extraction. Check whether trust signals are visible above the fold and whether proof appears near the hero or CTA.";
  }
}

function summaryItemReferencesSection(
  value: string,
  sectionName: AnalysisSectionKey
) {
  return SUMMARY_SECTION_PATTERNS[sectionName].test(value);
}

function getMissingEvidenceSummaryGap(sectionName: AnalysisSectionKey) {
  switch (sectionName) {
    case "Hero":
      return "Hero needs a visual check";
    case "CTA":
      return "CTA path needs a visual check";
    case "Social Proof":
      return "Trust signals need a visual check";
  }
}

function getMissingEvidenceRecommendation(sectionName: AnalysisSectionKey) {
  switch (sectionName) {
    case "Hero":
      return [
        "- If the first screen relies mostly on imagery, pair it with one category line and one clear user result.",
        "- If the visual already carries the story, add supporting copy that explains what changes before scroll."
      ].join("\n");
    case "CTA":
      return [
        "- If the lead CTA is not visually dominant, make one primary action clearly stronger than the rest.",
        "- If there are multiple CTA paths, label the secondary option so its role is obvious at a glance."
      ].join("\n");
    case "Social Proof":
      return [
        "- If proof is not already visible near the hero, move one named proof point, one quantified signal, and one credibility marker closer to the CTA.",
        "- If trust currently relies on brand feel alone, add a tighter trust stack that makes scale and validation explicit."
      ].join("\n");
  }
}

function getManualCheckCompetitorReference(
  sectionName: AnalysisSectionKey,
  competitorContent: ExtractedCompetitorContent[]
) {
  const competitorNames = competitorContent
    .slice(0, 2)
    .map((competitor, index) => getCompetitorName(competitor, index));
  const competitorList =
    competitorNames.length > 0
      ? formatReadableList(competitorNames)
      : "strong SaaS peers";

  switch (sectionName) {
    case "Hero":
      return `- Compare the first-screen visual hierarchy to ${competitorList}: do they pair the headline with a product UI, workflow preview, or demo frame?`;
    case "CTA":
      return `- Compare CTA prominence to ${competitorList}: is the lead action higher contrast or more visually dominant than secondary links?`;
    case "Social Proof":
      return `- Compare trust layout to ${competitorList}: do they surface logos, proof badges, or quantified validation near the hero instead of lower on the page?`;
  }
}

function getManualCheckLines(
  sectionName: AnalysisSectionKey,
  competitorContent: ExtractedCompetitorContent[]
) {
  switch (sectionName) {
    case "Hero":
      return [
        "- Does the first screen show the product in use, not just text?",
        getManualCheckCompetitorReference(sectionName, competitorContent)
      ].join("\n");
    case "CTA":
      return [
        "- Is the primary CTA the most prominent element on screen?",
        getManualCheckCompetitorReference(sectionName, competitorContent)
      ].join("\n");
    case "Social Proof":
      return [
        "- Are logos, badges, or proof rails visible above the fold?",
        getManualCheckCompetitorReference(sectionName, competitorContent)
      ].join("\n");
  }
}

function appendManualCheckGuidance(
  recommendation: string,
  sectionName: AnalysisSectionKey,
  confidenceLevel: ConfidenceLevel,
  competitorContent: ExtractedCompetitorContent[],
  coverage: EvidenceCoverage
) {
  if (confidenceLevel !== "LOW") {
    return recommendation;
  }

  const baseRecommendation =
    coverage === "missing" || recommendation === MISSING_INFORMATION_TEXT
      ? getMissingEvidenceRecommendation(sectionName)
      : recommendation;

  return [
    baseRecommendation,
    "",
    "What to check manually (until V2 vision analysis):",
    getManualCheckLines(sectionName, competitorContent)
  ].join("\n");
}

function dedupeSummaryItems(values: string[], maxItems = 3) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = sanitizeSummaryItem(value);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

function sanitizeSummaryStrengthsForEvidence(
  values: string[],
  coverageBySection: Partial<Record<AnalysisSectionKey, EvidenceCoverage>>
) {
  const missingSections = (Object.entries(coverageBySection) as Array<
    [AnalysisSectionKey, EvidenceCoverage | undefined]
  >)
    .filter(([, coverage]) => coverage === "missing")
    .map(([sectionName]) => sectionName);

  return dedupeSummaryItems(
    values.filter(
      (value) =>
        !missingSections.some((sectionName) =>
          summaryItemReferencesSection(value, sectionName)
        )
    )
  );
}

function sanitizeSummaryGapsForEvidence(
  values: string[],
  coverageBySection: Partial<Record<AnalysisSectionKey, EvidenceCoverage>>
) {
  const missingSections = (Object.entries(coverageBySection) as Array<
    [AnalysisSectionKey, EvidenceCoverage | undefined]
  >)
    .filter(([, coverage]) => coverage === "missing")
    .map(([sectionName]) => sectionName);
  const preservedValues = values.filter(
    (value) =>
      !missingSections.some((sectionName) =>
        summaryItemReferencesSection(value, sectionName)
      )
  );

  return dedupeSummaryItems([
    ...missingSections.map(getMissingEvidenceSummaryGap),
    ...preservedValues
  ]);
}

function sanitizeSummaryItem(value: string) {
  return sanitizeSentenceLikeText(value)
    .replace(/[,:;]\s*$/g, "")
    .trim();
}

function splitIntoSentences(value: string) {
  return splitSentencesPreservingDomains(value)
    .map((sentence) => sanitizeSentenceLikeText(sentence))
    .filter(Boolean);
}

function normalizeSentenceForComparison(value: string) {
  return value
    .toLowerCase()
    .replace(/["“”'’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 3 &&
        !new Set([
          "this",
          "that",
          "with",
          "from",
          "into",
          "their",
          "there",
          "about",
          "because",
          "compared",
          "page"
        ]).has(word)
    );
}

function isRepeatedObservationSentence(first: string, second: string) {
  const firstWords = normalizeSentenceForComparison(first);
  const secondWords = normalizeSentenceForComparison(second);

  if (firstWords.length === 0 || secondWords.length === 0) {
    return false;
  }

  const firstSet = new Set(firstWords);
  const overlap = secondWords.filter((word) => firstSet.has(word));
  const overlapRatio = overlap.length / Math.max(secondWords.length, 1);

  return overlapRatio >= 0.5;
}

function sanitizeObservation(value: string) {
  const sentences = splitIntoSentences(value).filter(
    (sentence) => !isIncompleteInsightSentence(sentence)
  );

  if (sentences.length === 0) {
    return MISSING_INFORMATION_TEXT;
  }

  const keptSentences: string[] = [sentences[0]];

  for (const sentence of sentences.slice(1)) {
    if (keptSentences.length >= 2) {
      break;
    }

    if (isRepeatedObservationSentence(keptSentences[0], sentence)) {
      continue;
    }

    keptSentences.push(sentence);
  }

  return keptSentences
    .map((sentence) => (/[.!?]$/.test(sentence) ? sentence : `${sentence}.`))
    .join(" ");
}

function polishObservationPhrases(value: string) {
  return value
    .replace(
      /\b(?:The\s+)?CTA does not state the next step\b/gi,
      "CTA keeps the next step simple, but does not clarify what happens after click"
    );
}

function removeObservationMetaPhrases(value: string) {
  const suppressedPatterns = [
    /\bThis may not be visible in extracted content\b\.?/i,
    /\bVisual analysis coming(?: in V2)?\b\.?/i,
    /\bObservation based on inferred page structure \(Visual analysis coming in V2\)\b\.?/i,
    /\bDirect text evidence not captured in current crawl; observation based on inferred page structure\b\.?/i,
    /\bBased on inferred site structure; direct text capture limited in V1 \(Visual parsing in V2\)\b\.?/i,
    /\bObservation derived from DOM hierarchy analysis; full OCR\/Vision analysis scheduled for V2\b\.?/i,
    /\bContextual deduction based on known brand patterns; text extraction pending technical refinement\b\.?/i,
    /\bDirect text capture limited in V1\b\.?/i,
    /\bVisual parsing in V2\b\.?/i,
    /\bDOM hierarchy analysis\b\.?/i,
    /\bfull OCR\/Vision analysis scheduled for V2\b\.?/i,
    /\btext extraction pending technical refinement\b\.?/i
  ];

  const keptSentences = splitIntoSentences(value).filter(
    (sentence) => !suppressedPatterns.some((pattern) => pattern.test(sentence))
  );

  if (keptSentences.length === 0) {
    return "";
  }

  return keptSentences
    .map((sentence) => sanitizeSentenceLikeText(sentence))
    .filter(Boolean)
    .join(" ");
}

function normalizeObservationForEvidence(
  value: string,
  coverage: EvidenceCoverage,
  sectionName: AnalysisSectionKey
) {
  if (coverage === "missing") {
    return getMissingEvidenceObservation(sectionName);
  }

  const cleanedValue = removeObservationMetaPhrases(value);

  if (!cleanedValue || cleanedValue === MISSING_INFORMATION_TEXT) {
    return cleanedValue || value;
  }

  if (coverage === "clear") {
    return polishObservationPhrases(cleanedValue);
  }

  return polishObservationPhrases(cleanedValue);
}

function normalizeConfidenceForEvidence(
  level: string,
  reason: string,
  coverage: EvidenceCoverage
): { level: ConfidenceLevel; reason: string } {
  const sanitizedReason = sanitizeSentenceLikeText(reason);
  const normalizedLevel: ConfidenceLevel = level === "HIGH" ? "HIGH" : "LOW";

  if (coverage === "missing") {
    return {
      level: "LOW" as const,
      reason:
        "Text-only V1 did not capture this visual evidence. V2 vision analysis is coming soon."
    };
  }

  if (coverage === "partial") {
    return {
      level: "LOW",
      reason:
        sanitizedReason && !isMissingEvidenceText(sanitizedReason)
          ? /[.!?]$/.test(sanitizedReason)
            ? sanitizedReason
            : `${sanitizedReason}.`
          : "Based on partial extracted signals, so confidence stays low."
    };
  }

  if (sanitizedReason) {
    return {
      level: normalizedLevel,
      reason: /[.!?]$/.test(sanitizedReason)
        ? sanitizedReason
        : `${sanitizedReason}.`
    };
  }

  return {
    level: normalizedLevel,
    reason:
      normalizedLevel === "HIGH"
        ? "Based on directly extracted text."
        : "Based on inferred structure rather than directly captured text."
  };
}

function sanitizeAnalyzeResponse(
  response: AnalyzeApiResponse,
  pageContent: ExtractedPageContent,
  competitorContent: ExtractedCompetitorContent[]
): AnalyzeApiResponse {
  const coverageBySection: Partial<Record<AnalysisSectionKey, EvidenceCoverage>> =
    {};
  const sections = response.sections.map((section) => {
    let { text: evidence, coverage } = sanitizeEvidenceBlock(section.evidence);
    let confidenceInput = section.confidence;
    const targetEvidence = getExtractedEvidenceFallback(section.name, pageContent);
    const hasTargetEvidence = Boolean(targetEvidence);

    if (!hasTargetEvidence) {
      evidence = NO_CLEAR_EVIDENCE_TEXT;
      coverage = "missing";
      confidenceInput = {
        level: "LOW",
        reason:
          "Text-only V1 did not capture this visual evidence. V2 vision analysis is coming soon."
      };
    } else if (coverage === "missing") {
      if (targetEvidence) {
        evidence = targetEvidence;
        coverage = "clear";
        confidenceInput = {
          level: "HIGH",
          reason: "Based on directly extracted text."
        };
      }
    }

    coverageBySection[section.name] = coverage;

    const observation = normalizeObservationForEvidence(
      sanitizeObservation(section.observation),
      coverage,
      section.name
    );
    const confidence = normalizeConfidenceForEvidence(
      confidenceInput.level,
      confidenceInput.reason,
      coverage
    );
    const sanitizedRecommendation = sanitizeBulletBlock(section.recommendation);

    return {
      ...section,
      title:
        coverage === "missing"
          ? getMissingEvidenceTitle(section.name)
          : sanitizeSentenceLikeText(section.title),
      observation,
      evidence,
      recommendation: appendManualCheckGuidance(
        sanitizedRecommendation,
        section.name,
        confidence.level,
        competitorContent,
        coverage
      ),
      confidence
    };
  });

  return {
    summary: {
      keyStrengths: sanitizeSummaryStrengthsForEvidence(
        response.summary.keyStrengths,
        coverageBySection
      ),
      keyGaps: sanitizeSummaryGapsForEvidence(
        response.summary.keyGaps,
        coverageBySection
      ),
      topActions: response.summary.topActions
        .map(sanitizeSummaryItem)
        .filter(Boolean)
    },
    sections
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Analyze error: missing OPENAI_API_KEY");
    return createAnalysisJsonResponse(
      { error: "Missing OPENAI_API_KEY environment variable." },
      500
    );
  }

  let body: AnalyzeRequestBody;

  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch (error) {
    console.error("Analyze error: request body must be valid JSON", error);

    return createAnalysisJsonResponse(
      { error: "Request body must be valid JSON." },
      400
    );
  }

  try {
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const sections = normalizeSections(body.sections);
    const competitorUrls = normalizeCompetitorUrls(body.competitorUrls);

    if (!url || !isValidUrl(url)) {
      console.error("Analyze error: invalid url", { url });
      return createAnalysisJsonResponse(
        { error: "Input `url` must be a valid absolute URL." },
        400
      );
    }

    if (sections.length === 0) {
      console.error("Analyze error: no valid sections", { sections });
      return createAnalysisJsonResponse(
        {
          error:
            "Input `sections` must include at least one of: Hero, CTA, Social Proof."
        },
        400
      );
    }

    let pageContent: ExtractedPageContent;
    let competitorContent: ExtractedCompetitorContent[];

    const [targetContent, ...resolvedCompetitors] = await Promise.all([
      extractPageContentFromUrl(url, sections).catch((error) => {
        console.error("Target content grounding failed", {
          url,
          error: getErrorDetails(error)
        });

        return createEmptyPageContent();
      }),
      ...competitorUrls.map(async (competitorUrl) => {
        const content = await extractPageContentFromUrl(
          competitorUrl,
          sections
        ).catch(
          (error) => {
            console.error("Competitor content grounding failed", {
              url: competitorUrl,
              error: getErrorDetails(error)
            });

            return createEmptyPageContent();
          }
        );

        return {
          url: competitorUrl,
          content
        };
      })
    ]);

    pageContent = targetContent;
    competitorContent = resolvedCompetitors;
    const promptPageContent = truncatePageContentForPrompt(pageContent);
    const promptCompetitorContent =
      truncateCompetitorContentForPrompt(competitorContent);

    const competitorContext =
      competitorContent.length > 0
        ? competitorContent
            .map(
              (competitor, index) =>
                `${getCompetitorName(competitor, index)} (${competitor.url})`
            )
            .join(", ")
        : MISSING_INFORMATION_TEXT;
    const isServiceBusiness = isLikelyServiceBusiness(url, [
      pageContent.title,
      pageContent.headline,
      pageContent.description,
      ...pageContent.headings
    ]);

    const prompt = [
      "You are a senior UX strategist analyzing a SaaS landing page.",
      "",
      "Your job is to produce a clear, confident, and structured analysis - not speculative or generic commentary.",
      "",
      "CORE PRINCIPLE:",
      '- Every insight must answer: "What does the user fail to understand, trust, or decide?"',
      "",
      "IMPORTANT RULES:",
      '- Do NOT use words like "likely", "may", "might", "probably", "suggests", "typically", or "common pattern"',
      "- Do NOT hedge or sound uncertain",
      "- Speak with clarity and authority",
      "- Be specific, concrete, and useful",
      "- Keep insights concise and scannable",
      "- Keep every field under 2 short sentences",
      '- If something cannot be verified, say: "Not enough information available to verify"',
      "",
      "WRITING QUALITY RULES:",
      "- Sound like a senior UX strategist",
      "- Prefer direct comparisons over generic advice",
      "- Use actual extracted text when available",
      "- Quote short headline or CTA snippets when useful",
      "- Do not invent missing copy",
      '- Avoid generic UX phrases such as "value proposition", "clarity", "engagement", and "optimize"',
      '- When partial information exists, prefer fairness phrasing such as "communicates X, but lacks Y" or "is clear at category level, but not outcome-specific"',
      "",
      "BALANCE RULES:",
      "- If the page shows strong brand signals, high-scale proof, or widely recognized positioning, do not frame the section as an outright weakness by default",
      "- In those cases, describe the tradeoff clearly",
      "- Example: a broader brand promise can support positioning while reducing immediate clarity for new users",
      "- Do not assume competitor patterns are automatically better or more correct",
      "- Before labeling something as a weakness, ask whether it reflects intentional positioning, a different sales motion, or a different product strategy",
      "- If the difference appears intentional, frame it as a tradeoff and explain the impact on the buyer's first impression or decision",
      "- Keep the tone balanced and credible, especially for strong or established products",
      "- If the page represents a service business such as an agency, focus the analysis on positioning, credibility, differentiation, and proof rather than product feature comparison",
      "",
      "GROUNDING REQUIREMENT:",
      "- Use the provided Page Context when available",
      "- Reference actual text, especially headline and CTA labels, explicitly",
      "- Do NOT generalize if real text is available",
      "- Do NOT invent text that is not provided",
      "- Before critiquing the Hero section, review all available hero content together: title, H1, H2 or supporting copy, headings, and description",
      "- Use ALL available hero-related text to determine what the page communicates, not just the H1",
      "- If supporting lines explain what the product does or what category it belongs to, include that context in the analysis",
      '- If headline and CTA text are missing, use other extracted text when available and otherwise say "Not enough information available to verify"',
      "",
      "CONTEXT:",
      `- URL: ${url}`,
      `- Sections: ${sections.join(", ")}`,
      `- Competitor context: ${competitorContext}`,
      `- Service business: ${isServiceBusiness ? "Yes" : "No"}`,
      "",
      "Assume this is a modern commercial landing page where clarity, trust, and conversion matter, but different products can pursue those goals through different positioning and sales motions.",
      "",
      "OUTPUT FORMAT (STRICT):",
      "Return JSON with the schema already enforced by this app:",
      '- summary.keyStrengths: 3 items max (these correspond to "strengths")',
      '- summary.keyGaps: 3 items max (these correspond to "gaps")',
      '- summary.topActions: 3 items max (these correspond to "actions")',
      `- sections: only for ${sections.join(", ")}`,
      "- Each section must include: name, title, observation, evidence, recommendation, confidence",
      "",
      "SUMMARY QUALITY:",
      "- Summary items must feel strategic and presentation-ready",
      "- Keep them short, direct, and useful",
      "- Keep each summary item to about 10 words when possible",
      "- Do not use ellipses, trailing commas, or unfinished lists",
      "- Do not repeat the same idea across cards",
      "- Avoid generic phrasing",
      `- If a section uses the exact fallback evidence string "${NO_CLEAR_EVIDENCE_TEXT}", summary items for that section must use text-only V1 wording such as "needs a visual check" and must not make definitive claims`,
      "- Focus on what the user still does not understand, trust, or decide",
      "- Write section recommendations first, then derive summary.topActions from those recommendations",
      "- summary.topActions must reuse the same high-level nouns and strategic framing as the detailed recommendations",
      '- If a section recommendation uses a term such as "trust stack" or "outcome-led", the matching topActions item must use that exact term too',
      '- summary.topActions should sound strategic, like "Anchor the brand promise", "Shift to outcome-led hero framing", or "Consolidate the trust stack", while section recommendations explain the tactical how-to',
      "",
      "SECTION GUIDELINES:",
      buildSectionRules(sections),
      "",
      "SECTION OUTPUT RULES:",
      "- title: a 3 to 5 word judgment label",
      "- title must be a conclusion, not a description",
      '- title should read like: "Positioning without outcome", "Split conversion paths", or "Strong scale, limited depth"',
      "- observation: maximum 2 short sentences",
      "- observation sentence 1 must state the core insight, not just describe the page",
      "- observation sentence 2 must add either a comparison or an implication",
      "- observation must expand the title instead of repeating it",
      "- observation must state what the page communicates, what is missing, and why that matters for the user's decision",
      "- observation must not repeat the same claim twice",
      "- observation must stay confident and professional even when confidence is LOW",
      "- observation must never mention crawl limits, extracted-content visibility, DOM analysis, visual analysis, future versions, or internal technical limitations",
      '- When partial explanation exists, do not use absolute critique phrases like "does not explain" or "no clarity"',
      "- If evidence is missing or incomplete, keep the observation direct and comparative while leaving uncertainty to the evidence and confidence fields",
      "- When the difference appears intentional, observation should explain the tradeoff instead of treating the pattern as a pure flaw",
      "- Prefer tradeoff phrasing like: Compared to Asana, which emphasizes task-level outcomes, this page uses broader system framing, which makes the offer feel less concrete on first read",
      "- If competitors are present, observation must include a direct comparison sentence in this pattern: Compared to [Competitor Name], which uses [X strategy], [Target Site] uses [Y strategy], which makes [impact]",
      '- avoid "The page says..." phrasing unless quoting is necessary for evidence',
      "- observation must not restate the title or repeat the same extracted phrase without adding meaning",
      "- evidence: maximum 2 short bullet lines in one string, each line starting with '- '",
      "- evidence must reference extracted text when available and quote headline or CTA text when useful",
      "- evidence must use clean, complete quotes only and must not include broken fragments or partial clauses",
      `- If no directly extracted text is available for evidence, the evidence field must be exactly "${NO_CLEAR_EVIDENCE_TEXT}"`,
      '- Never write phrases like "contextual deduction", "inferred structure", "known brand patterns", or "pending technical refinement" in evidence',
      "- Evidence must only contain directly quoted extracted text or the exact fallback string",
      `- If evidence is exactly "${NO_CLEAR_EVIDENCE_TEXT}", title and observation must switch to text-only V1 wording, explain what designers should check manually, and must not make definitive claims about what the page does or does not show`,
      "- If direct text evidence is not available, evidence must use exactly this approved fallback line:",
      formatEvidenceFallbacksForPrompt(),
      "- recommendation: maximum 2 short bullet lines in one string, each line starting with '- '",
      "- recommendation must say what to change and how to change it",
      "- recommendation must stay specific and concrete",
      "- recommendation should provide the tactical how-to, not just the strategic label",
      '- If confidence is LOW because evidence is missing, add a manual-check block after the main bullets in this format:',
      '"What to check manually (until V2 vision analysis):"',
      "- Then include 2 short bullets about the visual elements to verify and the competitor pattern to compare",
      '- If the recommendation consolidates proof elements, use the term "trust stack"',
      '- If the recommendation sharpens the user result or payoff framing, use the term "outcome-led"',
      "- confidence.level must be exactly HIGH or LOW",
      "- confidence.reason: one short sentence using simple wording",
      "",
      "COMPARISON RULES:",
      "- If competitors are present, compare the target page against them directly",
      "- Every selected section must include one clear comparison sentence when competitor content is available",
      "- LOW confidence does not remove the comparison requirement",
      "- Treat competitors as reference points for differences in wording, proof, friction, and positioning, not as automatic defaults",
      "- Prefer wording like: Compared to Linear, this page...",
      "- When competitor text is too thin, say Not enough information available to verify",
      "- Even with LOW confidence, still explain why the page feels broad, narrow, generic, or specific by referencing the selected competitors",
      "- If Jira, Asana, or Monday are selected, use them as named reference points for product framing, CTA specificity, and proof structure whenever relevant",
      "- Prefer comparison statements like: This page is more brand-led, while competitors emphasize immediate task outcomes, which makes the first impression broader but less concrete",
      "- Name the competitors and describe one concrete difference in wording, next step, proof, or positioning",
      "- Do not use blanket phrasing like 'weaker than competitors' when the better explanation is a strategic tradeoff",
      "- For CTA, a short action like 'Try X' can support product-led, low-friction entry. Critique it only when the surrounding text still leaves the next step unclear",
      "- For Social Proof, if explicit proof is thin but the page leans on authority, research, or reputation, describe that the page relies on brand authority rather than explicit proof",
      "- When the target page has strong scale or brand proof, compare the tradeoff instead of calling it simply weaker",
      "",
      "CONFIDENCE RULES:",
      "- HIGH = directly supported by extracted text",
      "- LOW = partially supported, uncertain, or insufficient text evidence",
      "- MEDIUM is not a valid confidence value",
      "- Confidence must reflect how well the TARGET page claim is verified, not how much competitor evidence exists",
      "- Competitor evidence can inform comparison, but it cannot raise confidence when target-page evidence is missing",
      '- If evidence says "Not enough information available to verify" or uses one of the approved fallback lines, confidence cannot be HIGH',
      "- If confidence is uncertain, resolve it to LOW and explain why in confidence.reason",
      "- Confidence reason must be short and explicit",
      "- Use simple confidence reasons like 'Based on directly extracted text' or 'Text-only V1 did not capture this visual evidence. V2 vision analysis is coming soon.'",
      "",
      "STYLE EXAMPLES:",
      'Bad: "The hero likely tries to communicate several ideas at once."',
      'Good: "The hero communicates several ideas at once and does not explain what changes for the user."',
      'Bad: "This is weaker than competitors."',
      'Good: "This is more brand-led, while competitors emphasize immediate task outcomes, which makes the offer feel broader on first read."',
      'Bad: "The CTA could be more specific."',
      `Good: "The CTA "${promptPageContent.ctas[0] || "Get started"}" keeps entry friction low, while competitors explain the first step more explicitly."`,
      'Better CTA tone: "CTA keeps the next step simple, but does not clarify what happens after click."',
      'Bad observation: "This may not be visible in extracted content."',
      'Good LOW-confidence observation: "Compared to Jira, which frames a specific workflow outcome, this page keeps the promise broader, which makes the hero feel less outcome-led on first read."',
      'Bad: "Social proof is not decision-grade."',
      'Good: "The page relies on brand authority rather than explicit customer proof, so trust comes more from reputation than named validation."',
      'Bad recommendation: "Improve CTA clarity."',
      `Good recommendation: "Replace "${promptPageContent.ctas[0] || "Get started"}" with an outcome-driven action that tells the user what happens next."`,
      'Good top action: "Shift to outcome-led hero framing."',
      'Bad top action: "Improve social proof."',
      'Good top action: "Consolidate the trust stack."',
      'Good Social Proof recommendation: "Combine logos, quantified proof, and one named validation point into a tighter trust stack near the CTA."',
      "",
      "QUALITY TEST (MUST PASS BEFORE RETURNING JSON):",
      '- No hedge words: likely, may, might, probably, suggests',
      '- Every section must explain what the user fails to understand, trust, or decide',
      '- No generic UX phrases',
      "- Do not treat competitor patterns as automatic defaults",
      "- If a difference appears intentional, explain the tradeoff",
      "- Do not allow HIGH confidence when evidence is missing or incomplete",
      "- Do not return MEDIUM",
      "- No repetition between title and observation",
      "- No broken or partial strings",
      "- No numbering artifacts such as 7. or 1.",
      "- No truncated sentences or trailing ellipses",
      "- No incomplete comparison fragments such as 'Compared to X, Y, and Z.'",
      "- No observation sentences about crawl limits, extracted-content visibility, DOM analysis, or future visual analysis",
      '- No evidence phrases such as "contextual deduction", "inferred structure", "known brand patterns", or "pending technical refinement"',
      "- Every observation must include a comparison when competitors are available",
      "- summary.topActions must match the vocabulary of the detailed recommendations",
      '- Every section must be specific, grounded, and actionable',
      "",
      "PAGE CONTEXT:",
      isServiceBusiness
        ? "- This page appears to be a service-based business. Analysis should focus on positioning and credibility rather than product comparison."
        : "- This page appears to be a product-led SaaS page unless the extracted content shows otherwise.",
      `- Hero Context: ${[
        promptPageContent.title,
        promptPageContent.headline,
        promptPageContent.description
      ]
        .filter(Boolean)
        .join(" | ") || "Not found"}`,
      `- Headline Source: ${formatHeadlineSourceForPrompt(
        promptPageContent.headlineSource
      )}`,
      `- Headline: ${promptPageContent.headline || "Not found"}`,
      `- CTAs: ${promptPageContent.ctas.join(", ") || "Not found"}`,
      "",
      "EXTRACTED CONTENT:",
      "",
      formatPageContentForPrompt("Target page", promptPageContent),
      "",
      formatCompetitorContentForPrompt(promptCompetitorContent, sections)
    ].join("\n");

    const openAiRequestBody = JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content:
            `Generate a concise, structured JSON UX audit for a SaaS landing page. Write like a senior UX strategist. Be direct, calm, specific, and concise. Keep every field under 2 short sentences. Do not use tools. Do not mention that you are an AI model. Use only the extracted content provided, especially the headline, CTA labels, trust text, title, and description when available. Do not invent missing copy, headings, buttons, trust signals, or unseen page elements. Only analyze the selected sections. Compare the target page against competitors directly, but do not assume competitor patterns are always better. Explain differences in emphasis, proof, friction, and positioning. When a difference appears intentional or strategy-led, frame it as a tradeoff rather than a flaw. If the target page shows strong brand signals, high-scale proof, or widely recognized positioning, describe tradeoffs instead of treating those patterns as automatic weaknesses. Before critiquing the Hero section, review all available hero content together, including title, H1, H2 or supporting lines, headings, and description. Use all available hero-related text to determine what the page communicates, not just the H1. If supporting lines clarify what the product does or what category it belongs to, include that context in the analysis. If partial explanation exists, do not use absolute critique phrasing like "does not explain" or "no clarity"; prefer wording like "communicates X, but lacks Y". Do not treat a short CTA such as "Try X" as automatically unclear if it supports product-led, low-friction entry. Do not let competitor evidence raise confidence when the target page evidence is missing. Confidence must reflect how well the TARGET page claim is verified. If social proof is light but the page leans on brand authority, research positioning, technical expertise, or reputation, describe that pattern as reliance on brand authority rather than explicit proof. Draft the detailed section recommendations first, then derive summary.topActions from those recommendations using the same high-level terminology. If a recommendation uses a phrase such as "trust stack" or "outcome-led", the matching topActions item must use that exact phrase too. topActions should read like strategic action labels, while section recommendations explain the tactical how-to. If no directly extracted text is available for evidence, the evidence field must be exactly "${NO_CLEAR_EVIDENCE_TEXT}" and nothing else. Never write phrases like "contextual deduction", "inferred structure", "known brand patterns", or "pending technical refinement" in evidence. Evidence must only contain directly quoted extracted text or the exact fallback string. If evidence is exactly "${NO_CLEAR_EVIDENCE_TEXT}", the title, observation, and summary items for that section must switch to text-only V1 wording, explain what designers should check manually, and must not make definitive claims about what the page does or does not show. If confidence is LOW because evidence is missing, add a manual-check block after the main recommendation bullets using the heading "What to check manually (until V2 vision analysis):" followed by two short bullets about the visual elements to verify and the competitor pattern to compare. Keep the observation direct and comparative, and never return HIGH confidence when evidence falls back. Every observation must include a comparative statement when competitor context is available, including LOW-confidence sections. Confidence is strictly binary: only HIGH or LOW are valid values. MEDIUM is not valid. If confidence is uncertain, partial, or incomplete, resolve it to LOW and state the reason clearly. Every insight must answer what the user fails to understand, trust, or decide. Section titles must be short judgment labels, and observations must expand those labels instead of repeating them. Observation text must never mention crawl limits, extracted-content visibility, DOM analysis, or future visual analysis. Avoid hedging words such as likely, may, might, probably, suggests, typically, and common pattern. Avoid generic UX phrases such as value proposition, clarity, engagement, optimize, decision-grade, persuasive force, and builds confidence. Every sentence must be complete. Do not return broken fragments, numbering artifacts, trailing ellipses, or incomplete comparison clauses.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      text: {
        format: {
          type: "json_schema",
          name: "landing_page_analysis",
          strict: true,
          schema: buildResponseSchema(sections)
        }
      }
    });

    let response: Response | null = null;
    let lastOpenAiErrorText = "";

    for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt += 1) {
      try {
        response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          signal: createTimeoutSignal(OPENAI_REQUEST_TIMEOUT_MS),
          body: openAiRequestBody
        });
      } catch (error) {
        console.error("OpenAI call failed", {
          attempt,
          error: getErrorDetails(error)
        });

        if (attempt < OPENAI_MAX_ATTEMPTS && isRetryableOpenAiError(error)) {
          await delay(OPENAI_RETRY_DELAY_MS);
          continue;
        }

        throw error;
      }

      if (response.ok) {
        break;
      }

      const errorText = await response.text();
      lastOpenAiErrorText = errorText;

      console.error("OpenAI analyze request failed", {
        attempt,
        status: response.status,
        responseText: errorText
      });

      if (
        attempt < OPENAI_MAX_ATTEMPTS &&
        isRetryableOpenAiResponse(response.status, errorText)
      ) {
        await delay(OPENAI_RETRY_DELAY_MS);
        continue;
      }

      return createAnalysisErrorResponse(
        errorText || `OpenAI request failed with status ${response.status}.`,
        502
      );
    }

    if (!response || !response.ok) {
      return createAnalysisErrorResponse(
        lastOpenAiErrorText || "OpenAI request did not complete successfully.",
        502
      );
    }

    const rawResponse = (await response.json()) as unknown;

    const responseText = extractResponseText(rawResponse);

    if (!responseText) {
      return createAnalysisErrorResponse(
        `Model response did not include extractable text output. Raw response: ${serializeForDebug(
          rawResponse
        )}`,
        502
      );
    }

    let parsed: unknown;

    try {
      parsed = parseStructuredOutput(responseText);
    } catch (error) {
      return createAnalysisErrorResponse(
        `${
          error instanceof Error
            ? error.message
            : "Model returned invalid JSON output."
        } Raw response: ${serializeForDebug(rawResponse)}`,
        502
      );
    }

    if (!isAnalyzeResponse(parsed)) {
      return createAnalysisErrorResponse(
        `Model output did not match the expected response shape. Raw response: ${serializeForDebug(
          rawResponse
        )}`,
        502
      );
    }

    return createAnalysisJsonResponse(
      sanitizeAnalyzeResponse(parsed, pageContent, competitorContent)
    );
  } catch (error) {
    console.error("Analyze error:", error);

    return createAnalysisErrorResponse(getErrorDetails(error));
  }
}
