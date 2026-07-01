/**
 * panel.tsx — Blog panel.
 *
 * Multi-view blog app. Content is baked at build time (content-data.ts) — no
 * runtime API calls for published posts.
 *
 * The draft editor (/drafts, /draft/:slug) is gated by __BLOG_EDITOR__, a
 * build-time define that is true wherever a backend exists (dev server, ano
 * build, MCP build) and false for the public GitHub Pages build — so the editor
 * + tiptap chunk are dead-code-eliminated from the public bundle. __BLOG_MCP__
 * additionally strips the heavy Dither (three.js) from the single-file MCP build.
 */

import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from "react";
import { Link, Outlet, useParams, useNavigate, useLocation, type RouteObject } from "react-router";
import { EditorProvider, useEditorContext } from "../app/components/editor/EditorContext";
import { PDFViewerProvider } from "../app/components/pdf-viewer";
import { VimStatusline } from "./components/VimStatusline";
import { useConfirm } from "./components/useConfirm";
import { bakedPosts, type BakedPost } from "./content-data";
import { blogClient } from "./blog-client";
import { FaPersonThroughWindow } from "react-icons/fa6";

// Homepage background animation — excluded from the MCP single-file build.
const Dither = __BLOG_MCP__ ? null : lazy(() => import("../app/components/Dither"));

// Draft editor routes. The import() is unreachable (DCE'd) when __BLOG_EDITOR__
// is statically false (GitHub Pages), keeping tiptap out of the public bundle.
const DraftsPage = __BLOG_EDITOR__
  ? lazy(() => import("./draft-routes").then(m => ({ default: m.DraftsPage })))
  : null;
const DraftEditor = __BLOG_EDITOR__
  ? lazy(() => import("./draft-routes").then(m => ({ default: m.DraftEditor })))
  : null;

// ─── Baked content helpers ───────────────────────────────────────────────────

const posts = bakedPosts;

/** Synchronous post metadata (without HTML body) for list views. */
function getMetas(): Array<{ slug: string; title: string; date: string; description: string; tags: string[] }> {
  return posts.map(({ content: _, ...meta }) => meta);
}

/** Synchronous tag cloud from baked data. */
function getTags(): Array<{ tag: string; count: number; normalized: string }> {
  const tagMap = new Map<string, { original: string; count: number }>();
  for (const p of posts) {
    for (const t of p.tags) {
      const n = t.toLowerCase().trim().replace(/\s+/g, "-");
      const existing = tagMap.get(n);
      if (existing) { existing.count++; } else { tagMap.set(n, { original: t, count: 1 }); }
    }
  }
  return [...tagMap.entries()].map(([n, { original, count }]) => ({ tag: original, count, normalized: n }))
    .sort((a, b) => b.count - a.count);
}

