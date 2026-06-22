import { defineConfig, mergeConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import baseConfig from "./vite.config.ts";

/**
 * MCP App build — produces a single self-contained HTML file (dist-mcp/
 * mcp-app.html) for the ext-apps resource served by server.ts. Everything
 * inlines (JS, CSS, font) so the sandboxed Claude Desktop iframe loads with no
 * external requests. __BLOG_MCP__ tree-shakes out the heavy/worker-bound deps
 * (Dither/three.js, the pdf.js viewer) that can't be inlined.
 */
export default defineConfig(async (env) => {
  const base = typeof baseConfig === "function" ? await baseConfig(env) : baseConfig;
  return mergeConfig(base, {
    base: "./",
    define: {
      __BLOG_EDITOR__: "true",
      __BLOG_MCP__: "true",
    },
    plugins: [viteSingleFile()],
    build: {
      outDir: "dist-mcp",
      // Inline every asset (the Kapel/Quadrunde fonts) as data URIs so the
      // single file is truly self-contained.
      assetsInlineLimit: 100_000_000,
      rollupOptions: { input: "mcp-app.html" },
    },
  });
});
