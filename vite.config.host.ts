import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * Builds the ext-apps host harness (mcp-host.html + src/mcp-host.ts) into a
 * single self-contained file (dist-host/mcp-host.html). server.http.ts serves
 * it at /host alongside the panel at /panel, so the whole live demo runs from
 * one tsx process. Not part of the shipped app.
 */
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist-host",
    target: "esnext",
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: "mcp-host.html" },
  },
});
