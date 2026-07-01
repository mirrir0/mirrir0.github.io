/**
 * ChangesPanel.tsx — Google-Docs-style review rail, fixed to the right of the
 * editor. Lists each pending suggestion (delete / insert / replace) as a card
 * with per-change accept/reject, plus bulk actions in the footer. Rendered only
 * while suggestions are pending; resolving them all lets autosave resume.
 */
import { Check, X } from "lucide-react";
import type { PendingSuggestion } from "./suggestion-mark";
import { ChangeBody, changeKind } from "./change-label";

interface ChangesPanelProps {
  pending: PendingSuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  /** Scroll the document so this change is centered. */
  onReveal: (id: string) => void;
}

export default function ChangesPanel({ pending, onAccept, onReject, onAcceptAll, onRejectAll, onReveal }: ChangesPanelProps) {
  if (pending.length === 0) return null;

  return (
    <aside
      className="fixed top-[140px] right-3 z-30 w-72 max-h-[calc(100vh-170px)] flex flex-col backdrop-blur-sm"
      style={{
        background: "var(--color-background-secondary, oklch(0.205 0.005 60))",
        border: "1px solid var(--color-border-primary, oklch(0.26 0.005 60))",
        borderRadius: "var(--border-radius-md, 5px)",
      }}
    >
      <header
        className="px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-primary, oklch(0.26 0.005 60))" }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.04em]"
          style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", color: "var(--color-text-secondary, oklch(0.6 0.005 90))" }}
        >
          {pending.length} proposed change{pending.length === 1 ? "" : "s"}
        </span>
      </header>

      <ul className="flex-1 overflow-y-auto">
        {pending.map((s) => (
          <li
            key={s.id}
            onClick={() => onReveal(s.id)}
            title="Jump to this change"
            className="px-3 py-2 cursor-pointer transition-colors hover:bg-[var(--color-background-tertiary,oklch(0.205_0.005_60))]"
            style={{ borderBottom: "1px solid var(--color-border-secondary, oklch(0.26 0.005 60))" }}
          >
            <div
              className="text-sm mb-1.5 break-words leading-snug"
              style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
            >
              <ChangeBody suggestion={s} />
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] uppercase tracking-[0.04em]"
                style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", color: "var(--color-text-tertiary, oklch(0.5 0.005 90))" }}
              >
                {changeKind(s)}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onReject(s.id); }}
                  title="Reject"
                  className="p-1 hover:text-red-400 transition-colors"
                  style={{ color: "var(--color-text-tertiary, oklch(0.5 0.005 90))", borderRadius: "var(--border-radius-sm, 4px)" }}
                >
                  <X size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAccept(s.id); }}
                  title="Accept"
                  className="p-1 hover:text-emerald-400 transition-colors"
                  style={{ color: "var(--color-text-tertiary, oklch(0.5 0.005 90))", borderRadius: "var(--border-radius-sm, 4px)" }}
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <footer
        className="flex items-center gap-1 px-2 py-2 shrink-0"
        style={{ borderTop: "1px solid var(--color-border-primary, oklch(0.26 0.005 60))" }}
      >
        <button
          type="button"
          onClick={onRejectAll}
          className="flex-1 h-7 text-xs hover:text-red-300 transition-colors"
          style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", color: "var(--color-text-secondary, oklch(0.6 0.005 90))", borderRadius: "var(--border-radius-sm, 4px)" }}
        >
          Reject all
        </button>
        <button
          type="button"
          onClick={onAcceptAll}
          className="flex-1 h-7 text-xs hover:text-emerald-300 transition-colors"
          style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", color: "#34d399", borderRadius: "var(--border-radius-sm, 4px)" }}
        >
          Accept all
        </button>
      </footer>
    </aside>
  );
}
