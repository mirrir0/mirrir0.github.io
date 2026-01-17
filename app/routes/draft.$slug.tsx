import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "react-router";
import { getDraftBySlug, saveDraft, publishDraft, deleteDraft } from "~/lib/drafts.server";
import { redirect } from "react-router";
import TiptapEditor from "~/components/editor/TiptapEditor";
import FrontmatterEditor from "~/components/editor/FrontmatterEditor";
import { useEditorContext } from "~/components/editor/EditorContext";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.draft) {
    return [{ title: "Draft Not Found" }];
  }
  return [
    { title: `Editing: ${data.draft.title}` },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  if (!import.meta.env.DEV) {
    throw new Response("Not Found", { status: 404 });
  }
  // Validate slug exists before use
  if (!params.slug) {
    throw new Response("Not Found", { status: 404 });
  }
  const draft = await getDraftBySlug(params.slug);
  if (!draft) {
    throw new Response("Not Found", { status: 404 });
  }
  return { draft };
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (!import.meta.env.DEV) {
    throw new Response("Forbidden", { status: 403 });
  }
  // Validate slug exists before use
  if (!params.slug) {
    throw new Response("Not Found", { status: 404 });
  }
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save") {
    const title = formData.get("title") as string;
    const date = formData.get("date") as string;
    const description = formData.get("description") as string;
    const tags = (formData.get("tags") as string)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const content = formData.get("content") as string;

    await saveDraft(params.slug, { title, date, description, tags }, content);
    return { success: true };
  }

  if (intent === "publish") {
    await publishDraft(params.slug);
    return redirect(`/blog/${params.slug}`);
  }

  if (intent === "delete") {
    await deleteDraft(params.slug);
    return redirect("/drafts");
  }

  return null;
}

export default function DraftEditor() {
  const { draft } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const editorContext = useEditorContext();

  const [frontmatter, setFrontmatter] = useState({
    title: draft.title,
    date: draft.date,
    description: draft.description || "",
    tags: draft.tags || [],
  });
  const [content, setContent] = useState(draft.content);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const initialLoadRef = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef({ frontmatter, content });
  const prevFetcherStateRef = useRef(fetcher.state);

  // Track last saved content for dirty detection
  const lastSavedRef = useRef({
    frontmatter: { ...frontmatter },
    content: content,
  });

  // Track if we're saving dirty content (vs no-op save)
  const savingDirtyRef = useRef(false);

  // Check if content is dirty (different from last saved)
  const isDirty = useMemo(() => {
    const last = lastSavedRef.current;
    return (
      content !== last.content ||
      frontmatter.title !== last.frontmatter.title ||
      frontmatter.date !== last.frontmatter.date ||
      frontmatter.description !== last.frontmatter.description ||
      JSON.stringify(frontmatter.tags) !== JSON.stringify(last.frontmatter.tags)
    );
  }, [content, frontmatter]);

  // Keep refs updated
  useEffect(() => {
    contentRef.current = { frontmatter, content };
  }, [frontmatter, content]);

  const isSaving = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "save";
  const isPublishing = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "publish";

  const handleSave = useCallback(() => {
    const { frontmatter: fm, content: c } = contentRef.current;

    // Check if we're actually saving dirty content
    const last = lastSavedRef.current;
    const wasDirty =
      c !== last.content ||
      fm.title !== last.frontmatter.title ||
      fm.date !== last.frontmatter.date ||
      fm.description !== last.frontmatter.description ||
      JSON.stringify(fm.tags) !== JSON.stringify(last.frontmatter.tags);

    if (!wasDirty) {
      return; // Don't save if nothing changed
    }

    savingDirtyRef.current = true;

    fetcher.submit(
      {
        intent: "save",
        title: fm.title,
        date: fm.date,
        description: fm.description,
        tags: fm.tags.join(", "),
        content: c,
      },
      { method: "post" }
    );
  }, [fetcher]);

  const handlePublish = useCallback(() => {
    if (confirm("Are you sure you want to publish this draft? It will be moved to the published posts.")) {
      fetcher.submit(
        {
          intent: "publish",
        },
        { method: "post" }
      );
    }
  }, [fetcher]);

  const handleDelete = useCallback(() => {
    if (confirm("Are you sure you want to delete this draft? This cannot be undone.")) {
      fetcher.submit(
        {
          intent: "delete",
        },
        { method: "post" }
      );
    }
  }, [fetcher]);

  // Register editor handlers with context
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

  // Sync state with context
  useEffect(() => {
    if (editorContext) {
      editorContext.setEditorState({
        saveStatus,
        isSaving,
        isPublishing,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus, isSaving, isPublishing]);

  // Handle Cmd+S / Ctrl+S keyboard shortcut
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

  // Autosave effect - only when dirty
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // Only autosave if actually dirty
    if (!isDirty) {
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for autosave
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, frontmatter, isDirty, handleSave]);

  // Update save status - only show for dirty saves
  useEffect(() => {
    const prevState = prevFetcherStateRef.current;
    prevFetcherStateRef.current = fetcher.state;

    if (fetcher.state === "submitting" || fetcher.state === "loading") {
      // Only show "saving" if we were saving dirty content
      if (savingDirtyRef.current) {
        setSaveStatus("saving");
      }
    } else if (
      fetcher.state === "idle" &&
      (prevState === "submitting" || prevState === "loading")
    ) {
      // Save completed
      if (savingDirtyRef.current) {
        // Update last saved ref
        lastSavedRef.current = {
          frontmatter: { ...contentRef.current.frontmatter },
          content: contentRef.current.content,
        };

        setSaveStatus("saved");
        savingDirtyRef.current = false;

        const timeoutId = setTimeout(() => setSaveStatus("idle"), 2000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [fetcher.state]);

  return (
    <main className="py-8 md:py-12">
      <article>
        <header className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-zinc-800">
          <FrontmatterEditor
            frontmatter={frontmatter}
            onChange={setFrontmatter}
          />
        </header>

        <div
          className="prose prose-invert prose-zinc max-w-none
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
        >
          <TiptapEditor content={content} onChange={setContent} />
        </div>
      </article>

      <footer className="mt-12 md:mt-16 pt-8 border-t border-zinc-800">
        <Link
          to="/drafts"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
        >
          &larr; back to drafts
        </Link>
      </footer>
    </main>
  );
}
