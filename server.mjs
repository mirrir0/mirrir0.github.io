/**
 * blog server — serves the draft API and health check from one process.
 * Called by ano-server's `serve` block.
 */
import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const ROOT = __dirname;
const POSTS_DIR = join(ROOT, "content", "posts");
const DRAFTS_DIR = join(ROOT, "content", "drafts");
const DIST_DIR = join(ROOT, "dist");

let highlighter = null;

// ── Helpers ──────────────────────────────────────────────────────────

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

function readDraftFile(slug) {
  const filePath = join(DRAFTS_DIR, `${slug}.md`);
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

function writeDraftFile(slug, fields) {
  const filePath = join(DRAFTS_DIR, `${slug}.md`);
  const existing = readDraftFile(slug) || {};
  const frontmatter = [
    `title: ${JSON.stringify(fields.title ?? existing.title ?? slug)}`,
    `description: ${JSON.stringify(fields.description ?? existing.description ?? "")}`,
    `date: ${JSON.stringify(fields.date ?? existing.date ?? new Date().toISOString())}`,
  ];
  if ((fields.tags ?? existing.tags)?.length > 0) {
    frontmatter.push(`tags: [${(fields.tags ?? existing.tags).join(", ")}]`);
  }
  const body = fields.content ?? existing.content ?? "";
  writeFileSync(filePath, `---\n${frontmatter.join("\n")}\n---\n\n${body}`);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function error(res, msg, status = 500) {
  json(res, { error: msg }, status);
}

// ── Router ───────────────────────────────────────────────────────────

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const method = req.method;

  // CORS preflight.
  if (method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    res.end();
    return;
  }

  // Health check.
  if (url.pathname === "/health") {
    return json(res, { status: "ok" });
  }

  // ── Drafts API ─────────────────────────────────────────────────────

  // GET /api/drafts — list all drafts
  if (method === "GET" && url.pathname === "/api/drafts") {
    if (!existsSync(DRAFTS_DIR)) return json(res, []);
    const drafts = readdirSync(DRAFTS_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => readMeta(join(DRAFTS_DIR, f)));
    return json(res, drafts);
  }

  // PUT /api/drafts — create a new draft
  if (method === "PUT" && url.pathname === "/api/drafts") {
    const body = await parseBody(req);
    const title = body.title || "Untitled";
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled";
    if (!existsSync(DRAFTS_DIR)) mkdirSync(DRAFTS_DIR, { recursive: true });
    writeDraftFile(slug, { title, date: new Date().toISOString() });
    return json(res, { slug }, 201);
  }

  // GET /api/drafts/:slug — read a single draft
  const draftMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)$/);
  if (draftMatch) {
    const slug = draftMatch[1];
    if (method === "GET") {
      const draft = readDraftFile(slug);
      if (!draft) return error(res, "draft not found", 404);
      return json(res, draft);
    }
    if (method === "POST") {
      const body = await parseBody(req);
      writeDraftFile(slug, body);
      return json(res, { ok: true });
    }
    if (method === "DELETE") {
      const filePath = join(DRAFTS_DIR, `${slug}.md`);
      if (existsSync(filePath)) unlinkSync(filePath);
      return json(res, { ok: true });
    }
  }

  // POST /api/drafts/:slug/publish — move draft to posts
  const publishMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/publish$/);
  if (publishMatch && method === "POST") {
    const slug = publishMatch[1];
    const src = join(DRAFTS_DIR, `${slug}.md`);
    const dest = join(POSTS_DIR, `${slug}.md`);
    if (!existsSync(src)) return error(res, "draft not found", 404);
    if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
    renameSync(src, dest);
    return json(res, { ok: true, slug });
  }

  // POST /api/posts/:slug/unpublish — move post back to drafts
  const unpubMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/unpublish$/);
  if (unpubMatch && method === "POST") {
    const slug = unpubMatch[1];
    const src = join(POSTS_DIR, `${slug}.md`);
    const dest = join(DRAFTS_DIR, `${slug}.md`);
    if (!existsSync(src)) return error(res, "post not found", 404);
    if (!existsSync(DRAFTS_DIR)) mkdirSync(DRAFTS_DIR, { recursive: true });
    renameSync(src, dest);
    return json(res, { ok: true, slug });
  }

  // DELETE /api/posts/:slug — delete a published post
  const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (postMatch && method === "DELETE") {
    const slug = postMatch[1];
    const filePath = join(POSTS_DIR, `${slug}.md`);
    if (existsSync(filePath)) unlinkSync(filePath);
    return json(res, { ok: true });
  }

  // POST /api/drafts/:slug/rename — rename a draft
  const renameMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/rename$/);
  if (renameMatch && method === "POST") {
    const oldSlug = renameMatch[1];
    const body = await parseBody(req);
    const newSlug = body.newSlug;
    if (!newSlug) return error(res, "newSlug required", 400);
    const src = join(DRAFTS_DIR, `${oldSlug}.md`);
    const dest = join(DRAFTS_DIR, `${newSlug}.md`);
    if (!existsSync(src)) return error(res, "draft not found", 404);
    renameSync(src, dest);
    return json(res, { ok: true, slug: newSlug });
  }

  // ── MCP JSON-RPC ───────────────────────────────────────────────────
  if (method === "POST" && url.pathname.startsWith("/mcp")) {
    const body = await parseBody(req);
    if (body.method === "initialize") {
      return json(res, { jsonrpc: "2.0", id: body.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "blog", version: "1.0.0" } } });
    }
    if (body.method === "tools/list") {
      return json(res, { jsonrpc: "2.0", id: body.id, result: { tools: [
        { name: "list_drafts", description: "List all drafts" },
        { name: "get_draft", description: "Get a single draft by slug", inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
        { name: "publish_draft", description: "Publish a draft", inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
      ] } });
    }
    if (body.method === "tools/call") {
      const { name, arguments: args } = body.params || {};
      if (name === "list_drafts") {
        const drafts = existsSync(DRAFTS_DIR) ? readdirSync(DRAFTS_DIR).filter(f => f.endsWith(".md")).map(f => readMeta(join(DRAFTS_DIR, f))) : [];
        return json(res, { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify(drafts) }] } });
      }
      if (name === "get_draft" && args?.slug) {
        const draft = readDraftFile(args.slug);
        return json(res, { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify(draft) }] } });
      }
      if (name === "publish_draft" && args?.slug) {
        const src = join(DRAFTS_DIR, `${args.slug}.md`);
        const dest = join(POSTS_DIR, `${args.slug}.md`);
        if (!existsSync(src)) return json(res, { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify({ error: "draft not found" }) }] } });
        if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
        renameSync(src, dest);
        return json(res, { jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify({ ok: true, slug: args.slug }) }] } });
      }
    }
    return json(res, { jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "method not found" } });
  }

  // ── Static files from dist/ (fallback for index.html, assets, etc.) ─
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = filePath.split("?")[0];
  const fullPath = join(DIST_DIR, filePath);
  if (existsSync(fullPath)) {
    const ext = extname(fullPath).toLowerCase();
    const mimeMap = { ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };
    res.writeHead(200, { "Content-Type": mimeMap[ext] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
    res.end(readFileSync(fullPath));
    return;
  }

  error(res, "not found", 404);
}

// ── Start ────────────────────────────────────────────────────────────

if (!existsSync(DRAFTS_DIR)) mkdirSync(DRAFTS_DIR, { recursive: true });

const port = parseInt(process.env.PORT || "2998", 10);
createServer(handle).listen(port, () => {
  console.log(`blog server on :${port}`);
});
