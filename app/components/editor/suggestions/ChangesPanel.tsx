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
    <aside className="fixed top-[140px] right-3 z-30 w-72 max-h-[calc(100vh-170px)] flex flex-col border border-zinc-700 bg-zinc-950/95 backdrop-blur-sm rounded-[5px]">
      <header className="px-3 py-2 border-b border-zinc-800 shrink-0">
        <span className="text-[10px] uppercase tracking-[0.04em] text-zinc-400 font-mono">
          {pending.length} proposed change{pending.length === 1 ? "" : "s"}
        </span>
      </header>

      <ul className="flex-1 overflow-y-auto divide-y divide-zinc-900">
        {pending.map((s) => (
          <li
            key={s.id}
            onClick={() => onReveal(s.id)}
            title="Jump to this change"
            className="px-3 py-2 cursor-pointer hover:bg-zinc-900/60 transition-colors"
          >
            <div className="text-sm font-mono mb-1.5 break-words leading-snug">
              <ChangeBody suggestion={s} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.04em] text-zinc-600 font-mono">{changeKind(s)}</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onReject(s.id); }}
                  title="Reject"
                  className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-[5px] transition-colors"
                >
                  <X size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAccept(s.id); }}
                  title="Accept"
                  className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-900 rounded-[5px] transition-colors"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <footer className="flex items-center gap-1 px-2 py-2 border-t border-zinc-800 shrink-0">
        <button
          type="button"
          onClick={onRejectAll}
          className="flex-1 h-7 text-xs font-mono text-zinc-400 hover:text-red-300 hover:bg-zinc-900 rounded-[5px] transition-colors"
        >
          Reject all
        </button>
        <button
          type="button"
          onClick={onAcceptAll}
          className="flex-1 h-7 text-xs font-mono text-emerald-400 hover:text-emerald-300 hover:bg-zinc-900 rounded-[5px] transition-colors"
        >
          Accept all
        </button>
      </footer>
    </aside>
  );
}
