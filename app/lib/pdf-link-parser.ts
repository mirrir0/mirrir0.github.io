export interface PDFLinkData {
  file: string;
  page: number;
  highlight: string | null;
}

/**
 * Parses a pdf: protocol link into its components
 * Format: pdf:filename.pdf#page=5&highlight=some+text
 */
export function parsePDFLink(href: string): PDFLinkData {
  // Remove pdf: prefix
  const withoutProtocol = href.slice(4);

  // Split file and hash
  const [file, hash] = withoutProtocol.split("#");

  // Parse query params from hash
  const params = new URLSearchParams(hash || "");

  return {
    file: file,
    page: parseInt(params.get("page") || "1", 10),
    highlight: params.get("highlight")
      ? decodeURIComponent(params.get("highlight")!)
      : null,
  };
}

/**
 * Escapes special regex characters in a string
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
