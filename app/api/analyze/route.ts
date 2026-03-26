import { NextRequest, NextResponse } from "next/server";

import { isLikelyServiceBusiness } from "@/lib/business-type";
import { splitSentencesPreservingDomains } from "@/lib/sentence-utils";
import type { AnalyzeApiResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const VALID_SECTIONS = ["Hero", "CTA", "Social Proof"] as const;
const PAGE_FETCH_TIMEOUT_MS = 10000;
const OPENAI_REQUEST_TIMEOUT_MS = 20000;
const HTML_PREVIEW_CHAR_LIMIT = 2500000;

type ValidSection = (typeof VALID_SECTIONS)[number];

type AnalyzeRequestBody = {
  url?: unknown;
  sections?: unknown;
  competitorUrls?: unknown;
};

type ExtractedPageContent = {
  title: string;
  headline: string;
  headings: string[];
  ctas: string[];
  description: string;
  trustSignals: string[];
};

type ExtractedCompetitorContent = {
  url: string;
  content: ExtractedPageContent;
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
                  enum: ["HIGH", "MEDIUM", "LOW"]
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
    { status }
  );
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

function formatListForPrompt(values: string[]) {
  return values.length > 0
    ? values.map((value) => `- ${value}`).join("\n")
    : MISSING_INFORMATION_TEXT;
}

function formatTextForPrompt(value: string) {
  return value.trim() ? value.trim() : MISSING_INFORMATION_TEXT;
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
    "Headings:",
    formatListForPrompt(content.headings),
    "CTAs:",
    formatListForPrompt(content.ctas),
    `Description: ${formatTextForPrompt(content.description)}`,
    "Trust Signals:",
    formatListForPrompt(content.trustSignals)
  ].join("\n");
}

