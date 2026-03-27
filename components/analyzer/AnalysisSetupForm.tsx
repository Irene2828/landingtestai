"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAnalysisStore } from "@/components/providers/AnalysisProvider";
import {
  getCompetitorLookupKey,
  getSuggestedCompetitorsForUrl,
  suggestedCompetitors,
  setupSections
} from "@/lib/mock-setup";
import type { AnalysisSectionKey, CompetitorSuggestion } from "@/lib/types";

import { CompetitorTags } from "./CompetitorTags";
import { SectionSelector } from "./SectionSelector";
import { UrlField } from "./UrlField";

const defaultSections: AnalysisSectionKey[] = ["Hero", "CTA", "Social Proof"];
const URL_ERROR_MESSAGE = "Enter a valid URL (e.g. https://example.com)";
const COMPETITOR_ERROR_MESSAGE =
  "Enter a valid competitor URL (e.g. https://notion.com)";

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

function getCompetitorNameFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    const [firstPart] = hostname.split(".");

    if (!firstPart) {
      return hostname;
    }

    return firstPart
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return url;
  }
}

function getCompetitorInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "C";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2);
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`;
}

function buildCustomCompetitor(url: string): CompetitorSuggestion {
  const name = getCompetitorNameFromUrl(url);
  const normalizedName = name || "Competitor";

  return {
    id: `custom:${url.toLowerCase()}`,
    name: normalizedName,
    initials: getCompetitorInitials(normalizedName),
    url
  };
}

function haveSameCompetitors(
  left: CompetitorSuggestion[],
  right: CompetitorSuggestion[]
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (competitor, index) => competitor.url === right[index]?.url
  );
}

export function AnalysisSetupForm() {
  const router = useRouter();
  const { clearAnalysis } = useAnalysisStore();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] =
    useState<AnalysisSectionKey[]>(defaultSections);
  const [competitors, setCompetitors] = useState(suggestedCompetitors);
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const lastSuggestionKeyRef = useRef("default");
  const hasManualCompetitorEditsRef = useRef(false);

  const canSubmit = useMemo(() => {
    return url.trim().length > 0 && selectedSections.length > 0;
  }, [selectedSections.length, url]);

  useEffect(() => {
    const nextSuggestionKey = getCompetitorLookupKey(url);
    const nextSuggestions = getSuggestedCompetitorsForUrl(url);

    if (nextSuggestionKey !== lastSuggestionKeyRef.current) {
      lastSuggestionKeyRef.current = nextSuggestionKey;
      hasManualCompetitorEditsRef.current = false;
      setCompetitors(nextSuggestions);
      return;
    }

    if (hasManualCompetitorEditsRef.current) {
      return;
    }

    setCompetitors((current) =>
      haveSameCompetitors(current, nextSuggestions) ? current : nextSuggestions
    );
  }, [url]);

  function toggleSection(section: AnalysisSectionKey) {
    setSelectedSections((current) =>
      current.includes(section)
        ? current.filter((value) => value !== section)
        : [...current, section]
    );
  }

  function removeCompetitor(id: string) {
    hasManualCompetitorEditsRef.current = true;
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

  function handleCompetitorInputChange(nextValue: string) {
    setCompetitorInput(nextValue);

    if (competitorError) {
      setCompetitorError(null);
    }
  }

  function handleAddCompetitor() {
    const normalizedCompetitorUrl = normalizeUrlInput(competitorInput);

    if (!normalizedCompetitorUrl || !isValidNormalizedUrl(normalizedCompetitorUrl)) {
      setCompetitorError(COMPETITOR_ERROR_MESSAGE);
      return;
    }

    const normalizedTargetUrl = normalizeUrlInput(url);

    if (
      normalizedTargetUrl &&
      normalizedCompetitorUrl.toLowerCase() === normalizedTargetUrl.toLowerCase()
    ) {
      setCompetitorError("Target page and competitor cannot be the same URL");
      return;
    }

    const competitorExists = competitors.some(
      (competitor) =>
        competitor.url.toLowerCase() === normalizedCompetitorUrl.toLowerCase()
    );

    if (competitorExists) {
      setCompetitorError("That competitor is already in the comparison set");
      return;
    }

    hasManualCompetitorEditsRef.current = true;
    setCompetitors((current) => [...current, buildCustomCompetitor(normalizedCompetitorUrl)]);
    setCompetitorInput("");
    setCompetitorError(null);
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
      searchParams.append("competitorUrl", competitor.url);
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

      <CompetitorTags
        competitors={competitors}
        competitorInput={competitorInput}
        competitorError={competitorError}
        onCompetitorInputChange={handleCompetitorInputChange}
        onAddCompetitor={handleAddCompetitor}
        onRemove={removeCompetitor}
      />

      <div className="setup-submit">
        <div className="setup-submit-stack">
          <button
            className="primary-button"
            type="submit"
            disabled={!canSubmit}
          >
            <Search
              className="primary-button-icon"
              strokeWidth={1.8}
              aria-hidden="true"
            />
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
