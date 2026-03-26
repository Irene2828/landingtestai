import { Fragment, type ReactNode } from "react";

type EmphasisOptions = {
  maxPerLine?: number;
};

type Match = {
  start: number;
  end: number;
  priority: number;
};

const emphasisRules = [
  { pattern: /\bprimary CTA\b/gi, priority: 120 },
  { pattern: /\bsecondary CTA\b/gi, priority: 118 },
  { pattern: /\bCTA labels?\b/gi, priority: 116 },
  { pattern: /\bCTA label\b/gi, priority: 114 },
  { pattern: /\bCTA text\b/gi, priority: 112 },
  { pattern: /\bsocial proof\b/gi, priority: 110 },
  { pattern: /\btrust signals?\b/gi, priority: 108 },
  { pattern: /\buser outcome\b/gi, priority: 106 },
  { pattern: /\bprimary action\b/gi, priority: 104 },
  { pattern: /\bconversion path\b/gi, priority: 102 },
  { pattern: /\bproof types?\b/gi, priority: 100 },
  { pattern: /\bfirst screen\b/gi, priority: 98 },
  { pattern: /\bnext step\b/gi, priority: 96 },
  { pattern: /\bclient logos?\b/gi, priority: 94 },
  { pattern: /\bproof block\b/gi, priority: 92 },
  { pattern: /\bheadlines?\b/gi, priority: 90 },
  { pattern: /\bhero\b/gi, priority: 88 },
  { pattern: /\boutcome\b/gi, priority: 86 },
  { pattern: /\bproof\b/gi, priority: 84 },
  { pattern: /\bCTA\b/gi, priority: 82 }
];

function collectMatches(line: string) {
  const matches: Match[] = [];

  for (const rule of emphasisRules) {
    for (const match of line.matchAll(rule.pattern)) {
      const matchedText = match[0];
      const start = match.index ?? -1;

      if (!matchedText || start < 0) {
        continue;
      }

      matches.push({
        start,
        end: start + matchedText.length,
        priority: rule.priority
      });
    }
  }

  for (const match of line.matchAll(/"([^"\n]{1,40})"/g)) {
    const matchedText = match[0];
    const start = match.index ?? -1;

    if (!matchedText || start < 0) {
      continue;
    }

    const wordCount = matchedText
      .replace(/"/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    if (wordCount === 0 || wordCount > 5) {
      continue;
    }

    matches.push({
      start,
      end: start + matchedText.length,
      priority: 95
    });
  }

  return matches;
}

function selectMatches(line: string, maxPerLine: number) {
  const candidates = collectMatches(line).sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    const leftLength = left.end - left.start;
    const rightLength = right.end - right.start;

    if (leftLength !== rightLength) {
      return rightLength - leftLength;
    }

    return left.start - right.start;
  });

  const selected: Match[] = [];

  for (const candidate of candidates) {
    const overlaps = selected.some(
      (match) => candidate.start < match.end && candidate.end > match.start
    );

    if (overlaps) {
      continue;
    }

    selected.push(candidate);

    if (selected.length >= maxPerLine) {
      break;
    }
  }

  return selected.sort((left, right) => left.start - right.start);
}

function renderLine(line: string, maxPerLine: number) {
  const matches = selectMatches(line, maxPerLine);

  if (matches.length === 0) {
    return line;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (cursor < match.start) {
      parts.push(line.slice(cursor, match.start));
    }

    parts.push(
      <strong key={`${match.start}-${match.end}-${index}`} className="text-emphasis">
        {line.slice(match.start, match.end)}
      </strong>
    );

    cursor = match.end;
  });

  if (cursor < line.length) {
    parts.push(line.slice(cursor));
  }

  return parts;
}

export function renderEmphasizedText(
  text: string,
  options: EmphasisOptions = {}
) {
  const { maxPerLine = 2 } = options;
  const lines = text.split("\n");

  return lines.map((line, index) => (
    <Fragment key={`${line}-${index}`}>
      {renderLine(line, maxPerLine)}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}
