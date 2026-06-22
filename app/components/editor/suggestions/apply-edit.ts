/**
 * apply-edit.ts — turn an agent edit op into a *suggestion* transaction.
 *
 * The key idea (so we never diff the whole document): an edit op bounds the
 * changed region. For a replace we word-diff ONLY find-vs-replace and map each
 * changed word back to a position inside the matched span — removed words get a
 * "delete" suggestion mark, added words are inserted with an "insert" mark, and
 * unchanged words are left untouched. The human then accepts/rejects per change.
 *
 * Matching is scoped to a single text block (paragraph/heading/list item), so a
 * `find` must be a contiguous phrase within one block. Cross-block phrases won't
 * match — the tool reports that and the agent retries with a tighter anchor.
 */
import type { Editor } from "@tiptap/core";
import type { Node as PMNode, Mark as PMMark, Schema } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

export type BlogEdit =
  | { op: "replace"; find: string; replace: string }
  | { op: "delete"; find: string }
  | { op: "insert"; after?: string; text: string }
  | { op: "append"; text: string };

export interface EditResult {
  ok: boolean;
  /** Suggestion ids created (for glow / focus), or a reason when ok is false. */
  ids?: string[];
  reason?: string;
}

// Suggestion ids only need to be unique within a review session. A module
// counter avoids Date.now()/crypto and stays deterministic for tests.
let seq = 0;
const newId = () => `s${++seq}`;

/**
 * Locate the first occurrence of `query` inside a single text block. Returns the
 * match's PM start/end and a per-character position map (`pos[k]` = PM position
 * before the k-th matched char; `pos[len]` = end), which stays correct even when
 * inline atoms sit elsewhere in the block.
 */
function findInDoc(doc: PMNode, query: string): { from: number; to: number; pos: number[] } | null {
  if (!query) return null;
  let hit: { from: number; to: number; pos: number[] } | null = null;

  doc.descendants((node, blockPos) => {
    if (hit) return false;
    if (!node.isTextblock) return undefined;

    // Build this block's inline text and a char→PM-position map.
    let text = "";
    const posMap: number[] = [];
    let rel = 0; // offset within the block's content
    node.forEach((child) => {
      const childStart = blockPos + 1 + rel;
      if (child.isText) {
        const t = child.text ?? "";
        for (let k = 0; k < t.length; k++) {
          text += t[k];
          posMap.push(childStart + k);
        }
      }
      rel += child.nodeSize;
    });

    const idx = text.indexOf(query);
    if (idx === -1) return undefined;

    const pos: number[] = [];
    for (let k = 0; k <= query.length; k++) {
      pos.push(k < query.length ? posMap[idx + k] : posMap[idx + query.length - 1] + 1);
    }
    hit = { from: posMap[idx], to: pos[query.length], pos };
    return false;
  });

  return hit;
}

/** Position just inside the end of the document's last text block. */
function endOfDoc(doc: PMNode): number {
  return Math.max(0, doc.content.size - 1);
}

function suggMark(schema: Schema, op: "insert" | "delete", id: string): PMMark {
  return schema.marks.suggestion.create({ id, op });
}

/** A built transaction plus the suggestion ids it introduces, or a failure reason. */
export type BuildResult = { tr: Transaction; ids: string[] } | { reason: string };

/**
 * Build (but do not dispatch) the suggestion transaction for an edit. Separated
 * from {@link applyEdit} so it can be unit-tested against a bare EditorState.
 */
export function buildEdit(state: EditorState, edit: BlogEdit): BuildResult {
  const { tr, schema } = state;

  if (edit.op === "replace" || edit.op === "delete") {
    const match = findInDoc(state.doc, edit.find);
    if (!match) return { reason: `text not found: "${edit.find.slice(0, 40)}"` };

    if (edit.op === "delete") {
      const id = newId();
      tr.addMark(match.from, match.to, suggMark(schema, "delete", id));
      return { tr, ids: [id] };
    }

    // replace: present ONE coherent change — strip the common leading/trailing
    // run (snapped to word boundaries so a word is never split), and treat the
    // whole changed middle as a single replace. The old region is struck through
    // and the new region inserted right after it, so the proposal reads naturally
    // ("reconciled it → live-reconciled the change") instead of fragmenting into
    // scattered word inserts/deletes.
    const { find, replace } = edit;
    const isWS = (c: string) => /\s/.test(c);

    let p = 0;
    const maxP = Math.min(find.length, replace.length);
    while (p < maxP && find[p] === replace[p]) p++;
    while (p > 0 && !isWS(find[p - 1])) p--; // back up to the start of the word

    let s = 0;
    const maxS = Math.min(find.length - p, replace.length - p);
    while (s < maxS && find[find.length - 1 - s] === replace[replace.length - 1 - s]) s++;
    while (s > 0 && !isWS(find[find.length - s])) s--; // forward to a word start

    const oldEnd = find.length - s;
    const oldRegion = find.slice(p, oldEnd);
    const newRegion = replace.slice(p, replace.length - s);
    if (!oldRegion && !newRegion) return { reason: "no change" };

    const id = newId();
    const delTo = match.pos[oldEnd];
    if (oldRegion) tr.addMark(match.pos[p], delTo, suggMark(schema, "delete", id));
    if (newRegion) tr.insert(delTo, schema.text(newRegion, [suggMark(schema, "insert", id)]));
    return { tr, ids: [id] };
  }

  if (edit.op === "insert") {
    let at = endOfDoc(state.doc);
    if (edit.after) {
      const anchor = findInDoc(state.doc, edit.after);
      if (!anchor) return { reason: `anchor not found: "${edit.after.slice(0, 40)}"` };
      at = anchor.to;
    }
    const id = newId();
    tr.insert(at, schema.text(edit.text, [suggMark(schema, "insert", id)]));
    return { tr, ids: [id] };
  }

  // append: add a new paragraph at the document end, its text marked insert.
  const id = newId();
  const para = schema.nodes.paragraph.create(null, schema.text(edit.text, [suggMark(schema, "insert", id)]));
  tr.insert(state.doc.content.size, para);
  return { tr, ids: [id] };
}

/**
 * Apply an edit as pending suggestions, dispatching one transaction to the editor.
 * Returns the created suggestion ids, or a failure reason.
 */
export function applyEdit(editor: Editor, edit: BlogEdit): EditResult {
  const res = buildEdit(editor.state, edit);
  if ("reason" in res) return { ok: false, reason: res.reason };
  editor.view.dispatch(res.tr);
  return { ok: true, ids: res.ids };
}
