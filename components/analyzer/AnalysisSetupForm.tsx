"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAnalysisStore } from "@/components/providers/AnalysisProvider";
import { suggestedCompetitors, setupSections } from "@/lib/mock-setup";
import type { AnalysisSectionKey } from "@/lib/types";

import { CompetitorTags } from "./CompetitorTags";
import { SectionSelector } from "./SectionSelector";
import { UrlField } from "./UrlField";

const defaultSections: AnalysisSectionKey[] = ["Hero", "CTA", "Social Proof"];

export function AnalysisSetupForm() {
  const router = useRouter();
  const { clearAnalysis } = useAnalysisStore();
  const [url, setUrl] = useState("");
  const [selectedSections, setSelectedSections] =
    useState<AnalysisSectionKey[]>(defaultSections);
  const [competitors, setCompetitors] = useState(suggestedCompetitors);

  const canSubmit = useMemo(() => {
    return url.trim().length > 0 && selectedSections.length > 0;
  }, [selectedSections.length, url]);

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const searchParams = new URLSearchParams({
      url: url.trim()
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
    <form className="setup-card" onSubmit={handleSubmit}>
      <UrlField value={url} onChange={setUrl} />

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
            Takes ~10 seconds · No signup required
          </p>
        </div>
      </div>
    </form>
  );
}
