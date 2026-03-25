"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { loadingSteps } from "@/lib/mock-setup";

const MOCK_LOADING_DELAY_MS = 1800;

export function AnalysisLoadingCard() {
  const router = useRouter();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      router.replace("/results");
    }, MOCK_LOADING_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <div className="loading-card">
      <div className="loading-card-header">
        <div className="loading-icon-ring" aria-hidden="true">
          <div className="loading-icon-pulse" />
          <span className="loading-icon-glyph material-symbols-outlined">
            search_insights
          </span>
        </div>

        <h1>Analyzing your landing page</h1>
        <p>
          Please wait while our AI engine gathers evidence-based insights and
          benchmarks your performance.
        </p>
      </div>

      <div className="loading-card-body">
        <div className="progress-block">
          <div className="progress-header">
            <span>Analysis Progress</span>
            <strong>65%</strong>
          </div>

          <div className="progress-track" aria-hidden="true">
            <div className="progress-bar" />
          </div>
        </div>

        <div className="loading-steps">
          {loadingSteps.map((step) => (
            <div
              key={step.title}
              className={`loading-step loading-step-${step.status}`}
            >
              <div className="loading-step-marker" aria-hidden="true">
                {step.status === "complete" ? (
                  <span className="loading-step-check material-symbols-outlined">
                    check
                  </span>
                ) : step.status === "active" ? (
                  <span className="loading-step-spinner" />
                ) : (
                  <span className="loading-step-dot" />
                )}
              </div>

              <div className="loading-step-copy">
                <h2>{step.title}</h2>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="loading-actions">
          <Link href="/" className="text-action">
            Cancel Analysis
          </Link>
        </div>
      </div>
    </div>
  );
}
