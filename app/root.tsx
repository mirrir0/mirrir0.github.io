import { useEffect, useState, Suspense, lazy } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import { FaPersonThroughWindow } from "react-icons/fa6";

import type { Route } from "./+types/root";
import "./app.css";
import { PDFViewerProvider, usePDFViewer } from "./components/pdf-viewer";

// Client-only wrapper for PDF viewer
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : null;
}

// Lazy load PDF viewer (client-only, uses browser APIs)
const PDFViewerPanel = lazy(() =>
  import("./components/pdf-viewer/PDFViewerPanel").then((mod) => ({
    default: mod.PDFViewerPanel,
  }))
);

// Inner layout that can access the PDF viewer context
function MainContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = usePDFViewer();

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        isOpen ? "md:mr-[50%]" : ""
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 md:px-6 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

function getDisplayInfo(pathname: string) {
  if (pathname === "/") return { mode: "NORMAL", path: "~/", section: "home" };
  if (pathname === "/about")
    return { mode: "NORMAL", path: "~/about", section: "about" };
  if (pathname === "/blog")
    return { mode: "NORMAL", path: "~/blog/", section: "index" };
  if (pathname === "/tags")
    return { mode: "NORMAL", path: "~/tags/", section: "index" };
  if (pathname.startsWith("/tags/")) {
    const tag = pathname.replace("/tags/", "");
    return { mode: "NORMAL", path: `~/tags/${tag}`, section: "tag" };
  }
  if (pathname.startsWith("/blog/")) {
    const slug = pathname.replace("/blog/", "");
    return { mode: "READ", path: `~/blog/${slug}`, section: "blog" };
  }
  return { mode: "NORMAL", path: `~${pathname}`, section: "page" };
}

function VimStatusline() {
  const location = useLocation();
  const [scrollInfo, setScrollInfo] = useState({ line: 1, col: 1, percent: 0 });
  const [headingTrail, setHeadingTrail] = useState<string[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const percent =
        docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      const line = Math.floor(scrollTop / 20) + 1;
      setScrollInfo({ line, col: 1, percent });

      // Find all headings and build breadcrumb trail
      const headings = Array.from(
        document.querySelectorAll("h1, h2, h3, h4, h5, h6")
      ) as HTMLElement[];

      const trail: { level: number; text: string }[] = [];
      const headerOffset = 80; // Account for sticky header

      for (const heading of headings) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= headerOffset) {
          const level = parseInt(heading.tagName[1]);
          const text = heading.textContent?.trim() || "";

          // Remove headings of same or lower level (reset breadcrumb)
          while (trail.length > 0 && trail[trail.length - 1].level >= level) {
            trail.pop();
          }
          trail.push({ level, text });
        }
      }

      setHeadingTrail(trail.map((h) => h.text));
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  const { mode, path, section } = getDisplayInfo(location.pathname);

  return (
    <div className="font-mono text-xs flex">
      <span className="bg-emerald-400 text-zinc-900 px-2 py-0.5 font-bold">
        {mode}
      </span>
      <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 truncate max-w-md">
        {headingTrail.length > 0
          ? headingTrail.map((h, i) => (
              <span key={i}>
                {i > 0 && <span className="text-zinc-500"> › </span>}
                {h}
              </span>
            ))
          : path}
      </span>
      <span className="bg-zinc-800 flex-1" />
      <span className="bg-zinc-700 text-zinc-400 px-2 py-0.5">{section}</span>
      <span className="bg-emerald-400 text-zinc-900 px-2 py-0.5 font-bold">
        {scrollInfo.percent}%
      </span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-end gap-4 py-6">
        <a
          href="https://github.com/mirrir0"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
          aria-label="GitHub"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 text-xs font-mono hover:text-zinc-300 transition-colors"
        >
          CC BY-SA 4.0
        </a>
      </div>
    </footer>
  );
}

function Header() {
  const location = useLocation();
  const isBlogPost =
    location.pathname.startsWith("/blog/") && location.pathname !== "/blog/";

  return (
    <header className="sticky top-0 z-50 py-2 md:py-3 bg-zinc-950">
      <nav className="font-mono">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="hover:opacity-80 transition-opacity flex items-baseline gap-2"
          >
            <span style={{ fontFamily: "Kapel" }} className="text-emerald-400 text-5xl">MIRRIR</span>
            <span className="text-zinc-500 text-sm font-mono">reflecting online</span>
          </Link>
          <FaPersonThroughWindow className="text-emerald-400 text-3xl" />
        </div>
        <div className="flex items-center gap-6 mt-2">
          <Link
            to="/"
            className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
          >
            home
          </Link>
          <Link
            to="/about"
            className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
          >
            about
          </Link>
          <Link
            to="/blog"
            className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
          >
            blog
          </Link>
        </div>
      </nav>
      {isBlogPost && (
        <div className="mt-2">
          <VimStatusline />
        </div>
      )}
    </header>
  );
}

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;600&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <PDFViewerProvider>
          <MainContent>{children}</MainContent>
          {/* PDF Viewer Panel (client-only) */}
          <ClientOnly>
            <Suspense fallback={null}>
              <PDFViewerPanel />
            </Suspense>
          </ClientOnly>
        </PDFViewerProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
