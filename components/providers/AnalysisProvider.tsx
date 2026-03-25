"use client";

import { createContext, useContext, useState } from "react";

import type { AnalyzeApiResponse, AnalyzeRequestPayload } from "@/lib/types";

type AnalysisContextValue = {
  request: AnalyzeRequestPayload | null;
  result: AnalyzeApiResponse | null;
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

export function AnalysisProvider({ children }: AnalysisProviderProps) {
  const [request, setRequest] = useState<AnalyzeRequestPayload | null>(null);
  const [result, setResult] = useState<AnalyzeApiResponse | null>(null);

  function handleSetAnalysis(
    nextRequest: AnalyzeRequestPayload,
    nextResult: AnalyzeApiResponse
  ) {
    setRequest(nextRequest);
    setResult(nextResult);
  }

  function clearAnalysis() {
    setRequest(null);
    setResult(null);
  }

  return (
    <AnalysisContext.Provider
      value={{
        request,
        result,
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
