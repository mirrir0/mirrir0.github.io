/**
 * SuggestionPopover.tsx — inline accept/reject control anchored to a clicked
 * suggestion mark. Shown when the user clicks any `.ano-sugg` span; acts on that
 * one change by id. Placed to the RIGHT of the mark when there's room, otherwise
 * ABOVE it.
 */
import { Check, X } from "lucide-react";
import type { PendingSuggestion } from "./suggestion-mark";
import { ChangeBody } from "./change-label";

export interface PopoverAnchor {
  id: string;
  rect: { top: number; right: number; bottom: number; left: number; width: number; height: number };
}

interface SuggestionPopoverProps {
  anchor: PopoverAnchor;
  suggestion: PendingSuggestion | undefined;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

// Approximate popover footprint, used only to choose right-vs-above placement
// and keep it on-screen. Wider now that it shows the change content.
const GAP = 8;
const POPOVER_W = 280;
const POPOVER_H = 34;

export default function SuggestionPopover({ anchor, suggestion, onAccept, onReject }: SuggestionPopoverProps) {
  const { rect } = anchor;
  const fitsRight = rect.right + GAP + POPOVER_W <= window.innerWidth;

  const style: React.CSSProperties = fitsRight
    ? { top: rect.top + rect.height / 2, left: rect.right + GAP, transform: "translateY(-50%)" }
    : { top: rect.top - POPOVER_H - GAP, left: rect.left + rect.width / 2, transform: "translateX(-50%)" };

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 60,
        maxWidth: POPOVER_W,
        background: "var(--color-background-secondary, oklch(0.205 0.005 60))",
        border: "1px solid var(--color-border-primary, oklch(0.26 0.005 60))",
        borderRadius: "var(--border-radius-md, 5px)",
        ...style,
      }}
      className="flex items-center gap-1.5 backdrop-blur-sm pl-2.5 pr-1 py-1"
      onMouseDown={(e) => e.preventDefault()}
    >
      {suggestion && (
        <span
          className="text-xs truncate min-w-0"
          style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
        >
          <ChangeBody suggestion={suggestion} />
        </span>
      )}
      <button
        type="button"
        onClick={() => onReject(anchor.id)}
        title="Reject change"
        className="p-1 hover:text-red-400 transition-colors"
        style={{
          color: "var(--color-text-tertiary, oklch(0.5 0.005 90))",
          borderRadius: "var(--border-radius-sm, 4px)",
        }}
      >
        <X size={14} />
      </button>
      <button
        type="button"
        onClick={() => onAccept(anchor.id)}
        title="Accept change"
        className="p-1 hover:text-emerald-400 transition-colors"
        style={{
          color: "var(--color-text-tertiary, oklch(0.5 0.005 90))",
          borderRadius: "var(--border-radius-sm, 4px)",
        }}
      >
        <Check size={14} />
      </button>
    </div>
  );
}
