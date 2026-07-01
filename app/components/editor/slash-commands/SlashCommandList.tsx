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
      <div
        className="overflow-hidden"
        style={{
          background: "var(--color-background-secondary, oklch(0.205 0.005 60))",
          border: "1px solid var(--color-border-primary, oklch(0.26 0.005 60))",
          borderRadius: "var(--border-radius-md, 5px)",
        }}
      >
        <div
          ref={containerRef}
          onWheel={handleWheel}
          className="max-h-80 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full"
          style={{ scrollbarColor: "var(--color-border-primary, oklch(0.26 0.005 60)) transparent" }}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const isSelected = index === selectedIndex;

            return (
              <button
                key={item.title}
                ref={(el) => { itemRefs.current[index] = el; }}
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2 text-left transition-colors"
                style={
                  isSelected
                    ? { color: "#34d399", background: "rgba(52,211,153,0.16)" }
                    : { color: "var(--color-text-secondary, oklch(0.6 0.005 90))" }
                }
                onClick={() => command(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex-shrink-0">
                  <Icon size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span
                    className="text-xs truncate"
                    style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", color: "var(--color-text-tertiary, oklch(0.5 0.005 90))" }}
                  >
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
