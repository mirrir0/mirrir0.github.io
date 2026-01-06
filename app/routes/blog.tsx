import { Link } from "react-router";
import type { Route } from "./+types/blog";
import { getAllPosts } from "~/lib/markdown.server";
import { normalizeTag } from "~/lib/utils";

export function meta() {
  return [
    { title: "Blog" },
    { name: "description", content: "Technical blog posts" },
  ];
}

export async function loader() {
  const posts = await getAllPosts();
  return { posts };
}

export default function Blog({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData;

  return (
    <main className="py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <h1 className="text-2xl font-display text-zinc-100 mb-2 tracking-wide">blog</h1>
        <p className="text-zinc-500 font-mono text-sm">
          technical writings and notes
        </p>
      </header>

      <div className="space-y-6 md:space-y-8">
        {posts.map((post) => (
          <article key={post.slug} className="group">
            <Link to={`/blog/${post.slug}`} className="block">
              <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4 mb-1">
                <time className="text-zinc-600 font-mono text-sm shrink-0">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  })}
                </time>
                <h2 className="text-zinc-100 group-hover:text-emerald-400 transition-colors font-mono">
                  {post.title}
                </h2>
              </div>
              {post.description && (
                <p className="text-zinc-500 text-sm md:ml-[88px]">
                  {post.description}
                </p>
              )}
            </Link>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 md:ml-[88px]">
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
          </article>
        ))}
      </div>

      <footer className="mt-12 md:mt-16 pt-8 border-t border-zinc-800 flex gap-6">
        <Link
          to="/"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
        >
          &larr; back to home
        </Link>
        <Link
          to="/blog/tags"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
        >
          browse tags
        </Link>
      </footer>
    </main>
  );
}
