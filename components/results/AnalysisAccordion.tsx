import {
  ChevronRight,
  CircleHelp,
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

function getObservationHelpText(section: SectionAnalysis) {
  if (section.sourceTone === "visual") {
    return "Text-grounded V1 could not verify this section from extracted copy alone. If the read feels cautious, the page likely relies on visual rendering or layout cues that V2 will ground with screenshots.";
  }

  if (section.sourceTone === "partial") {
    return "This section used partial text extraction. If the answer feels thin, stronger content rendering and screenshot grounding are planned for V2.";
  }

  return null;
}

export function AnalysisAccordion({ sections }: AnalysisAccordionProps) {
  return (
    <div className="accordion">
      {sections.map((section, index) => {
        const SectionIcon = sectionIconByKey[section.key];
        const observationHelpText = section.sourceHelpText
          ? null
          : getObservationHelpText(section);

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
                  <span className="analysis-source-meta">
                    <span
                      className={`analysis-source-badge analysis-source-badge-${section.sourceTone}`}
                    >
                      {section.sourceLabel}
                    </span>
                    {section.sourceHelpText ? (
                      <span
                        className="analysis-source-help"
                        data-tooltip={section.sourceHelpText}
                        aria-label={section.sourceHelpText}
                        tabIndex={0}
                      >
                        <CircleHelp
                          className="analysis-source-help-icon"
                          strokeWidth={1.6}
                          aria-hidden="true"
                        />
                      </span>
                    ) : null}
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
                  <div className="content-label-row">
                    <span className="content-label">Observation</span>
                    {observationHelpText ? (
                      <span
                        className="analysis-source-help content-label-help"
                        data-tooltip={observationHelpText}
                        aria-label={observationHelpText}
                        tabIndex={0}
                      >
                        <CircleHelp
                          className="analysis-source-help-icon"
                          strokeWidth={1.6}
                          aria-hidden="true"
                        />
                      </span>
                    ) : null}
                  </div>
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
