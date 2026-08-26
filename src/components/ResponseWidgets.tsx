/**
 * ResponseWidgets — small, presentation-only pieces shared by every AI answer
 * surface (Ask Robo, Homework Helper, the lesson "Robo can help more" panel).
 * A structured `steps[]` response always renders as a numbered list of
 * step-cards (with real math typesetting inside each step) instead of one
 * flat paragraph. No AI calls here — pure rendering.
 */
import { TutorText } from "./Math";

/** Numbered step-card list. Renders nothing if there are no steps, so callers
 *  can use it unconditionally alongside a flat-string fallback. */
export function StepCards({ steps, className = "" }: { steps?: string[]; className?: string }) {
  if (!steps || steps.length === 0) return null;
  return (
    <ol className={`fm-step-cards ${className}`.trim()}>
      {steps.map((s, i) => (
        <li key={i} className="fm-step-card">
          <span className="fm-step-card-num">{i + 1}</span>
          <span className="fm-step-card-text"><TutorText>{s}</TutorText></span>
        </li>
      ))}
    </ol>
  );
}
