/**
 * mcp-host.ts — a minimal ext-apps host harness (no basic-host needed).
 *
 * Stands in for Claude Desktop: renders the blog panel in an iframe, bridges it
 * to the HTTP MCP server (server.http.ts) via the real ext-apps AppBridge, and
 * exposes buttons that act as "the agent" — each calls a server tool, then
 * delivers the tool input + result to the panel, which navigates + animates.
 *
 * Bundled to a single file by vite.config.host.ts and served (with the panel)
 * from server.http.ts, so the whole demo is one `tsx` process.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
import type { McpUiStyles } from "@modelcontextprotocol/ext-apps/app-bridge";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// ── Theme variable sets ───────────────────────────────────────────────────
// Keys are the MCP-standard McpUiStyleVariableKey set; any key outside that set
// is rejected by AppBridge schema validation.  Values mirror the blog's own
// CSS design tokens so the panel retheming is visually obvious.

// McpUiStyles requires all 76 keys present (values may be undefined).
// We supply only the meaningful subset and cast — the bridge sends only what's set.
const DARK_VARS = {
  "--color-background-primary":   "oklch(0.155 0.005 60)",
  "--color-background-secondary": "oklch(0.205 0.005 60)",
  "--color-background-tertiary":  "oklch(0.205 0.005 60)",
  "--color-text-primary":         "oklch(0.88 0.005 90)",
  "--color-text-secondary":       "oklch(0.6 0.005 90)",
  "--color-text-tertiary":        "oklch(0.5 0.005 90)",
  "--color-border-primary":       "oklch(0.26 0.005 60)",
  "--color-border-secondary":     "oklch(0.26 0.005 60)",
  "--color-ring-primary":         "#34d399",
  "--font-sans":                  '"Fira Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  "--font-mono":                  '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
  "--border-radius-md":           "5px",
  "--border-radius-sm":           "4px",
};

const LIGHT_VARS = {
  "--color-background-primary":   "oklch(0.985 0.002 90)",
  "--color-background-secondary": "oklch(0.955 0.002 90)",
  "--color-background-tertiary":  "oklch(0.955 0.002 90)",
  "--color-text-primary":         "oklch(0.18 0 0)",
  "--color-text-secondary":       "oklch(0.42 0 0)",
  "--color-text-tertiary":        "oklch(0.55 0 0)",
  "--color-border-primary":       "oklch(0.86 0 0)",
  "--color-border-secondary":     "oklch(0.86 0 0)",
  "--color-ring-primary":         "#34d399",
  "--font-sans":                  '"Fira Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  "--font-mono":                  '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
  "--border-radius-md":           "5px",
  "--border-radius-sm":           "4px",
};

const IMPL = { name: "blog-host-harness", version: "1.0.0" };
const log = (m: string) => {
  const el = document.getElementById("log")!;
  el.textContent = `${m}\n${el.textContent}`;
};

const iframe = document.getElementById("panel") as HTMLIFrameElement;

const client = new Client(IMPL);
await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", location.origin)));
const serverCaps = client.getServerCapabilities();
log("connected to MCP server");

const bridge = new AppBridge(
  client,
  IMPL,
  { openLinks: {}, serverTools: serverCaps?.tools, serverResources: serverCaps?.resources },
  {
    hostContext: {
      theme: "dark",
      platform: "web",
      containerDimensions: { maxHeight: 6000 },
      displayMode: "inline",
      availableDisplayModes: ["inline", "fullscreen"],
      styles: { variables: DARK_VARS as unknown as McpUiStyles },
    },
  },
);

// Connect the bridge to the panel iframe once it has loaded, so the host is
// listening before the panel sends its ui/initialize.
await new Promise<void>((resolve) => {
  if (iframe.contentDocument?.readyState === "complete") resolve();
  else iframe.addEventListener("load", () => resolve(), { once: true });
});
await bridge.connect(new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!));
log("panel bridged (ext-apps handshake complete)");

// Theme toggle — lets a developer watch the panel re-theme live.
let currentTheme: "dark" | "light" = "dark";
button("btn-theme-light", async () => {
  if (currentTheme === "light") return;
  currentTheme = "light";
  bridge.setHostContext({ theme: "light", styles: { variables: LIGHT_VARS as unknown as McpUiStyles } });
  log("host → theme: light");
});
button("btn-theme-dark", async () => {
  if (currentTheme === "dark") return;
  currentTheme = "dark";
  bridge.setHostContext({ theme: "dark", styles: { variables: DARK_VARS as unknown as McpUiStyles } });
  log("host → theme: dark");
});

/** One agent step: call a tool, then deliver its input + result to the panel. */
async function drive(name: string, args: Record<string, unknown>) {
  log(`agent → ${name}(${JSON.stringify(args)})`);
  const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
  await bridge.sendToolInput({ arguments: args });
  await bridge.sendToolResult(result);
  return result;
}

function button(id: string, fn: () => Promise<void>) {
  document.getElementById(id)!.addEventListener("click", () => {
    fn().catch((e) => log(`error: ${e?.message ?? e}`));
  });
}

let currentSlug = "";
button("btn-create", async () => {
  const r = await drive("create_draft", { title: "A Post the Agent Wrote" });
  currentSlug = JSON.parse(r.content.find((c) => c.type === "text")!.text).slug;
  log(`opened /draft/${currentSlug}`);
});
button("btn-write", async () => {
  if (!currentSlug) return log("create a draft first");
  await drive("update_draft", {
    slug: currentSlug,
    description: "Written live by an agent over MCP ext-apps.",
    tags: ["mcp", "agents", "live"],
    content: "## the agent is typing\n\nThis paragraph arrived through the ext-apps loop: the host called `update_draft`, the result streamed to the panel, and the editor reconciled it — with an emerald highlight to mark the write.\n\n- tool call\n- postMessage\n- live editor update",
  });
  log("content pushed to editor (watch the glow)");
});
button("btn-replace", async () => {
  if (!currentSlug) return log("create + write a draft first");
  await drive("replace_text", {
    slug: currentSlug,
    find: "the editor reconciled it",
    replace: "the editor live-reconciled the change",
  });
  log("proposed a word-level edit — review it in the panel");
});
button("btn-append", async () => {
  if (!currentSlug) return log("create a draft first");
  await drive("append_text", {
    slug: currentSlug,
    text: "And the human stays in the loop: every agent edit is a suggestion to accept or reject.",
  });
  log("proposed a new paragraph — review it in the panel");
});
button("btn-list", () => drive("list_drafts", {}).then(() => log("→ /drafts")));
button("btn-publish", async () => {
  if (!currentSlug) return log("create a draft first");
  await drive("publish_draft", { slug: currentSlug });
  log(`published → /blog/${currentSlug}`);
});

log("ready — click 'Create draft', then 'Write content'");
