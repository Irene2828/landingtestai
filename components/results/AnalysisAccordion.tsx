import {
  ChevronRight,
  LayoutTemplate,
  MousePointerClick,
  ShieldCheck,
  type LucideIcon
} from "lucide-react";

import type { SectionAnalysis } from "@/lib/types";

import { ScreenshotPlaceholder } from "./ScreenshotPlaceholder";
import { renderEmphasizedText } from "./text-emphasis";

type AnalysisAccordionProps = {
  sections: SectionAnalysis[];
};

const sectionIconByKey: Record<SectionAnalysis["key"], LucideIcon> = {
  Hero: LayoutTemplate,
  CTA: MousePointerClick,
  "Social Proof": ShieldCheck
};

export function AnalysisAccordion({ sections }: AnalysisAccordionProps) {
  return (
    <div className="accordion">
      {sections.map((section, index) => {
        const SectionIcon = sectionIconByKey[section.key];

        return (
          <details
            key={section.key}
            className="analysis-card"
            open={index === 0}
          >
            <summary>
              <div className="analysis-card-summary-copy">
                <div className="analysis-card-meta-row">
                  <span className="section-key-badge">{section.key}</span>
                  <span
                    className={`analysis-source-badge analysis-source-badge-${section.sourceTone}`}
                  >
                    {section.sourceLabel}
                  </span>
                </div>
                <div className="analysis-card-title-row">
                  <SectionIcon
                    className="analysis-card-title-icon"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h3>{section.title}</h3>
                </div>
              </div>
              <ChevronRight
                className="accordion-marker"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </summary>

            <div className="analysis-card-body">
              <ScreenshotPlaceholder
                label={section.screenshotLabel}
                sourceTone={section.sourceTone}
              />

              <div className="analysis-content">
                <div className="content-block">
                  <span className="content-label">Observation</span>
                  <p>
                    {renderEmphasizedText(section.observation, {
                      maxPerLine: 1,
                      mode: "observation"
                    })}
                  </p>
                </div>

                <div className="content-block content-block-evidence">
                  <span className="content-label">Evidence</span>
                  <p>{section.evidence}</p>
                </div>

                <div className="content-block">
                  <span className="content-label">Recommendation</span>
                  <p>
                    {renderEmphasizedText(section.recommendation, {
                      maxPerLine: 2,
                      mode: "recommendation"
                    })}
                  </p>
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
        );
      })}
    </div>
  );
}
