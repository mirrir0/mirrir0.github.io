/**
 * mcp-app.tsx — Blog MCP App UI.
 *
 * Interactive MCP App with full Tiptap draft editor running inline.
 *
 * Views:
 *   - Drafts list: clickable, expand icon → fullscreen
 *   - Draft editor: Tiptap + frontmatter + suggestions panel + MIRRIR header
 *   - Tool results: edit proposals, confirmations
 *
 * Uses blog-client (MCP mode → app.callServerTool) for all draft CRUD.
 * Fonts (Kapel, Quadrunde) are inlined by vite-plugin-singlefile.
 */
import type { McpUiHostContext, App } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { applyHostStyleVariables, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import { StrictMode, useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { setApp } from "./mcp/app-singleton";
import { blogClient } from "./blog-client";
import { EditorProvider, useEditorContext } from "../app/components/editor/EditorContext";
import { DraftMenu } from "../app/components/DraftMenu";
import { useConfirm } from "./components/useConfirm";
import "../app/app.css";

// ── Types ──────────────────────────────────────────────────────────────────

type DisplayMode = "inline" | "fullscreen" | "pip";

interface DraftMeta {
  slug: string; title: string; date: string;
  description: string; tags: string[];
}

interface BlogEdit {
  op: "replace" | "delete" | "insert" | "append";
  find?: string; replace?: string; after?: string; text?: string;
}

interface BlogToolResult {
  tool: string; ok?: boolean; slug?: string;
  title?: string; description?: string; date?: string;
  tags?: string[]; content?: string;
  drafts?: DraftMeta[]; edit?: BlogEdit; error?: string;
}

interface DraftData {
  slug: string; title: string; date: string;
  description: string; tags: string[]; content: string;
}

// ── Lazy editor imports ───────────────────────────────────────────────

const TiptapEditor = lazy(() => import("../app/components/editor/TiptapEditor"));
const FrontmatterEditor = lazy(() => import("../app/components/editor/FrontmatterEditor"));

// ── Styles ─────────────────────────────────────────────────────────────────

const mcpCss = `
html, body { margin: 0; overflow: hidden; }
.blog-mcp-root {
  display: flex; flex-direction: column;
  height: 100dvh; overflow: hidden;
  box-sizing: border-box;
  background: var(--color-background-primary, oklch(0.155 0.005 60));
  color: var(--color-text-primary, oklch(0.88 0.005 90));
  font-family: var(--font-sans, system-ui, sans-serif);
}
.blog-mcp-header-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; flex-shrink: 0;
  border-bottom: 1px solid var(--color-border-primary, oklch(0.26 0.005 60));
  background: var(--color-background-primary, oklch(0.155 0.005 60));
}
.blog-mcp-logo {
  font-family: "Kapel", sans-serif;
  font-size: 24px; color: var(--color-text-info, #10b981);
  letter-spacing: -0.5px;
}
.blog-mcp-subtitle {
  font-family: var(--font-mono, monospace);
  font-size: 10px; color: var(--color-text-secondary, oklch(0.6 0.005 90));
}
.blog-mcp-main {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
  padding: 12px; display: flex; flex-direction: column; gap: 8px;
}
.blog-mcp-main.max-height-list { max-height: 480px; }

.blog-mcp-card {
  border: 1px solid var(--color-border-primary, oklch(0.26 0.005 60));
  border-radius: var(--border-radius-md, 5px); padding: 12px;
}
.blog-mcp-card-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;
}
.blog-mcp-card h3 {
  font-family: var(--font-mono, monospace);
  font-size: var(--font-heading-xs-size, 12px);
  font-weight: var(--font-weight-semibold, 600);
  margin: 0 0 6px 0; color: var(--color-text-primary, oklch(0.88 0.005 90));
}

.blog-mcp-row {
  display: flex; align-items: baseline; gap: 8px;
  padding: 5px 0; font-size: var(--font-text-sm-size, 12px);
  border-bottom: 1px solid var(--color-border-primary, oklch(0.26 0.005 60));
  cursor: pointer; transition: background 0.1s;
}
.blog-mcp-row:hover { background: var(--color-background-secondary, oklch(0.205 0.005 60)); }
.blog-mcp-row:last-child { border-bottom: none; }

.blog-mcp-pre {
  background: var(--color-background-secondary, oklch(0.205 0.005 60));
  padding: 8px; border-radius: var(--border-radius-sm, 4px);
  overflow-x: auto; font-family: var(--font-mono, monospace);
  font-size: var(--font-text-sm-size, 11px); white-space: pre-wrap;
  max-height: 260px; overflow-y: auto; margin-top: 6px;
}

.blog-mcp-meta { font-size: 10px; color: var(--color-text-secondary, oklch(0.6 0.005 90)); }
.blog-mcp-view-more {
  text-align: center; font-size: 10px; color: var(--color-text-secondary, oklch(0.6 0.005 90));
  padding: 6px 0 2px;
}

.blog-mcp-btn {
  padding: 3px 10px; font-size: 10px; cursor: pointer;
  background: var(--color-background-secondary, oklch(0.205 0.005 60));
  color: var(--color-text-primary, oklch(0.88 0.005 90));
  border: 1px solid var(--color-border-primary, oklch(0.26 0.005 60));
  border-radius: var(--border-radius-sm, 4px);
  font-family: var(--font-sans, system-ui, sans-serif);
}
.blog-mcp-btn:hover { background: var(--color-background-info, rgba(14,165,233,0.12)); }

.blog-mcp-btn-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; padding: 0; cursor: pointer;
  background: transparent; color: var(--color-text-secondary, oklch(0.6 0.005 90));
  border: 1px solid var(--color-border-primary, oklch(0.26 0.005 60));
  border-radius: var(--border-radius-sm, 4px);
}
.blog-mcp-btn-icon:hover { color: var(--color-text-primary, oklch(0.88 0.005 90)); }
.blog-mcp-btn-icon svg { width: 12px; height: 12px; }

.blog-mcp-badge {
  font-family: var(--font-mono, monospace);
  font-size: 8px; padding: 1px 5px; border-radius: var(--border-radius-sm, 4px);
  font-weight: var(--font-weight-medium, 500);
  text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0;
}
.blog-mcp-badge-ok { background: rgba(0,230,57,0.12); color: var(--color-text-success, #00E639); }
.blog-mcp-badge-err { background: rgba(255,45,32,0.12); color: var(--color-text-error, #FF2D20); }
.blog-mcp-badge-accent { background: rgba(192,132,252,0.12); color: var(--color-text-info, #C084FC); }

.blog-mcp-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.blog-mcp-tag {
  font-family: var(--font-mono, monospace); font-size: 9px; padding: 1px 6px;
  background: var(--color-background-secondary, oklch(0.205 0.005 60));
  color: var(--color-text-secondary, oklch(0.6 0.005 90));
  border-radius: var(--border-radius-sm, 4px);
}

@keyframes blog-mcp-spin { to { transform: rotate(360deg); } }
.blog-mcp-spinner {
  width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
  border: 1.5px solid var(--color-border-primary, oklch(0.26 0.005 60));
  border-top-color: #FF6700;
  animation: blog-mcp-spin 0.8s linear infinite;
}
.blog-mcp-loading {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 20px; color: var(--color-text-secondary, oklch(0.6 0.005 90));
  font-size: var(--font-text-sm-size, 12px);
}

.blog-mcp-sugg-ins {
  background: rgba(52,211,153,0.16);
  border-bottom: 1px solid rgba(52,211,153,0.7); color: rgb(167,243,208);
}
.blog-mcp-sugg-del {
  background: rgba(255,45,32,0.12); text-decoration: line-through;
  text-decoration-color: rgba(255,45,32,0.8); color: rgb(252,165,165);
}

/* Editor states */
.blog-mcp-editor-loading {
  flex: 1; display: flex; align-items: center; justify-content: center;
  min-height: 200px;
}
`;

// ── Icons ────────────────────────────────────────────────────────────

function ExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 12, height: 12 }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function detectEarlyTool(args: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) return "list_drafts";
  if (args.slug !== undefined && args.title !== undefined) return "update_draft";
  if (args.slug !== undefined && args.find !== undefined && args.replace !== undefined) return "replace_text";
  if (args.slug !== undefined && args.find !== undefined) return "delete_text";
  if (args.slug !== undefined && args.after !== undefined) return "insert_text";
  if (args.slug !== undefined && args.text !== undefined && args.newSlug === undefined) return "append_text";
  if (args.slug !== undefined && args.newSlug !== undefined) return "rename_draft";
  if (args.slug !== undefined) return "draft_op";
  if (args.title !== undefined && args.slug === undefined) return "create_draft";
  return "blog";
}

