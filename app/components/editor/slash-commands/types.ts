import type { Editor, Range } from "@tiptap/core";
import type { ComponentType } from "react";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
  command: (props: { editor: Editor; range: Range }) => void;
}