function getCompetitorName(
  competitor: ExtractedCompetitorContent,
  index: number
) {
  try {
    const hostname = new URL(competitor.url).hostname.replace(/^www\./i, "");
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

  const letter = String.fromCharCode(65 + index);

  return `Competitor ${letter}`;
}

function formatCompetitorContentForPrompt(
  competitorContent: ExtractedCompetitorContent[]
) {
  if (competitorContent.length === 0) {
    return formatPageContentForPrompt("Competitors", null);
  }

  return competitorContent
    .map((competitor, index) =>
      [
        formatPageContentForPrompt(
          getCompetitorName(competitor, index),
          competitor.content
        ),
        `Source URL: ${competitor.url}`
      ].join("\n")
    )
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
        candidate.score >= 3 && !isLikelyTrustNavigationNoise(candidate.value)
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

function isBrokenHeroHeadline(value: string, description: string) {
  if (!value || !description) {
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

function extractPageContentFromHtml(
  html: string,
  sections: ValidSection[]
): ExtractedPageContent {
  const needsHeroContent = sections.includes("Hero");
  const needsCtaContent = sections.includes("CTA");
  const needsTrustContent = sections.includes("Social Proof");
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1] ? normalizeExtractedText(titleMatch[1]) : "";
  const h1Text =
    needsHeroContent || needsTrustContent ? extractTagText(html, "h1") : [];
  const h2Text =
    needsHeroContent || needsTrustContent ? extractTagText(html, "h2") : [];
  const ctas = needsCtaContent ? extractCallToActionsFromHtml(html) : [];
  const description = extractMetaDescription(html);
  const rawHeadline = h1Text[0] ? normalizeExtractedText(h1Text[0]) : "";
  const useDescriptionAsHeadline = isBrokenHeroHeadline(rawHeadline, description);
  const headline = useDescriptionAsHeadline ? description : rawHeadline;
  const heroHeadings = useDescriptionAsHeadline ? h2Text : [...h1Text, ...h2Text];

  return {
    title,
    headline,
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

async function fetchPageHtml(url: string) {
  console.log("Fetching page HTML:", url);

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

  console.log("Page fetch response:", { url, status: response.status });

  if (!response.body) {
    const html = await response.text();

    console.log("Page HTML ready:", { url, length: html.length });

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

  console.log("Page HTML ready:", { url, length: html.length });

  return html.slice(0, HTML_PREVIEW_CHAR_LIMIT);
}

async function extractPageContentFromUrl(
  url: string,
  sections: ValidSection[]
) {
  const html = await fetchPageHtml(url);

  return extractPageContentFromHtml(html, sections);
}

function createEmptyPageContent(): ExtractedPageContent {
  return {
    title: "",
    headline: "",
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
      "- Hero: compare what the page says, what changes for the user, and whether the first screen shows one clear next step using the full hero context, not just the main headline."
    );
  }

  if (selectedSections.includes("CTA")) {
    rules.push(
      "- CTA: compare CTA wording, what happens next, and whether one action leads using extracted button text and button-like links."
    );
  }

  if (selectedSections.includes("Social Proof")) {
    rules.push(
      "- Social Proof: compare customer proof, logos, reviews, certifications, and quantified credibility language using extracted trust-signal text, headings, and meta description."
    );
  }

  return rules.join("\n");
}

function trimForLog(value: string, maxLength = 4000) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength)}\n...[trimmed ${value.length - maxLength} chars]`
    : value;
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

function sanitizeAnalyzeResponse(
  response: AnalyzeApiResponse
): AnalyzeApiResponse {
  return {
    summary: {
      keyStrengths: response.summary.keyStrengths
        .map(sanitizeSummaryItem)
        .filter(Boolean),
      keyGaps: response.summary.keyGaps.map(sanitizeSummaryItem).filter(Boolean),
      topActions: response.summary.topActions
        .map(sanitizeSummaryItem)
        .filter(Boolean)
    },
    sections: response.sections.map((section) => {
      const observation = sanitizeObservation(section.observation);
      const confidenceReason = sanitizeSentenceLikeText(
        section.confidence.reason
      );

      return {
        ...section,
        title: sanitizeSentenceLikeText(section.title),
        observation,
        evidence: sanitizeBulletBlock(section.evidence),
        recommendation: sanitizeBulletBlock(section.recommendation),
        confidence: {
          ...section.confidence,
          reason: /[.!?]$/.test(confidenceReason)
            ? confidenceReason
            : `${confidenceReason}.`
        }
      };
    })
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Analyze error: missing OPENAI_API_KEY");
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY environment variable." },
      { status: 500 }
    );
  }

  let body: AnalyzeRequestBody;

  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch (error) {
    console.error("Analyze error: request body must be valid JSON", error);

    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  try {
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const sections = normalizeSections(body.sections);
    const competitorUrls = normalizeCompetitorUrls(body.competitorUrls);

    if (!url || !isValidUrl(url)) {
      console.error("Analyze error: invalid url", { url });
      return NextResponse.json(
        { error: "Input `url` must be a valid absolute URL." },
        { status: 400 }
      );
    }

    if (sections.length === 0) {
      console.error("Analyze error: no valid sections", { sections });
      return NextResponse.json(
        {
          error:
            "Input `sections` must include at least one of: Hero, CTA, Social Proof."
        },
        { status: 400 }
      );
    }

    console.log("Selected sections:", sections);

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

    console.log("Extracted target content:", pageContent);
    console.log("Extracted headline:", pageContent.headline);
    console.log("Extracted CTAs:", pageContent.ctas);

    console.log("Extracted competitor content:", competitorContent);

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
      "Assume this is a modern commercial landing page where clarity, trust, and conversion matter.",
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
      "- Focus on what the user still does not understand, trust, or decide",
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
      '- When partial explanation exists, do not use absolute critique phrases like "does not explain" or "no clarity"',
      '- avoid "The page says..." phrasing unless quoting is necessary for evidence',
      "- observation must not restate the title or repeat the same extracted phrase without adding meaning",
      "- evidence: maximum 2 short bullet lines in one string, each line starting with '- '",
      "- evidence must reference extracted text when available and quote headline or CTA text when useful",
      "- evidence must use clean, complete quotes only and must not include broken fragments or partial clauses",
      "- recommendation: maximum 2 short bullet lines in one string, each line starting with '- '",
      "- recommendation must say what to change and how to change it",
      "- recommendation must stay specific and concrete",
      "- confidence.level must be exactly HIGH, MEDIUM, or LOW",
      "- confidence.reason: one short sentence using simple wording",
      "",
      "COMPARISON RULES:",
      "- If competitors are present, compare the target page against them directly",
      "- Every selected section must include one clear comparison sentence when competitor content is available",
      "- Prefer wording like: Compared to Linear, this page...",
      "- When competitor text is too thin, say Not enough information available to verify",
      "- Prefer comparison statements like: Competitors use action-specific CTAs like 'Book demo' while the target page uses 'Get started'",
      "- Name the competitors and describe one concrete difference in wording or proof",
      "- When the target page has strong scale or brand proof, compare the tradeoff instead of calling it simply weaker",
      "",
      "CONFIDENCE RULES:",
      "- HIGH = directly supported by extracted text",
      "- MEDIUM = partially supported by extracted text",
      "- LOW = insufficient text evidence",
      "- Confidence reason must be short and explicit",
      "- Use simple confidence reasons like 'Based on directly extracted text' or 'Not enough information available to verify this claim'",
      "",
      "STYLE EXAMPLES:",
      'Bad: "The hero likely tries to communicate several ideas at once."',
      'Good: "The hero communicates several ideas at once and does not explain what changes for the user."',
      'Bad: "The CTA could be more specific."',
      `Good: "The CTA "${pageContent.ctas[0] || "Get started"}" is generic and does not explain the next step or outcome."`,
      'Bad: "Social proof is not decision-grade."',
      'Good: "Social proof is not strong enough to drive trust quickly."',
      'Bad recommendation: "Improve CTA clarity."',
      `Good recommendation: "Replace "${pageContent.ctas[0] || "Get started"}" with an outcome-driven action that tells the user what happens next."`,
      "",
      "QUALITY TEST (MUST PASS BEFORE RETURNING JSON):",
      '- No hedge words: likely, may, might, probably, suggests',
      '- Every section must explain what the user fails to understand, trust, or decide',
      '- No generic UX phrases',
      "- No repetition between title and observation",
      "- No broken or partial strings",
      "- No numbering artifacts such as 7. or 1.",
      "- No truncated sentences or trailing ellipses",
      "- No incomplete comparison fragments such as 'Compared to X, Y, and Z.'",
      '- Every section must be specific, grounded, and actionable',
      "",
      "PAGE CONTEXT:",
      isServiceBusiness
        ? "- This page appears to be a service-based business. Analysis should focus on positioning and credibility rather than product comparison."
        : "- This page appears to be a product-led SaaS page unless the extracted content shows otherwise.",
      `- Hero Context: ${[pageContent.title, pageContent.headline, pageContent.description]
        .filter(Boolean)
        .join(" | ") || "Not found"}`,
      `- Headline: ${pageContent.headline || "Not found"}`,
      `- CTAs: ${pageContent.ctas.join(", ") || "Not found"}`,
      "",
      "EXTRACTED CONTENT:",
      "",
      formatPageContentForPrompt("Target page", pageContent),
      "",
      formatCompetitorContentForPrompt(competitorContent)
    ].join("\n");

    console.log("Final prompt payload:", trimForLog(prompt));

    let response: Response;

    try {
      response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        signal: createTimeoutSignal(OPENAI_REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          input: [
            {
              role: "system",
              content:
                'Generate a concise, structured JSON UX audit for a SaaS landing page. Write like a senior UX strategist. Be direct, calm, specific, and concise. Keep every field under 2 short sentences. Do not use tools. Do not mention that you are an AI model. Use only the extracted content provided, especially the headline, CTA labels, trust text, title, and description when available. Do not invent missing copy, headings, buttons, trust signals, or unseen page elements. Only analyze the selected sections. Compare the target page against competitors directly and call out where the target is stronger or weaker. If the target page shows strong brand signals, high-scale proof, or widely recognized positioning, describe tradeoffs instead of treating those patterns as automatic weaknesses. Before critiquing the Hero section, review all available hero content together, including title, H1, H2 or supporting lines, headings, and description. Use all available hero-related text to determine what the page communicates, not just the H1. If supporting lines clarify what the product does or what category it belongs to, include that context in the analysis. If partial explanation exists, do not use absolute critique phrasing like "does not explain" or "no clarity"; prefer wording like "communicates X, but lacks Y". Every insight must answer what the user fails to understand, trust, or decide. Section titles must be short judgment labels, and observations must expand those labels instead of repeating them. Avoid hedging words such as likely, may, might, probably, suggests, typically, and common pattern. Avoid generic UX phrases such as value proposition, clarity, engagement, optimize, decision-grade, persuasive force, and builds confidence. Every sentence must be complete. Do not return broken fragments, numbering artifacts, trailing ellipses, or incomplete comparison clauses. If evidence is missing, say "Not enough information available to verify".'
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
        })
      });
    } catch (error) {
      console.error("OpenAI call failed:", error);
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();

      console.error("OpenAI analyze request failed", {
        status: response.status,
        responseText: errorText
      });

      return createAnalysisErrorResponse(
        errorText || `OpenAI request failed with status ${response.status}.`,
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

    return NextResponse.json(sanitizeAnalyzeResponse(parsed));
  } catch (error) {
    console.error("Analyze error:", error);

    return createAnalysisErrorResponse(getErrorDetails(error));
  }
}
