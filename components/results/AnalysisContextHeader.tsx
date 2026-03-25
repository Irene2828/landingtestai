"use client";

import { suggestedCompetitors } from "@/lib/mock-setup";
import type { AnalyzeRequestPayload } from "@/lib/types";

type AnalysisContextHeaderProps = {
  request: AnalyzeRequestPayload | null;
};

const competitorNameByUrl = new Map(
  suggestedCompetitors.map((competitor) => [competitor.url, competitor.name])
);

function formatAnalyzedUrl(url: string) {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

function formatCompetitorLabel(url: string) {
  const matchedName = competitorNameByUrl.get(url);

  if (matchedName) {
    return matchedName;
  }

  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    const [firstPart] = hostname.split(".");

    if (!firstPart) {
      return formatAnalyzedUrl(url);
    }

    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  } catch {
    return formatAnalyzedUrl(url);
  }
}

export function AnalysisContextHeader({
  request
}: AnalysisContextHeaderProps) {
  if (!request) {
    return null;
  }

  const competitorTags = (request.competitorUrls ?? []).map(formatCompetitorLabel);

  return (
    <div className="analysis-context-header" aria-label="Analysis context">
      <div className="analysis-context-group analysis-context-group-page">
        <span className="analysis-context-label">Page</span>
        <span className="analysis-context-value">
          {formatAnalyzedUrl(request.url)}
        </span>
      </div>

      <span className="analysis-context-separator" aria-hidden="true">
        /
      </span>

      {competitorTags.length > 0 ? (
        <>
          <div className="analysis-context-group analysis-context-group-competitors">
            <span className="analysis-context-label">Competitors</span>
            <div className="analysis-context-tags">
              {competitorTags.map((competitor) => (
                <span
                  key={competitor}
                  className="analysis-context-tag analysis-context-tag-competitor"
                >
                  {competitor}
                </span>
              ))}
            </div>
          </div>

          <span className="analysis-context-separator" aria-hidden="true">
            /
          </span>
        </>
      ) : null}

      <div className="analysis-context-group analysis-context-group-sections">
        <span className="analysis-context-label">Sections</span>
        <div className="analysis-context-tags">
          {request.sections.map((section) => (
            <span
              key={section}
              className="analysis-context-tag analysis-context-tag-section"
            >
              {section}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
