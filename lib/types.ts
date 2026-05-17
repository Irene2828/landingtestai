export type ConfidenceLevel = "HIGH" | "LOW";

export type AnalysisSectionKey = 
  | "FIRST IMPRESSION" 
  | "CALL TO ACTION" 
  | "TRUST & CREDIBILITY" 
  | "MESSAGING CLARITY" 
  | "CONVERSION FRICTION";

export type AnalyzeRequestPayload = {
  url: string;
  businessType: string;
  goal?: string;
};

export type FrictionPoint = {
  location: string;
  current_text: string;
  friction_analysis: string;
  better_alternative: string;
};

export type OverallImpression = {
  positioning: string;
  ux_hierarchy: string;
  cta_strategy: string;
};

export type AnalyzeApiResponse = {
  overall_impression: OverallImpression;
  industry_modernity: string;
  friction_audit: FrictionPoint[];
};

export type LoadingStep = {
  title: string;
  description: string;
  status: "complete" | "active" | "pending";
};

export type ResultsData = AnalyzeApiResponse;

export type MockResults = ResultsData;

export type SectionAnalysis = {
  name: AnalysisSectionKey;
  score?: number;
  grade?: string;
  verdict?: string;
  analysis?: string;
  finding?: string;
  actionable_fix?: string;
  design_fix?: string;
  status?: 'strong' | 'needs-work' | 'missing' | string;
};
