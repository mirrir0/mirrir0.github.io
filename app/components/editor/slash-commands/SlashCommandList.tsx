import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SlashCommandItem } from "./types";

export interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    // Scroll selected item into view
    useEffect(() => {
      const selectedItem = itemRefs.current[selectedIndex];
      if (selectedItem && containerRef.current) {
        selectedItem.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }

        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) {
            command(item);
          }
          return true;
        }

        return false;
      },
    }));

    // Prevent scroll from bubbling to page
    const handleWheel = (e: React.WheelEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtTop = scrollTop === 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight;

      // Prevent scroll if at boundary and trying to scroll further
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (items.length === 0) {
      return null;
    }

    return (
      // Outer wrapper clips the scrollbar corners on all browsers
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden">
        <div
          ref={containerRef}
          onWheel={handleWheel}
          className="max-h-80 overflow-y-auto overscroll-contain
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-zinc-600
            [&::-webkit-scrollbar-thumb]:rounded-full
            scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-600"
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const isSelected = index === selectedIndex;

            return (
              <button
                key={item.title}
                ref={(el) => { itemRefs.current[index] = el; }}
                type="button"
                className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-emerald-400/20 text-emerald-400"
                    : "text-zinc-300 hover:bg-zinc-700"
                }`}
                onClick={() => command(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex-shrink-0">
                  <Icon size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="font-mono text-xs text-zinc-500 truncate">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

SlashCommandList.displayName = "SlashCommandList";

export default SlashCommandList;
