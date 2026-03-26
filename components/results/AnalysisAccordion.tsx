import type { SectionAnalysis } from "@/lib/types";

import { ScreenshotPlaceholder } from "./ScreenshotPlaceholder";
import { renderEmphasizedText } from "./text-emphasis";

type AnalysisAccordionProps = {
  sections: SectionAnalysis[];
};

export function AnalysisAccordion({ sections }: AnalysisAccordionProps) {
  return (
    <div className="accordion">
      {sections.map((section, index) => (
        <details
          key={section.key}
          className="analysis-card"
          open={index === 0}
        >
          <summary>
            <div className="analysis-card-summary-copy">
              <span className="section-key-badge">{section.key}</span>
              <h3>{section.title}</h3>
            </div>
            <span className="accordion-marker" aria-hidden="true">
              →
            </span>
          </summary>

          <div className="analysis-card-body">
            <ScreenshotPlaceholder label={section.screenshotLabel} />

            <div className="analysis-content">
              <div className="content-block">
                <span className="content-label">Observation</span>
                <p>{renderEmphasizedText(section.observation, { maxPerLine: 1 })}</p>
              </div>

              <div className="content-block content-block-evidence">
                <span className="content-label">Evidence</span>
                <p>{section.evidence}</p>
              </div>

              <div className="content-block">
                <span className="content-label">Recommendation</span>
                <p>{renderEmphasizedText(section.recommendation, { maxPerLine: 2 })}</p>
              </div>

              <div className="confidence-box">
                <span className="confidence-badge">
                  {section.confidence.level} confidence
                </span>
                <p className="confidence-note">{section.confidence.reason}</p>
              </div>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
