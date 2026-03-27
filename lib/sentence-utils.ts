const DOMAIN_DOT_PLACEHOLDER = "<<<DOMAIN_DOT>>>";
const QUOTED_DOT_PLACEHOLDER = "<<<QUOTED_DOT>>>";
const QUOTED_EXCLAMATION_PLACEHOLDER = "<<<QUOTED_EXCLAMATION>>>";
const QUOTED_QUESTION_PLACEHOLDER = "<<<QUOTED_QUESTION>>>";
const DOMAIN_PATTERN = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
const QUOTED_TEXT_PATTERN = /(["“])([\s\S]*?)(["”])/g;

function protectDomainDots(value: string) {
  return value.replace(DOMAIN_PATTERN, (match) =>
    match.replace(/\./g, DOMAIN_DOT_PLACEHOLDER)
  );
}

function restoreDomainDots(value: string) {
  return value.replaceAll(DOMAIN_DOT_PLACEHOLDER, ".");
}

function protectQuotedSentencePunctuation(value: string) {
  return value.replace(
    QUOTED_TEXT_PATTERN,
    (_, openQuote: string, content: string, closeQuote: string) =>
      `${openQuote}${content
        .replace(/\./g, QUOTED_DOT_PLACEHOLDER)
        .replace(/!/g, QUOTED_EXCLAMATION_PLACEHOLDER)
        .replace(/\?/g, QUOTED_QUESTION_PLACEHOLDER)}${closeQuote}`
  );
}

function restoreQuotedSentencePunctuation(value: string) {
  return value
    .replaceAll(QUOTED_DOT_PLACEHOLDER, ".")
    .replaceAll(QUOTED_EXCLAMATION_PLACEHOLDER, "!")
    .replaceAll(QUOTED_QUESTION_PLACEHOLDER, "?");
}

export function splitSentencesPreservingDomains(value: string) {
  const protectedValue = protectQuotedSentencePunctuation(
    protectDomainDots(value)
  );
  const sentences = protectedValue.match(/[^.!?]+[.!?]?/g) ?? [];

  return sentences
    .map((sentence) =>
      restoreQuotedSentencePunctuation(restoreDomainDots(sentence)).trim()
    )
    .filter(Boolean);
}
