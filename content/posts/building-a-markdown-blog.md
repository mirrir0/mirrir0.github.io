---
title: "Building a Markdown Blog with React Router v7"
date: "2025-01-05"
description: "A technical walkthrough of building a server-rendered markdown blog."
tags: ["react", "markdown", "tutorial"]
---

# Building a Markdown Blog with React Router v7

This post covers the technical details of how this blog was built.

## The Stack

- **React Router v7** - Full-stack React framework with SSR
- **Tailwind CSS v4** - Utility-first styling
- **marked** - Markdown to HTML conversion
- **gray-matter** - Frontmatter parsing

## Server-Side Data Loading

React Router v7 uses a `loader` function for server-side data fetching:

```typescript
export async function loader({ params }: Route.LoaderArgs) {
  const post = await getPostBySlug(params.slug);
  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }
  return { post };
}
```

## Why Server-Side Rendering?

1. **SEO** - Search engines can index content
2. **Performance** - Content is ready on first paint
3. **Accessibility** - Works without JavaScript

## File Structure

```
content/
  posts/
    hello-world.md
    building-a-markdown-blog.md
app/
  lib/
    markdown.server.ts
  routes/
    blog.tsx
    blog.$slug.tsx
```

The `.server.ts` suffix ensures the file only runs on the server.
