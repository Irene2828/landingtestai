"use client";

import Link from "next/link";

import { isLikelyServiceBusiness } from "@/lib/business-type";
import { useAnalysisStore } from "@/components/providers/AnalysisProvider";
import { mapAnalysisResponseToResults } from "@/lib/analysis-results";

import { AnalysisContextHeader } from "./AnalysisContextHeader";
import { AnalysisAccordion } from "./AnalysisAccordion";
import { ResultsSummary } from "./ResultsSummary";

export function ResultsPageContent() {
  const { request, result, isHydrated } = useAnalysisStore();

  if (!isHydrated) {
    return <main className="app-shell" />;
  }

  if (!result) {
    return (
      <main className="app-shell">
        <div className="empty-state">
          <h2 className="empty-state-title">No analysis available</h2>
          <p>
            Start from the setup page to generate a landing page analysis for
            the selected sections.
          </p>
          <div className="empty-state-actions">
            <Link href="/" className="primary-link">
              Back to setup
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const results = mapAnalysisResponseToResults(result);
  const showServiceBusinessNote = request
    ? isLikelyServiceBusiness(request.url)
    : false;

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
          <h2 className="page-title">Audit Results</h2>
          <p className="page-intro">
            Structured insights based on page content and competitor
            comparisons.
          </p>
          <p className="page-coming-next">
            Visual analysis is coming next. Some elements may not be captured
            yet.
          </p>
          {showServiceBusinessNote ? (
            <p className="page-intro page-intro-note">
              This page appears to be a service-based business. Analysis focuses
              on positioning and credibility rather than product comparison.
            </p>
          ) : null}
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
