/**
 * Build-time defines injected by vite (see vite.config.ts / vite.config.mcp.ts).
 *
 * __BLOG_EDITOR__ — draft editor (routes + tiptap chunk) is compiled in. False
 *   only for the public GitHub Pages build so the editor is dead-code-eliminated.
 * __BLOG_MCP__ — this is the MCP App single-file build; gates the ext-apps client
 *   bootstrap and excludes heavy/worker-bound deps (Dither, pdf.js).
 */
declare const __BLOG_EDITOR__: boolean;
declare const __BLOG_MCP__: boolean;
