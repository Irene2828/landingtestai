import { splitSentencesPreservingDomains } from "./sentence-utils";
import type { AnalyzeApiResponse, AnalysisSectionKey, ResultsData } from "./types";

const TEXT_ONLY_V1_EVIDENCE_FALLBACK =
  "Not captured by text extraction. Visual analysis (screenshots, logo detection, button positioning) coming in V2.";

const sectionMeta: Record<
  AnalysisSectionKey,
  { title: string; screenshotLabel: string }
> = {
  Hero: {
    title: "Hero Message Clarity",
    screenshotLabel: "Hero section reference"
  },
  CTA: {
    title: "Call to Action Strength",
    screenshotLabel: "Primary CTA reference"
  },
  "Social Proof": {
    title: "Trust and Proof Signals",
    screenshotLabel: "Trust signal reference"
  }
};

function extractSectionSummary(observation: string) {
  const trimmedObservation = observation.trim().replace(/^[-*•]\s*/m, "");
  const firstLine = trimmedObservation.split("\n").find((line) => line.trim());

  if (!firstLine) {
    return trimmedObservation;
  }

  const normalizedFirstLine = firstLine.replace(/^[-*•]\s*/, "").trim();
  const sentences = splitSentencesPreservingDomains(normalizedFirstLine);

  if (!sentences || sentences.length === 0) {
    return normalizedFirstLine;
  }

  if (sentences.length > 1) {
    return sentences[1];
  }

  return sentences[0];
}

function getSectionSourceMeta(
  sectionName: AnalysisSectionKey,
  evidence: string,
  confidenceLevel: "HIGH" | "LOW"
) {
  if (evidence.trim() === TEXT_ONLY_V1_EVIDENCE_FALLBACK) {
    return {
      sourceLabel: "Visual check recommended",
      sourceTone: "visual" as const,
      sourceHelpText:
        sectionName === "Hero"
          ? "V1 is text-grounded. If the extracted hero line looks unreliable, such as a testimonial role, video title, or other non-hero text, the app falls back to a manual visual check instead of pretending certainty. V2 adds screenshot grounding."
          : "V1 is text-grounded. When the app cannot verify this section from extracted copy alone, it falls back to manual visual checks instead of guessing. V2 adds screenshot-based grounding for these cases."
    };
  }

  if (confidenceLevel === "LOW") {
    return {
      sourceLabel: "Partial text extraction",
      sourceTone: "partial" as const,
      sourceHelpText:
        "Some text was extracted, but not enough stable target-page evidence was available for a fully grounded read. The section stays LOW confidence on purpose."
    };
  }

  return {
    sourceLabel: "Text extracted",
    sourceTone: "text" as const,
    sourceHelpText: undefined
  };
}

export function mapAnalysisResponseToResults(
  response: AnalyzeApiResponse
): ResultsData {
  return {
    keyStrengths: response.summary.keyStrengths,
    keyGaps: response.summary.keyGaps,
    topActions: response.summary.topActions,
    sections: response.sections.map((section) => {
      const sourceMeta = getSectionSourceMeta(
        section.name,
        section.evidence,
        section.confidence.level
      );

      return {
        key: section.name,
        title: section.title || sectionMeta[section.name].title,
        summary: extractSectionSummary(section.observation),
        screenshotLabel: sectionMeta[section.name].screenshotLabel,
        sourceLabel: sourceMeta.sourceLabel,
        sourceTone: sourceMeta.sourceTone,
        sourceHelpText: sourceMeta.sourceHelpText,
        observation: section.observation,
        evidence: section.evidence,
        recommendation: section.recommendation,
        confidence: section.confidence
      };
    })
  };
}
