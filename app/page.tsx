import { AnalysisSetupForm } from "@/components/analyzer/AnalysisSetupForm";
import { AppHeader } from "@/components/shared/AppHeader";

export default function HomePage() {
  return (
    <div className="setup-shell">
      <AppHeader />

      <main className="setup-main">
        <div className="setup-container">
          <div className="setup-intro">
            <h2>
              <span>Get clear, evidence-based</span>
              <span>UX insights for your SAAS landing page</span>
            </h2>
            <p className="setup-intro-support">
              Compare your page against{" "}
              <span className="setup-intro-emphasis">category competitors</span>{" "}
              across <span className="setup-inline-chip">Hero</span>,{" "}
              <span className="setup-inline-chip">CTA</span>, and{" "}
              <span className="setup-inline-chip">Trust signals</span>.
            </p>
          </div>

          <AnalysisSetupForm />
        </div>
      </main>
    </div>
  );
}
