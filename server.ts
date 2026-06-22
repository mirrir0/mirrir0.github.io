/**
 * server.ts — stdio MCP App server for the blog (Claude Desktop).
 *
 * Exposes the full draft lifecycle as model-visible MCP tools and serves the
 * single-file panel build (dist-mcp/mcp-app.html) as the UI resource, so an
 * agent can draft/edit/publish AND drive the rendered panel. The tool surface
 * lives in blog-mcp.mts (shared with the HTTP transport, server.http.ts).
 *
 * Run with: tsx server.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createDraftStore } from "./draft-store.mjs";
import { registerBlog } from "./blog-mcp.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
// BLOG_CONTENT_DIR overrides the content root (used by tests so they don't
// mutate the real drafts). Defaults to the repo's content/.
const CONTENT = process.env.BLOG_CONTENT_DIR || join(ROOT, "content");
const store = createDraftStore({ draftsDir: join(CONTENT, "drafts"), postsDir: join(CONTENT, "posts") });

const server = new McpServer({ name: "blog", version: "1.0.0" });
registerBlog(server, store, join(ROOT, "dist-mcp", "mcp-app.html"));

await server.connect(new StdioServerTransport());
