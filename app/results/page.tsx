import { AnalysisAccordion } from "@/components/results/AnalysisAccordion";
import { ResultsSummary } from "@/components/results/ResultsSummary";
import { mockResults } from "@/lib/mock-results";

export default function ResultsPage() {
  return (
    <main className="app-shell">
      <div className="results-page">
        <header className="page-header">
          <span className="eyebrow">Mock Results</span>
          <h1>Landing Page Analysis</h1>
          <p className="page-intro">
            Structured, evidence-based output for a SaaS landing page. This
            page is powered by mock data only for the MVP UI.
          </p>
        </header>

        <ResultsSummary
          strengths={mockResults.keyStrengths}
          gaps={mockResults.keyGaps}
          actions={mockResults.topActions}
        />

        <section className="analysis-section">
          <div className="section-heading">
            <span className="eyebrow">Section Analysis</span>
            <h2>Page Sections</h2>
            <p>
              Each section captures the visible issue, supporting evidence, and
              the most useful next improvement.
            </p>
          </div>

          <AnalysisAccordion sections={mockResults.sections} />
        </section>
      </div>
    </main>
  );
}
