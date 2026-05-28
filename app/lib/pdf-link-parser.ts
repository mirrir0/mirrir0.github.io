/**
 * pdf-link-parser.ts — PDF link utilities used by PDFViewerPanel.
 */

/**
 * Escapes special regex characters in a string.
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
