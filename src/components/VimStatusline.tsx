/**
 * VimStatusline.tsx — Status bar shown on blog post and draft editor pages.
 *
 * Ported from ~/mirrir/blog/app/root.tsx.
 *
 * On blog posts: shows READ mode, heading breadcrumb trail, and scroll %
 * On draft editors: shows EDITOR/DRAFT/Save buttons, heading trail,
 *   save status notification, and DraftMenu (publish/delete) in statusline variant.
 *
 * Heading trail is built by scanning the DOM for h1-h6 elements above
 * the viewport header offset and building a breadcrumb path.
 */

import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useEditorContext } from "../../app/components/editor/EditorContext";
import { DraftMenu } from "../../app/components/DraftMenu";

function getDisplayInfo(pathname: string) {
  if (pathname === "/") return { mode: "NORMAL", path: "~/", section: "home" };
  if (pathname === "/about")
    return { mode: "NORMAL", path: "~/about", section: "about" };
  if (pathname === "/blog")
    return { mode: "NORMAL", path: "~/blog/", section: "index" };
  if (pathname === "/tags")
    return { mode: "NORMAL", path: "~/tags/", section: "index" };
  if (pathname.startsWith("/tags/")) {
    const tag = pathname.replace("/tags/", "");
    return { mode: "NORMAL", path: `~/tags/${tag}`, section: "tag" };
  }
  if (pathname.startsWith("/blog/")) {
    const slug = pathname.replace("/blog/", "");
    return { mode: "READ", path: `~/blog/${slug}`, section: "blog" };
  }
  if (pathname.startsWith("/draft/")) {
    const slug = pathname.replace("/draft/", "");
    return { mode: "DRAFT", path: `~/drafts/${slug}`, section: "editor" };
  }
  if (pathname === "/drafts") {
    return { mode: "NORMAL", path: "~/drafts/", section: "index" };
  }
  return { mode: "NORMAL", path: `~${pathname}`, section: "page" };
}

export function VimStatusline() {
  const location = useLocation();
  const [scrollInfo, setScrollInfo] = useState({ line: 1, col: 1, percent: 0 });
  const [headingTrail, setHeadingTrail] = useState<string[]>([]);
  const editorContext = useEditorContext();

  const isDraftEditor = location.pathname.startsWith("/draft/");
  const isBlogPostEdit = location.pathname.startsWith("/blog/") && editorContext?.onPublish && editorContext?.onDelete;
  const hasEditorActions = (isDraftEditor || isBlogPostEdit) && editorContext != null;

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const percent =
        docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      const line = Math.floor(scrollTop / 20) + 1;
      setScrollInfo({ line, col: 1, percent });

      // Find all headings and build breadcrumb trail
      const headings = Array.from(
        document.querySelectorAll("h1, h2, h3, h4, h5, h6")
      ) as HTMLElement[];

      const trail: { level: number; text: string }[] = [];
      const headerOffset = 80;

      for (const heading of headings) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= headerOffset) {
          const level = parseInt(heading.tagName[1]);
          const text = heading.textContent?.trim() || "";

          while (trail.length > 0 && trail[trail.length - 1].level >= level) {
            trail.pop();
          }
          trail.push({ level, text });
        }
      }

      setHeadingTrail(trail.map((h) => h.text));
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  const { mode, path, section } = getDisplayInfo(location.pathname);

  return (
    <div className="font-mono text-xs flex">
      {/* Left side */}
      {hasEditorActions && editorContext ? (
        isDraftEditor ? (
          <>
            <span className="bg-emerald-400 text-zinc-900 px-2 py-0.5 font-bold">
              EDITOR
            </span>
            <span className="bg-amber-500 text-zinc-900 px-2 py-0.5 font-bold">
              DRAFT
            </span>
            <button
              onClick={() => editorContext.onSave?.()}
              disabled={editorContext.isSaving}
              className="bg-zinc-700 text-zinc-300 px-2 py-0.5 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </>
        ) : (
          <>
            <span className="bg-amber-500 text-zinc-900 px-2 py-0.5 font-bold">
              POST
            </span>
            <button
              onClick={() => editorContext.onPublish?.()}
              className="bg-zinc-700 text-zinc-300 px-2 py-0.5 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Unpublish
            </button>
            <button
              onClick={() => editorContext.onDelete?.()}
              className="bg-zinc-700 text-red-400 px-2 py-0.5 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Delete
            </button>
          </>
        )
      ) : (
        <span className="bg-emerald-400 text-zinc-900 px-2 py-0.5 font-bold">
          {mode}
        </span>
      )}
      <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 truncate max-w-md">
        {headingTrail.length > 0
          ? headingTrail.map((h, i) => (
              <span key={i}>
                {i > 0 && <span className="text-zinc-500"> › </span>}
                {h}
              </span>
            ))
          : path}
      </span>
      <span className="bg-zinc-800 flex-1" />

      {/* Right side */}
      {hasEditorActions && editorContext ? (
        isDraftEditor ? (
          <>
            {editorContext.saveStatus !== "idle" && (
              <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5">
                {editorContext.saveStatus === "saving" && (
                  <span className="text-amber-400 animate-pulse">saving...</span>
                )}
                {editorContext.saveStatus === "saved" && (
                  <span className="text-emerald-400 animate-fade-out">Saved</span>
                )}
              </span>
            )}
            <DraftMenu
              variant="statusline"
              onPublish={() => editorContext.onPublish?.()}
              onDelete={() => editorContext.onDelete?.()}
              disabled={editorContext.isPublishing}
            />
          </>
        ) : (
          <span className="bg-zinc-700 text-zinc-400 px-2 py-0.5">{section}</span>
        )
      ) : (
        <>
          <span className="bg-zinc-700 text-zinc-400 px-2 py-0.5">{section}</span>
          <span className="bg-emerald-400 text-zinc-900 px-2 py-0.5 font-bold">
            {scrollInfo.percent}%
          </span>
        </>
      )}
    </div>
  );
}
