import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Image,
  FileText,
  Upload,
} from "lucide-react";
import type { SlashCommandItem } from "./types";

export const slashCommands: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: Heading1,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: List,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: ListOrdered,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Blockquote",
    description: "Add a quote block",
    icon: Quote,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Add a code snippet",
    icon: Code,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Horizontal Rule",
    description: "Insert a divider line",
    icon: Minus,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Image",
    description: "Insert an image from URL",
    icon: Image,
    command: ({ editor, range }) => {
      const url = window.prompt("Enter image URL:");
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      } else {
        editor.chain().focus().deleteRange(range).run();
      }
    },
  },
  {
    title: "PDF",
    description: "Embed a PDF document",
    icon: FileText,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(
        new CustomEvent("editor:open-document-picker", { detail: { type: "pdf" } })
      );
    },
  },
  {
    title: "Upload",
    description: "Upload a file",
    icon: Upload,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(
        new CustomEvent("editor:open-document-picker", { detail: { type: "upload" } })
      );
    },
  },
];
