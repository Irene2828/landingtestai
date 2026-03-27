import { Plus, X } from "lucide-react";

import type { CompetitorSuggestion } from "@/lib/types";

type CompetitorTagsProps = {
  competitors: CompetitorSuggestion[];
  competitorInput: string;
  competitorError?: string | null;
  onCompetitorInputChange: (value: string) => void;
  onAddCompetitor: () => void;
  onRemove: (id: string) => void;
};

export function CompetitorTags({
  competitors,
  competitorInput,
  competitorError,
  onCompetitorInputChange,
  onAddCompetitor,
  onRemove
}: CompetitorTagsProps) {
  return (
    <div className="setup-block">
      <h3 className="setup-label setup-label-compact">Compare against</h3>

      <div className="setup-competitor-row">
        <div className="tag-panel" aria-label="Suggested competitors">
          {competitors.map((competitor) => (
            <div key={competitor.id} className="competitor-tag">
              <span className="competitor-tag-mark" aria-hidden="true">
                {competitor.initials}
              </span>
              <span className="competitor-tag-name">{competitor.name}</span>
              <button
                type="button"
                className="competitor-tag-remove"
                onClick={() => onRemove(competitor.id)}
                aria-label={`Remove ${competitor.name}`}
              >
                <X className="inline-icon" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="competitor-add-shell">
          <div
            className={`competitor-add-input-shell${
              competitorError ? " competitor-add-input-shell-error" : ""
            }`}
          >
            <input
              className="competitor-add-input"
              type="text"
              value={competitorInput}
              onChange={(event) => onCompetitorInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                event.preventDefault();
                onAddCompetitor();
              }}
              placeholder="https://competitor.com"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Add competitor by URL"
              aria-invalid={competitorError ? "true" : "false"}
            />
          </div>

          <button
            className="inline-action"
            type="button"
            onClick={onAddCompetitor}
          >
            <Plus className="inline-icon" strokeWidth={1.8} aria-hidden="true" />
            Add competitor
          </button>
        </div>
      </div>

      <p className="setup-hint setup-hint-centered">
        Suggested from your site category. Add a custom URL if you want a different benchmark.
      </p>
      {competitorError ? (
        <p className="setup-error" role="alert">
          {competitorError}
        </p>
      ) : null}
    </div>
  );
}
