/**
 * blog-mcp.mts — registers the blog's MCP App tools + UI resource on an
 * McpServer. Shared by both transports (server.ts = stdio for Claude Desktop,
 * server.http.ts = HTTP for the ext-apps basic-host), so the tool surface and
 * UI-intent envelopes are defined exactly once.
 */
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { readFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Draft, DraftStore } from "./draft-store.mjs";

export const RESOURCE_URI = "ui://blog/app.html";

// ── UI intent envelope ───────────────────────────────────────────────
// Returned as structuredContent from every tool. The panel maps view ->
// router navigation; a `draft` payload is pushed into the open editor. The
// nonce lets the editor mark an external push as already-saved so autosave
// does not echo it back.
let intentSeq = 0;
// Mirrors the BlogEdit union in app/components/editor/suggestions/apply-edit.ts.
// Duplicated deliberately to keep the Node server free of any editor/tiptap
// import — this is the wire contract between the two, stated on each side.
type BlogEdit =
  | { op: "replace"; find: string; replace: string }
  | { op: "delete"; find: string }
  | { op: "insert"; after?: string; text: string }
  | { op: "append"; text: string };
type BlogIntent = {
  v: 1;
  view: "drafts" | "draft" | "post" | "blog";
  slug?: string;
  draft?: Draft | null;
  edit?: BlogEdit | null;
  nonce: number;
};
function intent(view: BlogIntent["view"], extra: Omit<Partial<BlogIntent>, "v" | "view" | "nonce"> = {}): BlogIntent {
  return { v: 1, view, nonce: ++intentSeq, ...extra };
}

function result(payload: unknown, structured: BlogIntent) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    structuredContent: structured as unknown as Record<string, unknown>,
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

/**
 * Register the UI resource (the single-file panel build) and every lifecycle
 * tool on `server`.
 * @param resourceHtmlPath absolute path to dist-mcp/mcp-app.html
 */
