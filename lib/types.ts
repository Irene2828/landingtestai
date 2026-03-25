export type ConfidenceLevel = "High" | "Medium" | "Low";

export type AnalysisSectionKey = "Hero" | "CTA" | "Social Proof";

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
  observation: string;
  evidence: string;
  recommendation: string;
  confidence: {
    level: ConfidenceLevel;
    reason: string;
  };
};

export type MockResults = {
  keyStrengths: string[];
  keyGaps: string[];
  topActions: string[];
  sections: SectionAnalysis[];
};
