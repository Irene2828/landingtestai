const DOMAIN_DOT_PLACEHOLDER = "<<<DOMAIN_DOT>>>";
const DOMAIN_PATTERN = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;

function protectDomainDots(value: string) {
  return value.replace(DOMAIN_PATTERN, (match) =>
    match.replace(/\./g, DOMAIN_DOT_PLACEHOLDER)
  );
}

function restoreDomainDots(value: string) {
  return value.replaceAll(DOMAIN_DOT_PLACEHOLDER, ".");
}

export function splitSentencesPreservingDomains(value: string) {
  const protectedValue = protectDomainDots(value);
  const sentences = protectedValue.match(/[^.!?]+[.!?]?/g) ?? [];

  return sentences
    .map((sentence) => restoreDomainDots(sentence).trim())
    .filter(Boolean);
}
