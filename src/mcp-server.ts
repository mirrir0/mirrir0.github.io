/**
 * mcp-server.ts — MCP backend for the Blog panel.
 *
 * Provides tools for listing/reading/writing blog posts and drafts.
 * Reads/writes markdown files from content/posts/ and content/drafts/.
 *
 * Uses marked + shiki for server-side markdown → HTML rendering.
 */

import { Hono } from "hono";
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { createHighlighter } from "shiki";

const ROOT = join(import.meta.dirname, "..");
const POSTS_DIR = join(ROOT, "content", "posts");
const DRAFTS_DIR = join(ROOT, "content", "drafts");

// ─── Shiki highlighting ──────────────────────────────────────────────────────

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

async function getHighlighter(): Promise<Awaited<ReturnType<typeof createHighlighter>>> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: ["javascript", "typescript", "tsx", "jsx", "json", "html", "css",
              "bash", "shell", "markdown", "yaml", "python", "rust", "go", "sql"],
    });
  }
  return highlighterPromise;
}

async function highlightCode(code: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  const loaded = hl.getLoadedLanguages();
  const finalLang = loaded.includes(lang) ? lang : "text";
  return hl.codeToHtml(code, { lang: finalLang, theme: "github-dark" });
}

// ─── Markdown → HTML ─────────────────────────────────────────────────────────

marked.use({
  async: true,
  walkTokens: async (token) => {
    if (token.type === "code") {
      const t = token as { lang?: string; text: string; highlightedHtml?: string };
      t.highlightedHtml = await highlightCode(t.text, t.lang ?? "text");
    }
  },
  renderer: {
    link({ href, title, tokens }: { href?: string; title?: string | null; tokens: unknown[] }) {
      const text = (marked as unknown as { Parser: { parseInline: (t: unknown[]) => string } }).Parser.parseInline(tokens);
      if (href?.startsWith("pdf:")) {
        const file = href.slice(4).split("#")[0] ?? href;
        const pdfUrl = `/pdfs/${file}`;
        return `<a href="${pdfUrl}" class="pdf-link" data-pdf-file="${file}">${text}</a>`;
      }
      return `<a href="${href}"${title ? ` title="${title}"` : ""}>${text}</a>`;
    },
    code(token: { lang?: string; text: string; highlightedHtml?: string }) {
      if (token.highlightedHtml) {
        return `<div class="code-block-wrapper">${token.highlightedHtml}</div>`;
      }
      return `<pre><code>${token.text}</code></pre>`;
    },
  },
});

// ─── Post helpers ────────────────────────────────────────────────────────────

function readPost(dir: string, slug: string): { meta: Record<string, unknown>; content: string } | null {
  const filePath = join(dir, `${slug}.md`);
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { meta: data as Record<string, unknown>, content };
}

function listPosts(dir: string): Array<Record<string, unknown>> {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const post = readPost(dir, slug);
    return {
      slug,
      title: post?.meta.title ?? slug,
      date: post?.meta.date ?? new Date().toISOString(),
      description: post?.meta.description ?? "",
      tags: post?.meta.tags ?? [],
    };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, "-");
}

function titleToSlug(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// ─── MCP tools ───────────────────────────────────────────────────────────────

const TOOLS = [
  { name: "list_posts", description: "List all published blog posts", inputSchema: { type: "object" as const, properties: {} } },
  { name: "get_post", description: "Get a published blog post by slug (rendered as HTML)", inputSchema: { type: "object" as const, properties: { slug: { type: "string" } }, required: ["slug"] } },
  { name: "list_tags", description: "List all tags with post counts", inputSchema: { type: "object" as const, properties: {} } },
  { name: "get_posts_by_tag", description: "Get all posts matching a tag", inputSchema: { type: "object" as const, properties: { tag: { type: "string" } }, required: ["tag"] } },
  { name: "list_drafts", description: "List all drafts", inputSchema: { type: "object" as const, properties: {} } },
  { name: "get_draft", description: "Get a draft by slug (returns raw markdown for editing)", inputSchema: { type: "object" as const, properties: { slug: { type: "string" } }, required: ["slug"] } },
  { name: "save_draft", description: "Save/update a draft", inputSchema: { type: "object" as const, properties: { slug: { type: "string" }, title: { type: "string" }, description: { type: "string" }, tags: { type: "array", items: { type: "string" } }, content: { type: "string" } }, required: ["slug", "title", "content"] } },
  { name: "create_draft", description: "Create a new draft from a title", inputSchema: { type: "object" as const, properties: { title: { type: "string" } }, required: ["title"] } },
  { name: "delete_draft", description: "Delete a draft by slug", inputSchema: { type: "object" as const, properties: { slug: { type: "string" } }, required: ["slug"] } },
  { name: "publish_draft", description: "Publish a draft (moves to posts)", inputSchema: { type: "object" as const, properties: { slug: { type: "string" } }, required: ["slug"] } },
];

// ─── Hono app ────────────────────────────────────────────────────────────────

const app = new Hono();

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  if (c.req.method === "OPTIONS") return new Response(null, { status: 204 });
  return await next();
});

app.get("/mcp/list_tools", (c) => c.json({ tools: TOOLS }));
app.get("/mcp/health", (c) => c.json({ status: "ok" }));

