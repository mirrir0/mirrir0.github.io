/**
 * panel.tsx — Blog panel.
 *
 * Multi-view blog app using the SDK's in-memory PanelRouter.
 * All data fetching goes through MCP tools (list_posts, get_post, etc.)
 * served by the Vite MCP middleware or the ano-app-server RPC gateway.
 *
 * Routes:
 *   /                → Home (Dither animation)
 *   /about           → About page
 *   /blog            → Blog index (all posts)
 *   /blog/:slug      → Single post (rendered HTML)
 *   /blog/tags       → Tag cloud
 *   /blog/tags/:tag  → Posts by tag
 *   /drafts          → Draft list (create, delete, publish)
 *   /draft/:slug     → Draft editor (Tiptap)
 */

import { useState, useEffect, useCallback, lazy, Suspense, useMemo, useRef } from "react";
import {
  useTheme,
  usePanelInit,
  PanelRouter,
  Routes,
  Route,
  Link,
  usePanelLocation,
} from "@anomalous/sdk/panel";
import type { RouteComponentProps } from "@anomalous/sdk/panel";
import { EditorProvider, useEditorContext } from "../app/components/editor/EditorContext";
import { PDFViewerProvider, usePDFViewer } from "../app/components/pdf-viewer";
import { DraftMenu } from "../app/components/DraftMenu";
import { FaPersonThroughWindow } from "react-icons/fa6";

const Dither = lazy(() => import("../app/components/Dither"));
const TiptapEditor = lazy(() => import("../app/components/editor/TiptapEditor"));
const FrontmatterEditor = lazy(() => import("../app/components/editor/FrontmatterEditor"));
const PDFViewerPanel = lazy(() => import("../app/components/pdf-viewer/PDFViewerPanel").then(m => ({ default: m.PDFViewerPanel })));

// ─── Design tokens ───────────────────────────────────────────────────────────

const CSS = {
  zinc950: "#0f0f0f", zinc900: "#18181b", zinc800: "#27272a",
  zinc700: "#3f3f46", zinc600: "#52525b", zinc500: "#71717a",
  zinc400: "#a1a1aa", zinc300: "#d4d4d8", zinc100: "#f4f4f8",
  emerald400: "#34d399", emerald500: "#10b981", emerald600: "#059669",
  amber400: "#fbbf24", amber500: "#f59e0b",
} as const;

// ─── MCP helpers ─────────────────────────────────────────────────────────────

function getMcpUrl(): string {
  // When proxied through ano-app-server (the producer iframe path),
  // calls go to /api/rpc. When running standalone (direct Vite), /mcp/call.
  return window.location.port === "8789" ? "/api/rpc" : "/mcp/call";
}

async function callMcp(tool: string, args?: Record<string, unknown>) {
  const isProxied = window.location.port === "8789";
  const body = isProxied
    ? { namespace: "mcp", method: tool, params: args ?? {}, appType: "blog" }
    : { tool, arguments: args ?? {} };

  const r = await fetch(getMcpUrl(), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`MCP ${tool}: ${r.status}`);
  const data = (await r.json()) as { content?: Array<{ type: string; text: string }>; isError?: boolean };
  const text = data.content?.[0]?.text ?? "{}";
  if (data.isError) throw new Error(text);
  return JSON.parse(text) as unknown;
}

// ─── Shared types ────────────────────────────────────────────────────────────

