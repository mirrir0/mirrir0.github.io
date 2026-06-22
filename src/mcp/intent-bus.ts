/**
 * intent-bus — bridges agent-driven tool results to the live editor.
 *
 * In MCP mode the data router has no loader/SSE, so navigating to /draft/:slug
 * won't refetch. When a tool result carries a fresh draft body, bootstrap.ts
 * navigates AND dispatches a `draft-push` here; the mounted DraftEditor listens
 * and applies the content (see draft-routes.tsx). The nonce lets the editor
 * mark the push as already-saved so autosave doesn't echo it back.
 */

import type { BlogEdit } from "../../app/components/editor/suggestions/apply-edit";

export interface BlogDraft {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  content: string;
}

export type DraftPushDetail = BlogDraft & { nonce: number };

/** A surgical edit pushed to the live editor as a pending suggestion (not a
 *  full-content replace). Carries the slug so the mounted editor can filter. */
export type EditPushDetail = { slug: string; edit: BlogEdit; nonce: number };

export const intentBus = new EventTarget();

export const DRAFT_PUSH = "draft-push";
export const EDIT_PUSH = "edit-push";

export function pushDraft(detail: DraftPushDetail): void {
  intentBus.dispatchEvent(new CustomEvent<DraftPushDetail>(DRAFT_PUSH, { detail }));
}

export function pushEdit(detail: EditPushDetail): void {
  intentBus.dispatchEvent(new CustomEvent<EditPushDetail>(EDIT_PUSH, { detail }));
}

export type { BlogEdit };
