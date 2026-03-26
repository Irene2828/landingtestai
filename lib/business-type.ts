const SERVICE_HOSTNAME_HINTS = ["cieden", "agency", "studio", "consulting"];

const SERVICE_TEXT_HINTS = [
  /\bagency\b/i,
  /\bstudio\b/i,
  /\bconsult(?:ing|ancy)?\b/i,
  /\bdesign services?\b/i,
  /\bproduct design\b/i,
  /\bui\/ux\b/i,
  /\bux design\b/i,
  /\bweb design\b/i,
  /\bbranding\b/i,
  /\bservice-based\b/i
];

function getNormalizedHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isLikelyServiceBusiness(
  url: string,
  textCandidates: string[] = []
) {
  const hostname = getNormalizedHostname(url);

  if (
    hostname &&
    SERVICE_HOSTNAME_HINTS.some(
      (hint) => hostname === hint || hostname.includes(`${hint}.`) || hostname.includes(hint)
    )
  ) {
    return true;
  }

  const combinedText = textCandidates.filter(Boolean).join(" ");

  if (!combinedText) {
    return false;
  }

  return SERVICE_TEXT_HINTS.some((pattern) => pattern.test(combinedText));
}
