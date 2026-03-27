"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react";

import type { AnalyzeApiResponse, AnalyzeRequestPayload } from "@/lib/types";

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

const ANALYSIS_SESSION_STORAGE_KEY = "landing-ai-analysis";

function isStoredAnalysisPayload(value: unknown): value is {
  request: AnalyzeRequestPayload | null;
  result: AnalyzeApiResponse | null;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    request?: unknown;
    result?: unknown;
  };

  if (!("request" in candidate) || !("result" in candidate)) {
    return false;
  }

  return true;
}

export function AnalysisProvider({ children }: AnalysisProviderProps) {
  const [request, setRequest] = useState<AnalyzeRequestPayload | null>(null);
  const [result, setResult] = useState<AnalyzeApiResponse | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const handleSetAnalysis = useCallback((
    nextRequest: AnalyzeRequestPayload,
    nextResult: AnalyzeApiResponse
  ) => {
    setRequest(nextRequest);
    setResult(nextResult);
  }, []);

  const clearAnalysis = useCallback(() => {
    setRequest(null);
    setResult(null);
  }, []);

  useEffect(() => {
    try {
      const storedValue = window.sessionStorage.getItem(
        ANALYSIS_SESSION_STORAGE_KEY
      );

      if (!storedValue) {
        setIsHydrated(true);
        return;
      }

      const parsedValue = JSON.parse(storedValue) as unknown;

      if (!isStoredAnalysisPayload(parsedValue)) {
        window.sessionStorage.removeItem(ANALYSIS_SESSION_STORAGE_KEY);
        setIsHydrated(true);
        return;
      }

      setRequest(parsedValue.request ?? null);
      setResult(parsedValue.result ?? null);
    } catch {
      window.sessionStorage.removeItem(ANALYSIS_SESSION_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!request || !result) {
      window.sessionStorage.removeItem(ANALYSIS_SESSION_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      ANALYSIS_SESSION_STORAGE_KEY,
      JSON.stringify({
        request,
        result
      })
    );
  }, [isHydrated, request, result]);

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
