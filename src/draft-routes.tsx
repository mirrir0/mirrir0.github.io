/**
 * draft-routes.tsx — Draft management routes (create, edit, publish).
 *
 * Loaded only where __BLOG_EDITOR__ is true (dev / ano / MCP builds);
 * dead-code-eliminated from the public GitHub Pages bundle.
 *
 * Data goes through blogClient, which dispatches to HTTP (server.mjs) or the
 * MCP server (app.callServerTool) per runtime. Two live-update channels keep the
 * view fresh when a draft changes outside this UI:
 *   - MCP: an agent's tool result is pushed via intent-bus (draft-push).
 *   - ano/standalone: server.mjs SSE (/api/events).
 *
 * Routes:
 *   /drafts          → Draft list (create, delete, publish)
 *   /draft/:slug     → Draft editor (FrontmatterEditor + Tiptap)
 */

import { useState, useEffect, useCallback, lazy, useMemo, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useEditorContext } from "../app/components/editor/EditorContext";
import { DraftMenu } from "../app/components/DraftMenu";
import { useConfirm } from "./components/useConfirm";
import type { Editor } from "@tiptap/core";
import { blogClient } from "./blog-client";
import { intentBus, DRAFT_PUSH, EDIT_PUSH, type DraftPushDetail, type EditPushDetail } from "./mcp/intent-bus";
import { glowElement } from "./glow";
import { applyEdit } from "../app/components/editor/suggestions/apply-edit";
import { collectSuggestions, type PendingSuggestion } from "../app/components/editor/suggestions/suggestion-mark";
import ChangesPanel from "../app/components/editor/suggestions/ChangesPanel";
import SuggestionPopover, { type PopoverAnchor } from "../app/components/editor/suggestions/SuggestionPopover";

/** Subscribe to server.mjs SSE in the ano/standalone (non-MCP) contexts. No-op
 *  in the MCP build (no server.mjs; freshness comes from intent-bus pushes). */
function subscribeEvents(onEvent: (type: string, slug: string) => void): () => void {
  if (__BLOG_MCP__) return () => {};
  const base = (window as { __ANO__?: { serveBase?: string } }).__ANO__?.serveBase || "";
  const es = new EventSource(base + "/api/events");
  for (const type of ["draft-changed", "published", "deleted"]) {
    es.addEventListener(type, (e) => {
      try { onEvent(type, JSON.parse((e as MessageEvent).data).slug); } catch { /* ignore malformed */ }
    });
  }
  return () => es.close();
}

const TiptapEditor = lazy(() => import("../app/components/editor/TiptapEditor"));
const FrontmatterEditor = lazy(() => import("../app/components/editor/FrontmatterEditor"));

// ─── Shared styles ───────────────────────────────────────────────────────────

interface PostMeta {
  slug: string; title: string; date: string;
  description: string; tags: string[];
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

// ─── DraftRow ────────────────────────────────────────────────────────────────

function DraftRow({ draft, onRefresh }: { draft: PostMeta; onRefresh: () => void }) {
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirm = useConfirm();

  const handlePublish = async () => {
    if (!await confirm("Publish this draft? It will be moved to the published posts.")) return;
    setPublishing(true);
    await blogClient.publishDraft(draft.slug);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!await confirm("Delete this draft? This cannot be undone.")) return;
    setDeleting(true);
    await blogClient.deleteDraft(draft.slug);
    onRefresh();
  };

