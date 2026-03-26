"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAnalysisStore } from "@/components/providers/AnalysisProvider";
import {
  getSuggestedCompetitorsForUrl,
  suggestedCompetitors,
  setupSections
} from "@/lib/mock-setup";
import type { AnalysisSectionKey } from "@/lib/types";

import { CompetitorTags } from "./CompetitorTags";
import { SectionSelector } from "./SectionSelector";
import { UrlField } from "./UrlField";

const defaultSections: AnalysisSectionKey[] = ["Hero", "CTA", "Social Proof"];
const URL_ERROR_MESSAGE = "Enter a valid URL (e.g. https://example.com)";

function normalizeUrlInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function isValidNormalizedUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function AnalysisSetupForm() {
  const router = useRouter();
  const { clearAnalysis } = useAnalysisStore();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] =
    useState<AnalysisSectionKey[]>(defaultSections);
  const [competitors, setCompetitors] = useState(suggestedCompetitors);

  const canSubmit = useMemo(() => {
    return url.trim().length > 0 && selectedSections.length > 0;
  }, [selectedSections.length, url]);

  useEffect(() => {
    setCompetitors(getSuggestedCompetitorsForUrl(url));
  }, [url]);

  function toggleSection(section: AnalysisSectionKey) {
    setSelectedSections((current) =>
      current.includes(section)
        ? current.filter((value) => value !== section)
        : [...current, section]
    );
  }

  function removeCompetitor(id: string) {
    setCompetitors((current) =>
      current.filter((competitor) => competitor.id !== id)
    );
  }

  function handleUrlChange(nextUrl: string) {
    setUrl(nextUrl);

    if (urlError) {
      setUrlError(null);
    }
  }

  function handleUrlBlur() {
    const normalizedUrl = normalizeUrlInput(url);

    if (normalizedUrl !== url) {
      setUrl(normalizedUrl);
    }

    if (!normalizedUrl) {
      setUrlError(null);
      return;
    }

    setUrlError(isValidNormalizedUrl(normalizedUrl) ? null : URL_ERROR_MESSAGE);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setUrlError(URL_ERROR_MESSAGE);
      return;
    }

    const normalizedUrl = normalizeUrlInput(url);

    if (normalizedUrl !== url) {
      setUrl(normalizedUrl);
    }

    if (!isValidNormalizedUrl(normalizedUrl)) {
      setUrlError(URL_ERROR_MESSAGE);
      return;
    }

    const searchParams = new URLSearchParams({
      url: normalizedUrl
    });

    selectedSections.forEach((section) => {
      searchParams.append("section", section);
    });

    competitors.forEach((competitor) => {
      searchParams.append("competitor", competitor.id);
    });

    clearAnalysis();
    router.push(`/loading?${searchParams.toString()}`);
  }

  return (
    <form className="setup-card" onSubmit={handleSubmit} noValidate>
      <UrlField
        value={url}
        onChange={handleUrlChange}
        onBlur={handleUrlBlur}
        error={urlError}
      />

      <SectionSelector
        options={setupSections}
        selected={selectedSections}
        onToggle={toggleSection}
      />

      <CompetitorTags competitors={competitors} onRemove={removeCompetitor} />

      <div className="setup-submit">
        <div className="setup-submit-stack">
          <button
            className="primary-button"
            type="submit"
            disabled={!canSubmit}
          >
            <span
              className="primary-button-icon material-symbols-outlined"
              aria-hidden="true"
            >
              analytics
            </span>
            Analyze page
          </button>
          <p className="setup-submit-meta">
            No signup required · ~10 seconds
          </p>
        </div>
      </div>
    </form>
  );
}
