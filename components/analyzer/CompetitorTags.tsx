type Competitor = {
  id: string;
  name: string;
  initials: string;
};

type CompetitorTagsProps = {
  competitors: Competitor[];
  onRemove: (id: string) => void;
};

export function CompetitorTags({
  competitors,
  onRemove
}: CompetitorTagsProps) {
  return (
    <div className="setup-block">
      <div className="setup-row">
        <div>
          <h3 className="setup-label setup-label-compact">Competitor Context</h3>
          <p className="setup-hint">
            Auto-detected for baseline comparison.
          </p>
        </div>

        <button className="inline-action" type="button">
          <span className="material-symbols-outlined inline-icon" aria-hidden="true">
            add
          </span>
          Add Custom
        </button>
      </div>

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
    </div>
  );
}
