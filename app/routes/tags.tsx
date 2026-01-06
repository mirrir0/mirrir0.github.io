import { Link } from "react-router";
import type { Route } from "./+types/tags";
import { getAllTags } from "~/lib/markdown.server";

export function meta() {
  return [
    { title: "All Tags" },
    { name: "description", content: "Browse blog posts by tag" },
  ];
}

export async function loader() {
  const tags = await getAllTags();
  return { tags };
}

export default function TagsIndex({ loaderData }: Route.ComponentProps) {
  const { tags } = loaderData;

  return (
    <main className="py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <h1 className="text-2xl font-display text-zinc-100 mb-2 tracking-wide">
          tags
        </h1>
        <p className="text-zinc-500 font-mono text-sm">
          browse posts by topic
        </p>
      </header>

      {tags.length === 0 ? (
        <p className="text-zinc-500 font-mono text-sm">No tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map(({ tag, count, normalized }) => (
            <Link
              key={normalized}
              to={`/blog/tags/${encodeURIComponent(normalized)}`}
              className="group flex items-baseline gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 rounded transition-colors"
            >
              <span className="text-zinc-600 group-hover:text-emerald-400 font-mono text-sm transition-colors">
                #
              </span>
              <span className="text-zinc-100 group-hover:text-emerald-400 font-mono transition-colors">
                {tag}
              </span>
              <span className="text-zinc-600 font-mono text-xs">
                ({count})
              </span>
            </Link>
          ))}
        </div>
      )}

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
