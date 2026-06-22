import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import { contentBakePlugin } from "./content-bake.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  // Absolute base: served at the domain root (CNAME mirrir.net /
  // mirrir0.github.io). Deep links like /blog/:slug must resolve assets from
  // /assets, not relative to the current path.
  base: "/",
  define: {
    // Editor (draft routes + tiptap chunk) is included everywhere a backend
    // exists — the dev server (command==="serve") and the ano build — but NOT
    // the public GitHub Pages build, which runs `pnpm build` with BLOG_PUBLIC=1.
    // (ano-server runs its build with a bare environment, so BLOG_PUBLIC is the
    // only reliable discriminator between the public build and the ano build.)
    // A statically-false __BLOG_EDITOR__ lets `__BLOG_EDITOR__ ? lazy(import) :
    // null` in panel.tsx dead-code-eliminate the editor + tiptap from the public
    // bundle. The MCP build (vite.config.mcp.ts) overrides both to true.
    __BLOG_EDITOR__: JSON.stringify(command === "serve" || !process.env.BLOG_PUBLIC),
    __BLOG_MCP__: "false",
  },
  plugins: [
    tailwindcss(),
    react(),
    contentBakePlugin(),
  ],
  server: {
    watch: {
      // content/ is managed by the backend API (server.http.ts) — file writes
      // here are saves, not source changes. Watching them triggers full page
      // reloads on every draft save.
      ignored: ["**/content/**"],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "app"),
      gifenc: "gifenc",
      warning: path.resolve(__dirname, "app/lib/warning-shim.ts"),
    },
  },
  optimizeDeps: {
    include: ["p5", "react-pdf"],
  },
  ssr: {
    noExternal: ["p5", "gifenc"],
    external: ["react-pdf", "pdfjs-dist"],
  },
}));