  return (
    <article className="group relative">
      <div className="absolute top-0 right-0">
        <DraftMenu variant="list" onPublish={handlePublish} onDelete={handleDelete} disabled={publishing || deleting} />
      </div>
      <Link to={`/draft/${draft.slug}`} className="block pr-10 no-underline text-inherit">
        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4 mb-1">
          <time className="text-zinc-600 font-mono text-sm shrink-0">{formatDate(draft.date)}</time>
          <h2 className="text-zinc-100 group-hover:text-emerald-400 transition-colors font-mono">{draft.title}</h2>
        </div>
        {draft.description && (
          <p className="text-zinc-500 text-sm md:ml-[88px]">{draft.description}</p>
        )}
      </Link>
      {draft.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 md:ml-[88px]">
          {draft.tags.map((tag: string) => (
            <span key={tag} className="text-xs font-mono px-2 py-1 bg-zinc-900 text-zinc-500 rounded">{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}

// ─── DraftsPage ──────────────────────────────────────────────────────────────

export function DraftsPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<PostMeta[] | null>(null);
  const [title, setTitle] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    blogClient.listDrafts().then((d) => setDrafts(d as PostMeta[])).catch(() => { });
  }, [refresh]);

  // Refresh the list when a draft is created/published/deleted out-of-band.
  useEffect(() => subscribeEvents(() => setRefresh((x) => x + 1)), []);

  const create = async () => {
    if (!title.trim()) return;
    try {
      const r = await blogClient.createDraft(title.trim());
      setTitle("");
      setRefresh((x) => x + 1);
      navigate(`/draft/${(r as { slug: string }).slug}`);
    } catch { }
  };

  if (!drafts) return <Loading />;

  return (
    <div className="py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <h1 className="text-2xl font-display text-zinc-100 mb-2 tracking-wide">drafts</h1>
        <p className="text-zinc-500 font-mono text-sm">unpublished posts and works in progress</p>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); create(); }} className="mb-8 md:mb-12">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My New Post Title"
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-mono text-sm rounded transition-colors"
          >
            + New Draft
          </button>
        </div>
      </form>

      {drafts.length === 0 ? (
        <p className="text-zinc-500 font-mono text-sm">No drafts yet. Create one above to get started.</p>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {drafts.map((draft) => (
            <DraftRow key={draft.slug} draft={draft} onRefresh={() => setRefresh((x) => x + 1)} />
          ))}
        </div>
      )}

      <footer className="mt-12 md:mt-16 pt-8 border-t border-zinc-800 flex gap-6">
        <Link to="/" className="text-zinc-600 hover:text-zinc-400 font-mono text-sm no-underline">&larr; back to home</Link>
        <Link to="/blog" className="text-zinc-600 hover:text-zinc-400 font-mono text-sm no-underline">view published</Link>
      </footer>
    </div>
  );
}

// ─── DraftEditor ─────────────────────────────────────────────────────────────