app.post("/mcp/call", async (c) => {
  const body = await c.req.json<{ tool: string; arguments: Record<string, unknown> }>();
  const { tool, arguments: args } = body;

  try {
    switch (tool) {
      case "list_posts": {
        const posts = listPosts(POSTS_DIR);
        return c.json({ content: [{ type: "text", text: JSON.stringify(posts) }] });
      }
      case "get_post": {
        const slug = String(args.slug ?? "");
        const post = readPost(POSTS_DIR, slug);
        if (!post) return c.json({ content: [{ type: "text", text: "Post not found" }], isError: true }, 404);
        const html = await marked.parse(post.content);
        return c.json({ content: [{ type: "text", text: JSON.stringify({ slug, title: post.meta.title ?? slug, date: post.meta.date ?? "", description: post.meta.description ?? "", tags: post.meta.tags ?? [], content: html }) }] });
      }
      case "list_tags": {
        const posts = listPosts(POSTS_DIR);
        const tagMap = new Map<string, { original: string; count: number }>();
        for (const p of posts) {
          const tags = (p.tags as string[]) ?? [];
          for (const t of tags) {
            const n = normalizeTag(t);
            const existing = tagMap.get(n);
            if (existing) { existing.count++; } else { tagMap.set(n, { original: t, count: 1 }); }
          }
        }
        const tagsResult = [...tagMap.entries()].map(([n, { original, count }]) => ({ tag: original, count, normalized: n })).sort((a, b) => b.count - a.count);
        return c.json({ content: [{ type: "text", text: JSON.stringify(tagsResult) }] });
      }
      case "get_posts_by_tag": {
        const tag = String(args.tag ?? "");
        const norm = normalizeTag(tag);
        const posts = listPosts(POSTS_DIR).filter((p) => ((p.tags as string[]) ?? []).some((t: string) => normalizeTag(t) === norm));
        return c.json({ content: [{ type: "text", text: JSON.stringify(posts) }] });
      }
      case "list_drafts": {
        const drafts = listPosts(DRAFTS_DIR);
        return c.json({ content: [{ type: "text", text: JSON.stringify(drafts) }] });
      }
      case "get_draft": {
        const slug = String(args.slug ?? "");
        const draft = readPost(DRAFTS_DIR, slug);
        if (!draft) return c.json({ content: [{ type: "text", text: "Draft not found" }], isError: true }, 404);
        return c.json({ content: [{ type: "text", text: JSON.stringify({ slug, title: draft.meta.title ?? slug, date: draft.meta.date ?? "", description: draft.meta.description ?? "", tags: draft.meta.tags ?? [], content: draft.content }) }] });
      }
      case "save_draft": {
        const slug = String(args.slug ?? "");
        const title = String(args.title ?? "");
        const description = String(args.description ?? "");
        const tags = Array.isArray(args.tags) ? args.tags as string[] : [];
        const content = String(args.content ?? "");
        mkdirSync(DRAFTS_DIR, { recursive: true });
        const fm = { title, description, tags, date: new Date().toISOString() };
        const fileContent = matter.stringify(content, fm);
        writeFileSync(join(DRAFTS_DIR, `${slug}.md`), fileContent, "utf-8");
        return c.json({ content: [{ type: "text", text: JSON.stringify({ saved: true, slug }) }] });
      }
      case "create_draft": {
        const title = String(args.title ?? "");
        const slug = titleToSlug(title);
        mkdirSync(DRAFTS_DIR, { recursive: true });
        const existing = readPost(DRAFTS_DIR, slug);
        if (existing) return c.json({ content: [{ type: "text", text: `Draft "${slug}" already exists` }], isError: true }, 409);
        const fm = { title, description: "", tags: [], date: new Date().toISOString() };
        const fileContent = matter.stringify("", fm);
        writeFileSync(join(DRAFTS_DIR, `${slug}.md`), fileContent, "utf-8");
        return c.json({ content: [{ type: "text", text: JSON.stringify({ created: true, slug }) }] });
      }
      case "delete_draft": {
        const slug = String(args.slug ?? "");
        const filePath = join(DRAFTS_DIR, `${slug}.md`);
        if (!existsSync(filePath)) return c.json({ content: [{ type: "text", text: "Draft not found" }], isError: true }, 404);
        unlinkSync(filePath);
        return c.json({ content: [{ type: "text", text: JSON.stringify({ deleted: true, slug }) }] });
      }
      case "publish_draft": {
        const slug = String(args.slug ?? "");
        const draftPath = join(DRAFTS_DIR, `${slug}.md`);
        if (!existsSync(draftPath)) return c.json({ content: [{ type: "text", text: "Draft not found" }], isError: true }, 404);
        const postPath = join(POSTS_DIR, `${slug}.md`);
        mkdirSync(POSTS_DIR, { recursive: true });
        renameSync(draftPath, postPath);
        return c.json({ content: [{ type: "text", text: JSON.stringify({ published: true, slug }) }] });
      }
      default:
        return c.json({ content: [{ type: "text", text: `Unknown tool: ${tool}` }], isError: true }, 400);
    }
  } catch (err) {
    return c.json({ content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }], isError: true }, 500);
  }
});

export { app as blogMcpServer };