// ── MCP Header Bar ─────────────────────────────────────────────────

function McpHeader({ app, displayMode, backLabel, onBack }: {
  app: App; displayMode: DisplayMode;
  backLabel?: string; onBack?: () => void;
}) {
  return (
    <div className="blog-mcp-header-bar">
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        {backLabel && onBack ? (
          <button className="blog-mcp-btn-icon" onClick={onBack} title={backLabel}>
            <BackIcon />
          </button>
        ) : null}
        <span className="blog-mcp-logo">MIRRIR</span>
        <span className="blog-mcp-subtitle">reflecting online</span>
      </div>
      <button className="blog-mcp-btn-icon"
        onClick={() => { void app.requestDisplayMode({ mode: "fullscreen" }); }}
        title="Expand to fullscreen">
        <ExpandIcon />
      </button>
    </div>
  );
}

// ── Drafts List ──────────────────────────────────────────────────────

function DraftsListView({ drafts, onSelect }: {
  drafts: DraftMeta[]; onSelect: (slug: string) => void;
}) {
  const visible = drafts.slice(0, 8);
  const remaining = drafts.length - visible.length;

  function shortSlug(s: string) { return s.length > 12 ? s.slice(0, 10) + ".." : s; }

  return (
    <div className="blog-mcp-main max-height-list">
      <div className="blog-mcp-card">
        <div className="blog-mcp-card-header">
          <h3 style={{ margin: 0 }}>drafts ({drafts.length})</h3>
          <span className="blog-mcp-badge blog-mcp-badge-accent">drafts</span>
        </div>
        {drafts.length === 0 && (
          <div className="blog-mcp-meta">No drafts. Create one with the create_draft tool.</div>
        )}
        {visible.map((d) => (
          <div key={d.slug} className="blog-mcp-row"
            onClick={() => onSelect(d.slug)}
            title={`Open ${d.title || d.slug} in editor`}>
            <span style={{
              fontFamily: "var(--font-mono, monospace)", fontSize: "var(--font-text-sm-size, 12px)",
              flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {d.title || shortSlug(d.slug)}
            </span>
            <span className="blog-mcp-meta">{formatDate(d.date)}</span>
          </div>
        ))}
        {remaining > 0 && <div className="blog-mcp-view-more">+{remaining} more</div>}
      </div>
    </div>
  );
}

// ── Draft Editor ─────────────────────────────────────────────────────

function DraftMcpEditor({ slug, app, onBack, displayMode }: {
  slug: string; app: App; onBack: () => void; displayMode: DisplayMode;
}) {
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [frontmatter, setFrontmatter] = useState({
    title: "", date: "", description: "", tags: [] as string[],
  });
  const [content, setContent] = useState("");
  const [currentSlug, setCurrentSlug] = useState(slug);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isPublishing, setIsPublishing] = useState(false);

  const editorContext = useEditorContext();
  const confirm = useConfirm();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // Load draft data on mount/slug change.
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    blogClient.getDraft(slug).then((d) => {
      if (d) {
        const dd = d as DraftData;
        setDraft(dd);
        setContent(dd.content || "");
        setFrontmatter({
          title: dd.title || "",
          date: dd.date || new Date().toISOString(),
          description: dd.description || "",
          tags: dd.tags || [],
        });
      } else {
        setLoadError("Draft not found");
      }
    }).catch((e) => {
      setLoadError((e as Error).message || "Failed to load draft");
    }).finally(() => setLoading(false));
  }, [slug]);

  // Track dirty state
  const isDirty = frontmatter.title !== (draft?.title ?? "")
    || frontmatter.description !== (draft?.description ?? "")
    || content !== (draft?.content ?? "")
    || currentSlug !== slug;

  useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);

  // Autosave
  useEffect(() => {
    if (!isDirty || loading) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        if (currentSlug !== slug) {
          await blogClient.renameDraft(slug, currentSlug);
        }
        await blogClient.updateDraft(currentSlug, {
          title: frontmatter.title || undefined,
          description: frontmatter.description || undefined,
          tags: frontmatter.tags,
          content,
          date: frontmatter.date || undefined,
        });
        setDraft({ slug: currentSlug, ...frontmatter, content });
        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus((s) => s === "saved" ? "idle" : s);
        }, 2000);
      } catch {
        setSaveStatus("idle");
      }
    }, 2000);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [content, frontmatter, isDirty, loading, currentSlug, slug]);

  // Ctrl+S
  const handleSave = useCallback(async () => {
    if (!dirtyRef.current) return;
    setSaveStatus("saving");
    try {
      if (currentSlug !== slug) {
        await blogClient.renameDraft(slug, currentSlug);
      }
      await blogClient.updateDraft(currentSlug, {
        title: frontmatter.title || undefined,
        description: frontmatter.description || undefined,
        tags: frontmatter.tags,
        content,
        date: frontmatter.date || undefined,
      });
      setDraft({ slug: currentSlug, ...frontmatter, content });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => s === "saved" ? "idle" : s), 2000);
    } catch { setSaveStatus("idle"); }
  }, [content, frontmatter, currentSlug, slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleSave]);

  const handlePublish = useCallback(async () => {
    if (!await confirm("Publish this draft? It will be moved to the published posts.")) return;
    setIsPublishing(true);
    try {
      if (isDirty) await handleSave();
      await blogClient.publishDraft(currentSlug);
      onBack();
    } catch { setIsPublishing(false); }
  }, [isDirty, handleSave, currentSlug, onBack, confirm]);

  const handleDelete = useCallback(async () => {
    if (!await confirm("Delete this draft? This cannot be undone.")) return;
    await blogClient.deleteDraft(currentSlug);
    onBack();
  }, [currentSlug, onBack, confirm]);

  // Register with editor context for statusline
  useEffect(() => {
    if (editorContext) {
      editorContext.registerEditor({
        onSave: handleSave,
        onPublish: handlePublish,
        onDelete: handleDelete,
      });
      editorContext.setEditorState({
        saveStatus,
        isSaving: saveStatus === "saving",
        isPublishing,
      });
    }
    return () => { editorContext?.unregisterEditor(); };
  }, [handleSave, handlePublish, handleDelete, saveStatus, isPublishing, editorContext]);

  if (loading) {
    return (
      <div className="blog-mcp-main">
        <div className="blog-mcp-editor-loading">
          <div className="blog-mcp-loading">
            <span className="blog-mcp-spinner" />
            Loading {slug}...
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="blog-mcp-main">
        <div className="blog-mcp-card">
          <h3>Error</h3>
          <div className="blog-mcp-meta">{loadError}</div>
          <button className="blog-mcp-btn" onClick={onBack} style={{ marginTop: 8 }}>Back to drafts</button>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-mcp-main" style={{ gap: 0 }}>
      {/* Frontmatter */}
      <div style={{
        padding: "8px 12px", borderBottom: "1px solid var(--color-border-primary, oklch(0.26 0.005 60))",
        background: "var(--color-background-primary, oklch(0.155 0.005 60))",
      }}>
        <Suspense fallback={null}>
          <FrontmatterEditor
            frontmatter={frontmatter}
            onChange={setFrontmatter}
            slug={currentSlug}
            onSlugChange={setCurrentSlug}
          />
        </Suspense>
      </div>

      {/* Editor body */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        <div className="prose prose-invert prose-zinc max-w-none
          prose-headings:font-mono prose-headings:font-normal
          prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
          prose-p:text-zinc-300 prose-p:leading-relaxed
          prose-a:text-emerald-400 prose-a:no-underline
          prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800
          prose-strong:text-zinc-100 prose-li:marker:text-zinc-600
          prose-hr:border-zinc-800 prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400">
          <Suspense fallback={<div className="blog-mcp-editor-loading"><span className="blog-mcp-spinner" /></div>}>
            <TiptapEditor content={content} onChange={setContent} />
          </Suspense>
        </div>
      </div>

      {/* Status bar with save indicator + actions */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "4px 12px", flexShrink: 0,
        borderTop: "1px solid var(--color-border-primary, oklch(0.26 0.005 60))",
        background: "var(--color-background-primary, oklch(0.155 0.005 60))",
        fontFamily: "var(--font-mono, monospace)", fontSize: "10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--color-text-secondary, oklch(0.6 0.005 90))" }}>/{currentSlug}</span>
          {saveStatus === "saving" && <span style={{ color: "#f59e0b" }}>saving...</span>}
          {saveStatus === "saved" && <span style={{ color: "var(--color-text-success, #00E639)" }}>saved</span>}
        </div>
        <DraftMenu
          variant="statusline"
          onPublish={handlePublish}
          onDelete={handleDelete}
          disabled={isPublishing}
        />
      </div>
    </div>
  );
}

