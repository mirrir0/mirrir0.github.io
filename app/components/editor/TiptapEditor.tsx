import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";
import EditorToolbar from "./EditorToolbar";
import { useEffect, useState } from "react";
import { lowlight } from "~/lib/lowlight";
import { PDFLinkNode } from "./pdf-node";
import { SlashCommands } from "./slash-commands";
import { DocumentPicker } from "./document-picker";

interface TiptapEditorProps {
  content: string; // markdown content
  onChange: (content: string) => void;
}

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const [isDocPickerOpen, setIsDocPickerOpen] = useState(false);
  const [docPickerTab, setDocPickerTab] = useState<'search' | 'upload'>('search');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block, use CodeBlockLowlight instead
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "hljs",
        },
      }),
      Link.configure({ openOnClick: false }),
      Image,
      PDFLinkNode,
      SlashCommands,
      Markdown,
    ],
    content, // Will be parsed as markdown by tiptap-markdown
    immediatelyRender: false, // Fix SSR hydration warning
    onUpdate: ({ editor }) => {
      // Export markdown via editor.storage.markdown.getMarkdown()
      const markdown = editor.storage.markdown.getMarkdown();
      onChange(markdown);
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

  // Update editor content when prop changes externally
  useEffect(() => {
    if (editor && content !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

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
