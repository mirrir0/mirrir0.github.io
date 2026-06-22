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
}

export default function TiptapEditor({ content, onChange, onEditor }: TiptapEditorProps) {
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
    <div className="flex flex-col">
      <div className="sticky top-[120px] z-10 bg-zinc-950">
        <EditorToolbar editor={editor} onOpenDocumentPicker={() => setIsDocPickerOpen(true)} />
      </div>
      <div className="flex-1">
        <EditorContent
          editor={editor}
          className="min-h-[400px] p-4
            prose prose-invert prose-zinc max-w-none
            prose-headings:font-mono prose-headings:font-normal
            prose-h1:text-xl prose-h1:md:text-2xl prose-h2:text-lg prose-h2:md:text-xl prose-h3:text-base prose-h3:md:text-lg
            prose-p:text-zinc-300 prose-p:leading-relaxed
            prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
            prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:overflow-x-auto
            prose-strong:text-zinc-100
            prose-ul:text-zinc-300 prose-ol:text-zinc-300
            prose-li:marker:text-zinc-600
            prose-hr:border-zinc-800
            prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400
            [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px]"
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