interface PostMeta {
  slug: string; title: string; date: string;
  description: string; tags: string[];
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: "100vh",
      background: CSS.zinc950, color: CSS.zinc100,
      fontFamily: "'Inter', system-ui, sans-serif", overflow: "auto",
    }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 50, padding: "8px 16px",
        background: CSS.zinc950, borderBottom: `1px solid ${CSS.zinc800}`,
      }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
        <nav style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "Kapel", color: CSS.emerald400, fontSize: 44 }}>MIRRIR</span>
              <span style={{ color: CSS.zinc500, fontSize: 14 }}>reflecting online</span>
            </Link>
            <FaPersonThroughWindow style={{ color: CSS.emerald400, fontSize: 28 }} />
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
            <Link to="/" style={{ color: CSS.zinc400, fontSize: 14, textDecoration: "none" }}>home</Link>
            <Link to="/about" style={{ color: CSS.zinc400, fontSize: 14, textDecoration: "none" }}>about</Link>
            <Link to="/blog" style={{ color: CSS.zinc400, fontSize: 14, textDecoration: "none" }}>blog</Link>
          </div>
        </nav>
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: "48rem", margin: "0 auto", padding: "32px 16px", width: "100%" }}>
        {children}
      </main>
      <footer style={{ borderTop: `1px solid ${CSS.zinc800}`, background: CSS.zinc950 }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "24px 16px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16 }}>
          <a href="https://github.com/mirrir0" target="_blank" rel="noopener noreferrer" style={{ color: CSS.zinc600 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" style={{ color: CSS.zinc500, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>
            CC BY-SA 4.0
          </a>
        </div>
      </footer>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <div style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: CSS.emerald400, borderRadius: "50%", animation: "blog-spin 0.6s linear infinite" }} />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

// ─── Route components ────────────────────────────────────────────────────────

function HomePage() {
  return (
    <div style={{ padding: "32px 0" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
        <p style={{ color: CSS.zinc400 }}>Staring into the wired, and the wired is looking back very confused.</p>
      </div>
      <div style={{ margin: "0 auto", width: "95%", height: 500, borderRadius: 12, overflow: "hidden", border: `4px solid ${CSS.emerald500}`, background: CSS.zinc900 }}>
        <Suspense fallback={<div style={{ width: "100%", height: 500, background: CSS.zinc900 }} />}>
          <div style={{ width: "100%", height: 500, position: "relative" }}>
            <Dither waveColor={[0.2, 0.7, 0.4]} mouseRadius={0} colorNum={2.5} waveAmplitude={0.45} waveFrequency={5.1} />
          </div>
        </Suspense>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 24, fontFamily: "'JetBrains Mono', monospace", color: CSS.zinc100, marginBottom: 8 }}>about</h1>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", marginTop: 16 }}>
        <div style={{ color: CSS.zinc600, fontSize: 14, marginBottom: 16 }}>
          Last login: {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: CSS.emerald400 }}>$</span> <span style={{ color: CSS.zinc100 }}>whoami</span>
        </div>
        <div style={{ color: CSS.zinc400, marginLeft: 16, marginBottom: 16 }}>
          Welcome! I'm Mirri. I'm a software engineer, founder, and occasional artist.
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: CSS.emerald400 }}>$</span> <span style={{ color: CSS.zinc100 }}>cat about.md</span>
        </div>
        <div style={{ color: CSS.zinc400, marginLeft: 16, marginBottom: 16 }}>
          This is my own little corner of the internet where I write about systems, web development, and the tools I build.
        </div>
        <div style={{ marginTop: 24 }}>
          <span style={{ color: CSS.emerald400 }}>$</span>
          <Link to="/blog" style={{ color: CSS.emerald400, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textDecoration: "underline", marginLeft: 8 }}>
            ls -la ./blog/
          </Link>
        </div>
      </div>
    </div>
  );
}

