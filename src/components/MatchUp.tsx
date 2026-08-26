/** Match-up — click a left card, then its matching right card, to connect
 *  equivalent pairs (e.g. a fraction and its picture, a shape and its property).
 *  The right column is shuffled once per mount. Bonus/practice extra, not wired
 *  into the SRS/mastery pipeline. */
import { useMemo, useState } from "react";
import { Concept } from "../api";
import { cheer, bigCheer } from "../celebrate";

export type MatchUpSpec = NonNullable<NonNullable<Concept["activityBook"]>["matchUp"]>;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MatchUp({ spec }: { spec: MatchUpSpec }) {
  const rightOrder = useMemo(() => shuffled(spec.pairs), [spec]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);
  const done = matched.size >= spec.pairs.length;

  function clickLeft(id: string) {
    if (matched.has(id)) return;
    setSelectedLeft(id === selectedLeft ? null : id);
  }

  function clickRight(rightPairId: string) {
    if (matched.has(rightPairId) || !selectedLeft) return;
    if (rightPairId === selectedLeft) {
      const next = new Set(matched);
      next.add(selectedLeft);
      setMatched(next);
      setSelectedLeft(null);
      if (next.size >= spec.pairs.length) bigCheer(); else cheer();
    } else {
      setWrongPair({ left: selectedLeft, right: rightPairId });
      setTimeout(() => setWrongPair(null), 450);
      setSelectedLeft(null);
    }
  }

  function reset() { setMatched(new Set()); setSelectedLeft(null); }

  return (
    <div className="fm-matchup">
      <p className="fm-tab-intro">{spec.instructions}</p>
      <div className="fm-matchup-grid">
        <div className="fm-matchup-col">
          {spec.pairs.map((p) => (
            <button
              key={p.id}
              className={`fm-matchup-card ${matched.has(p.id) ? "matched" : ""} ${selectedLeft === p.id ? "selected" : ""} ${wrongPair?.left === p.id ? "wrong" : ""}`}
              disabled={matched.has(p.id)}
              onClick={() => clickLeft(p.id)}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="fm-matchup-col">
          {rightOrder.map((p) => (
            <button
              key={p.id}
              className={`fm-matchup-card ${matched.has(p.id) ? "matched" : ""} ${wrongPair?.right === p.id ? "wrong" : ""}`}
              disabled={matched.has(p.id)}
              onClick={() => clickRight(p.id)}
            >
              {p.right}
            </button>
          ))}
        </div>
      </div>
      {done && (
        <div className="fm-matchup-done">
          <p>🔗 All matched!</p>
          <button className="fm-secondary" onClick={reset}>↺ Do it again</button>
        </div>
      )}
    </div>
  );
}
