/**
 * Tiny cross-component bus so any screen can deep-link into a specific Math
 * Tools tool (e.g. "open the Fraction Wall") without prop-drilling through
 * App.tsx — MathToolbox is always mounted but fully self-contained (no props
 * in, see src/components/MathToolbox.tsx), so a window CustomEvent is the
 * smallest way to reach it from elsewhere (e.g. HomeworkSolver.tsx).
 */
const EVENT = "fm-open-tool";

export function openTool(id: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: id }));
}

export function onOpenTool(handler: (id: string) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
