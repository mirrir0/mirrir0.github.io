import { defineApp } from "@anomalous/sdk/manifest";

export default defineApp({
  version: 1,
  type: "blog",
  label: "Blog",
  devPort: 3040,

  dev: {
    command: "vite --port 3040",
    installCommand: "pnpm install",
  },

  mode: "panel",

  services: {
    mcp: {
      type: "mcp",
      tools: [
        "list_posts", "get_post", "list_tags", "get_posts_by_tag",
        "list_drafts", "get_draft", "save_draft", "create_draft",
        "delete_draft", "rename_draft", "publish_draft",
      ],
    },
  },

  needs: ["rpc", "theme", "navigation", "toasts"],

  build: {
    command: "pnpm build",
    outputDir: "dist",
  },
});
