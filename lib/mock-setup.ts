/**
 * V1: Competitor suggestions use a curated lookup map for known categories.
 * This is intentionally conservative — fake automatic discovery would be
 * less reliable than honest manual override for an 8-hour V1.
 *
 * V2 approach (scoped, not yet built):
 * 1. Extract category signal from target page (title, headline, description)
 *    and ask the model what job the product solves and who the buyer is.
 * 2. Use that as a search brief via Tavily or G2 category pages —
 *    not a generic "competitors of X" query which returns listicles.
 * 3. Validate relevance before running analysis using category language overlap.
 * 4. Surface the competitor set as a reviewable step the user can edit
 *    before analysis fires — consistent with the confidence system philosophy.
 */
import type {
  CompetitorSuggestion,
  LoadingStep,
  SetupSectionOption
} from "./types";

export const setupSections: SetupSectionOption[] = [
  { key: "Hero", label: "Hero Section" },
  { key: "CTA", label: "Call to Action (CTA)" },
  { key: "Social Proof", label: "Social Proof" }
];

export const competitorCatalog: CompetitorSuggestion[] = [
  {
    id: "linear",
    name: "Linear",
    initials: "L",
    url: "https://linear.app/"
  },
  {
    id: "loom",
    name: "Loom",
    initials: "Lm",
    url: "https://www.loom.com/"
  },
  {
    id: "notion",
    name: "Notion",
    initials: "N",
    url: "https://www.notion.com/"
  },
  {
    id: "jira",
    name: "Jira",
    initials: "J",
    url: "https://www.atlassian.com/software/jira"
  },
  {
    id: "asana",
    name: "Asana",
    initials: "A",
    url: "https://asana.com/"
  },
  {
    id: "monday",
    name: "Monday",
    initials: "M",
    url: "https://monday.com/"
  },
  {
    id: "outreach",
    name: "Outreach",
    initials: "O",
    url: "https://www.outreach.io/"
  },
  {
    id: "salesloft",
    name: "Salesloft",
    initials: "S",
    url: "https://www.salesloft.com/"
  },
  {
    id: "zoominfo",
    name: "ZoomInfo",
    initials: "Z",
    url: "https://www.zoominfo.com/"
  },
  {
    id: "salesforce",
    name: "Salesforce",
    initials: "Sf",
    url: "https://www.salesforce.com/"
  },
  {
    id: "marketo",
    name: "Marketo",
    initials: "Mk",
    url: "https://business.adobe.com/products/marketo/adobe-marketo.html"
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    initials: "Ac",
    url: "https://www.activecampaign.com/"
  },
  {
    id: "openai",
    name: "OpenAI",
    initials: "O",
    url: "https://openai.com/"
  },
  {
    id: "deepmind",
    name: "Google DeepMind",
    initials: "Gd",
    url: "https://deepmind.google/"
  },
  {
    id: "cohere",
    name: "Cohere",
    initials: "C",
    url: "https://cohere.com/"
  }
];

const competitorById = new Map(
  competitorCatalog.map((competitor) => [competitor.id, competitor])
);

const competitorLookup: Record<string, string[]> = {
  apollo: ["outreach", "salesloft", "zoominfo"],
  linear: ["jira", "asana", "monday"],
  hubspot: ["salesforce", "marketo", "activecampaign"],
  anthropic: ["openai", "deepmind", "cohere"],
  default: ["notion", "linear", "loom"]
};

export const suggestedCompetitors: CompetitorSuggestion[] = competitorLookup.default
  .map((id) => competitorById.get(id))
  .filter((value): value is CompetitorSuggestion => Boolean(value));

const IGNORED_HOST_TOKENS = new Set([
  "www",
  "com",
  "app",
  "so",
  "io",
  "co",
  "net",
  "org",
  "ai",
  "dev",
  "google"
]);

function normalizeSiteToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getNormalizedHostname(url: string) {
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    return null;
  }

  try {
    const candidate = /^https?:\/\//i.test(normalizedUrl)
      ? normalizedUrl
      : `https://${normalizedUrl}`;

    return new URL(candidate).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function getComparableHostnameTokens(url: string) {
  const hostname = getNormalizedHostname(url);

  if (!hostname) {
    return [];
  }

  return hostname
    .split(".")
    .map((token) => normalizeSiteToken(token))
    .filter((token) => token && !IGNORED_HOST_TOKENS.has(token));
}

function matchesSuggestedCompetitor(url: string, competitor: CompetitorSuggestion) {
  const targetTokens = new Set(getComparableHostnameTokens(url));

  if (targetTokens.size === 0) {
    return false;
  }

  const competitorTokens = [
    normalizeSiteToken(competitor.id),
    ...getComparableHostnameTokens(competitor.url)
  ].filter(Boolean);

  return competitorTokens.some((token) => targetTokens.has(token));
}

export function getCompetitorLookupKey(url: string) {
  const hostname = getNormalizedHostname(url);

  if (!hostname) {
    return "default";
  }

  for (const key of Object.keys(competitorLookup)) {
    if (key === "default") {
      continue;
    }

    if (hostname === key || hostname.startsWith(`${key}.`) || hostname.includes(key)) {
      return key;
    }
  }

  return "default";
}

export function getSuggestedCompetitorsForUrl(url: string) {
  const lookupKey = getCompetitorLookupKey(url);
  const competitorIds = competitorLookup[lookupKey] ?? competitorLookup.default;

  return competitorIds
    .map((id) => competitorById.get(id))
    .filter((value): value is CompetitorSuggestion => Boolean(value))
    .filter((competitor) => !matchesSuggestedCompetitor(url, competitor));
}

export const loadingSteps: LoadingStep[] = [
  {
    title: "Extracting hero, CTA, and proof text",
    description: "Grounding the analysis in the target page's visible copy and structure.",
    status: "complete"
  },
  {
    title: "Comparing against selected competitors",
    description:
      "Benchmarking positioning, CTA phrasing, and trust patterns against the selected set.",
    status: "active"
  },
  {
    title: "Drafting evidence-backed recommendations",
    description: "Turning grounded comparisons into strengths, gaps, and next actions.",
    status: "pending"
  }
];