// ── Tool result views ──────────────────────────────────────────────────────

function DraftToolResultView({ data, isError }: { data: BlogToolResult; isError: boolean }) {
  if (isError || data.error) {
    return (
      <div className="blog-mcp-card">
        <h3>error</h3>
        <span className="blog-mcp-badge blog-mcp-badge-err">failed</span>
        <div className="blog-mcp-meta" style={{ marginTop: 4 }}>{data.error ?? "draft operation failed"}</div>
      </div>
    );
  }
  const label = data.tool === "create_draft" ? "created"
    : data.tool === "rename_draft" ? "renamed"
    : data.tool === "update_draft" ? "updated" : "draft";
  return (
    <div className="blog-mcp-card">
      <div className="blog-mcp-card-header">
        <h3 style={{ margin: 0 }}>{label}</h3>
        <span className="blog-mcp-badge blog-mcp-badge-ok">draft</span>
      </div>
      {data.slug && <div className="blog-mcp-meta" style={{ marginBottom: 4 }}>/{data.slug}</div>}
      {data.title && <div className="blog-mcp-meta" style={{ fontWeight: "var(--font-weight-medium, 500)", color: "var(--color-text-primary)", marginBottom: 2 }}>{data.title}</div>}
      {data.description && <div className="blog-mcp-meta" style={{ marginBottom: 4 }}>{data.description}</div>}
      {data.date && <div className="blog-mcp-meta" style={{ marginBottom: 4 }}>{formatDate(data.date)}</div>}
      {data.tags && data.tags.length > 0 && (
        <div className="blog-mcp-tags">{data.tags.map((t) => <span key={t} className="blog-mcp-tag">{t}</span>)}</div>
      )}
      {data.content && (
        <div className="blog-mcp-pre">{data.content.slice(0, 500)}{data.content.length > 500 ? "..." : ""}</div>
      )}
    </div>
  );
}

