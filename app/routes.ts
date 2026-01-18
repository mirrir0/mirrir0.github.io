import { type RouteConfig, index, route } from "@react-router/dev/routes";

const routes: RouteConfig = [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
  route("blog", "routes/blog.tsx"),
  route("blog/tags", "routes/tags.tsx"),
  route("blog/tags/:tag", "routes/tags.$tag.tsx"),
  route("blog/:slug", "routes/blog.$slug.tsx"),
];

// Add dev-only routes
if (import.meta.env.DEV) {
  routes.push(
    route("drafts", "routes/drafts.tsx"),
    route("draft/:slug", "routes/draft.$slug.tsx"),
    route("api/list-pdfs", "routes/api.list-pdfs.ts"),
    route("api/upload-pdf", "routes/api.upload-pdf.ts")
  );
}

export default routes;