/** Synchronous tag filter from baked data. */
function getPostsByTag(tag: string): Array<{ slug: string; title: string; date: string; description: string; tags: string[] }> {
  const norm = tag.toLowerCase().trim().replace(/\s+/g, "-");
  return posts
    .filter(p => p.tags.some(t => t.toLowerCase().trim().replace(/\s+/g, "-") === norm))
    .map(({ content: _, ...meta }) => meta);
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function BlogLayout({ children }: { children: ReactNode }) {
  const editorEnabled = __BLOG_EDITOR__;
  const location = useLocation();
  const isBlogPost = location.pathname.startsWith("/blog/") && location.pathname !== "/blog/";
  const isDraftEditor = location.pathname.startsWith("/draft/");
  const showStatusline = isBlogPost || isDraftEditor;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className={showStatusline ? "sticky top-0 z-50 pt-2 md:pt-3 bg-background" : "sticky top-0 z-50 py-2 md:py-3 bg-background"}>
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <nav className="font-mono">
            <div className="flex items-center justify-between">
              <Link to="/" className="hover:opacity-80 transition-opacity flex items-baseline gap-2 no-underline">
                <span style={{ fontFamily: "Kapel" }} className="text-emerald-400 text-5xl">MIRRIR</span>
                <span className="text-muted-foreground text-sm font-mono">reflecting online</span>
              </Link>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <FaPersonThroughWindow className="text-emerald-400 text-3xl" />
              </div>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors text-sm no-underline">home</Link>
              <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors text-sm no-underline">about</Link>
              <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors text-sm no-underline">blog</Link>
              {editorEnabled && <Link to="/drafts" className="text-muted-foreground hover:text-foreground transition-colors text-sm no-underline">drafts</Link>}
            </div>
          </nav>
          {showStatusline && (
            <div className="mt-2">
              <VimStatusline />
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 px-1">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          {children}
        </div>
      </main>
      <footer className="mt-16 border-t border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 md:px-6 flex items-center justify-end gap-4 py-6">
          <a href="https://github.com/mirrir0" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-card-foreground transition-colors" aria-label="GitHub">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground text-xs font-mono hover:text-card-foreground transition-colors no-underline">
            CC BY-SA 4.0
          </a>
        </div>
      </footer>
    </div>
  );
}

// ── Theme toggle (standalone mode) ─────────────────────────────────────────
// Sets MCP-standard CSS custom properties so the @theme inline
// block's var() chain resolves to the correct light/dark values.
// In host mode (Anomalous panel iframe), the host overrides these via
// AppBridge — the toggle is still useful for standalone (GitHub Pages).

const LIGHT_VARS: Record<string, string> = {
  "--color-background-primary":   "oklch(0.985 0.002 90)",
  "--color-background-secondary": "oklch(0.955 0.002 90)",
  "--color-background-tertiary":  "oklch(0.955 0.002 90)",
  "--color-text-primary":         "oklch(0.18 0 0)",
  "--color-text-secondary":       "oklch(0.42 0 0)",
  "--color-text-tertiary":        "oklch(0.55 0 0)",
  "--color-border-primary":       "oklch(0.86 0 0)",
  "--color-border-secondary":     "oklch(0.86 0 0)",
};

const DARK_VARS: Record<string, string> = {
  "--color-background-primary":   "oklch(0.155 0.005 60)",
  "--color-background-secondary": "oklch(0.205 0.005 60)",
  "--color-background-tertiary":  "oklch(0.205 0.005 60)",
  "--color-text-primary":         "oklch(0.88 0.005 90)",
  "--color-text-secondary":       "oklch(0.6 0.005 90)",
  "--color-text-tertiary":        "oklch(0.5 0.005 90)",
  "--color-border-primary":       "oklch(0.26 0.005 60)",
  "--color-border-secondary":     "oklch(0.26 0.005 60)",
};

function applyThemeVars(vars: Record<string, string>) {
  const s = document.documentElement.style;
  for (const k of Object.keys(vars)) s.setProperty(k, vars[k]);
}

function getTheme(): "light" | "dark" {
  return localStorage.getItem("blog-theme") === "light" ? "light" : "dark";
}

function setTheme(t: "light" | "dark") {
  localStorage.setItem("blog-theme", t);
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.style.colorScheme = t;
  applyThemeVars(t === "light" ? LIGHT_VARS : DARK_VARS);
}

function ThemeToggle() {
  const [theme, setLocalTheme] = useState(getTheme);
  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setLocalTheme(next);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggle}
      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-5 h-5 border-[3px] border-white/20 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

// ─── Route components ────────────────────────────────────────────────────────

function HomePage() {
  const [showDither, setShowDither] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShowDither(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="py-8 md:py-12">
      <div className="font-mono mb-8">
        <p className="text-muted-foreground">Staring into the wired, and the wired is looking back very confused.</p>
      </div>
      <div className="mx-auto w-[95%] h-[500px] rounded-xl overflow-hidden border-[4px] border-emerald-500 bg-card">
        {Dither && showDither ? (
          <Suspense fallback={<div className="w-full h-[500px] bg-card" />}>
            <div className="w-full h-[500px] relative">
              <Dither waveColor={[0.2, 0.7, 0.4]} mouseRadius={0} colorNum={2.5} waveAmplitude={0.45} waveFrequency={5.1} />
            </div>
          </Suspense>
        ) : (
          <div className="w-full h-[500px] bg-card" />
        )}
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="py-8 md:py-12">
      <h1 className="text-2xl font-mono text-foreground mb-2">about</h1>
      <div className="font-mono mt-4">
        <div className="text-muted-foreground text-sm mb-4">
          Last login: {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="mb-2">
          <span className="text-emerald-400">$</span> <span className="text-foreground">whoami</span>
        </div>
        <div className="text-muted-foreground ml-4 mb-4">
          Welcome! I'm Mirri. I'm a software engineer, founder, and occasional artist.
        </div>
        <div className="mb-2">
          <span className="text-emerald-400">$</span> <span className="text-foreground">cat about.md</span>
        </div>
        <div className="text-muted-foreground ml-4 mb-4">
          This is my own little corner of the internet where I write about systems, web development, and the tools I build.
        </div>
        <div className="mt-6">
          <span className="text-emerald-400">$</span>
          <Link to="/blog" className="text-emerald-400 font-mono text-sm underline ml-2 no-underline hover:underline">
            ls -la ./blog/
          </Link>
        </div>
      </div>
    </div>
  );
}

function BlogList() {
  const metas = getMetas();

  return (
    <div className="py-8 md:py-12">
      <h1 className="text-2xl font-mono text-foreground mb-8">blog</h1>
      <div className="flex flex-col gap-6">
        {metas.map((p) => (
          <article key={p.slug}>
            <Link to={`/blog/${p.slug}`} className="block no-underline text-inherit">
              <div className="flex flex-wrap items-baseline gap-1 md:gap-4 mb-1">
                <time className="text-muted-foreground font-mono text-sm">{formatDate(p.date)}</time>
                <h2 className="text-foreground font-mono text-base m-0">{p.title}</h2>
              </div>
              {p.description && <p className="text-muted-foreground text-sm md:ml-[88px]">{p.description}</p>}
            </Link>
            {p.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 md:ml-[88px]">
                {p.tags.map((t) => (
                  <Link key={t} to={`/blog/tags/${encodeURIComponent(t.toLowerCase().trim().replace(/\s+/g, "-"))}`}
                    className="text-xs font-mono px-2 py-1 bg-card text-muted-foreground rounded no-underline">
                    {t}
                  </Link>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      <footer className="mt-12 pt-8 border-t border-border flex gap-6">
        <Link to="/" className="text-muted-foreground hover:text-card-foreground font-mono text-sm no-underline">&larr; home</Link>
        <Link to="/blog/tags" className="text-muted-foreground hover:text-card-foreground font-mono text-sm no-underline">tags</Link>
      </footer>
    </div>
  );
}

function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = posts.find(p => p.slug === slug) ?? null;
  const [editMode, setEditMode] = useState(false);
  const confirm = useConfirm();
  const editorEnabled = __BLOG_EDITOR__;
  const editorContext = useEditorContext();

  const handleUnpublish = async () => {
    if (!await confirm("Unpublish this post? It will be moved back to drafts.")) return;
    if (slug) await blogClient.unpublishPost(slug);
    navigate(`/draft/${slug}`);
  };

  const handleDelete = async () => {
    if (!await confirm("Delete this post? This cannot be undone.")) return;
    if (slug) await blogClient.deletePost(slug);
    navigate("/blog");
  };

  useEffect(() => {
    if (editMode && editorContext) {
      editorContext.registerEditor({
        onSave: () => {},
        onPublish: handleUnpublish,
        onDelete: handleDelete,
      });
    }
    return () => {
      if (editMode) editorContext?.unregisterEditor();
    };
  }, [editMode, handleUnpublish, handleDelete, editorContext]);

  if (!post) {
    return (
      <div className="py-8">
        <h1 className="text-2xl font-mono text-foreground">Not Found</h1>
        <Link to="/blog" className="text-muted-foreground font-mono text-sm mt-4 block no-underline">&larr; back</Link>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12">
      <article>
        <header className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <time className="text-muted-foreground font-mono text-sm">{formatDate(post.date)}</time>
              <h1 className="text-2xl md:text-3xl font-mono text-foreground mt-2">{post.title}</h1>
            </div>
            {editorEnabled && (
              <button
                onClick={() => setEditMode((v) => !v)}
                className={`shrink-0 px-2 py-1 font-mono text-xs rounded transition-colors ${
                  editMode ? "bg-amber-500 text-background" : "bg-secondary text-muted-foreground hover:text-card-foreground"
                }`}
              >
                {editMode ? "editing" : "edit"}
              </button>
            )}
          </div>
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((t) => (
                <Link key={t} to={`/blog/tags/${encodeURIComponent(t.toLowerCase().trim().replace(/\s+/g, "-"))}`}
                  className="text-xs font-mono px-2 py-1 bg-card text-muted-foreground rounded no-underline">
                  {t}
                </Link>
              ))}
            </div>
          )}
        </header>
        <div className="blog-content prose prose-zinc max-w-none dark:prose-invert
          prose-headings:font-mono prose-headings:font-normal
          prose-h1:text-xl prose-h1:md:text-2xl prose-h2:text-lg prose-h2:md:text-xl prose-h3:text-base prose-h3:md:text-lg
          prose-p:leading-relaxed
          prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
          prose-code:text-emerald-400 prose-code:bg-card prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
      <footer className="mt-12 md:mt-16 pt-8 border-t border-border">
        <Link to="/blog" className="text-muted-foreground hover:text-card-foreground font-mono text-sm no-underline">&larr; back to blog</Link>
      </footer>
    </div>
  );
}

function TagsPage() {
  const tags = getTags();

  return (
    <div className="py-8 md:py-12">
      <h1 className="text-2xl font-mono text-foreground mb-6">tags</h1>
      <div className="flex flex-wrap gap-3">
        {tags.map((t) => (
          <Link key={t.normalized} to={`/blog/tags/${encodeURIComponent(t.normalized)}`}
            className="text-sm font-mono px-3 py-1 bg-card text-card-foreground rounded no-underline">
            {t.tag} <span className="text-muted-foreground">({t.count})</span>
          </Link>
        ))}
      </div>
      <footer className="mt-12 pt-8 border-t border-border">
        <Link to="/blog" className="text-muted-foreground hover:text-card-foreground font-mono text-sm no-underline">&larr; back</Link>
      </footer>
    </div>
  );
}

function TagPosts() {
  const { tag } = useParams();
  const metas = getPostsByTag(tag ?? "");

  return (
    <div className="py-8 md:py-12">
      <h1 className="text-2xl font-mono text-foreground mb-6">tag: {tag}</h1>
      <div className="flex flex-col gap-6">
        {metas.map((p) => (
          <article key={p.slug}>
            <Link to={`/blog/${p.slug}`} className="block no-underline text-inherit">
              <div className="flex flex-wrap items-baseline gap-1 md:gap-4 mb-1">
                <time className="text-muted-foreground font-mono text-sm">{formatDate(p.date)}</time>
                <h2 className="text-foreground font-mono text-base m-0">{p.title}</h2>
              </div>
            </Link>
          </article>
        ))}
      </div>
      <footer className="mt-12 pt-8 border-t border-border">
        <Link to="/blog/tags" className="text-muted-foreground hover:text-card-foreground font-mono text-sm no-underline">&larr; tags</Link>
      </footer>
    </div>
  );
}

// ─── Routing ─────────────────────────────────────────────────────────────────

/**
 * Layout route: providers + chrome wrap an <Outlet> for the matched page.
 * The Suspense boundary covers lazily-loaded route elements (Dither, draft
 * editor). Providers live inside the router so route components can consume
 * editor/PDF context.
 */
function Layout() {
  return (
    <EditorProvider>
      <PDFViewerProvider>
        <BlogLayout>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </BlogLayout>
      </PDFViewerProvider>
    </EditorProvider>
  );
}

function NotFound() {
  return <div className="py-8 text-muted-foreground">404 — not found</div>;
}

// Dev-only draft routes are spread in only when DraftsPage/DraftEditor exist
// (DEV builds). In production both are null and the lazy imports are
// dead-code-eliminated, so the draft editor never enters the bundle.
const draftRoutes: RouteObject[] =
  DraftsPage && DraftEditor
    ? [
        { path: "drafts", element: <DraftsPage /> },
        { path: "draft/:slug", element: <DraftEditor /> },
      ]
    : [];

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "blog", element: <BlogList /> },
      { path: "blog/tags", element: <TagsPage /> },
      { path: "blog/tags/:tag", element: <TagPosts /> },
      { path: "blog/:slug", element: <BlogPost /> },
      ...draftRoutes,
      { path: "*", element: <NotFound /> },
    ],
  },
];
