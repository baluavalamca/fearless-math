/** Dot-to-dot — click the dots in order (usually a skip-counting sequence) to
 *  reveal a picture. A classic activity-book format, reimagined as a graded
 *  click game: this is a bonus/practice extra (like teachingGallery/liveSim),
 *  not wired into the SRS/mastery pipeline. */
import { useState } from "react";
import { Concept } from "../api";
import { cheer, bigCheer } from "../celebrate";

export type DotToDotSpec = NonNullable<NonNullable<Concept["activityBook"]>["dotToDot"]>;

export function DotToDot({ spec }: { spec: DotToDotSpec }) {
  const [solved, setSolved] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const done = solved >= spec.dots.length;

  function clickDot(i: number) {
    if (done) return;
    if (i === solved) {
      const next = solved + 1;
      setSolved(next);
      if (next >= spec.dots.length) bigCheer();
      else cheer();
    } else if (i > solved) {
      setWrongIdx(i);
      setTimeout(() => setWrongIdx(null), 450);
    }
  }

  function reset() { setSolved(0); }

  const pathD = spec.dots
    .slice(0, solved)
    .map((d, i) => `${i === 0 ? "M" : "L"} ${d.x} ${d.y}`)
    .join(" ");

  return (
    <div className="fm-d2d">
      <p className="fm-tab-intro">{spec.instructions}</p>
      <div className="fm-d2d-board">
        <svg viewBox="0 0 100 100" className="fm-d2d-svg">
          {pathD && <path d={pathD} className="fm-d2d-line" />}
          {spec.dots.map((d, i) => {
            const state = i < solved ? "done" : i === solved ? "next" : "todo";
            return (
              <g key={i} onClick={() => clickDot(i)} className={`fm-d2d-dot fm-d2d-dot-${state} ${wrongIdx === i ? "fm-d2d-wrong" : ""}`}>
                <circle cx={d.x} cy={d.y} r={state === "next" ? 3.4 : 2.6} />
                <text x={d.x} y={d.y - 4.2} textAnchor="middle">{d.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {done ? (
        <div className="fm-d2d-done">
          <p>🎉 {spec.revealName ? `You revealed a ${spec.revealName}!` : "Picture complete!"}</p>
          <button className="fm-secondary" onClick={reset}>↺ Do it again</button>
        </div>
      ) : (
        <p className="fm-d2d-hint">Find <strong>{spec.dots[solved]?.label}</strong> next.</p>
      )}
    </div>
  );
}
