import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/blog.$slug";
import { getPostBySlug } from "~/lib/markdown.server";
import { normalizeTag } from "~/lib/utils";
import { usePDFViewer } from "~/components/pdf-viewer";

export function meta({ data }: Route.MetaArgs) {
  if (!data?.post) {
    return [{ title: "Post Not Found" }];
  }
  return [
    { title: data.post.title },
    { name: "description", content: data.post.description || "" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const post = await getPostBySlug(params.slug);
  // Return null post instead of throwing 404 to allow prerendering placeholder routes
  return { post };
}

// Handle non-prerendered routes (when ssr:false and route not in prerender list)
export async function clientLoader() {
  return { post: null };
}

export default function BlogPost({ loaderData }: Route.ComponentProps) {
  const { post } = loaderData;
  const { openPDF } = usePDFViewer();
  const articleRef = useRef<HTMLDivElement>(null);

  // Handle not found case
  if (!post) {
    return (
      <main className="py-8 md:py-12">
        <h1 className="text-2xl font-display text-zinc-100 mb-4">
          Post Not Found
        </h1>
        <p className="text-zinc-400 mb-8">
          The post you're looking for doesn't exist.
        </p>
        <Link
          to="/blog"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
        >
          &larr; back to blog
        </Link>
      </main>
    );
  }

  // Handle clicks on PDF links
  // Only intercept normal left clicks - let cmd+click, ctrl+click, middle-click, right-click work normally
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const handleClick = (e: MouseEvent) => {
      // Skip if modifier keys are pressed or not a left click
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      const target = e.target as HTMLElement;
      const pdfLink = target.closest(".pdf-link") as HTMLAnchorElement;

      if (pdfLink) {
        e.preventDefault();
        const file = pdfLink.dataset.pdfFile;
        const page = parseInt(pdfLink.dataset.pdfPage || "1", 10);
        const highlight = pdfLink.dataset.pdfHighlight || null;

        if (file) {
          openPDF(file, page, highlight || null);
        }
      }
    };

    article.addEventListener("click", handleClick);
    return () => article.removeEventListener("click", handleClick);
  }, [openPDF]);

  // Handle copy button clicks for code blocks
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const handleCopyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const copyButton = target.closest(".copy-button") as HTMLButtonElement;

      if (copyButton) {
        const code = copyButton.dataset.code;
        if (code) {
          // Decode HTML entities
          const decoded = code
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"');

          await navigator.clipboard.writeText(decoded);

          // Show success state
          copyButton.classList.add("copied");
          setTimeout(() => {
            copyButton.classList.remove("copied");
          }, 2000);
        }
      }
    };

    article.addEventListener("click", handleCopyClick);
    return () => article.removeEventListener("click", handleCopyClick);
  }, []);

  return (
    <main className="py-8 md:py-12">
      <article ref={articleRef}>
        <header className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-zinc-800">
          <time className="text-zinc-600 font-mono text-sm">
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <h1 className="text-2xl md:text-3xl font-display text-zinc-100 mt-2 tracking-wide">
            {post.title}
          </h1>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/blog/tags/${encodeURIComponent(normalizeTag(tag))}`}
                  className="text-xs font-mono px-2 py-1 bg-zinc-900 text-zinc-500 rounded hover:bg-zinc-800 hover:text-emerald-400 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
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
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      <footer className="mt-12 md:mt-16 pt-8 border-t border-zinc-800">
        <Link
          to="/blog"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
        >
          &larr; back to blog
        </Link>
      </footer>
    </main>
  );
}