function PostView({ data, isError }: { data: BlogToolResult; isError: boolean }) {
  const isPublish = data.tool === "publish_draft";
  return (
    <div className="blog-mcp-card">
      <div className="blog-mcp-card-header">
        <h3 style={{ margin: 0 }}>{isPublish ? "published" : "unpublished"}</h3>
        <span className={`blog-mcp-badge ${isError ? "blog-mcp-badge-err" : "blog-mcp-badge-ok"}`}>
          {isPublish ? "live" : "draft"}
        </span>
      </div>
      {data.slug && <div className="blog-mcp-meta">/{data.slug}</div>}
      {data.title && <div className="blog-mcp-meta" style={{ fontWeight: "var(--font-weight-medium, 500)", color: "var(--color-text-primary)", marginTop: 4 }}>{data.title}</div>}
    </div>
  );
}

function EditProposalView({ data, isError }: { data: BlogToolResult; isError: boolean }) {
  if (isError || data.error) {
    return (
      <div className="blog-mcp-card">
        <h3>edit failed</h3>
        <span className="blog-mcp-badge blog-mcp-badge-err">error</span>
        <div className="blog-mcp-meta" style={{ marginTop: 4 }}>{data.error ?? "edit could not be applied"}</div>
      </div>
    );
  }
  const edit = data.edit;
  const label = data.tool === "replace_text" ? "replace" : data.tool === "delete_text" ? "delete" : data.tool === "insert_text" ? "insert" : "append";
  return (
    <div className="blog-mcp-card">
      <div className="blog-mcp-card-header">
        <h3 style={{ margin: 0 }}>{label}</h3>
        <span className="blog-mcp-badge blog-mcp-badge-accent">pending review</span>
      </div>
      {data.slug && <div className="blog-mcp-meta" style={{ marginBottom: 6 }}>/{data.slug}</div>}
      {edit?.op === "replace" && (
        <div className="blog-mcp-pre">
          <span className="blog-mcp-sugg-del">{(edit.find ?? "").slice(0, 80)}{(edit.find ?? "").length > 80 ? "..." : ""}</span>
          {" → "}
          <span className="blog-mcp-sugg-ins">{(edit.replace ?? "").slice(0, 80)}{(edit.replace ?? "").length > 80 ? "..." : ""}</span>
        </div>
      )}
      {edit?.op === "delete" && <div className="blog-mcp-pre"><span className="blog-mcp-sugg-del">{(edit.find ?? "").slice(0, 120)}...</span></div>}
      {edit?.op === "insert" && (
        <div className="blog-mcp-pre">
          {edit.after ? <span className="blog-mcp-meta">after "{edit.after.slice(0, 40)}"</span> : <span className="blog-mcp-meta">start of doc</span>}
          <div style={{ marginTop: 4 }}><span className="blog-mcp-sugg-ins">{(edit.text ?? "").slice(0, 120)}</span></div>
        </div>
      )}
      {edit?.op === "append" && (
        <div className="blog-mcp-pre">
          <span className="blog-mcp-meta">appended to end:</span>
          <div style={{ marginTop: 4 }}><span className="blog-mcp-sugg-ins">{(edit.text ?? "").slice(0, 120)}</span></div>
        </div>
      )}
    </div>
  );
}

