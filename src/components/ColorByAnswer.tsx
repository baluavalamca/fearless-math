/** Color-by-answer — solve each region's question, figure out which legend
 *  color the answer maps to, then click that color swatch and the region to
 *  fill it. The digital take on color-by-number activity pages. Bonus/practice
 *  extra, not wired into the SRS/mastery pipeline (simple local answer check,
 *  not the full submitAnswer pipeline). */
import { useState } from "react";
import { Concept } from "../api";
import { cheer, bigCheer } from "../celebrate";

export type ColorByAnswerSpec = NonNullable<NonNullable<Concept["activityBook"]>["colorByAnswer"]>;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

export function ColorByAnswer({ spec }: { spec: ColorByAnswerSpec }) {
  const [fills, setFills] = useState<Record<string, string>>({});
  const [openRegion, setOpenRegion] = useState<string | null>(null);
  const [pending, setPending] = useState<{ regionId: string; key: string; color: string } | null>(null);
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [wrongSwatch, setWrongSwatch] = useState<string | null>(null);

  const total = spec.regions.length;
  const done = Object.keys(fills).length >= total;
  const region = openRegion ? spec.regions.find((r) => r.id === openRegion) : null;

  function openR(id: string) {
    if (fills[id] || pending) return;
    setOpenRegion(id);
    setInput("");
    setWrong(false);
    setHintsShown(0);
  }

  function submit() {
    if (!region) return;
    if (normalize(input) === normalize(String(region.q.answer))) {
      const match = spec.legend.find((l) => normalize(l.matchAnswer) === normalize(String(region.q.answer)));
      setOpenRegion(null);
      if (match) setPending({ regionId: region.id, key: match.key, color: match.color });
      cheer();
    } else {
      setWrong(true);
      setHintsShown((h) => Math.min(h + 1, region.q.hintLadder.length));
      setTimeout(() => setWrong(false), 450);
    }
  }

  function pickSwatch(key: string) {
    if (!pending) return;
    if (key === pending.key) {
      const next = { ...fills, [pending.regionId]: pending.color };
      setFills(next);
      setPending(null);
      if (Object.keys(next).length >= total) bigCheer(); else cheer();
    } else {
      setWrongSwatch(key);
      setTimeout(() => setWrongSwatch(null), 450);
    }
  }

  function reset() { setFills({}); setOpenRegion(null); setPending(null); }

  return (
    <div className="fm-cba">
      <p className="fm-tab-intro">{spec.instructions}</p>

      <div className="fm-cba-legend">
        {spec.legend.map((l) => (
          <button
            key={l.key}
            className={`fm-cba-swatch ${pending && pending.key === l.key ? "target" : ""} ${wrongSwatch === l.key ? "wrong" : ""}`}
            style={{ background: l.color }}
            onClick={() => pickSwatch(l.key)}
            title={l.key}
          >
            {l.key}
          </button>
        ))}
      </div>
      {pending && <p className="fm-cba-prompt">✅ Correct! Now click the matching color above.</p>}

      <div className="fm-cba-board">
        <svg viewBox={spec.viewBox || "0 0 200 200"} className="fm-cba-svg">
          {spec.regions.map((r) => (
            <path
              key={r.id}
              d={r.d}
              className={`fm-cba-region ${fills[r.id] ? "filled" : ""}`}
              style={{ fill: fills[r.id] || "var(--card)" }}
              onClick={() => openR(r.id)}
            />
          ))}
        </svg>
      </div>

      {region && (
        <div className="fm-cba-question">
          <p className="fm-maze-q">{region.q.q}</p>
          <div className="fm-cba-answer-row">
            <input
              type="text"
              className="fm-yt-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              autoFocus
            />
            <button className="fm-secondary" onClick={submit}>Check</button>
            <button className="fm-secondary" onClick={() => setOpenRegion(null)}>Cancel</button>
          </div>
          {wrong && <p className="fm-cba-wrong">Not quite — try again!</p>}
          {hintsShown > 0 && <p className="fm-maze-hint">💡 {region.q.hintLadder[Math.min(hintsShown - 1, region.q.hintLadder.length - 1)]}</p>}
        </div>
      )}

      {done && (
        <div className="fm-cba-done">
          <p>🎨 Picture complete!</p>
          <button className="fm-secondary" onClick={reset}>↺ Do it again</button>
        </div>
      )}
    </div>
  );
}
