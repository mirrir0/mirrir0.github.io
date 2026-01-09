import { Link } from "react-router";
import type { Route } from "./+types/tags.$tag";
import { getPostsByTag, getTagDisplayName } from "~/lib/markdown.server";
import { normalizeTag } from "~/lib/utils";

export function meta({ data }: Route.MetaArgs) {
  if (!data || !data.tag) {
    return [{ title: "Tag Not Found" }];
  }
  return [
    { title: `Posts tagged "${data.tag}"` },
    { name: "description", content: `Blog posts tagged with ${data.tag}` },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const tagParam = params.tag;

  // Get posts for this tag
  const posts = await getPostsByTag(tagParam);

  // Return empty posts instead of throwing 404 to allow prerendering placeholder routes
  if (posts.length === 0) {
    return { posts: [], tag: null, normalizedTag: normalizeTag(tagParam) };
  }

  // Get the display name (original casing)
  const tagDisplayName = (await getTagDisplayName(tagParam)) || tagParam;

  return { posts, tag: tagDisplayName, normalizedTag: normalizeTag(tagParam) };
}

// Handle non-prerendered routes (when ssr:false and route not in prerender list)
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return { posts: [], tag: null, normalizedTag: normalizeTag(params.tag) };
}

export default function TagPage({ loaderData }: Route.ComponentProps) {
  const { posts, tag } = loaderData;

  // Handle not found case
  if (!tag || posts.length === 0) {
    return (
      <main className="py-8 md:py-12">
        <h1 className="text-2xl font-display text-zinc-100 mb-4">
          Tag Not Found
        </h1>
        <p className="text-zinc-400 mb-8">
          No posts found with this tag.
        </p>
        <div className="flex gap-6">
          <Link
            to="/blog"
            className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
          >
            &larr; all posts
          </Link>
          <Link
            to="/blog/tags"
            className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
          >
            all tags
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-zinc-600 font-mono text-lg">#</span>
          <h1 className="text-2xl font-display text-zinc-100 tracking-wide">
            {tag}
          </h1>
        </div>
        <p className="text-zinc-500 font-mono text-sm">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
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
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 md:ml-[88px]">
                  {post.tags.map((postTag) => (
                    <Link
                      key={postTag}
                      to={`/blog/tags/${encodeURIComponent(
                        normalizeTag(postTag)
                      )}`}
                      className="text-xs font-mono px-2 py-1 bg-zinc-900 text-zinc-500 rounded hover:bg-zinc-800 hover:text-emerald-400 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {postTag}
                    </Link>
                  ))}
                </div>
              )}
            </Link>
          </article>
        ))}
      </div>

      <footer className="mt-12 md:mt-16 pt-8 border-t border-zinc-800 flex gap-6">
        <Link
          to="/blog"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
        >
          &larr; all posts
        </Link>
        <Link
          to="/blog/tags"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
        >
          all tags
        </Link>
      </footer>
    </main>
  );
}
