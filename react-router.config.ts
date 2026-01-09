import type { Config } from "@react-router/dev/config";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

// Helper to normalize tags (matches app/lib/utils.ts)
function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, "-");
}

export default {
  // Disable runtime SSR - pages will be pre-rendered at build time
  ssr: false,

  // Pre-render all routes at build time for GitHub Pages
  async prerender() {
    const POSTS_DIR = path.join(process.cwd(), "content/posts");

    // Static routes
    const staticRoutes = ["/", "/about", "/blog", "/blog/tags"];

    // Read all markdown files to get slugs and tags
    let files: string[] = [];
    try {
      files = await fs.readdir(POSTS_DIR);
    } catch {
      // Directory may not exist or be empty
    }
    const slugs: string[] = [];
    const allTags = new Set<string>();

    for (const file of files) {
      if (file.endsWith(".md")) {
        const slug = file.replace(/\.md$/, "");
        slugs.push(slug);

        // Parse frontmatter to extract tags
        const filePath = path.join(POSTS_DIR, file);
        const content = await fs.readFile(filePath, "utf-8");
        const { data } = matter(content);

        if (data.tags && Array.isArray(data.tags)) {
          data.tags.forEach((tag: string) => {
            allTags.add(normalizeTag(tag));
          });
        }
      }
    }

    // Generate dynamic routes
    const blogPostRoutes = slugs.map((slug) => `/blog/${slug}`);
    const tagRoutes = Array.from(allTags).map((tag) => `/blog/tags/${tag}`);

    // When no posts exist, include placeholder paths so route loader exports are valid
    // (React Router requires routes with loaders to have at least one prerender path when ssr:false)
    // These will generate 404 pages which is correct behavior
    const placeholderRoutes =
      slugs.length === 0
        ? ["/blog/_", "/blog/tags/_"]
        : [];

    return [...staticRoutes, ...blogPostRoutes, ...tagRoutes, ...placeholderRoutes];
  },
} satisfies Config;
