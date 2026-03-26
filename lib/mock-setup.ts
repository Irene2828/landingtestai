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
    .filter((value): value is CompetitorSuggestion => Boolean(value));
}

export const loadingSteps: LoadingStep[] = [
  {
    title: "Parsing structure and page content",
    description: "Extracting the core messaging, headings, and action paths.",
    status: "complete"
  },
  {
    title: "Comparing against selected competitors",
    description:
      "Benchmarking value proposition, CTA clarity, and trust language.",
    status: "active"
  },
  {
    title: "Generating evidence-based recommendations",
    description: "Compiling the clearest strengths, gaps, and next actions.",
    status: "pending"
  }
];
