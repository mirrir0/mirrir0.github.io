/**
 * server.http.ts — the blog's single serve process.
 *
 * Serves three concerns from one port (run by ano-server's `serve` block):
 *   1. The panel SPA (static files from dist/, with / -> index.html) plus the
 *      draft REST API and an SSE change stream — the transport the panel iframe
 *      uses when running standalone / inside the ano workspace (not as an MCP App).
 *   2. The Streamable-HTTP MCP endpoint at /mcp — the real @modelcontextprotocol
 *      transport, so the ext-apps host (browser) and the federation bridge can
 *      connect, list the full tool surface, and render the panel as an MCP App.
 *   3. The ext-apps harness (/host) and the panel UI resource (/panel) for the
 *      standalone live demo.
 *
 * All draft/post mutations go through the shared draft-store, so this HTTP
 * transport and the stdio MCP server (server.ts) stay in lockstep. The /mcp
 * server is stateless: each request gets a fresh McpServer + transport.
 * Run with: tsx server.http.ts  (PORT defaults to 3001)
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createDraftStore } from "./draft-store.mjs";
import type { DraftFields } from "./draft-store.mjs";
import { registerBlog } from "./blog-mcp.mjs";

type Req = import("node:http").IncomingMessage;
type Res = import("node:http").ServerResponse;

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTENT = process.env.BLOG_CONTENT_DIR || join(ROOT, "content");
const DIST_DIR = join(ROOT, "dist");
const DRAFTS_DIR = join(CONTENT, "drafts");
const RESOURCE = join(ROOT, "dist-mcp", "mcp-app.html");
const store = createDraftStore({ draftsDir: DRAFTS_DIR, postsDir: join(CONTENT, "posts") });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, mcp-protocol-version, last-event-id",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const MIME: Record<string, string> = {
  ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
};

function readBody(req: Req): Promise<unknown> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve(undefined); } });
  });
}

function json(res: Res, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function errorJson(res: Res, msg: string, status = 500) {
  json(res, { error: msg }, status);
}

// The harness host page (/host) and the panel resource (/panel), so the live
// ext-apps demo runs from this one process. Built by vite.config.host.ts /
// vite.config.mcp.ts.
function serveHtml(res: Res, path: string) {
  if (!existsSync(path)) { res.writeHead(404); res.end(`build missing: ${path}`); return; }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(readFileSync(path));
}

// ── Draft REST API + SSE ─────────────────────────────────────────────
// The panel's standalone/ano transport (blog-client.ts callApi). Mirrors the
// MCP tool surface; both write through the same store so they stay in lockstep.
// Returns true if the request matched an /api/* route, false to fall through.
async function handleApi(req: Req, res: Res, url: URL, method: string): Promise<boolean> {
  // SSE change stream — lets an open panel refetch when a draft is mutated
  // out-of-band (e.g. by an agent on the MCP transport). Held open until the
  // client disconnects.
  if (method === "GET" && url.pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(": connected\n\n");
    const unsubscribe = store.subscribe((type, slug) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify({ slug })}\n\n`);
    });
    req.on("close", unsubscribe);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/drafts") {
    json(res, store.listDrafts());
    return true;
  }
  if (method === "PUT" && url.pathname === "/api/drafts") {
    const body = ((await readBody(req)) ?? {}) as { title?: string };
    json(res, store.createDraft({ title: body.title }), 201);
    return true;
  }

  // GET/POST/DELETE /api/drafts/:slug — read / update / delete a single draft
  const draftMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)$/);
  if (draftMatch) {
    const slug = draftMatch[1];
    if (method === "GET") {
      const draft = store.readDraft(slug);
      if (!draft) { errorJson(res, "draft not found", 404); return true; }
      json(res, draft);
      return true;
    }
    if (method === "POST") {
      const body = ((await readBody(req)) ?? {}) as DraftFields;
      store.writeDraft(slug, body);
      json(res, { ok: true });
      return true;
    }
    if (method === "DELETE") {
      json(res, store.deleteDraft(slug));
      return true;
    }
  }

  // POST /api/drafts/:slug/publish — move draft to posts
  const publishMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/publish$/);
  if (publishMatch && method === "POST") {
    try { json(res, store.publishDraft(publishMatch[1])); }
    catch (e) { errorJson(res, (e as Error).message, 404); }
    return true;
  }

  // POST /api/posts/:slug/unpublish — move post back to drafts
  const unpubMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/unpublish$/);
  if (unpubMatch && method === "POST") {
    try { json(res, store.unpublishPost(unpubMatch[1])); }
    catch (e) { errorJson(res, (e as Error).message, 404); }
    return true;
  }

  // DELETE /api/posts/:slug — delete a published post
  const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (postMatch && method === "DELETE") {
    json(res, store.deletePost(postMatch[1]));
    return true;
  }

  // POST /api/drafts/:slug/rename — rename a draft
  const renameMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/rename$/);
  if (renameMatch && method === "POST") {
    const body = ((await readBody(req)) ?? {}) as { newSlug?: string };
    if (!body.newSlug) { errorJson(res, "newSlug required", 400); return true; }
    try { json(res, store.renameDraft(renameMatch[1], body.newSlug)); }
    catch (e) { errorJson(res, (e as Error).message, 404); }
    return true;
  }

  return false;
}

const httpServer = createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
  const url = new URL(req.url ?? "/", "http://localhost");
  const method = req.method ?? "GET";

  if (url.pathname === "/health") { res.writeHead(200, CORS); res.end("ok"); return; }
  if (url.pathname === "/host") return serveHtml(res, join(ROOT, "dist-host", "mcp-host.html"));
  if (url.pathname === "/panel") return serveHtml(res, RESOURCE);

  // ── Streamable-HTTP MCP endpoint ───────────────────────────────────
  // Stateless: a fresh server + transport per request.
  if (url.pathname === "/mcp") {
    for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
    const server = new McpServer({ name: "blog", version: "1.0.0" });
    registerBlog(server, store, RESOURCE);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, method === "POST" ? await readBody(req) : undefined);
    return;
  }

  if (await handleApi(req, res, url, method)) return;

  // MCP App resource: the Anomalous host resolves ui://blog/app.html to
  // /api/v1/apps/blog/s/app.html — serve the single-file MCP build.
  if (url.pathname === "/app.html") return serveHtml(res, RESOURCE);

  // ── Static files from dist/ (panel SPA: index.html, assets, fonts) ──
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = filePath.split("?")[0];
  const fullPath = join(DIST_DIR, filePath);
  if (existsSync(fullPath)) {
    const ext = extname(fullPath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
    res.end(readFileSync(fullPath));
    return;
  }

  res.writeHead(404, CORS);
  res.end("not found");
});

if (!existsSync(DRAFTS_DIR)) mkdirSync(DRAFTS_DIR, { recursive: true });

const port = parseInt(process.env.PORT || "3001", 10);
httpServer.listen(port, () => console.log(`blog server (http + mcp) on :${port}`));
