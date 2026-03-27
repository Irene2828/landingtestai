export type ConfidenceLevel = "HIGH" | "LOW";

export type AnalysisSectionKey = "Hero" | "CTA" | "Social Proof";

export type AnalyzeRequestPayload = {
  url: string;
  sections: AnalysisSectionKey[];
  competitorUrls?: string[];
};

export type CompetitorSuggestion = {
  id: string;
  name: string;
  initials: string;
  url: string;
};

export type AnalyzeApiResponse = {
  sections: Array<{
    name: AnalysisSectionKey;
    title: string;
    observation: string;
    evidence: string;
    recommendation: string;
    confidence: {
      level: ConfidenceLevel;
      reason: string;
    };
  }>;
  summary: {
    keyStrengths: string[];
    keyGaps: string[];
    topActions: string[];
  };
};

export type SetupSectionOption = {
  key: AnalysisSectionKey;
  label: string;
};

export type LoadingStep = {
  title: string;
  description: string;
  status: "complete" | "active" | "pending";
};

export type SectionAnalysis = {
  key: AnalysisSectionKey;
  title: string;
  summary: string;
  screenshotLabel: string;
  sourceLabel: string;
  sourceTone: "text" | "partial" | "visual";
  sourceHelpText?: string;
  observation: string;
  evidence: string;
  recommendation: string;
  confidence: {
    level: ConfidenceLevel;
    reason: string;
  };
};

export type ResultsData = {
  keyStrengths: string[];
  keyGaps: string[];
  topActions: string[];
  sections: SectionAnalysis[];
};

export type MockResults = ResultsData;
