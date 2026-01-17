import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  CodeSquare,
  Minus,
  Link,
  Unlink,
  Image,
  Undo,
  Redo,
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  const buttonClass = (isActive: boolean = false) =>
    `p-1.5 rounded transition-colors ${
      isActive
        ? "bg-emerald-400/20 text-emerald-400"
        : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
    }`;

  const disabledClass = "opacity-40 cursor-not-allowed";

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const iconSize = 16;

  return (
    <div className="flex flex-wrap items-center gap-0.5 py-1.5 px-1">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive("bold"))}
        title="Bold"
      >
        <Bold size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive("italic"))}
        title="Italic"
      >
        <Italic size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={buttonClass(editor.isActive("strike"))}
        title="Strikethrough"
      >
        <Strikethrough size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={buttonClass(editor.isActive("code"))}
        title="Inline Code"
      >
        <Code size={iconSize} />
      </button>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={buttonClass(editor.isActive("heading", { level: 1 }))}
        title="Heading 1"
      >
        <Heading1 size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive("heading", { level: 2 }))}
        title="Heading 2"
      >
        <Heading2 size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={buttonClass(editor.isActive("heading", { level: 3 }))}
        title="Heading 3"
      >
        <Heading3 size={iconSize} />
      </button>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive("bulletList"))}
        title="Bullet List"
      >
        <List size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive("orderedList"))}
        title="Numbered List"
      >
        <ListOrdered size={iconSize} />
      </button>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={buttonClass(editor.isActive("blockquote"))}
        title="Blockquote"
      >
        <Quote size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={buttonClass(editor.isActive("codeBlock"))}
        title="Code Block"
      >
        <CodeSquare size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={buttonClass()}
        title="Horizontal Rule"
      >
        <Minus size={iconSize} />
      </button>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      <button
        type="button"
        onClick={addLink}
        className={buttonClass(editor.isActive("link"))}
        title="Add Link"
      >
        <Link size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive("link")}
        className={`${buttonClass()} ${!editor.isActive("link") ? disabledClass : ""}`}
        title="Remove Link"
      >
        <Unlink size={iconSize} />
      </button>
      <button
        type="button"
        onClick={addImage}
        className={buttonClass()}
        title="Add Image"
      >
        <Image size={iconSize} />
      </button>

      <div className="w-px h-4 bg-zinc-800 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={`${buttonClass()} ${!editor.can().undo() ? disabledClass : ""}`}
        title="Undo"
      >
        <Undo size={iconSize} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={`${buttonClass()} ${!editor.can().redo() ? disabledClass : ""}`}
        title="Redo"
      >
        <Redo size={iconSize} />
      </button>
    </div>
  );
}
