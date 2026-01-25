import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { createElement, createRef } from "react";
import SlashCommandList, { type SlashCommandListRef } from "./SlashCommandList";
import { slashCommands } from "./commands";
import type { SlashCommandItem } from "./types";

const slashCommandPluginKey = new PluginKey("slash-commands");

// Type for the root object
type ReactRoot = {
  render: (element: React.ReactNode) => void;
  unmount: () => void;
};

export const SlashCommands = Extension.create({
  name: "slash-commands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: SuggestionProps["editor"];
          range: SuggestionProps["range"];
          props: SlashCommandItem;
        }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions<SlashCommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        pluginKey: slashCommandPluginKey,
        ...this.options.suggestion,
        items: ({ query }) => {
          return slashCommands.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let container: HTMLDivElement | null = null;
          let root: ReactRoot | null = null;
          let listRef = createRef<SlashCommandListRef>();

          const updatePosition = (clientRect: (() => DOMRect | null) | null) => {
            if (!container || !clientRect) return;

            const rect = clientRect();
            if (rect) {
              container.style.top = `${rect.bottom + 8}px`;
              container.style.left = `${rect.left}px`;
            }
          };

          const handleClickOutside = (event: MouseEvent) => {
            if (container && !container.contains(event.target as Node)) {
              cleanup();
            }
          };

          const cleanup = () => {
            document.removeEventListener("mousedown", handleClickOutside);
            if (root) {
              root.unmount();
              root = null;
            }
            if (container) {
              container.remove();
              container = null;
            }
          };

          return {
            onStart: async (props) => {
              // Dynamically import createRoot to avoid SSR issues
              const { createRoot } = await import("react-dom/client");

              container = document.createElement("div");
              container.style.position = "fixed";
              container.style.zIndex = "50";
              document.body.appendChild(container);

              updatePosition(props.clientRect ?? null);

              root = createRoot(container);
              root.render(
                createElement(SlashCommandList, {
                  items: props.items,
                  command: props.command,
                  ref: listRef,
                })
              );

              // Add click outside listener after a small delay to avoid immediate closing
              setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
              }, 0);
            },

            onUpdate: (props) => {
              updatePosition(props.clientRect ?? null);

              if (root && container) {
                root.render(
                  createElement(SlashCommandList, {
                    items: props.items,
                    command: props.command,
                    ref: listRef,
                  })
                );
              }
            },

            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                cleanup();
                return true;
              }

              return listRef.current?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              cleanup();
            },
          };
        },
      }),
    ];
  },
});

export default SlashCommands;
