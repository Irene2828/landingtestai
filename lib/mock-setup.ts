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

export const suggestedCompetitors: CompetitorSuggestion[] = [
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
  }
];

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
