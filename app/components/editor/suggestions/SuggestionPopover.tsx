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
      style={{ position: "fixed", zIndex: 60, maxWidth: POPOVER_W, ...style }}
      className="flex items-center gap-1.5 border border-zinc-700 bg-zinc-950/95 backdrop-blur-sm rounded-[5px] pl-2.5 pr-1 py-1"
      onMouseDown={(e) => e.preventDefault()}
    >
      {suggestion && (
        <span className="text-xs font-mono truncate min-w-0">
          <ChangeBody suggestion={suggestion} />
        </span>
      )}
      <button
        type="button"
        onClick={() => onReject(anchor.id)}
        title="Reject change"
        className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-[5px] transition-colors"
      >
        <X size={14} />
      </button>
      <button
        type="button"
        onClick={() => onAccept(anchor.id)}
        title="Accept change"
        className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 rounded-[5px] transition-colors"
      >
        <Check size={14} />
      </button>
    </div>
  );
}
