import { Suspense, lazy } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";

const Dither = lazy(() => import("../components/Dither"));

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "mirrir.net" },
    { name: "description", content: "A terminal-style technical blog" },
  ];
}

export default function Home() {
  return (
    <main className="py-8 md:py-12">
      <div className="font-mono space-y-6">
        <p className="text-zinc-400">
          Staring into the wired, and the wired is looking back very confused.
        </p>
      </div>

      <div className="mt-8 rounded-xl overflow-hidden border-4 border-emerald-500 shadow-[8px_8px_0_rgb(16,185,129)]">
        <div style={{ width: '100%', height: '600px', position: 'relative' }}>
          <Suspense fallback={<div className="w-full h-full bg-zinc-900" />}>
            <Dither
              waveColor={[0.2, 0.7, 0.4]}
              mouseRadius={0}
              colorNum={2.5}
              waveAmplitude={0.45}
              waveFrequency={5.1}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
