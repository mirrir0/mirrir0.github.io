import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import { blogMcpServer } from "./src/mcp-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/api/static/blog/" : "/",
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "blog-mcp-server",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ?? "";
          if (url.startsWith("/mcp/")) {
            const body = await readBody(req);
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (typeof v === "string") headers.set(k, v);
              else if (Array.isArray(v)) headers.set(k, v.join(", "));
            }

            const host = req.headers.host ?? `localhost:${server.config.server.port ?? 3040}`;
            const fetchReq = new Request(`http://${host}${url}`, {
              method: req.method,
              headers,
              body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
            });

            const fetchRes = await blogMcpServer.fetch(fetchReq);

            res.statusCode = fetchRes.status;
            fetchRes.headers.forEach((v, k) => res.setHeader(k, v));

            const resBody = await fetchRes.text();
            res.end(resBody);
            return;
          }
          next();
        });
      },
    },
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

async function readBody(req: import("node:http").IncomingMessage): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(chunks.length > 0 ? Buffer.concat(chunks).toString() : null));
  });
}
