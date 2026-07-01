/**
 * suggestion-mark.ts — a Tiptap mark that flags agent-proposed edits for human
 * review (accept/reject), at word granularity.
 *
 * Two ops coexist while a change is pending:
 *   - "insert": newly-added text. Accept keeps it; reject removes it.
 *   - "delete": text proposed for removal — kept in the doc (struck through)
 *               until resolved. Accept removes it; reject keeps it.
 *
 * The mark deliberately defines NO renderMarkdown, so @tiptap/markdown serializes
 * it transparently (just its text children). That keeps the review layer out of
 * saved markdown — but a pending "delete" mark's text is still physically in the
 * doc, so the editor SUSPENDS autosave while suggestions are pending and only
 * persists once every change is accepted/rejected (see draft-routes).
 */
import { Mark, mergeAttributes } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

export type SuggestionOp = "insert" | "delete";

/**
 * A pending change, surfaced to the review UI. One logical change shares an id;
 * a replace carries both `deleted` (struck old text) and `inserted` (new text),
 * a pure delete only `deleted`, a pure insert only `inserted`.
 */
export interface PendingSuggestion {
  id: string;
  deleted: string;
  inserted: string;
  from: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    suggestion: {
      acceptSuggestion: (id: string) => ReturnType;
      rejectSuggestion: (id: string) => ReturnType;
      acceptAllSuggestions: () => ReturnType;
      rejectAllSuggestions: () => ReturnType;
    };
  }
}

/** Every distinct pending suggestion in the doc, in document order. */
export function collectSuggestions(doc: PMNode): PendingSuggestion[] {
  const byId = new Map<string, PendingSuggestion>();
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== "suggestion") continue;
      const id = mark.attrs.id as string;
      const op = mark.attrs.op as SuggestionOp;
      const text = node.text ?? "";
      const existing = byId.get(id);
      if (existing) {
        if (op === "delete") existing.deleted += text;
        else existing.inserted += text;
      } else {
        byId.set(id, {
          id,
          from: pos,
          deleted: op === "delete" ? text : "",
          inserted: op === "insert" ? text : "",
        });
      }
    }
  });
  return [...byId.values()].sort((a, b) => a.from - b.from);
}

/**
 * Resolve a set of suggestion ids on `tr`, per-range. accept-insert /
 * reject-delete keep the text and drop the mark; accept-delete / reject-insert
 * remove the text. Mutating descending keeps earlier positions valid as the doc
 * shrinks. Returns true if any range was touched. Exported for unit tests.
 */
export function resolveIds(state: EditorState, tr: Transaction, ids: string[], mode: "accept" | "reject"): boolean {
  const markType = state.schema.marks.suggestion;
  const idSet = new Set(ids);
  // `block` is set when the suggestion text is the ENTIRE content of its parent
  // textblock (e.g. an appended paragraph): removing only the text would leave an
  // empty <p>, so we remove the whole node instead. Never set for the doc's first
  // block, so we can't empty the document.
  const ops: Array<{ from: number; to: number; removeText: boolean; block?: { from: number; to: number } }> = [];
  // Walk once; every suggestion range whose id is targeted resolves by its own op.
  state.doc.descendants((node, pos, parent) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== "suggestion" || !idSet.has(mark.attrs.id as string)) continue;
      const op = mark.attrs.op as SuggestionOp;
      const removeText = (mode === "accept" && op === "delete") || (mode === "reject" && op === "insert");
      let block: { from: number; to: number } | undefined;
      if (removeText && parent?.isTextblock && parent.childCount === 1) {
        const from = pos - 1; // the block's opening boundary, just before its text
        if (from > 0) block = { from, to: from + parent.nodeSize };
      }
      ops.push({ from: pos, to: pos + node.nodeSize, removeText, block });
    }
  });
  if (!ops.length) return false;
  ops.sort((a, b) => b.from - a.from);
  for (const o of ops) {
    if (o.removeText) tr.delete(o.block ? o.block.from : o.from, o.block ? o.block.to : o.to);
    else tr.removeMark(o.from, o.to, markType);
  }
  return true;
}

export const SuggestionMark = Mark.create({
  name: "suggestion",

  // Don't extend the mark when typing at its boundaries — a pending change is a
  // fixed span, not a live formatting state the user is "inside".
  inclusive: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-sugg-id"),
        renderHTML: (attrs: Record<string, unknown>) => (attrs.id ? { "data-sugg-id": attrs.id } : {}),
      },
      op: {
        default: "insert",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-sugg-op") || "insert",
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-sugg-op": attrs.op }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-sugg-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const op = (HTMLAttributes["data-sugg-op"] as string) ?? "insert";
    return ["span", mergeAttributes(HTMLAttributes, { class: `ano-sugg ano-sugg-${op}` }), 0];
  },

  addCommands() {
    return {
      acceptSuggestion:
        (id: string) =>
        ({ state, tr, dispatch }) => {
          const ok = resolveIds(state, tr, [id], "accept");
          if (ok && dispatch) dispatch(tr);
          return ok;
        },
      rejectSuggestion:
        (id: string) =>
        ({ state, tr, dispatch }) => {
          const ok = resolveIds(state, tr, [id], "reject");
          if (ok && dispatch) dispatch(tr);
          return ok;
        },
      acceptAllSuggestions:
        () =>
        ({ state, tr, dispatch }) => {
          const ids = [...new Set(collectSuggestions(state.doc).map((s) => s.id))];
          const ok = resolveIds(state, tr, ids, "accept");
          if (ok && dispatch) dispatch(tr);
          return ok;
        },
      rejectAllSuggestions:
        () =>
        ({ state, tr, dispatch }) => {
          const ids = [...new Set(collectSuggestions(state.doc).map((s) => s.id))];
          const ok = resolveIds(state, tr, ids, "reject");
          if (ok && dispatch) dispatch(tr);
          return ok;
        },
    };
  },
});

export default SuggestionMark;
