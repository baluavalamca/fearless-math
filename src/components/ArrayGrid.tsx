/** Offline SVG array/equal-groups component — third visual component. */

export interface GridSpec {
  rows: number;
  cols: number;
  label?: string;
  highlightRows?: number; // shade the first N rows (for repeated addition / sharing)
  asGroups?: boolean;     // draw each row as a separate "basket" (equal groups view)
}

export function ArrayGrid({ grids, caption }: { grids: GridSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      {grids.map((g, i) => <Grid key={i} spec={g} />)}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Grid({ spec }: { spec: GridSpec }) {
  const cell = 34, gap = 8, groupGap = spec.asGroups ? 14 : 0;
  const W = spec.cols * (cell + gap) + gap + 8;
  const H = spec.rows * (cell + gap + groupGap) + gap + 8;

  return (
    <div className="fm-strip-row">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: Math.min(W, 480) }}
        role="img"
        aria-label={
          `${spec.rows} ${spec.asGroups ? "groups" : "rows"} of ${spec.cols} — ` +
          `${spec.rows} times ${spec.cols} equals ${spec.rows * spec.cols}`
        }
      >
        {Array.from({ length: spec.rows }, (_, r) => (
          <g key={r}>
            {spec.asGroups && (
              <rect
                x={2} y={r * (cell + gap + groupGap) + 2}
                width={W - 8} height={cell + gap + 4}
                rx={12} fill="none" stroke="#e8d9c0" strokeWidth={2} strokeDasharray="6 4"
              />
            )}
            {Array.from({ length: spec.cols }, (_, c) => (
              <circle
                key={c}
                cx={c * (cell + gap) + gap + cell / 2 + 4}
                cy={r * (cell + gap + groupGap) + gap + cell / 2 + 4}
                r={cell / 2 - 2}
                fill={spec.highlightRows != null && r < spec.highlightRows
                  ? "var(--fm-shade, #ff9f43)"
                  : "#fdf3e3"}
                stroke="#8d6e3f"
                strokeWidth={2}
              />
            ))}
          </g>
        ))}
      </svg>
      <span className="fm-strip-label">
        {spec.label ?? `${spec.rows} × ${spec.cols} = ${spec.rows * spec.cols}`}
      </span>
    </div>
  );
}
