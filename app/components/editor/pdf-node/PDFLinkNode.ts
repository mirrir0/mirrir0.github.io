import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import PDFLinkNodeView from "./PDFLinkNodeView";

export interface PDFLinkOptions {
  HTMLAttributes: Record<string, unknown>;
}

export interface PDFLinkAttributes {
  file: string | null;
  page: number;
  highlight: string | null;
  label: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pdfLink: {
      /**
       * Insert a PDF link node
       */
      setPDFLink: (options: {
        file: string;
        page?: number;
        highlight?: string | null;
        label?: string | null;
      }) => ReturnType;
    };
  }
}

export const PDFLinkNode = Node.create<PDFLinkOptions>({
  name: "pdfLink",

  group: "inline",

  inline: true,

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      file: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-file"),
        renderHTML: (attributes: PDFLinkAttributes) => {
          if (!attributes.file) {
            return {};
          }
          return { "data-file": attributes.file };
        },
      },
      page: {
        default: 1,
        parseHTML: (element: HTMLElement) => {
          const page = element.getAttribute("data-page");
          return page ? parseInt(page, 10) : 1;
        },
        renderHTML: (attributes: PDFLinkAttributes) => {
          return { "data-page": attributes.page };
        },
      },
      highlight: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-highlight"),
        renderHTML: (attributes: PDFLinkAttributes) => {
          if (!attributes.highlight) {
            return {};
          }
          return { "data-highlight": attributes.highlight };
        },
      },
      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-label"),
        renderHTML: (attributes: PDFLinkAttributes) => {
          if (!attributes.label) {
            return {};
          }
          return { "data-label": attributes.label };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-pdf-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-pdf-link": "",
      }),
    ];
  },

  // v3 native @tiptap/markdown drops any node without a renderMarkdown handler
  // (MarkdownManager returns '' for unknown node types). PDF links are a custom
  // atom node with no Markdown syntax, so serialize them as the same HTML span
  // we emit in renderHTML — `marked` passes inline HTML through to the baked
  // post, and on load native Markdown re-parses it via parseHTML above. Without
  // this, editing+saving a draft containing a PDF link would silently lose it.
  renderMarkdown: (node: { attrs?: Record<string, unknown> }): string => {
    const a = (node.attrs ?? {}) as Partial<PDFLinkAttributes>;
    if (!a.file) return "";
    const esc = (v: unknown) =>
      String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const attrs = [
      `data-pdf-link=""`,
      `data-file="${esc(a.file)}"`,
      `data-page="${a.page ?? 1}"`,
      a.highlight ? `data-highlight="${esc(a.highlight)}"` : "",
      a.label ? `data-label="${esc(a.label)}"` : "",
    ].filter(Boolean).join(" ");
    return `<span ${attrs}></span>`;
  },

  addCommands() {
    return {
      setPDFLink:
        (options: { file: string; page?: number; highlight?: string | null; label?: string | null }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              file: options.file,
              page: options.page ?? 1,
              highlight: options.highlight ?? null,
              label: options.label ?? null,
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PDFLinkNodeView);
  },
});

export default PDFLinkNode;
