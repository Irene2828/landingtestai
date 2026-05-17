"use client";

import { AlertCircle, Check, Circle, LoaderCircle, Search } from "lucide-react";
import Link from "next/link";
import {
  type ReadonlyURLSearchParams,
  useRouter,
  useSearchParams
} from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAnalysisStore } from "@/components/providers/AnalysisProvider";
import type {
  AnalyzeApiResponse,
  AnalyzeRequestPayload
} from "@/lib/types";

export type LoadingStep = {
  title: string;
  description: string;
  status: "complete" | "active" | "pending";
};

export const loadingSteps: LoadingStep[] = [
  {
    title: "Connecting to page",
    description: "Resolving URL and checking accessibility",
    status: "complete"
  },
  {
    title: "Extracting content",
    description: "Scanning page structure and visible text",
    status: "active"
  },
  {
    title: "Running opportunity analysis",
    description: "Evaluating against agency conversion heuristics",
    status: "pending"
  }
];

const ANALYZE_TIMEOUT_MS = 45000;

let pendingAnalyzeRequest:
  | {
      key: string;
      startedAt: number;
      promise: Promise<AnalyzeApiResponse>;
    }
  | null = null;

function getRequestFromSearchParams(
  searchParams: ReadonlyURLSearchParams
): AnalyzeRequestPayload {
  const url = searchParams.get("url")?.trim() ?? "";
  const businessType = searchParams.get("businessType")?.trim() ?? "B2B SaaS";
  const goal = searchParams.get("goal")?.trim() ?? "More demo requests";

  return {
    url,
    businessType,
    goal
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

const LOADING_STATES = [
  "Fetching page content...",
  "Extracting headlines, CTAs and trust signals...",
  "Evaluating first impression...",
  "Scoring conversion friction...",
  "Generating opportunity report...",
  "Almost there..."
];

function AnalysisLoadingCardView({
  error,
  onRetry
}: AnalysisLoadingCardViewProps) {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);

  useEffect(() => {
    if (error) return;

    const interval = setInterval(() => {
      setCurrentStateIndex((prev) => 
        prev < LOADING_STATES.length - 1 ? prev + 1 : prev
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [error]);

  const progressPercentage = Math.min(((currentStateIndex + 1) / LOADING_STATES.length) * 100, 100);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 24px', width: '100%' }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '480px', 
        background: '#FFFFFF', 
        borderRadius: '16px', 
        border: '1px solid #EBEBEB',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        
        {!error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: '#0057FF',
                animation: 'pulse-dot 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
              <div 
                key={currentStateIndex}
                style={{ 
                  color: '#3D3D3D', 
                  fontSize: '15px', 
                  fontWeight: 500,
                  animation: 'fade-in 0.3s ease forwards'
                }}
              >
                {LOADING_STATES[currentStateIndex]}
              </div>
            </div>

            <div style={{ width: '100%', height: '2px', background: '#EBEBEB', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: '#0057FF', 
                width: `${progressPercentage}%`,
                transition: 'width 2.5s linear'
              }} />
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: '#FFF0F0', color: '#E54A4A', marginBottom: '16px' }}>
              <AlertCircle strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0D0D0D', margin: '0 0 8px' }}>Analysis Failed</h3>
            <p style={{ color: '#6B6B6B', fontSize: '14px', margin: '0 0 24px' }}>{error}</p>
            <div style={{ display: 'grid', gap: '12px' }}>
              <button className="primary-button" onClick={onRetry}>Try Again</button>
              <Link href="/" style={{ color: '#6B6B6B', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>Cancel</Link>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
  const requestKey = `${request.url}:${request.businessType}:${request.goal}:${attempt}`;

  useEffect(() => {
    let isActive = true;

    if (!request.url) {
      clearAnalysis();
      setError(
        "Missing analysis input. Go back and submit a URL."
      );
      return () => {
        isActive = false;
      };
    }
    setError(null);
    clearAnalysis();

    const requestPayload: AnalyzeRequestPayload = {
      url: String(request.url),
      businessType: request.businessType ?? "Other",
      goal: request.goal ?? "Not specified"
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
                const response = await fetch("/api/analyze", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  cache: "no-store",
                  body: JSON.stringify({
                    url: requestPayload.url,
                    businessType: requestPayload.businessType,
                    goal: requestPayload.goal
                  })
                });

                const responsePayload = (await response.json()) as
                  | AnalyzeApiResponse
                  | { error?: string; details?: string };

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
            businessType: requestPayload.businessType,
            goal: requestPayload.goal
          },
          responsePayload
        );
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
