import { createHighlighter, type Highlighter } from "shiki";

// Singleton - highlighter is expensive to create
let highlighterPromise: Promise<Highlighter> | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: [
        "javascript",
        "typescript",
        "tsx",
        "jsx",
        "json",
        "html",
        "css",
        "bash",
        "shell",
        "markdown",
        "yaml",
        "python",
        "rust",
        "go",
        "sql",
      ],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang: string
): Promise<string> {
  const highlighter = await getHighlighter();

  // Fallback to 'text' if language not loaded
  const loadedLangs = highlighter.getLoadedLanguages();
  const finalLang = loadedLangs.includes(lang) ? lang : "text";

  return highlighter.codeToHtml(code, {
    lang: finalLang,
    theme: "github-dark",
  });
}