function BlogList() {
  const [posts, setPosts] = useState<PostMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callMcp("list_posts").then((p) => setPosts(p as PostMeta[])).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div style={{ color: "#FF2D20", padding: 32 }}>{error}</div>;
  if (!posts) return <Loading />;

  return (
    <div style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 24, fontFamily: "'JetBrains Mono', monospace", color: CSS.zinc100, marginBottom: 32 }}>blog</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {posts.map((p) => (
          <article key={p.slug}>
            <Link to={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 16px", marginBottom: 4 }}>
                <time style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{formatDate(p.date)}</time>
                <h2 style={{ color: CSS.zinc100, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, margin: 0 }}>{p.title}</h2>
              </div>
              {p.description && <p style={{ color: CSS.zinc500, fontSize: 14, marginLeft: 88 }}>{p.description}</p>}
            </Link>
            {p.tags?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, marginLeft: 88 }}>
                {p.tags.map((t) => (
                  <Link key={t} to={`/blog/tags/${encodeURIComponent(t.toLowerCase().trim().replace(/\s+/g, "-"))}`}
                    style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", background: CSS.zinc900, color: CSS.zinc500, borderRadius: 5, textDecoration: "none" }}>
                    {t}
                  </Link>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      <footer style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${CSS.zinc800}`, display: "flex", gap: 24 }}>
        <Link to="/" style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textDecoration: "none" }}>&larr; home</Link>
        <Link to="/blog/tags" style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textDecoration: "none" }}>tags</Link>
      </footer>
    </div>
  );
}

function BlogPost({ params }: RouteComponentProps) {
  const { slug } = params;
  const [post, setPost] = useState<{ title: string; date: string; tags: string[]; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    callMcp("get_post", { slug })
      .then((p: unknown) => setPost(p as { title: string; date: string; tags: string[]; content: string }))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loading />;
  if (error || !post) {
    return (
      <div style={{ padding: "32px 0" }}>
        <h1 style={{ fontSize: 24, fontFamily: "'JetBrains Mono', monospace", color: CSS.zinc100 }}>Not Found</h1>
        <Link to="/blog" style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textDecoration: "none", marginTop: 16, display: "block" }}>&larr; back</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 0" }}>
      <article ref={articleRef}>
        <header style={{ marginBottom: 32, paddingBottom: 32, borderBottom: `1px solid ${CSS.zinc800}` }}>
          <time style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{formatDate(post.date)}</time>
          <h1 style={{ fontSize: 28, fontFamily: "'JetBrains Mono', monospace", color: CSS.zinc100, marginTop: 8 }}>{post.title}</h1>
          {post.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {post.tags.map((t) => (
                <Link key={t} to={`/blog/tags/${encodeURIComponent(t.toLowerCase().trim().replace(/\s+/g, "-"))}`}
                  style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", background: CSS.zinc900, color: CSS.zinc500, borderRadius: 5, textDecoration: "none" }}>
                  {t}
                </Link>
              ))}
            </div>
          )}
        </header>
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.content }}
          style={{ color: CSS.zinc300, lineHeight: 1.8, fontFamily: "'Georgia', serif" }} />
      </article>
      <footer style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${CSS.zinc800}` }}>
        <Link to="/blog" style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textDecoration: "none" }}>&larr; back to blog</Link>
      </footer>
    </div>
  );
}

function TagsPage() {
  const [tags, setTags] = useState<Array<{ tag: string; count: number; normalized: string }> | null>(null);

  useEffect(() => {
    callMcp("list_tags").then((t) => setTags(t as Array<{ tag: string; count: number; normalized: string }>)).catch(() => {});
  }, []);

  if (!tags) return <Loading />;

  return (
    <div style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 24, fontFamily: "'JetBrains Mono', monospace", color: CSS.zinc100, marginBottom: 24 }}>tags</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {tags.map((t) => (
          <Link key={t.normalized} to={`/blog/tags/${encodeURIComponent(t.normalized)}`}
            style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", padding: "4px 12px", background: CSS.zinc900, color: CSS.zinc400, borderRadius: 5, textDecoration: "none" }}>
            {t.tag} <span style={{ color: CSS.zinc600 }}>({t.count})</span>
          </Link>
        ))}
      </div>
      <footer style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${CSS.zinc800}` }}>
        <Link to="/blog" style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textDecoration: "none" }}>&larr; back</Link>
      </footer>
    </div>
  );
}

function TagPosts({ params }: RouteComponentProps) {
  const { tag } = params;
  const [posts, setPosts] = useState<PostMeta[] | null>(null);

  useEffect(() => {
    callMcp("get_posts_by_tag", { tag }).then((p) => setPosts(p as PostMeta[])).catch(() => {});
  }, [tag]);

  if (!posts) return <Loading />;

  return (
    <div style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 24, fontFamily: "'JetBrains Mono', monospace", color: CSS.zinc100, marginBottom: 24 }}>tag: {tag}</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {posts.map((p) => (
          <article key={p.slug}>
            <Link to={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 16px", marginBottom: 4 }}>
                <time style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{formatDate(p.date)}</time>
                <h2 style={{ color: CSS.zinc100, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, margin: 0 }}>{p.title}</h2>
              </div>
            </Link>
          </article>
        ))}
      </div>
      <footer style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${CSS.zinc800}` }}>
        <Link to="/blog/tags" style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textDecoration: "none" }}>&larr; tags</Link>
      </footer>
    </div>
  );
}

