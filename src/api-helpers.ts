/**
 * api-helpers.ts — API fetch utility for the blog panel.
 *
 * API calls always route through __ANO__.serveBase so they hit the
 * backend server process (server.mjs). The dev proxy is only used
 * for static assets and HTML — not for API endpoints.
 */
const ANO = (window as any).__ANO__ || {};
const BASE = ANO.serveBase || "";

export async function callApi(path: string, opts?: { method?: string; body?: unknown }): Promise<unknown> {
  const url = BASE + path;
  const r = await fetch(url, {
    method: opts?.method ?? "GET",
    headers: opts?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`API ${path}: ${r.status}`);
  return json;
}
