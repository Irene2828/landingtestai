"use client";

import type { AnalyzeRequestPayload } from "@/lib/types";

type AnalysisContextHeaderProps = {
  request: AnalyzeRequestPayload | null;
};

function formatAnalyzedUrl(url: string) {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

export function AnalysisContextHeader({
  request
}: AnalysisContextHeaderProps) {
  if (!request) {
    return null;
  }

  return (
    <div className="analysis-context-header" aria-label="Analysis context">
      <div className="analysis-context-group analysis-context-group-page">
        <span className="analysis-context-label">Website</span>
        <span className="analysis-context-value">
          {formatAnalyzedUrl(request.url)}
        </span>
      </div>

      <span className="analysis-context-separator" aria-hidden="true">
        /
      </span>

      <div className="analysis-context-group analysis-context-group-sections">
        <span className="analysis-context-label">Context</span>
        <div className="analysis-context-tags">
          <span className="analysis-context-tag analysis-context-tag-section">
            {request.businessType}
          </span>
          {request.goal && (
            <span className="analysis-context-tag analysis-context-tag-section">
              {request.goal}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
