import { renderEmphasizedText } from "./text-emphasis";

type ResultsSummaryProps = {
  strengths: string[];
  gaps: string[];
  actions: string[];
};

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
          <h3>{card.title}</h3>
          <ul>
            {itemsByKey[card.key].map((item) => {
              if (card.key !== "actions") {
                return <li key={item}>{trimSummaryItem(item)}</li>;
              }

              return (
                <li key={item}>
                  {renderEmphasizedText(trimSummaryItem(item), {
                    maxPerLine: 2,
                    mode: "summary"
                  })}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </section>
  );
}
