/**
 * Confetti celebrations (canvas-confetti). Colours are pulled from the active
 * theme tokens so a burst matches whatever palette is on. Honors reduced-motion.
 */
import confetti from "canvas-confetti";

function themeColors(): string[] {
  const s = getComputedStyle(document.documentElement);
  const g = (v: string, d: string) => (s.getPropertyValue(v).trim() || d);
  return [g("--accent", "#ff9f43"), g("--accent-dark", "#e8842a"), g("--good", "#2e7d32"), "#ffffff", "#ffd964"];
}

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Small pop for a correct answer. */
export function cheer() {
  if (reduced()) return;
  confetti({ particleCount: 55, spread: 72, startVelocity: 38, ticks: 140, scalar: 0.9,
    origin: { y: 0.72 }, colors: themeColors(), disableForReducedMotion: true });
}

/** Big celebration for finishing / mastering. */
export function bigCheer() {
  if (reduced()) return;
  const colors = themeColors();
  confetti({ particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.6 }, colors, disableForReducedMotion: true });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors }), 150);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors }), 300);
}
