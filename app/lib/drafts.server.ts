import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const DRAFTS_DIR = path.join(process.cwd(), "content/drafts");
const POSTS_DIR = path.join(process.cwd(), "content/posts");

export interface DraftMeta {
  slug: string;
  title: string;
  date: string;
  description?: string;
  tags?: string[];
}

export interface Draft extends DraftMeta {
  content: string; // RAW markdown, not HTML
}

/**
 * Gets all drafts from the drafts directory
 * Returns empty array if directory doesn't exist
 */
export async function getAllDrafts(): Promise<DraftMeta[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(DRAFTS_DIR);
  } catch {
    return [];
  }
  const drafts = await Promise.all(
    files
      .filter((file) => file.endsWith(".md"))
      .map(async (file) => {
        const slug = file.replace(/\.md$/, "");
        const filePath = path.join(DRAFTS_DIR, file);
        const content = await fs.readFile(filePath, "utf-8");
        const { data } = matter(content);
        return {
          slug,
          title: data.title || slug,
          date: data.date || new Date().toISOString(),
          description: data.description,
          tags: data.tags,
        } as DraftMeta;
      })
  );

  return drafts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Gets a draft by slug
 * Returns RAW markdown content (not HTML) for editing
 * Returns null if file doesn't exist
 */
export async function getDraftBySlug(slug: string): Promise<Draft | null> {
  const filePath = path.join(DRAFTS_DIR, `${slug}.md`);
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(fileContent);
    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      description: data.description,
      tags: data.tags,
      content, // RAW markdown, not HTML
    };
  } catch {
    return null;
  }
}

/**
 * Saves a draft with the given frontmatter and content
 * Uses gray-matter to stringify frontmatter and content together
 */
export async function saveDraft(
  slug: string,
  frontmatter: Omit<DraftMeta, "slug">,
  content: string
): Promise<void> {
  const filePath = path.join(DRAFTS_DIR, `${slug}.md`);
  const fileContent = matter.stringify(content, frontmatter);

  // Ensure drafts directory exists
  try {
    await fs.mkdir(DRAFTS_DIR, { recursive: true });
  } catch {
    // Directory already exists or creation failed
  }

  await fs.writeFile(filePath, fileContent, "utf-8");
}

/**
 * Creates a new draft with default frontmatter
 */
export async function createDraft(slug: string): Promise<void> {
  const defaultFrontmatter = {
    title: slug,
    date: new Date().toISOString(),
    description: "",
    tags: [],
  };
  const defaultContent = "";

  await saveDraft(slug, defaultFrontmatter, defaultContent);
}

/**
 * Publishes a draft by moving it from drafts to posts directory
 * Creates posts directory if it doesn't exist
 */
export async function publishDraft(slug: string): Promise<void> {
  const draftPath = path.join(DRAFTS_DIR, `${slug}.md`);
  const postPath = path.join(POSTS_DIR, `${slug}.md`);

  // Ensure posts directory exists
  try {
    await fs.mkdir(POSTS_DIR, { recursive: true });
  } catch {
    // Directory already exists or creation failed
  }

  // Move file from drafts to posts
  await fs.rename(draftPath, postPath);
}

/**
 * Deletes a draft by removing its file from the drafts directory
 */
export async function deleteDraft(slug: string): Promise<void> {
  const draftPath = path.join(DRAFTS_DIR, `${slug}.md`);
  await fs.unlink(draftPath);
}
