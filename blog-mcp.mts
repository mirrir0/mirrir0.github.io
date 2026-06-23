/**
 * blog-mcp.mts — registers the blog's MCP App tools + UI resource on an
 * McpServer. Shared by both transports (server.ts = stdio for Claude Desktop,
 * server.http.ts = HTTP for the ext-apps basic-host), so the tool surface and
 * UI-intent envelopes are defined exactly once.
 *
 * Every tool's structuredContent now includes a `tool` discriminator field so
 * the compact MCP app views (src/mcp-app.tsx) know which card to render.
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
// Returned as structuredContent from every tool. The MCP app router
// dispatches on `tool`; the full blog SPA uses `view`/`draft`/`edit`.
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
  /** MCP tool name — the MCP app router uses this to pick the right view card. */
  tool: string;
  view: "drafts" | "draft" | "post" | "blog";
  slug?: string;
  draft?: Draft | null;
  edit?: BlogEdit | null;
  nonce: number;
};
function intent(tool: string, view: BlogIntent["view"], extra: Omit<Partial<BlogIntent>, "v" | "tool" | "view" | "nonce"> = {}): BlogIntent {
  return { v: 1, tool, view, nonce: ++intentSeq, ...extra };
}

function result(tool: string, payload: unknown, structured: BlogIntent) {
  // Unpack payload into structuredContent so compact MCP views (mcp-app.tsx)
  // can read data directly. Arrays → `drafts`; objects → spread; primitives →
  // `value`. Intent fields override same-named payload fields; `tool` always wins.
  const extra: Record<string, unknown> =
    Array.isArray(payload) ? { drafts: payload }
    : (payload != null && typeof payload === "object" ? payload as Record<string, unknown>
    : { value: payload });
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    structuredContent: { ...extra, ...structured, tool } as unknown as Record<string, unknown>,
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
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: readFileSync(resourceHtmlPath, "utf-8") }],
    }),
  );

  registerAppTool(
    server,
    "list_drafts",
    { title: "List drafts", description: "List all draft posts.", inputSchema: {}, _meta: ui },
    async () => result("list_drafts", store.listDrafts(), intent("list_drafts", "drafts")),
  );

  registerAppTool(
    server,
    "get_draft",
    { title: "Get draft", description: "Open a draft by slug and show it in the editor.", inputSchema: { slug: z.string() }, _meta: ui },
    async ({ slug }) => {
      const draft = store.readDraft(slug);
      if (!draft) return errorResult("draft not found");
      return result("get_draft", draft, intent("get_draft", "draft", { slug, draft }));
    },
  );

  registerAppTool(
    server,
    "create_draft",
    { title: "Create draft", description: "Create a new draft with the given title and open it in the editor.", inputSchema: { title: z.string() }, _meta: ui },
    async ({ title }) => {
      const { slug } = store.createDraft({ title });
      const draft = store.readDraft(slug);
      return result("create_draft", { slug, title, date: draft!.date }, intent("create_draft", "draft", { slug, draft }));
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
      return result("update_draft", draft, intent("update_draft", "draft", { slug, draft }));
    },
  );

  // ── Surgical edit tools ───────────────────────────────────────────────
  const editResult = (tool: string, slug: string, edit: BlogEdit) =>
    result(tool, { ok: true, edit }, intent(tool, "draft", { slug, edit }));

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
        "Propose replacing an exact run of text in the draft with new text. Shows a word-level suggestion (old struck through, new highlighted) for the human to accept or reject.",
      inputSchema: { slug: z.string(), find: z.string(), replace: z.string() },
      _meta: ui,
    },
    async ({ slug, find, replace }) => {
      const err = requireText(slug, find);
      if (err) return errorResult(err);
      return editResult("replace_text", slug, { op: "replace", find, replace });
    },
  );

  registerAppTool(
    server,
    "delete_text",
    {
      title: "Delete text",
      description: "Propose deleting an exact run of text from the draft. Shows the text struck through for the human to accept or reject.",
      inputSchema: { slug: z.string(), find: z.string() },
      _meta: ui,
    },
    async ({ slug, find }) => {
      const err = requireText(slug, find);
      if (err) return errorResult(err);
      return editResult("delete_text", slug, { op: "delete", find });
    },
  );

  registerAppTool(
    server,
    "insert_text",
    {
      title: "Insert text",
      description: "Propose inserting new inline text. Shown highlighted for accept/reject.",
      inputSchema: { slug: z.string(), text: z.string(), after: z.string().optional() },
      _meta: ui,
    },
    async ({ slug, text, after }) => {
      if (after) {
        const err = requireText(slug, after);
        if (err) return errorResult(err);
      }
      return editResult("insert_text", slug, { op: "insert", text, after });
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
    async ({ slug, text }) => editResult("append_text", slug, { op: "append", text }),
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
      return result("rename_draft", { ok: true, slug: newSlug }, intent("rename_draft", "draft", { slug: newSlug, draft }));
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
      return result("publish_draft", { ok: true, slug }, intent("publish_draft", "post", { slug }));
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
      return result("unpublish_post", { ok: true, slug, title: draft?.title }, intent("unpublish_post", "draft", { slug, draft }));
    },
  );

  registerAppTool(
    server,
    "delete_draft",
    { title: "Delete draft", description: "Delete a draft and return to the drafts list.", inputSchema: { slug: z.string() }, _meta: ui },
    async ({ slug }) => {
      store.deleteDraft(slug);
      return result("delete_draft", { ok: true, slug }, intent("delete_draft", "drafts"));
    },
  );

  registerAppTool(
    server,
    "delete_post",
    { title: "Delete post", description: "Delete a published post and return to the blog index.", inputSchema: { slug: z.string() }, _meta: ui },
    async ({ slug }) => {
      store.deletePost(slug);
      return result("delete_post", { ok: true, slug }, intent("delete_post", "blog"));
    },
  );
}
