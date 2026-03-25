import type { LoadingStep, SetupSectionOption } from "./types";

export const setupSections: SetupSectionOption[] = [
  { key: "Hero", label: "Hero Section" },
  { key: "CTA", label: "Call to Action (CTA)" },
  { key: "Social Proof", label: "Social Proof" }
];

export const suggestedCompetitors = [
  { id: "linear", name: "Linear", initials: "L" },
  { id: "loom", name: "Loom", initials: "Lm" },
  { id: "notion", name: "Notion", initials: "N" }
];

export const loadingSteps: LoadingStep[] = [
  {
    title: "Parsing HTML & Structure",
    description: "Successfully extracted core elements and semantic tags.",
    status: "complete"
  },
  {
    title: "Analyzing Competitors & Benchmarking",
    description:
      "Comparing copy, value propositions, and CTA placement against top performers in your niche.",
    status: "active"
  },
  {
    title: "Generating Evidence-Based Insights",
    description: "Pending completion of benchmark analysis.",
    status: "pending"
  }
];
