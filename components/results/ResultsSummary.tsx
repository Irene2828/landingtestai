type ResultsSummaryProps = {
  strengths: string[];
  gaps: string[];
  actions: string[];
};

function splitSummaryItem(item: string) {
  const words = item.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return { lead: "", remainder: "" };
  }

  const leadWordCount = Math.min(words.length, 5);
  const visibleWords = words.slice(0, 12);
  const lead = visibleWords.slice(0, leadWordCount).join(" ");
  const remainder = visibleWords.slice(leadWordCount).join(" ");

  return {
    lead,
    remainder: remainder.trim()
  };
}

function trimSummaryItem(item: string) {
  const words = item.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  const visibleWords = words.slice(0, 12).join(" ");

  return visibleWords;
}

const cards = [
  {
    key: "strengths",
    title: "What's Working",
    className: "summary-card-strengths"
  },
  {
    key: "gaps",
    title: "Where It Breaks",
    className: "summary-card-gaps"
  },
  {
    key: "actions",
    title: "What To Do Next",
    className: "summary-card-actions"
  }
] as const;

export function ResultsSummary({
  strengths,
  gaps,
  actions
}: ResultsSummaryProps) {
  const itemsByKey = {
    strengths,
    gaps,
    actions
  };

  return (
    <section className="summary-grid" aria-label="Top summary">
      {cards.map((card) => (
        <article
          key={card.key}
          className={`summary-card ${card.className}`.trim()}
        >
          <h2>{card.title}</h2>
          <ul>
            {itemsByKey[card.key].map((item) => {
              if (card.key !== "actions") {
                return <li key={item}>{trimSummaryItem(item)}</li>;
              }

              const { lead, remainder } = splitSummaryItem(item);

              return (
                <li key={item}>
                  <strong className="summary-item-lead">{lead}</strong>
                  {remainder ? ` ${remainder}` : ""}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </section>
  );
}
