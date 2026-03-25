type ResultsSummaryProps = {
  strengths: string[];
  gaps: string[];
  actions: string[];
};

const cards = [
  {
    key: "strengths",
    title: "Key Strengths",
    description: "Where the page already builds confidence and clarity.",
    className: "summary-card-strengths"
  },
  {
    key: "gaps",
    title: "Key Gaps",
    description: "Where the current page loses clarity or persuasive force.",
    className: "summary-card-gaps"
  },
  {
    key: "actions",
    title: "Top Actions",
    description: "The highest-leverage improvements to prioritize next.",
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
          <p>{card.description}</p>
          <ul>
            {itemsByKey[card.key].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
