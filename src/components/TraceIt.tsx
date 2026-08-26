/** Trace-it — click the stroke-order dots along a numeral/shape outline to
 *  "trace" it, the digital equivalent of the pencil-tracing pages in Foundation
 *  activity books. Same ordered-click engine as DotToDot but rendered as a
 *  dashed stroke over a big faint glyph, with a direction arrow on the next dot. */
import { useState } from "react";
import { Concept } from "../api";
import { cheer, bigCheer } from "../celebrate";

export type TraceItSpec = NonNullable<NonNullable<Concept["activityBook"]>["traceIt"]>;

export function TraceIt({ spec }: { spec: TraceItSpec }) {
  const [solved, setSolved] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const done = solved >= spec.points.length;

  function clickPoint(i: number) {
    if (done) return;
    if (i === solved) {
      const next = solved + 1;
      setSolved(next);
      if (next >= spec.points.length) bigCheer();
      else cheer();
    } else if (i > solved) {
      setWrongIdx(i);
      setTimeout(() => setWrongIdx(null), 450);
    }
  }

  function reset() { setSolved(0); }

  const solvedPathD = spec.points
    .slice(0, solved)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const fullPathD = spec.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="fm-trace">
      <p className="fm-tab-intro">{spec.instructions}</p>
      <div className="fm-trace-board">
        <svg viewBox="0 0 100 100" className="fm-trace-svg">
          <text x="50" y="62" textAnchor="middle" className="fm-trace-glyph">{spec.glyph}</text>
          <path d={fullPathD} className="fm-trace-guide" />
          {solvedPathD && <path d={solvedPathD} className="fm-trace-line" />}
          {spec.points.map((p, i) => {
            const state = i < solved ? "done" : i === solved ? "next" : "todo";
            return (
              <g key={i} onClick={() => clickPoint(i)} className={`fm-trace-dot fm-trace-dot-${state} ${wrongIdx === i ? "fm-trace-wrong" : ""}`}>
                <circle cx={p.x} cy={p.y} r={state === "next" ? 3.6 : 2.4} />
                {state === "next" && <circle cx={p.x} cy={p.y} r={5.5} className="fm-trace-pulse" />}
              </g>
            );
          })}
        </svg>
      </div>
      {done ? (
        <div className="fm-trace-done">
          <p>✏️ Nicely traced!</p>
          <button className="fm-secondary" onClick={reset}>↺ Trace again</button>
        </div>
      ) : (
        <p className="fm-trace-hint">Click the glowing dot — dot {solved + 1} of {spec.points.length}.</p>
      )}
    </div>
  );
}
