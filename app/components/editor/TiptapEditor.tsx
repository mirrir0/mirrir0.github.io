import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import EditorToolbar from "./EditorToolbar";
import { useEffect, useState } from "react";
import { lowlight } from "~/lib/lowlight";
import { PDFLinkNode } from "./pdf-node";
import { SlashCommands } from "./slash-commands";
import { SuggestionMark } from "./suggestions/suggestion-mark";
import { DocumentPicker } from "./document-picker";

interface TiptapEditorProps {
  content: string; // markdown content
  onChange: (content: string) => void;
  // Surfaces the editor instance so the route can drive it (agent edits,
  // accept/reject). Called with the instance on ready and null on teardown.
  onEditor?: (editor: Editor | null) => void;
  // Sticky offset for the toolbar within its scroll container. The standalone
  // route scrolls under a ~120px fixed page header; the MCP panel scrolls inside
  // its own body and passes "0px" to avoid a dead gap above the toolbar.
  toolbarTop?: string;
}

export default function TiptapEditor({ content, onChange, onEditor, toolbarTop = "120px" }: TiptapEditorProps) {
  const [isDocPickerOpen, setIsDocPickerOpen] = useState(false);
  const [docPickerTab, setDocPickerTab] = useState<'search' | 'upload'>('search');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block, use CodeBlockLowlight instead
        link: { openOnClick: false }, // v3: Link is bundled in StarterKit
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "hljs",
        },
      }),
      Image,
      PDFLinkNode,
      SlashCommands,
      SuggestionMark,
      Markdown,
    ],
    content, // Parsed as markdown (see contentType below)
    contentType: "markdown", // v3 @tiptap/markdown: treat `content` as markdown
    immediatelyRender: false, // Fix SSR hydration warning
    // v3 disables per-transaction rerenders by default; EditorToolbar reads
    // editor.isActive()/can() during render, so opt back in to keep it live.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      // v3 native markdown: Editor.getMarkdown() replaces the old
      // editor.storage.markdown.getMarkdown() from tiptap-markdown.
      onChange(editor.getMarkdown());
    },
  });

  // Listen for slash command events to open document picker
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setDocPickerTab(e.detail.type === 'upload' ? 'upload' : 'search');
      setIsDocPickerOpen(true);
    };
    window.addEventListener('editor:open-document-picker', handler as EventListener);
    return () => window.removeEventListener('editor:open-document-picker', handler as EventListener);
  }, []);

  // Update editor content when prop changes externally (e.g. agent push, SSE).
  // emitUpdate:false prevents this programmatic set from echoing back through
  // onUpdate -> onChange -> autosave. v3 setContent emits updates by default.
  useEffect(() => {
    if (editor && content !== editor.getMarkdown()) {
      editor.commands.setContent(content, { contentType: "markdown", emitUpdate: false });
    }
  }, [content, editor]);

  // Surface the editor instance to the route (for agent edits + accept/reject).
  useEffect(() => {
    onEditor?.(editor ?? null);
    return () => onEditor?.(null);
  }, [editor, onEditor]);

  return (
    // max-w-3xl mx-auto matches the public app's reading column (panel.tsx),
    // so the editing measure equals the published measure.
    <div className="flex flex-col max-w-3xl mx-auto w-full">
      <div
        className="sticky z-10"
        style={{ top: toolbarTop, background: "var(--color-background-primary, oklch(0.155 0.005 60))" }}
      >
        <EditorToolbar editor={editor} onOpenDocumentPicker={() => setIsDocPickerOpen(true)} />
      </div>
      <div className="flex-1">
        {/* prose max-w-none provides typography plugin structure;
            blog-editor scopes all color/theme rules via app.css */}
        <EditorContent
          editor={editor}
          className="blog-editor prose max-w-none"
        />
      </div>
      <DocumentPicker
        isOpen={isDocPickerOpen}
        onClose={() => setIsDocPickerOpen(false)}
        defaultTab={docPickerTab}
        onSelect={(file: string, page?: number) => {
          editor?.commands.setPDFLink({ file, page: page ?? 1 });
          setIsDocPickerOpen(false);
        }}
      />
    </div>
  );
}
