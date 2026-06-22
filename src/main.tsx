/**
 * main.tsx — Entry point for the blog.
 *
 * One react-router route tree, history backend chosen per runtime context:
 *   - Standalone (static GitHub Pages deploy): browser history — real URLs,
 *     shareable deep links (resolved on cold load via public/404.html).
 *   - Anomalous panel: the ano-server proxy serves the app in a same-origin
 *     iframe under a proxy base path and injects window.__ANO__. The browser URL
 *     is the proxy path, not the app's routes, so use in-memory history.
 *   - MCP App (Claude Desktop): rendered in a sandboxed ext-apps iframe. Also
 *     in-memory history; the agent drives navigation via tool results. The
 *     ext-apps `App` client is bootstrapped async after first paint — see
 *     mcp/bootstrap.ts. The __BLOG_MCP__ define is statically false in the other
 *     builds, so this branch (and the ext-apps client) is dead-code-eliminated.
 */

import { createRoot } from "react-dom/client";
import { createBrowserRouter, createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { routes } from "./panel";
import "../app/app.css";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

const isAno = "__ANO__" in window;
const isMcp = __BLOG_MCP__ && window.parent !== window;
const router = isAno || isMcp ? createMemoryRouter(routes) : createBrowserRouter(routes);

createRoot(root).render(<RouterProvider router={router} />);

// MCP mode: wire the panel as an ext-apps App so the agent's tool calls drive
// navigation + the editor. Async; never blocks first paint.
if (isMcp) {
  void import("./mcp/bootstrap").then((m) => m.bootstrapMcp(router));
}
