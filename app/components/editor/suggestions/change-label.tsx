/**
 * change-label.tsx — shared rendering of a pending suggestion's content
 * (delete / insert / replace), used by both the inline popover and the changes
 * list so the two stay visually consistent.
 */
import type { PendingSuggestion } from "./suggestion-mark";

const trim = (t: string) => (t.length > 60 ? t.slice(0, 60) + "…" : t);

export function changeKind(s: PendingSuggestion): "replace" | "delete" | "insert" {
  if (s.deleted && s.inserted) return "replace";
  return s.deleted ? "delete" : "insert";
}

export function ChangeBody({ suggestion }: { suggestion: PendingSuggestion }) {
  const s = suggestion;
  if (s.deleted && s.inserted) {
    return (
      <>
        <span className="line-through text-red-300/90">{trim(s.deleted)}</span>
        <span className="text-muted-foreground"> → </span>
        <span className="text-emerald-300">{trim(s.inserted)}</span>
      </>
    );
  }
  if (s.deleted) return <span className="line-through text-red-300/90">{trim(s.deleted)}</span>;
  return <span className="text-emerald-300">{trim(s.inserted)}</span>;
}
