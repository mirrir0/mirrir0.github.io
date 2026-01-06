import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  optimizeDeps: {
    include: ['p5', 'react-pdf'],
  },
  ssr: {
    noExternal: ['p5', 'gifenc'],
    external: ['react-pdf', 'pdfjs-dist'],
  },
  resolve: {
    alias: {
      'gifenc': 'gifenc',
      'warning': path.resolve(__dirname, 'app/lib/warning-shim.ts'),
    },
  },
});