function ConfirmView({ data, action }: { data: BlogToolResult; action: string }) {
  return (
    <div className="blog-mcp-card">
      <div className="blog-mcp-card-header">
        <h3 style={{ margin: 0 }}>{action}</h3>
        <span className="blog-mcp-badge blog-mcp-badge-ok">done</span>
      </div>
      {data.slug && <div className="blog-mcp-meta">/{data.slug}</div>}
    </div>
  );
}

function ToolResultRouter({ data, isError }: { data: BlogToolResult; isError: boolean }) {
  switch (data.tool) {
    case "get_draft":
    case "create_draft":
    case "update_draft":
    case "rename_draft":
      return <DraftToolResultView data={data} isError={isError} />;
    case "publish_draft":
    case "unpublish_post":
      return <PostView data={data} isError={isError} />;
    case "delete_draft":
    case "delete_post":
      return <ConfirmView data={data} action={data.tool === "delete_draft" ? "deleted draft" : "deleted post"} />;
    case "replace_text":
    case "delete_text":
    case "insert_text":
    case "append_text":
      return <EditProposalView data={data} isError={isError} />;
    default:
      return (
        <div className="blog-mcp-card">
          <h3>{isError ? "error" : "result"} · {data.tool ?? "unknown"}</h3>
          {data.error && <div className="blog-mcp-meta">{data.error}</div>}
        </div>
      );
  }
}

