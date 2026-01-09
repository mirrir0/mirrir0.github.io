import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { marked, type Tokens } from "marked";
import { normalizeTag } from "./utils";
import { parsePDFLink } from "./pdf-link-parser";
import { highlightCode } from "./shiki.server";

// Custom renderer for pdf: protocol links
const renderer = {
  link({ href, title, tokens }: Tokens.Link) {
    const text = this.parser.parseInline(tokens);

    // Check for pdf: protocol
    if (href && href.startsWith("pdf:")) {
      const pdfData = parsePDFLink(href);
      const escapedFile = pdfData.file.replace(/"/g, "&quot;");
      const escapedHighlight = (pdfData.highlight || "").replace(/"/g, "&quot;");
      // Use actual PDF URL so cmd+click and right-click work naturally
      const pdfUrl = `/pdfs/${escapedFile}`;
      return `<a href="${pdfUrl}"
        class="pdf-link"
        data-pdf-file="${escapedFile}"
        data-pdf-page="${pdfData.page}"
        data-pdf-highlight="${escapedHighlight}"
        title="${title || `Open ${pdfData.file}`}"
      >${text}</a>`;
    }

    // Default link behavior
    return `<a href="${href}"${title ? ` title="${title}"` : ""}>${text}</a>`;
  },
};

marked.use({ renderer });

// Shiki syntax highlighting extension
marked.use({
  async: true,
  async walkTokens(token) {
    if (token.type === "code") {
      const codeToken = token as Tokens.Code;
      const lang = codeToken.lang || "text";
      const code = codeToken.text;
      // Store highlighted HTML in a custom property
      (codeToken as Tokens.Code & { highlightedHtml?: string }).highlightedHtml =
        await highlightCode(code, lang);
    }
  },
  renderer: {
    code(token: Tokens.Code) {
      // Use pre-highlighted HTML if available
      const highlighted = (token as Tokens.Code & { highlightedHtml?: string })
        .highlightedHtml;
      if (highlighted) {
        // Wrap with container and add copy button
        const escapedCode = token.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
        return `<div class="code-block-wrapper">
          <button class="copy-button" data-code="${escapedCode}" aria-label="Copy code">
            <svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
          ${highlighted}
        </div>`;
      }
      // Fallback to default rendering
      const lang = token.lang || "";
      const escaped = token.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
    },
  },
});

const POSTS_DIR = path.join(process.cwd(), "content/posts");

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description?: string;
  tags?: string[];
}

export interface Post extends PostMeta {
  content: string;
}

export async function getAllPosts(): Promise<PostMeta[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(POSTS_DIR);
  } catch {
    return [];
  }
  const posts = await Promise.all(
    files
      .filter((file) => file.endsWith(".md"))
      .map(async (file) => {
        const slug = file.replace(/\.md$/, "");
        const filePath = path.join(POSTS_DIR, file);
        const content = await fs.readFile(filePath, "utf-8");
        const { data } = matter(content);
        return {
          slug,
          title: data.title || slug,
          date: data.date || new Date().toISOString(),
          description: data.description,
          tags: data.tags,
        } as PostMeta;
      })
  );

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(fileContent);
    const htmlContent = await marked(content);
    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      description: data.description,
      tags: data.tags,
      content: htmlContent,
    };
  } catch {
    return null;
  }
}

/**
 * Gets all unique tags across all posts with their counts
 * Returns tags with original casing (from first occurrence) and normalized keys
 */
export async function getAllTags(): Promise<
  Array<{ tag: string; count: number; normalized: string }>
> {
  const posts = await getAllPosts();
  const tagMap = new Map<string, { original: string; count: number }>();

  posts.forEach((post) => {
    if (post.tags) {
      post.tags.forEach((tag) => {
        const normalized = normalizeTag(tag);
        if (tagMap.has(normalized)) {
          const existing = tagMap.get(normalized)!;
          tagMap.set(normalized, { ...existing, count: existing.count + 1 });
        } else {
          tagMap.set(normalized, { original: tag, count: 1 });
        }
      });
    }
  });

  return Array.from(tagMap.entries())
    .map(([normalized, { original, count }]) => ({
      tag: original,
      count,
      normalized,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * Gets all posts that have a specific tag (case-insensitive)
 * Returns posts sorted by date (newest first)
 */
export async function getPostsByTag(tag: string): Promise<PostMeta[]> {
  const normalizedTag = normalizeTag(tag);
  const posts = await getAllPosts();

  return posts.filter((post) =>
    post.tags?.some((t) => normalizeTag(t) === normalizedTag)
  );
}

/**
 * Gets the original casing of a tag from the posts
 * Used for display purposes on tag pages
 */
export async function getTagDisplayName(tag: string): Promise<string | null> {
  const normalizedTag = normalizeTag(tag);
  const posts = await getAllPosts();

  for (const post of posts) {
    if (post.tags) {
      const found = post.tags.find((t) => normalizeTag(t) === normalizedTag);
      if (found) return found;
    }
  }

  return null;
}
