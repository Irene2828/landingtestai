import { Fragment, type ReactNode } from "react";

type EmphasisMode =
  | "observation"
  | "recommendation"
  | "summary"
  | "evidence";

type EmphasisOptions = {
  maxPerLine?: number;
  mode?: EmphasisMode;
};

type Match = {
  start: number;
  end: number;
  priority: number;
};

type EmphasisRule = {
  pattern: RegExp;
  priority: number;
  modes: EmphasisMode[];
};

const emphasisRules: EmphasisRule[] = [
  {
    pattern:
      /\bCompared to [A-Z][A-Za-z0-9.&-]*(?: [A-Z][A-Za-z0-9.&-]*){0,2}(?:'s)?\b/i,
    priority: 170,
    modes: ["observation"]
  },
  {
    pattern:
      /\bUnlike [A-Z][A-Za-z0-9.&-]*(?: [A-Z][A-Za-z0-9.&-]*){0,2}(?:'s)?\b/i,
    priority: 168,
    modes: ["observation"]
  },
  {
    pattern:
      /\bWhereas [A-Z][A-Za-z0-9.&-]*(?: [A-Z][A-Za-z0-9.&-]*){0,2}(?:'s)?\b/i,
    priority: 166,
    modes: ["observation"]
  },
  {
    pattern: /^What to check manually\b/i,
    priority: 164,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Shift to)\b/i,
    priority: 160,
    modes: ["recommendation", "summary"]
  },
  {
    pattern: /^(?:-\s*)?(Clarify)\b/i,
    priority: 158,
    modes: ["recommendation", "summary"]
  },
  {
    pattern: /^(?:-\s*)?(Consolidate)\b/i,
    priority: 156,
    modes: ["recommendation", "summary"]
  },
  {
    pattern: /^(?:-\s*)?(Anchor)\b/i,
    priority: 154,
    modes: ["recommendation", "summary"]
  },
  {
    pattern: /^(?:-\s*)?(Define)\b/i,
    priority: 152,
    modes: ["recommendation", "summary"]
  },
  {
    pattern: /^(?:-\s*)?(Keep)\b/i,
    priority: 150,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Add)\b/i,
    priority: 148,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Make)\b/i,
    priority: 146,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Move)\b/i,
    priority: 144,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Pair)\b/i,
    priority: 142,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Build)\b/i,
    priority: 140,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Place)\b/i,
    priority: 138,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Rework)\b/i,
    priority: 136,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Replace)\b/i,
    priority: 134,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Label)\b/i,
    priority: 132,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Compare)\b/i,
    priority: 130,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Check)\b/i,
    priority: 128,
    modes: ["recommendation"]
  },
  {
    pattern: /^(?:-\s*)?(Headline|Title|CTAs|Trust Signals|Description):/i,
    priority: 126,
    modes: ["evidence"]
  }
];

function getGlobalPattern(pattern: RegExp) {
  const flags = new Set(pattern.flags.split(""));
  flags.add("g");

  return new RegExp(pattern.source, Array.from(flags).join(""));
}

function collectMatches(line: string, mode: EmphasisMode) {
  const matches: Match[] = [];

  for (const rule of emphasisRules) {
    if (!rule.modes.includes(mode)) {
      continue;
    }

    for (const match of line.matchAll(getGlobalPattern(rule.pattern))) {
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

  for (const match of line.matchAll(/["“]([^"”\n]{1,120})["”]/g)) {
    const matchedText = match[0];
    const start = match.index ?? -1;

    if (!matchedText || start < 0) {
      continue;
    }

    const wordCount = matchedText
      .replace(/"/g, "")
      .replace(/[“”]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    if (wordCount === 0 || wordCount > 12) {
      continue;
    }

    matches.push({
      start,
      end: start + matchedText.length,
      priority: mode === "evidence" ? 124 : 122
    });
  }

  return matches;
}

function selectMatches(
  line: string,
  maxPerLine: number,
  mode: EmphasisMode
) {
  const candidates = collectMatches(line, mode).sort((left, right) => {
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

function renderLine(line: string, maxPerLine: number, mode: EmphasisMode) {
  const matches = selectMatches(line, maxPerLine, mode);

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
  const { maxPerLine = 2, mode = "observation" } = options;
  const lines = text.split("\n");

  return lines.map((line, index) => (
    <Fragment key={`${line}-${index}`}>
      {renderLine(line, maxPerLine, mode)}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}
