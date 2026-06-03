import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import { contentBakePlugin } from "./content-bake";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [
    tailwindcss(),
    react(),
    contentBakePlugin(),
  ],
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
