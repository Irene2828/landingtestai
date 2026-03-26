"use client";

import Link from "next/link";
import {
  type ReadonlyURLSearchParams,
  useRouter,
  useSearchParams
} from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAnalysisStore } from "@/components/providers/AnalysisProvider";
import { competitorCatalog, loadingSteps } from "@/lib/mock-setup";
import type {
  AnalysisSectionKey,
  AnalyzeApiResponse,
  AnalyzeRequestPayload
} from "@/lib/types";

const ANALYZE_TIMEOUT_MS = 15000;

const validSectionKeys = new Set<AnalysisSectionKey>([
  "Hero",
  "CTA",
  "Social Proof"
]);

let pendingAnalyzeRequest:
  | {
      key: string;
      startedAt: number;
      promise: Promise<AnalyzeApiResponse>;
    }
  | null = null;

const competitorUrlById = new Map(
  competitorCatalog.map((competitor) => [competitor.id, competitor.url])
);

function getRequestFromSearchParams(
  searchParams: ReadonlyURLSearchParams
): AnalyzeRequestPayload {
  const url = searchParams.get("url")?.trim() ?? "";
  const sections = searchParams
    .getAll("section")
    .filter(
      (value): value is AnalysisSectionKey =>
        validSectionKeys.has(value as AnalysisSectionKey)
    );
  const competitorUrls = searchParams
    .getAll("competitor")
    .map((value) => competitorUrlById.get(value))
    .filter((value): value is string => typeof value === "string")
    .filter((value, index, values) => values.indexOf(value) === index);

  return {
    url,
    sections,
    competitorUrls
  };
}

function getErrorMessage(value: unknown) {
  if (value && typeof value === "object" && "error" in value) {
    const candidate = value as { error?: unknown; details?: unknown };
    const error = candidate.error;
    const details = candidate.details;

    if (typeof error === "string") {
      return typeof details === "string" && details.length > 0
        ? `${error}: ${details}`
        : error;
    }
  }

  return "Unable to generate the analysis right now.";
}

type AnalysisLoadingCardViewProps = {
  error: string | null;
  onRetry?: () => void;
};

function AnalysisLoadingCardView({
  error,
  onRetry
}: AnalysisLoadingCardViewProps) {
  return (
    <div className="loading-card">
      <div className="loading-card-header">
        <div className="loading-icon-ring" aria-hidden="true">
          <div className="loading-icon-pulse" />
          <span className="loading-icon-glyph material-symbols-outlined">
            search_insights
          </span>
        </div>

        <h2 className="loading-card-title">Analyzing your landing page</h2>
        <p>
          Reviewing structure, messaging, and competitive positioning.
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
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="loading-error" role="alert">
            <strong>Analysis could not be completed.</strong>
            <p>{error}</p>
          </div>
        ) : null}

        <div className="loading-actions">
          {error ? (
            <div className="loading-actions-group">
              <button
                className="primary-button"
                type="button"
                onClick={onRetry}
              >
                Retry Analysis
              </button>
              <Link href="/" className="text-action" prefetch={false}>
                Back to setup
              </Link>
            </div>
          ) : (
            <Link href="/" className="text-action" prefetch={false}>
              Cancel Analysis
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function AnalysisLoadingFallback() {
  return <AnalysisLoadingCardView error={null} />;
}

export function AnalysisLoadingCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearAnalysis, setAnalysis } = useAnalysisStore();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(
    () => getRequestFromSearchParams(searchParams),
    [searchParams]
  );
  const requestKey = `${request.url}:${request.sections.join("|")}:${request.competitorUrls?.join("|") ?? ""}:${attempt}`;

  useEffect(() => {
    let isActive = true;

    if (!request.url || request.sections.length === 0) {
      clearAnalysis();
      setError(
        "Missing analysis input. Go back and submit a URL and section selection."
      );
      return () => {
        isActive = false;
      };
    }
    setError(null);
    clearAnalysis();

    const requestPayload: AnalyzeRequestPayload = {
      url: String(request.url),
      sections: request.sections.map((section) => String(section)).filter(
        (section): section is AnalysisSectionKey =>
          validSectionKeys.has(section as AnalysisSectionKey)
      ),
      competitorUrls: request.competitorUrls ?? []
    };

    async function runAnalysis() {
      try {
        let analyzePromise: Promise<AnalyzeApiResponse>;

        const canReusePendingRequest =
          pendingAnalyzeRequest?.key === requestKey &&
          Date.now() - pendingAnalyzeRequest.startedAt < ANALYZE_TIMEOUT_MS;

        if (canReusePendingRequest && pendingAnalyzeRequest) {
          analyzePromise = pendingAnalyzeRequest.promise;
        } else {
          const startedAt = Date.now();
          let timeoutId: number | null = null;

          analyzePromise = Promise.race([
            (async () => {
              try {
                console.log("Calling analyze API");
                console.log("Before fetch", requestPayload);

                const response = await fetch("/api/analyze", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    url: requestPayload.url,
                    sections: requestPayload.sections,
                    competitorUrls: requestPayload.competitorUrls
                  })
                });

                console.log("After fetch", response);

                const responsePayload = (await response.json()) as
                  | AnalyzeApiResponse
                  | { error?: string; details?: string };

                console.log("After parsing response", responsePayload);

                if (!response.ok) {
                  throw new Error(getErrorMessage(responsePayload));
                }

                return responsePayload as AnalyzeApiResponse;
              } finally {
                if (timeoutId !== null) {
                  window.clearTimeout(timeoutId);
                }

                if (
                  pendingAnalyzeRequest?.key === requestKey &&
                  pendingAnalyzeRequest.startedAt === startedAt
                ) {
                  pendingAnalyzeRequest = null;
                }
              }
            })(),
            new Promise<AnalyzeApiResponse>((_, reject) => {
              timeoutId = window.setTimeout(() => {
                if (
                  pendingAnalyzeRequest?.key === requestKey &&
                  pendingAnalyzeRequest.startedAt === startedAt
                ) {
                  pendingAnalyzeRequest = null;
                }

                reject(
                  new Error(
                    "Analysis request timed out. Please try again."
                  )
                );
              }, ANALYZE_TIMEOUT_MS);
            })
          ]);

          pendingAnalyzeRequest = {
            key: requestKey,
            startedAt,
            promise: analyzePromise
          };
        }

        const responsePayload = await analyzePromise;

        if (!isActive) {
          return;
        }

        setAnalysis(
          {
            url: requestPayload.url,
            sections: requestPayload.sections,
            competitorUrls: requestPayload.competitorUrls
          },
          responsePayload
        );
        console.log("Redirecting to results");
        router.replace("/results");
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        console.error("Analyze flow error:", caughtError);
        clearAnalysis();
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to generate the analysis right now."
        );
      }
    }

    void runAnalysis();

    return () => {
      isActive = false;
    };
  }, [clearAnalysis, request, requestKey, router, setAnalysis]);

  function handleRetry() {
    setAttempt((currentAttempt) => currentAttempt + 1);
  }

  return <AnalysisLoadingCardView error={error} onRetry={handleRetry} />;
}