export function registerBlog(server: McpServer, store: DraftStore, resourceHtmlPath: string): void {
  const ui = { ui: { resourceUri: RESOURCE_URI } };

  registerAppResource(
    server,
    "blog-app",
    RESOURCE_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      // No external origins: fonts inline and callServerTool is postMessage.
      _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } } },
    },
    async () => ({
      contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: readFileSync(resourceHtmlPath, "utf-8") }],
    }),
  );

  registerAppTool(
    server,
    "list_drafts",
    { title: "List drafts", description: "List all draft posts.", inputSchema: {}, _meta: ui },
    async () => result(store.listDrafts(), intent("drafts")),
  );

  registerAppTool(
    server,
    "get_draft",
    { title: "Get draft", description: "Open a draft by slug and show it in the editor.", inputSchema: { slug: z.string() }, _meta: ui },
    async ({ slug }) => {
      const draft = store.readDraft(slug);
      if (!draft) return errorResult("draft not found");
      return result(draft, intent("draft", { slug, draft }));
    },
  );

  registerAppTool(
    server,
    "create_draft",
    { title: "Create draft", description: "Create a new draft with the given title and open it in the editor.", inputSchema: { title: z.string() }, _meta: ui },
    async ({ title }) => {
      const { slug } = store.createDraft({ title });
      const draft = store.readDraft(slug);
      return result({ slug }, intent("draft", { slug, draft }));
    },
  );

  registerAppTool(
    server,
    "update_draft",
    {
      title: "Update draft",
      description: "Write title/description/date/tags/markdown content to a draft. The editor updates live.",
      inputSchema: {
        slug: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        date: z.string().optional(),
        tags: z.array(z.string()).optional(),
        content: z.string().optional(),
      },
      _meta: ui,
    },
    async ({ slug, ...fields }) => {
      store.writeDraft(slug, fields);
      const draft = store.readDraft(slug);
      return result(draft, intent("draft", { slug, draft }));
    },
  );

  // ── Surgical edit tools ───────────────────────────────────────────────
  // Unlike update_draft (a full-content write), these propose a *reviewable*
  // change: the tool returns an `edit` intent and does NOT touch the file. The
  // panel applies it as a pending suggestion the human accepts/rejects; the file
  // is persisted by the editor's autosave only once the review is resolved. The
  // server validates the anchor text against the current draft for fast feedback.
  const editResult = (slug: string, edit: BlogEdit) =>
    result({ ok: true, edit }, intent("draft", { slug, edit }));

  const requireText = (slug: string, needle: string): string | null => {
    const draft = store.readDraft(slug);
    if (!draft) return "draft not found";
    if (!draft.content.includes(needle)) return `text not found in draft: "${needle.slice(0, 40)}"`;
    return null;
  };

  registerAppTool(
    server,
    "replace_text",
    {
      title: "Replace text",
      description:
        "Propose replacing an exact run of text in the draft with new text. Shows a word-level suggestion (old struck through, new highlighted) for the human to accept or reject. `find` must be an exact, unique phrase within a single paragraph.",
      inputSchema: { slug: z.string(), find: z.string(), replace: z.string() },
      _meta: ui,
    },
    async ({ slug, find, replace }) => {
      const err = requireText(slug, find);
      if (err) return errorResult(err);
      return editResult(slug, { op: "replace", find, replace });
    },
  );

  registerAppTool(
    server,
    "delete_text",
    {
      title: "Delete text",
      description:
        "Propose deleting an exact run of text from the draft. Shows the text struck through for the human to accept or reject. `find` must be an exact phrase within a single paragraph.",
      inputSchema: { slug: z.string(), find: z.string() },
      _meta: ui,
    },
    async ({ slug, find }) => {
      const err = requireText(slug, find);
      if (err) return errorResult(err);
      return editResult(slug, { op: "delete", find });
    },
  );

  registerAppTool(
    server,
    "insert_text",
    {
      title: "Insert text",
      description:
        "Propose inserting new inline text. With `after`, it is inserted right after that exact anchor phrase; without `after`, at the end of the document. Shown highlighted for accept/reject.",
      inputSchema: { slug: z.string(), text: z.string(), after: z.string().optional() },
      _meta: ui,
    },
    async ({ slug, text, after }) => {
      if (after) {
        const err = requireText(slug, after);
        if (err) return errorResult(err);
      }
      return editResult(slug, { op: "insert", text, after });
    },
  );

  registerAppTool(
    server,
    "append_text",
    {
      title: "Append paragraph",
      description: "Propose appending a new paragraph to the end of the draft. Shown highlighted for accept/reject.",
      inputSchema: { slug: z.string(), text: z.string() },
      _meta: ui,
    },
    async ({ slug, text }) => editResult(slug, { op: "append", text }),
  );

  registerAppTool(
    server,
    "rename_draft",
    { title: "Rename draft", description: "Change a draft's slug.", inputSchema: { slug: z.string(), newSlug: z.string() }, _meta: ui },
    async ({ slug, newSlug }) => {
      try {
        store.renameDraft(slug, newSlug);
      } catch (e) {
        return errorResult((e as Error).message);
      }
      const draft = store.readDraft(newSlug);
      return result({ ok: true, slug: newSlug }, intent("draft", { slug: newSlug, draft }));
    },
  );

  registerAppTool(
    server,
    "publish_draft",
    { title: "Publish draft", description: "Publish a draft (move it to posts) and show the published post.", inputSchema: { slug: z.string() }, _meta: ui },
    async ({ slug }) => {
      try {
        store.publishDraft(slug);
      } catch (e) {
        return errorResult((e as Error).message);
      }
      return result({ ok: true, slug }, intent("post", { slug }));
    },
  );

  registerAppTool(
    server,
    "unpublish_post",
    { title: "Unpublish post", description: "Move a published post back to drafts and open it in the editor.", inputSchema: { slug: z.string() }, _meta: ui },
    async ({ slug }) => {
      try {
        store.unpublishPost(slug);
      } catch (e) {
        return errorResult((e as Error).message);
      }
      const draft = store.readDraft(slug);
      return result({ ok: true, slug }, intent("draft", { slug, draft }));
    },
  );

  registerAppTool(
    server,
    "delete_draft",
    { title: "Delete draft", description: "Delete a draft and return to the drafts list.", inputSchema: { slug: z.string() }, _meta: ui },
    async ({ slug }) => {
      store.deleteDraft(slug);
      return result({ ok: true }, intent("drafts"));
    },
  );

  registerAppTool(
    server,
    "delete_post",
    { title: "Delete post", description: "Delete a published post and return to the blog index.", inputSchema: { slug: z.string() }, _meta: ui },
    async ({ slug }) => {
      store.deletePost(slug);
      return result({ ok: true }, intent("blog"));
    },
  );
}
