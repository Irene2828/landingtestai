import { Suspense } from "react";

import {
  AnalysisLoadingCard,
  AnalysisLoadingFallback
} from "@/components/loading/AnalysisLoadingCard";
import { AppHeader } from "@/components/shared/AppHeader";

export default function LoadingPage() {
  return (
    <div className="setup-shell">
      <AppHeader />
      <main className="loading-shell">
        <Suspense fallback={<AnalysisLoadingFallback />}>
          <AnalysisLoadingCard />
        </Suspense>
      </main>
    </div>
  );
}
