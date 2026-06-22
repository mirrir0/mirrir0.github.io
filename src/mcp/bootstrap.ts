/**
 * bootstrap.ts — wires the panel as an ext-apps App client (MCP mode only).
 *
 * The agent's model-visible tool calls drive the rendered panel: each tool
 * returns a UI intent in `structuredContent`, which we map to router
 * navigation and (for drafts) a content push into the live editor. Two host
 * behaviours are covered: a reused ("warm") view fires `ontoolresult`; a fresh
 * ("cold") view per call exposes the originating tool via getHostContext().
 *
 * Loaded via dynamic import only when __BLOG_MCP__ is true, so ext-apps never
 * enters the standalone/ano bundles.
 */
import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
} from "@modelcontextprotocol/ext-apps";
import { setApp } from "./app-singleton";
import { pushDraft, pushEdit, type BlogDraft, type BlogEdit } from "./intent-bus";

/** Mirror of the server.ts intent envelope (the tool result's structuredContent). */
interface BlogIntent {
  v: 1;
  view: "drafts" | "draft" | "post" | "blog";
  slug?: string;
  draft?: BlogDraft | null;
  edit?: BlogEdit | null;
  nonce: number;
}

/** Minimal structural type for the react-router data router instance. */
interface NavRouter {
  navigate: (to: string) => void | Promise<void>;
}

/** Navigate with a View Transition so agent-driven view changes animate
 *  (crossfade + slide, styled in app.css). Falls back to a plain navigate
 *  where the API is unavailable. */
function nav(router: NavRouter, to: string): void {
  const start = (document as Document & { startViewTransition?: (cb: () => void) => void }).startViewTransition;
  if (typeof start === "function") start.call(document, () => { void router.navigate(to); });
  else void router.navigate(to);
}

function applyIntent(router: NavRouter, structured: unknown): void {
  const intent = structured as BlogIntent | undefined;
  if (!intent || intent.v !== 1) return;
  switch (intent.view) {
    case "drafts":
      nav(router, "/drafts");
      break;
    case "blog":
      nav(router, "/blog");
      break;
    case "post":
      if (intent.slug) nav(router, `/blog/${intent.slug}`);
      break;
    case "draft":
      if (!intent.slug) break;
      nav(router, `/draft/${intent.slug}`);
      // A surgical edit applies as a pending suggestion; a draft payload is a
      // full-content replace. The two are mutually exclusive per tool.
      if (intent.edit) pushEdit({ slug: intent.slug, edit: intent.edit, nonce: intent.nonce });
      else if (intent.draft) pushDraft({ ...intent.draft, nonce: intent.nonce });
      break;
  }
}

/**
 * Optimistic, tool-name-less early nav. `ontoolinput` carries only the
 * arguments, so the most we can do before the result lands is jump to the
 * draft being addressed. The authoritative `applyIntent` (from the result)
 * follows and fills content.
 */
function applyIntentEarly(router: NavRouter, params: { arguments?: Record<string, unknown> }): void {
  const slug = params?.arguments?.slug;
  if (typeof slug === "string") nav(router, `/draft/${slug}`);
}

/**
 * Cold-start fallback (fresh view per call): the host context exposes only the
 * instantiating tool's *name* (its definition), not the call arguments — so the
 * slug-bearing routes can't be derived here. Those are covered by the host
 * replaying `ontoolinput`/`ontoolresult` to the freshly-connected app. We only
 * handle the slug-less landing, which can't clobber a handler-driven nav since
 * its target matches the tool's own intent.
 */
function applyInitialRoute(router: NavRouter, toolName: string | undefined): void {
  if (toolName === "list_drafts" || toolName === "delete_draft") {
    nav(router, "/drafts");
  }
}

export async function bootstrapMcp(router: NavRouter): Promise<void> {
  const app = new App({ name: "blog", version: "1.0.0" });
  setApp(app);

  // Register ALL handlers before connect — events can fire immediately.
  app.ontoolinput = (params) => applyIntentEarly(router, params);
  app.ontoolresult = (params) => applyIntent(router, params.structuredContent);
  app.onhostcontextchanged = (ctx) => {
    if (ctx.theme) applyDocumentTheme(ctx.theme);
    if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
    if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  };
  app.onteardown = async () => ({});

  await app.connect(new PostMessageTransport(window.parent, window.parent));

  const ctx = app.getHostContext();
  if (ctx?.theme) applyDocumentTheme(ctx.theme);
  applyInitialRoute(router, ctx?.toolInfo?.tool?.name);
}
