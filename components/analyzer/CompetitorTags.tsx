import type { CompetitorSuggestion } from "@/lib/types";

type CompetitorTagsProps = {
  competitors: CompetitorSuggestion[];
  onRemove: (id: string) => void;
};

export function CompetitorTags({
  competitors,
  onRemove
}: CompetitorTagsProps) {
  return (
    <div className="setup-block">
      <h3 className="setup-label setup-label-compact">Compare against</h3>

      <div className="setup-competitor-row">
        <div className="tag-panel">
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
                <span className="material-symbols-outlined inline-icon" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
          ))}
        </div>

        <button
          className="inline-action inline-action-disabled"
          type="button"
          aria-disabled="true"
          title="Coming soon"
          data-tooltip="Coming soon"
        >
          + Add competitor
        </button>
      </div>

      <p className="setup-hint setup-hint-centered">
        Suggested from your site category. You can edit these.
      </p>
    </div>
  );
}
