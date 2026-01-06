import { Link } from "react-router";
import type { Route } from "./+types/about";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "About | Terminal Blog" },
    { name: "description", content: "About the author" },
  ];
}

export default function About() {
  return (
    <main className="py-8 md:py-12">
      <div className="font-mono">
        <div className="text-zinc-600 text-sm mb-4">
          Last login: {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400">$</span>
            <span className="text-zinc-100">whoami</span>
          </div>
          <div className="text-zinc-400 ml-4">
            Welcome! I'm Mirri. <br />
            I'm a software engineer, founder, and occasional artist.
          </div>

          <div className="flex items-start gap-2 mt-6">
            <span className="text-emerald-400">$</span>
            <span className="text-zinc-100">cat about.md</span>
          </div>
          <div className="text-zinc-400 ml-4 space-y-2">
            <p># This Site</p>
            <br />
            <p>
              This is my own little corner of the internet where I write about systems, web development, and the tools I
              build. Occasionally you'll find me using to store neat pebbles from the shells.
            </p>
          </div>

          <div className="flex items-start gap-2 mt-6">
            <span className="text-emerald-400">$</span>
            <span className="text-zinc-100">ls -la ./words</span>
          </div>
          <div className="text-zinc-400 ml-4">
            <Link
              to="/blog"
              className="text-emerald-400 hover:underline"
            >
              drwxr-xr-x  blog/
            </Link>
          </div>

          <div className="flex items-start gap-2 mt-8">
            <span className="text-emerald-400">$</span>
            <span className="text-zinc-500 animate-pulse">_</span>
          </div>
        </div>
      </div>
    </main>
  );
}
