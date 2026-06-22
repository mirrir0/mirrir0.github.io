/**
 * blog-client — one lifecycle API for every runtime context.
 *
 * Standalone / ano: HTTP to server.http.ts (callApi). MCP App: app.callServerTool to
 * the stdio server (server.ts). The transport is chosen at build time via the
 * __BLOG_MCP__ define, so the unused branch (and its imports) is dead-code-
 * eliminated. Each method returns the same shape callApi returned historically,
 * so draft-routes is transport-agnostic.
 */
import { callApi } from "./api-helpers";
import { requireApp } from "./mcp/app-singleton";

export interface DraftFields {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
  content?: string;
}

const TOOL = {
  listDrafts: "list_drafts",
  getDraft: "get_draft",
  createDraft: "create_draft",
  updateDraft: "update_draft",
  renameDraft: "rename_draft",
  publishDraft: "publish_draft",
  unpublishPost: "unpublish_post",
  deleteDraft: "delete_draft",
  deletePost: "delete_post",
} as const;

/** MCP transport: call a server tool and return its text payload parsed as JSON
 *  (matches the HTTP response shape). */
async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const app = await requireApp();
  const r = await app.callServerTool({ name, arguments: args });
  const text = r.content?.find((c) => c.type === "text")?.text;
  return text ? JSON.parse(text) : null;
}

export const blogClient = {
  listDrafts: (): Promise<unknown> =>
    __BLOG_MCP__ ? callTool(TOOL.listDrafts, {}) : callApi("/api/drafts"),

  getDraft: (slug: string): Promise<unknown> =>
    __BLOG_MCP__ ? callTool(TOOL.getDraft, { slug }) : callApi(`/api/drafts/${slug}`),

  createDraft: (title: string): Promise<unknown> =>
    __BLOG_MCP__ ? callTool(TOOL.createDraft, { title }) : callApi("/api/drafts", { method: "PUT", body: { title } }),

  updateDraft: (slug: string, fields: DraftFields): Promise<unknown> =>
    __BLOG_MCP__ ? callTool(TOOL.updateDraft, { slug, ...fields }) : callApi(`/api/drafts/${slug}`, { method: "POST", body: fields }),

  renameDraft: (slug: string, newSlug: string): Promise<unknown> =>
    __BLOG_MCP__ ? callTool(TOOL.renameDraft, { slug, newSlug }) : callApi(`/api/drafts/${slug}/rename`, { method: "POST", body: { newSlug } }),

  publishDraft: (slug: string): Promise<unknown> =>
    __BLOG_MCP__ ? callTool(TOOL.publishDraft, { slug }) : callApi(`/api/drafts/${slug}/publish`, { method: "POST" }),

  unpublishPost: (slug: string): Promise<unknown> =>
    __BLOG_MCP__ ? callTool(TOOL.unpublishPost, { slug }) : callApi(`/api/posts/${slug}/unpublish`, { method: "POST" }),

  deleteDraft: (slug: string): Promise<unknown> =>
    __BLOG_MCP__ ? callTool(TOOL.deleteDraft, { slug }) : callApi(`/api/drafts/${slug}`, { method: "DELETE" }),

  deletePost: (slug: string): Promise<unknown> =>
    __BLOG_MCP__ ? callTool(TOOL.deletePost, { slug }) : callApi(`/api/posts/${slug}`, { method: "DELETE" }),
};
