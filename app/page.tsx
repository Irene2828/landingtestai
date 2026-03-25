import { AnalysisSetupForm } from "@/components/analyzer/AnalysisSetupForm";
import { AppHeader } from "@/components/shared/AppHeader";

export default function HomePage() {
  return (
    <div className="setup-shell">
      <AppHeader />

      <main className="setup-main">
        <div className="setup-container">
          <div className="setup-intro">
            <h2>Analyze Landing Page</h2>
            <p>Configure your analysis parameters below.</p>
          </div>

          <AnalysisSetupForm />
        </div>
      </main>
    </div>
  );
}
