"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { AnalyzeApiResponse, AnalyzeRequestPayload } from "@/lib/types";

const ANALYSIS_STORAGE_KEY = "landing-page-analysis";

type AnalysisContextValue = {
  request: AnalyzeRequestPayload | null;
  result: AnalyzeApiResponse | null;
  isHydrated: boolean;
  setAnalysis: (
    request: AnalyzeRequestPayload,
    result: AnalyzeApiResponse
  ) => void;
  clearAnalysis: () => void;
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

type AnalysisProviderProps = {
  children: React.ReactNode;
};

type PersistedAnalysis = {
  request: AnalyzeRequestPayload;
  result: AnalyzeApiResponse;
};

function readPersistedAnalysis() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(ANALYSIS_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PersistedAnalysis;
  } catch {
    window.sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
    return null;
  }
}

export function AnalysisProvider({ children }: AnalysisProviderProps) {
  const [request, setRequest] = useState<AnalyzeRequestPayload | null>(null);
  const [result, setResult] = useState<AnalyzeApiResponse | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const persistedAnalysis = readPersistedAnalysis();

    if (persistedAnalysis) {
      setRequest(persistedAnalysis.request);
      setResult(persistedAnalysis.result);
    }

    setIsHydrated(true);
  }, []);

  const handleSetAnalysis = useCallback((
    nextRequest: AnalyzeRequestPayload,
    nextResult: AnalyzeApiResponse
  ) => {
    setRequest(nextRequest);
    setResult(nextResult);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        ANALYSIS_STORAGE_KEY,
        JSON.stringify({
          request: nextRequest,
          result: nextResult
        } satisfies PersistedAnalysis)
      );
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setRequest(null);
    setResult(null);

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
    }
  }, []);

  return (
    <AnalysisContext.Provider
      value={{
        request,
        result,
        isHydrated,
        setAnalysis: handleSetAnalysis,
        clearAnalysis
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisStore() {
  const context = useContext(AnalysisContext);

  if (!context) {
    throw new Error("useAnalysisStore must be used within AnalysisProvider.");
  }

  return context;
}
