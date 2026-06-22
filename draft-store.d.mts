/**
 * Types for draft-store.mjs (hand-written so server.ts type-checks without a
 * build step on the .mjs source).
 */

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
}

export interface Draft extends PostMeta {
  content: string;
}

export interface DraftFields {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
  content?: string;
}

export type DraftEvent = "draft-changed" | "published" | "deleted";

export interface DraftStore {
  readMeta(filePath: string): PostMeta;
  listDrafts(): PostMeta[];
  listPosts(): PostMeta[];
  readDraft(slug: string): Draft | null;
  readPost(slug: string): Draft | null;
  writeDraft(slug: string, fields: DraftFields): void;
  createDraft(args: { title?: string }): { slug: string };
  deleteDraft(slug: string): { ok: true };
  renameDraft(oldSlug: string, newSlug: string): { ok: true; slug: string };
  publishDraft(slug: string): { ok: true; slug: string };
  unpublishPost(slug: string): { ok: true; slug: string };
  deletePost(slug: string): { ok: true };
  subscribe(fn: (type: DraftEvent, slug: string) => void): () => void;
}

export function createDraftStore(dirs: { draftsDir: string; postsDir: string }): DraftStore;
