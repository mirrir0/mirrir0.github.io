import { Link, Form, useLoaderData, useFetcher } from "react-router";
import { redirect } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "react-router";
import { getAllDrafts, createDraft, deleteDraft, publishDraft, type DraftMeta } from "~/lib/drafts.server";
import { DraftMenu } from "~/components/DraftMenu";

export const meta: MetaFunction = () => {
  return [
    { title: "Drafts" },
    { name: "description", content: "Draft posts" },
  ];
};

export async function loader(_args: LoaderFunctionArgs) {
  if (!import.meta.env.DEV) {
    throw new Response("Not Found", { status: 404 });
  }
  const drafts = await getAllDrafts();
  return { drafts };
}

export async function action({ request }: ActionFunctionArgs) {
  if (!import.meta.env.DEV) {
    throw new Response("Forbidden", { status: 403 });
  }
  const formData = await request.formData();
  const intent = formData.get("intent");
  const slug = formData.get("slug") as string;

  if (intent === "create" && slug) {
    await createDraft(slug);
    return redirect(`/draft/${slug}`);
  }

  if (intent === "delete" && slug) {
    await deleteDraft(slug);
    return { success: true };
  }

  if (intent === "publish" && slug) {
    await publishDraft(slug);
    return redirect(`/blog/${slug}`);
  }

  // Backwards compatibility for create form without intent
  if (slug) {
    await createDraft(slug);
    return redirect(`/draft/${slug}`);
  }

  return null;
}

function DraftRow({ draft }: { draft: DraftMeta }) {
  const fetcher = useFetcher();

  const handlePublish = () => {
    if (confirm("Are you sure you want to publish this draft? It will be moved to the published posts.")) {
      fetcher.submit(
        { intent: "publish", slug: draft.slug },
        { method: "post" }
      );
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this draft? This cannot be undone.")) {
      fetcher.submit(
        { intent: "delete", slug: draft.slug },
        { method: "post" }
      );
    }
  };

  return (
    <article className="group relative">
      <div className="absolute top-0 right-0">
        <DraftMenu
          variant="list"
          onPublish={handlePublish}
          onDelete={handleDelete}
        />
      </div>
      <Link to={`/draft/${draft.slug}`} className="block pr-10">
        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4 mb-1">
          <time className="text-zinc-600 font-mono text-sm shrink-0">
            {new Date(draft.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })}
          </time>
          <h2 className="text-zinc-100 group-hover:text-emerald-400 transition-colors font-mono">
            {draft.title}
          </h2>
        </div>
        {draft.description && (
          <p className="text-zinc-500 text-sm md:ml-[88px]">
            {draft.description}
          </p>
        )}
      </Link>
      {draft.tags && draft.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 md:ml-[88px]">
          {draft.tags.map((tag: string) => (
            <span
              key={tag}
              className="text-xs font-mono px-2 py-1 bg-zinc-900 text-zinc-500 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function DraftsPage() {
  const { drafts } = useLoaderData<typeof loader>();

  return (
    <main className="py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <h1 className="text-2xl font-display text-zinc-100 mb-2 tracking-wide">drafts</h1>
        <p className="text-zinc-500 font-mono text-sm">
          unpublished posts and works in progress
        </p>
      </header>

      <Form method="post" className="mb-8 md:mb-12">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="slug"
            placeholder="new-draft-slug"
            required
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-mono text-sm rounded transition-colors"
          >
            + New Draft
          </button>
        </div>
      </Form>

      {drafts.length === 0 ? (
        <p className="text-zinc-500 font-mono text-sm">
          No drafts yet. Create one above to get started.
        </p>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {drafts.map((draft: DraftMeta) => (
            <DraftRow key={draft.slug} draft={draft} />
          ))}
        </div>
      )}

      <footer className="mt-12 md:mt-16 pt-8 border-t border-zinc-800 flex gap-6">
        <Link
          to="/"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
        >
          &larr; back to home
        </Link>
        <Link
          to="/blog"
          className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
        >
          view published
        </Link>
      </footer>
    </main>
  );
}
