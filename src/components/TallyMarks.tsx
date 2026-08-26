/**
 * TallyMarks — classic tally counting: four upright strokes, the fifth stroke
 * crosses them diagonally to "close the gate". Renders one or more groups so
 * a lesson can show a tally chart (e.g. favourite fruits) or just teach the
 * counting-in-fives pattern itself.
 */
export interface TallyGroupSpec {
  count: number;    // how many items this group represents
  label?: string;   // e.g. "Mango", "Day 1"
}

export interface TallySpec {
  groups: TallyGroupSpec[];
}

/** One bundle of 5 strokes (or fewer, for a leftover/partial bundle). */
function Bundle({ n }: { n: number }) {
  const strokes = Math.min(n, 5);
  return (
    <span className="fm-tally-bundle" aria-hidden="true">
      {Array.from({ length: strokes }).map((_, i) => (
        <span key={i} className={`fm-tally-stroke ${i === 4 ? "fm-tally-strike" : ""}`} />
      ))}
    </span>
  );
}

function Group({ g }: { g: TallyGroupSpec }) {
  const full = Math.floor(g.count / 5);
  const rest = g.count % 5;
  const bundles = Array.from({ length: full }, () => 5).concat(rest > 0 ? [rest] : []);
  return (
    <div className="fm-tally-group">
      <div className="fm-tally-marks">
        {bundles.length === 0 && <span className="fm-tally-empty">—</span>}
        {bundles.map((n, i) => <Bundle key={i} n={n} />)}
      </div>
      <div className="fm-tally-count">{g.count}</div>
      {g.label && <div className="fm-tally-label">{g.label}</div>}
    </div>
  );
}

export function TallyMarks({ tallies, caption }: { tallies: TallySpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      {tallies.map((t, ti) => (
        <div className="fm-tally-row" key={ti}>
          {t.groups.map((g, gi) => <Group key={gi} g={g} />)}
        </div>
      ))}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
