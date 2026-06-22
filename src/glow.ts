/**
 * glow.ts — a fading emerald glow ring around a specific element, used to mark
 * the thing an agent just acted on (e.g. the editor body it wrote into). Scoped
 * to the target, not the whole view. Honors prefers-reduced-motion.
 */
const RING = "0 0 0 2px rgba(52,211,153,0.85), 0 0 26px 3px rgba(52,211,153,0.45)";
const NONE = "0 0 0 0 rgba(52,211,153,0), 0 0 0 0 rgba(52,211,153,0)";

export function glowElement(el: HTMLElement | null): void {
  if (!el) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  el.animate(
    [
      { boxShadow: NONE, borderRadius: "8px", offset: 0 },
      { boxShadow: RING, borderRadius: "8px", offset: 0.12 },
      { boxShadow: RING, borderRadius: "8px", offset: 0.4 },
      { boxShadow: NONE, borderRadius: "8px", offset: 1 },
    ],
    { duration: 1300, easing: "ease-out" },
  );
}