function DraftsPage({ navigate }: RouteComponentProps) {
  const [drafts, setDrafts] = useState<PostMeta[] | null>(null);
  const [title, setTitle] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    callMcp("list_drafts").then((d) => setDrafts(d as PostMeta[])).catch(() => {});
  }, [refresh]);

  const create = async () => {
    if (!title.trim()) return;
    try {
      const r = await callMcp("create_draft", { title: title.trim() });
      setTitle("");
      setRefresh((x) => x + 1);
      navigate.push(`/draft/${(r as { slug: string }).slug}`);
    } catch {}
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this draft?")) return;
    await callMcp("delete_draft", { slug });
    setRefresh((x) => x + 1);
  };

  const handlePublish = async (slug: string) => {
    if (!confirm("Publish this draft?")) return;
    await callMcp("publish_draft", { slug });
    setRefresh((x) => x + 1);
  };

  if (!drafts) return <Loading />;

  return (
    <div style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 24, fontFamily: "'JetBrains Mono', monospace", color: CSS.zinc100, marginBottom: 24 }}>drafts</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <input
          type="text" placeholder="New draft title..." value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          style={{ flex: 1, padding: "8px 12px", background: CSS.zinc900, border: `1px solid ${CSS.zinc700}`, borderRadius: 5, color: CSS.zinc100, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: "none" }}
        />
        <button onClick={create} style={{ padding: "8px 16px", background: CSS.emerald600, color: CSS.zinc100, borderRadius: 5, border: "none", cursor: "pointer", fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>+ New</button>
      </div>
      {drafts.length === 0 ? (
        <p style={{ color: CSS.zinc500, fontSize: 14 }}>No drafts yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {drafts.map((d) => (
            <article key={d.slug} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link to={`/draft/${d.slug}`} style={{ flex: 1, textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <time style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{formatDate(d.date)}</time>
                  <span style={{ color: CSS.zinc100, fontFamily: "'JetBrains Mono', monospace", fontSize: 16 }}>{d.title}</span>
                </div>
              </Link>
              <button onClick={() => handlePublish(d.slug)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${CSS.emerald500}`, borderRadius: 5, color: CSS.emerald400, cursor: "pointer", fontSize: 12 }}>publish</button>
              <button onClick={() => handleDelete(d.slug)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${CSS.zinc700}`, borderRadius: 5, color: CSS.zinc500, cursor: "pointer", fontSize: 12 }}>delete</button>
            </article>
          ))}
        </div>
      )}
      <footer style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${CSS.zinc800}`, display: "flex", gap: 24 }}>
        <Link to="/" style={{ color: CSS.zinc600, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textDecoration: "none" }}>&larr; home</Link>
      </footer>
    </div>
  );
}

function DraftEditor({ params, navigate }: RouteComponentProps) {
  const { slug } = params;
  const [draft, setDraft] = useState<{ title: string; description: string; tags: string[]; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [title, setTitleState] = useState("");
  const [description, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    callMcp("get_draft", { slug })
      .then((d: unknown) => {
        const dd = d as { title: string; description: string; tags: string[]; content: string };
        setDraft(dd); setContent(dd.content); setTitleState(dd.title); setDesc(dd.description || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const save = async () => {
    setSaving(true);
    await callMcp("save_draft", { slug, title, description, content, tags: [] });
    setSaving(false);
  };

  if (loading) return <Loading />;
  if (!draft) return <div style={{ padding: 32, color: "#FF2D20" }}>Draft not found</div>;

  return (
    <div style={{ padding: "32px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate.push("/drafts")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${CSS.zinc700}`, borderRadius: 5, color: CSS.zinc400, cursor: "pointer", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>&larr; drafts</button>
        <input value={title} onChange={(e) => setTitleState(e.target.value)} style={{ flex: 1, padding: "6px 12px", background: CSS.zinc900, border: `1px solid ${CSS.zinc700}`, borderRadius: 5, color: CSS.zinc100, fontSize: 16, fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
        <button onClick={save} disabled={saving} style={{ padding: "6px 16px", background: CSS.emerald600, color: CSS.zinc100, borderRadius: 5, border: "none", cursor: saving ? "default" : "pointer", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", opacity: saving ? 0.6 : 1 }}>{saving ? "saving..." : "Save"}</button>
      </div>
      <input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="description..."
        style={{ width: "100%", marginBottom: 16, padding: "8px 12px", background: CSS.zinc900, border: `1px solid ${CSS.zinc700}`, borderRadius: 5, color: CSS.zinc400, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" }} />
      <Suspense fallback={<Loading />}>
        <TiptapEditor content={content} onChange={setContent} />
      </Suspense>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export function App() {
  return (
    <PanelRouter initialPath="/">
      <EditorProvider>
        <PDFViewerProvider>
          <Layout>
            <Routes fallback={<div style={{ padding: 32, color: CSS.zinc500 }}>404 — not found</div>}>
              <Route path="/" component={HomePage} />
              <Route path="/about" component={AboutPage} />
              <Route path="/blog" component={BlogList} />
              <Route path="/blog/tags" component={TagsPage} />
              <Route path="/blog/tags/:tag" component={TagPosts} />
              <Route path="/blog/:slug" component={BlogPost} />
              <Route path="/drafts" component={DraftsPage} />
              <Route path="/draft/:slug" component={DraftEditor} />
            </Routes>
          </Layout>
        </PDFViewerProvider>
      </EditorProvider>
      <style>{`
        @keyframes blog-spin { to { transform: rotate(360deg); } }
        .blog-content h1, .blog-content h2, .blog-content h3 {
          font-family: 'JetBrains Mono', monospace; font-weight: normal; color: #f4f4f8;
        }
        .blog-content h1 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 0.75rem; }
        .blog-content h2 { font-size: 1.1rem; margin-top: 1.75rem; margin-bottom: 0.5rem; }
        .blog-content h3 { font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .blog-content p { margin-bottom: 1rem; line-height: 1.8; }
        .blog-content a { color: #34d399; text-decoration: none; }
        .blog-content a:hover { text-decoration: underline; }
        .blog-content pre { background: #18181b; border: 1px solid #27272a; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 1rem 0; }
        .blog-content code { color: #34d399; background: #18181b; padding: 1px 6px; border-radius: 4px; font-size: 0.9em; }
        .blog-content pre code { padding: 0; background: transparent; color: #d4d4d8; }
        .blog-content ul, .blog-content ol { margin-bottom: 1rem; padding-left: 1.5rem; }
        .blog-content li { margin-bottom: 0.25rem; }
        .blog-content blockquote { border-left: 3px solid #3f3f46; padding-left: 1rem; color: #a1a1aa; margin: 1rem 0; }
        .blog-content hr { border-color: #27272a; margin: 2rem 0; }
      `}</style>
    </PanelRouter>
  );
}
