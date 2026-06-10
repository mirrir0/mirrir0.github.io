import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import { contentBakePlugin } from "./content-bake.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  // Absolute base: served at the domain root (CNAME mirrir.net /
  // mirrir0.github.io). Deep links like /blog/:slug must resolve assets from
  // /assets, not relative to the current path.
  base: "/",
  plugins: [
    tailwindcss(),
    react(),
    contentBakePlugin(),
  ],
  server: {
    watch: {
      // content/ is managed by the backend API (server.mjs) — file writes
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
