/**
 * main.tsx — Entry point for the blog.
 *
 * One react-router route tree, two history backends chosen at the boundary:
 *   - Standalone (static GitHub Pages deploy): browser history — real URLs,
 *     shareable deep links (resolved on cold load via public/404.html).
 *   - Embedded as an Anomalous panel: the ano-server proxy serves the app in a
 *     same-origin iframe under a proxy base path (/api/v1/apps/blog/s/...) and
 *     injects window.__ANO__. The browser URL there is the proxy path, not the
 *     app's own routes, so browser history can't drive routing — use in-memory
 *     history instead. (Note: the iframe is same-origin per
 *     AnomalousRuntimePanel's sandbox, so an origin check would not detect it;
 *     __ANO__ is the reliable marker.)
 */

import { createRoot } from "react-dom/client";
import { createBrowserRouter, createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { routes } from "./panel";
import "../app/app.css";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

const isEmbedded = "__ANO__" in window;
const router = isEmbedded ? createMemoryRouter(routes) : createBrowserRouter(routes);

createRoot(root).render(<RouterProvider router={router} />);
