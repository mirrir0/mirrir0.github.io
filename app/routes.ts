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
    route("draft/:slug", "routes/draft.$slug.tsx")
  );
}

export default routes;
