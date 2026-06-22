/**
 * draft-store.mjs — filesystem CRUD + frontmatter serialization for the blog's
 * draft/post lifecycle. Single source of truth shared by server.mjs (HTTP) and
 * server.ts (stdio MCP) so both transports mutate content identically.
 *
 * Plain ESM (not TS) so `node server.mjs` needs no build step; server.ts imports
 * it under tsx with the sibling draft-store.d.ts for types.
 *
 * Logic is lifted verbatim from the original server.mjs route handlers — keep it
 * byte-identical (frontmatter format, slugify regex, default values) so the
 * static baker and existing drafts continue to round-trip.
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

/**
 * @param {{ draftsDir: string, postsDir: string }} dirs
 */
export function createDraftStore({ draftsDir, postsDir }) {
  // In-process change listeners (SSE fan-out). Mutations notify subscribers so
  // an open panel can refetch. MCP doesn't use this (its freshness comes from
  // the agent's tool calls driving the UI), only the HTTP server does.
  const listeners = new Set();
  const emit = (type, slug) => {
    for (const fn of listeners) {
      try { fn(type, slug); } catch { /* a broken SSE client must not break a write */ }
    }
  };

  function readMeta(filePath) {
    const raw = readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const slug = filePath.split("/").pop().replace(/\.md$/, "");
    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date(0).toISOString(),
      description: data.description || "",
      tags: data.tags || [],
    };
  }

  function listIn(dir) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => readMeta(join(dir, f)));
  }

  function readIn(dir, slug) {
    const filePath = join(dir, `${slug}.md`);
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date(0).toISOString(),
      description: data.description || "",
      tags: data.tags || [],
      content,
    };
  }

  function listDrafts() {
    return listIn(draftsDir);
  }

  function listPosts() {
    return listIn(postsDir);
  }

  function readDraft(slug) {
    return readIn(draftsDir, slug);
  }

  function readPost(slug) {
    return readIn(postsDir, slug);
  }

  function writeDraft(slug, fields) {
    const filePath = join(draftsDir, `${slug}.md`);
    const existing = readDraft(slug) || {};
    const frontmatter = [
      `title: ${JSON.stringify(fields.title ?? existing.title ?? slug)}`,
      `description: ${JSON.stringify(fields.description ?? existing.description ?? "")}`,
      `date: ${JSON.stringify(fields.date ?? existing.date ?? new Date().toISOString())}`,
    ];
    if ((fields.tags ?? existing.tags)?.length > 0) {
      frontmatter.push(`tags: [${(fields.tags ?? existing.tags).join(", ")}]`);
    }
    const body = fields.content ?? existing.content ?? "";
    if (!existsSync(draftsDir)) mkdirSync(draftsDir, { recursive: true });
    writeFileSync(filePath, `---\n${frontmatter.join("\n")}\n---\n\n${body}`);
    emit("draft-changed", slug);
  }

  function createDraft({ title }) {
    const t = title || "Untitled";
    const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled";
    writeDraft(slug, { title: t, date: new Date().toISOString() });
    return { slug };
  }

  function deleteDraft(slug) {
    const filePath = join(draftsDir, `${slug}.md`);
    if (existsSync(filePath)) unlinkSync(filePath);
    emit("deleted", slug);
    return { ok: true };
  }

  function renameDraft(oldSlug, newSlug) {
    const src = join(draftsDir, `${oldSlug}.md`);
    const dest = join(draftsDir, `${newSlug}.md`);
    if (!existsSync(src)) throw new Error("draft not found");
    renameSync(src, dest);
    emit("draft-changed", newSlug);
    return { ok: true, slug: newSlug };
  }

  function publishDraft(slug) {
    const src = join(draftsDir, `${slug}.md`);
    const dest = join(postsDir, `${slug}.md`);
    if (!existsSync(src)) throw new Error("draft not found");
    if (!existsSync(postsDir)) mkdirSync(postsDir, { recursive: true });
    renameSync(src, dest);
    emit("published", slug);
    return { ok: true, slug };
  }

  function unpublishPost(slug) {
    const src = join(postsDir, `${slug}.md`);
    const dest = join(draftsDir, `${slug}.md`);
    if (!existsSync(src)) throw new Error("post not found");
    if (!existsSync(draftsDir)) mkdirSync(draftsDir, { recursive: true });
    renameSync(src, dest);
    emit("draft-changed", slug);
    return { ok: true, slug };
  }

  function deletePost(slug) {
    const filePath = join(postsDir, `${slug}.md`);
    if (existsSync(filePath)) unlinkSync(filePath);
    emit("deleted", slug);
    return { ok: true };
  }

  /** Subscribe to mutation events; returns an unsubscribe function. */
  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    readMeta,
    listDrafts,
    listPosts,
    readDraft,
    readPost,
    writeDraft,
    createDraft,
    deleteDraft,
    renameDraft,
    publishDraft,
    unpublishPost,
    deletePost,
    subscribe,
  };
}