export function DraftEditor() {
  const { slug: initialSlug = "" } = useParams();
  const navigate = useNavigate();
  const editorContext = useEditorContext();
  const confirm = useConfirm();

  const [draft, setDraft] = useState<{ slug: string; title: string; date: string; description: string; tags: string[]; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [slug, setSlug] = useState(initialSlug);
  const [frontmatter, setFrontmatter] = useState({
    title: "", date: "", description: "", tags: [] as string[],
  });
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isPublishing, setIsPublishing] = useState(false);

  const initialLoadRef = useRef(true);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef({ frontmatter, content, slug });
  const savingRef = useRef(false);

  // Pending agent-proposed suggestions. While any are unresolved, autosave is
  // suspended (a pending "delete" still has its text in the doc, so saving now
  // would persist text the human may reject). Resolving them all resumes saving.
  const [pending, setPending] = useState<PendingSuggestion[]>([]);
  const hasPending = pending.length > 0;
  const pendingRef = useRef(false);
  useEffect(() => { pendingRef.current = hasPending; }, [hasPending]);

  // Inline accept/reject popover, anchored to a clicked suggestion mark.
  const [popover, setPopover] = useState<PopoverAnchor | null>(null);

  // TiptapEditor hands us its instance on ready (null on teardown). We track
  // pending suggestions off its update stream and drive accept/reject from here.
  const handleEditor = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
    if (!editor) { setPending([]); setPopover(null); return; }
    const refresh = () => {
      const next = collectSuggestions(editor.state.doc);
      // Keep the same empty array when nothing's pending so ordinary typing
      // (which fires "update" every keystroke) doesn't churn a re-render.
      setPending((prev) => (prev.length === 0 && next.length === 0 ? prev : next));
    };
    refresh();
    editor.on("update", refresh);

    // Click a suggestion mark → open the inline accept/reject popover for its id;
    // click anywhere else in the editor closes it.
    const onClick = (ev: MouseEvent) => {
      const el = (ev.target as HTMLElement | null)?.closest?.("[data-sugg-id]") as HTMLElement | null;
      if (!el) { setPopover(null); return; }
      const id = el.getAttribute("data-sugg-id");
      if (!id) { setPopover(null); return; }
      const r = el.getBoundingClientRect();
      setPopover({ id, rect: { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height } });
    };
    editor.view.dom.addEventListener("click", onClick);
  }, []);

  // The popover is pinned to viewport coords captured at click time; any scroll
  // or resize invalidates them, so dismiss it.
  useEffect(() => {
    if (!popover) return;
    const close = () => setPopover(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [popover]);

  const resolveOne = useCallback((id: string, mode: "accept" | "reject") => {
    const editor = editorRef.current;
    if (!editor) return;
    if (mode === "accept") editor.commands.acceptSuggestion(id);
    else editor.commands.rejectSuggestion(id);
    setPopover(null);
  }, []);

  // Clicking a change in the rail scrolls the document so it's centered, and
  // glows it briefly so the eye lands on the right spot.
  const revealSuggestion = useCallback((id: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const el = editor.view.dom.querySelector(`[data-sugg-id="${id}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    glowElement(el);
  }, []);

  const lastSavedRef = useRef({ frontmatter: { ...frontmatter }, content, slug });

  const isDirty = useMemo(() => {
    const last = lastSavedRef.current;
    return (
      content !== last.content ||
      frontmatter.title !== last.frontmatter.title ||
      frontmatter.date !== last.frontmatter.date ||
      frontmatter.description !== last.frontmatter.description ||
      JSON.stringify(frontmatter.tags) !== JSON.stringify(last.frontmatter.tags) ||
      slug !== last.slug
    );
  }, [content, frontmatter, slug]);

  useEffect(() => {
    contentRef.current = { frontmatter, content, slug };
  }, [frontmatter, content, slug]);

  // Applies a draft into editor state and marks it as the last-saved baseline,
  // so an externally-sourced draft (initial load, agent push, SSE) doesn't read
  // as dirty and trigger an echoing autosave.
  const applyDraft = useCallback((dd: { slug: string; title: string; date: string; description: string; tags: string[]; content: string }) => {
    setDraft(dd);
    setContent(dd.content || "");
    setFrontmatter({
      title: dd.title || "",
      date: dd.date || new Date().toISOString(),
      description: dd.description || "",
      tags: dd.tags || [],
    });
    setSlug(dd.slug || initialSlug);
    lastSavedRef.current = {
      frontmatter: { title: dd.title || "", date: dd.date || "", description: dd.description || "", tags: dd.tags || [] },
      content: dd.content || "",
      slug: dd.slug || initialSlug,
    };
  }, [initialSlug]);

  useEffect(() => {
    setLoading(true);
    blogClient.getDraft(initialSlug)
      .then((d) => { if (d) applyDraft(d as Parameters<typeof applyDraft>[0]); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [initialSlug, applyDraft]);

  // MCP: an agent's update/get/create tool result is pushed here. Apply it live
  // to the editor if it targets the draft we're showing.
  useEffect(() => {
    const onPush = (e: Event) => {
      const d = (e as CustomEvent<DraftPushDetail>).detail;
      if (d.slug !== initialSlug) return;
      applyDraft(d);
      setLoading(false);
      // Glow a ring around the editor body the agent just wrote into.
      glowElement(editorBodyRef.current);
    };
    intentBus.addEventListener(DRAFT_PUSH, onPush);
    return () => intentBus.removeEventListener(DRAFT_PUSH, onPush);
  }, [initialSlug, applyDraft]);

  // MCP: an agent's surgical edit tool (replace/insert/delete/append) pushes here.
  // Apply it as a pending suggestion on the live editor and glow the new range(s).
  useEffect(() => {
    const onEdit = (e: Event) => {
      const d = (e as CustomEvent<EditPushDetail>).detail;
      if (d.slug !== initialSlug) return;
      const editor = editorRef.current;
      if (!editor) return;
      const res = applyEdit(editor, d.edit);
      if (res.ok && res.ids) {
        for (const id of res.ids) {
          editor.view.dom
            .querySelectorAll(`[data-sugg-id="${id}"]`)
            .forEach((el) => glowElement(el as HTMLElement));
        }
      }
    };
    intentBus.addEventListener(EDIT_PUSH, onEdit);
    return () => intentBus.removeEventListener(EDIT_PUSH, onEdit);
  }, [initialSlug]);

  // ano/standalone: refetch on an out-of-band change to this draft, unless the
  // user has unsaved edits (don't clobber them). Deletion bounces to the list.
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => {
    const sub = subscribeEvents((type, s) => {
      if (s !== initialSlug) return;
      if (type === "deleted") { navigate("/drafts"); return; }
      if (dirtyRef.current) return;
      blogClient.getDraft(initialSlug).then((d) => { if (d) applyDraft(d as Parameters<typeof applyDraft>[0]); }).catch(() => { });
    });
    return sub;
  }, [initialSlug, applyDraft, navigate]);

  const handleSave = useCallback(async () => {
    // Suspend persistence while a review is open — the doc holds unresolved
    // delete/insert suggestions that must not reach the saved markdown yet.
    if (pendingRef.current) return;
    const { frontmatter: fm, content: c, slug: s } = contentRef.current;

    const last = lastSavedRef.current;
    if (
      c === last.content &&
      fm.title === last.frontmatter.title &&
      fm.date === last.frontmatter.date &&
      fm.description === last.frontmatter.description &&
      JSON.stringify(fm.tags) === JSON.stringify(last.frontmatter.tags) &&
      s === last.slug
    ) return;

    savingRef.current = true;
    setSaveStatus("saving");

    try {
      if (s !== initialSlug) {
        await blogClient.renameDraft(initialSlug, s);
        navigate(`/draft/${s}`, { replace: true });
      }

      await blogClient.updateDraft(s, {
        title: fm.title,
        description: fm.description,
        tags: fm.tags,
        content: c,
        date: fm.date,
      });

      lastSavedRef.current = {
        frontmatter: { ...fm },
        content: c,
        slug: s,
      };

      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus((prev) => prev === "saved" ? "idle" : prev);
      }, 2000);
    } catch {
      setSaveStatus("idle");
    } finally {
      savingRef.current = false;
    }
  }, [initialSlug, navigate]);

  const handlePublish = useCallback(async () => {
    if (!await confirm("Publish this draft? It will be moved to the published posts.")) return;
    setIsPublishing(true);
    try {
      if (isDirty) await handleSave();
      await blogClient.publishDraft(contentRef.current.slug);
      navigate(`/blog/${contentRef.current.slug}`);
    } catch (err) {
      setIsPublishing(false);
      throw err;
    }
  }, [isDirty, handleSave, navigate, confirm]);

  const handleDelete = useCallback(async () => {
    if (!await confirm("Delete this draft? This cannot be undone.")) return;
    await blogClient.deleteDraft(contentRef.current.slug);
    navigate("/drafts");
  }, [navigate, confirm]);

  useEffect(() => {
    if (editorContext) {
      editorContext.registerEditor({
        onSave: handleSave,
        onPublish: handlePublish,
        onDelete: handleDelete,
      });
    }
    return () => {
      editorContext?.unregisterEditor();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSave, handlePublish, handleDelete]);

  useEffect(() => {
    if (editorContext) {
      editorContext.setEditorState({
        saveStatus,
        isSaving: saveStatus === "saving",
        isPublishing,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus, isPublishing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (!isDirty) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [content, frontmatter, isDirty, handleSave]);

  if (loading) return <Loading />;
  if (!draft) return <div className="py-8 text-red-500">Draft not found</div>;

  return (
    <div className="py-8 md:py-12">
      {/* Google-Docs-style review rail, fixed to the right of the editor column.
          Rendered outside .prose so editor typography doesn't style it. */}
      <ChangesPanel
        pending={pending}
        onAccept={(id) => editorRef.current?.commands.acceptSuggestion(id)}
        onReject={(id) => editorRef.current?.commands.rejectSuggestion(id)}
        onAcceptAll={() => editorRef.current?.commands.acceptAllSuggestions()}
        onRejectAll={() => editorRef.current?.commands.rejectAllSuggestions()}
        onReveal={revealSuggestion}
      />
      <article>
        <header className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-zinc-800">
          <FrontmatterEditor
            frontmatter={frontmatter}
            onChange={setFrontmatter}
            slug={slug}
            onSlugChange={setSlug}
          />
        </header>

        <div className="prose prose-invert prose-zinc max-w-none
          prose-headings:font-mono prose-headings:font-normal
          prose-h1:text-xl prose-h1:md:text-2xl prose-h2:text-lg prose-h2:md:text-xl prose-h3:text-base prose-h3:md:text-lg
          prose-p:text-zinc-300 prose-p:leading-relaxed
          prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
          prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:overflow-x-auto
          prose-strong:text-zinc-100
          prose-ul:text-zinc-300 prose-ol:text-zinc-300
          prose-li:marker:text-zinc-600
          prose-hr:border-zinc-800
          prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400"
          ref={editorBodyRef}
        >
          <TiptapEditor content={content} onChange={setContent} onEditor={handleEditor} />
          {popover && (
            <SuggestionPopover
              anchor={popover}
              suggestion={pending.find((s) => s.id === popover.id)}
              onAccept={(id) => resolveOne(id, "accept")}
              onReject={(id) => resolveOne(id, "reject")}
            />
          )}
        </div>
      </article>

      <footer className="mt-12 md:mt-16 pt-8 border-t border-zinc-800">
        <Link to="/drafts" className="text-zinc-600 hover:text-zinc-400 font-mono text-sm no-underline">
          &larr; back to drafts
        </Link>
      </footer>
    </div>
  );
}