// ── App Shell ──────────────────────────────────────────────────────────────

function BlogMcpApp() {
  const [toolData, setToolData] = useState<BlogToolResult | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("inline");
  const [isError, setIsError] = useState(false);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const [early, setEarly] = useState<string | undefined>();

  // View routing
  const [view, setView] = useState<"list" | "editor">("list");
  const [editSlug, setEditSlug] = useState<string | null>(null);

  const { app, error } = useApp({
    appInfo: { name: "Blog", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (a) => {
      // Wire the singleton so blog-client (MCP mode) can reach the App.
      setApp(a);

      a.ontoolinput = (params) => {
        setEarly(detectEarlyTool((params.arguments ?? {}) as Record<string, unknown>));
      };
      a.ontoolresult = (r) => {
        const sc = (r.structuredContent ?? {}) as unknown as BlogToolResult;
        setToolData(sc);
        setIsError(r.isError ?? false);
        if (sc.tool === "list_drafts") setView("list");
      };
      a.onhostcontextchanged = (ctx: McpUiHostContext) => {
        setHostContext((prev) => ({ ...prev, ...ctx }));
      };
      a.onteardown = async () => ({});
    },
  });

  useEffect(() => {
    if (!app) return;
    const ctx = app.getHostContext();
    if (ctx) setHostContext(ctx);
  }, [app]);

  useEffect(() => {
    if (hostContext?.theme) {
      applyDocumentTheme(hostContext.theme);
      document.documentElement.setAttribute("data-theme", hostContext.theme);
      document.documentElement.style.colorScheme = hostContext.theme;
    }
    if (hostContext?.styles?.variables) applyHostStyleVariables(hostContext.styles.variables);
    if (hostContext?.displayMode) setDisplayMode(hostContext.displayMode);
  }, [hostContext]);

  const handleSelectDraft = useCallback((slug: string) => {
    setEditSlug(slug);
    setView("editor");
  }, []);

  const handleBackToList = useCallback(() => {
    setView("list");
    setEditSlug(null);
  }, []);

  if (error) {
    return (
      <div className="blog-mcp-root">
        <div className="blog-mcp-header-bar">
          <span className="blog-mcp-logo">MIRRIR</span>
        </div>
        <div className="blog-mcp-main">
          <div className="blog-mcp-card"><h3>Error</h3>{error.message}</div>
        </div>
      </div>
    );
  }
  if (!app) {
    return (
      <div className="blog-mcp-root" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="blog-mcp-loading"><span className="blog-mcp-spinner" />Connecting...</div>
      </div>
    );
  }

  return (
    <div className="blog-mcp-root">
      <style>{mcpCss}</style>
      {view === "editor" && editSlug ? (
        <EditorProvider>
          <McpHeader app={app} displayMode={displayMode}
            backLabel="Back to drafts" onBack={handleBackToList} />
          <DraftMcpEditor slug={editSlug} app={app} onBack={handleBackToList} displayMode={displayMode} />
        </EditorProvider>
      ) : (
        <>
          <McpHeader app={app} displayMode={displayMode} />
          {toolData?.drafts && view === "list" ? (
            <DraftsListView drafts={toolData.drafts} onSelect={handleSelectDraft} />
          ) : toolData === null ? (
            <div className="blog-mcp-main">
              <div className="blog-mcp-card">
                <div className="blog-mcp-loading" style={{ flexDirection: "column", gap: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="blog-mcp-spinner" />{early ?? "loading"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="blog-mcp-main max-height-list">
              <ToolResultRouter data={toolData} isError={isError} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Mount ─────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(
  <StrictMode><BlogMcpApp /></StrictMode>,
);
