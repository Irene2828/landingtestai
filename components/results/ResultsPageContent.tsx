"use client";

import Link from "next/link";

import { useAnalysisStore } from "@/components/providers/AnalysisProvider";
import { mapAnalysisResponseToResults } from "@/lib/analysis-results";

import { AnalysisContextHeader } from "./AnalysisContextHeader";
import { AnalysisAccordion } from "./AnalysisAccordion";
import { ResultsSummary } from "./ResultsSummary";

export function ResultsPageContent() {
  const { request, result } = useAnalysisStore();

  if (!result) {
    return (
      <main className="app-shell">
        <div className="empty-state">
          <h1>No analysis available</h1>
          <p>
            Start from the setup page to generate a landing page analysis for
            the selected sections.
          </p>
          <Link href="/" className="primary-link">
            Back to setup
          </Link>
        </div>
      </main>
    );
  }

  const results = mapAnalysisResponseToResults(result);

  return (
    <main className="app-shell">
      <div className="results-page">
        <header className="page-header">
          <div className="page-header-top">
            <AnalysisContextHeader request={request} />
            <Link
              href="/"
              className="text-action page-header-link"
              aria-label="Back to Main Page"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
            </Link>
          </div>
          <h1>The Result</h1>
          <p className="page-intro">
            Structured insights based on page content and competitor
            comparisons. Visual analysis is coming next.
          </p>
        </header>

        <ResultsSummary
          strengths={results.keyStrengths}
          gaps={results.keyGaps}
          actions={results.topActions}
        />

        <section className="analysis-section">
          <p className="page-intro analysis-section-intro">
            And here's the detailed explanation and insights for you:
          </p>
          <AnalysisAccordion sections={results.sections} />
        </section>
      </div>
    </main>
  );
}
