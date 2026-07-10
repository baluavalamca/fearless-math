/** Offline SVG number line (0 to 1) — second visual component. */

export interface LineSpec {
  parts: number;       // equal jumps between 0 and 1
  mark?: number;       // marker after this many jumps (e.g. 3 => 3/parts)
  label?: string;      // label shown at the marker
  showLabels?: boolean; // show fraction labels at every tick
}

export function NumberLine({ lines, caption }: { lines: LineSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      {lines.map((l, i) => <Line key={i} spec={l} />)}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Line({ spec }: { spec: LineSpec }) {
  const W = 460, H = 96, pad = 26;
  const y = 58;
  const span = W - pad * 2;
  const x = (k: number) => pad + (span * k) / spec.parts;
  const marked = spec.mark != null && spec.mark >= 0 && spec.mark <= spec.parts;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W }}
      role="img"
      aria-label={
        `Number line from 0 to 1 with ${spec.parts} equal jumps` +
        (marked ? `, marker at ${spec.mark}/${spec.parts}` : "")
      }
    >
      {/* base line with arrowheads */}
      <line x1={6} y1={y} x2={W - 6} y2={y} stroke="#8d6e3f" strokeWidth={3} />
      <polygon points={`${W - 6},${y} ${W - 16},${y - 5} ${W - 16},${y + 5}`} fill="#8d6e3f" />
      <polygon points={`6,${y} 16,${y - 5} 16,${y + 5}`} fill="#8d6e3f" />

      {/* ticks */}
      {Array.from({ length: spec.parts + 1 }, (_, k) => (
        <g key={k}>
          <line x1={x(k)} y1={y - 10} x2={x(k)} y2={y + 10} stroke="#8d6e3f" strokeWidth={k === 0 || k === spec.parts ? 3 : 2} />
          {(k === 0 || k === spec.parts) && (
            <text x={x(k)} y={y + 30} textAnchor="middle" fontSize={16} fontWeight={700} fill="#3d2f1e">
              {k === 0 ? "0" : "1"}
            </text>
          )}
          {spec.showLabels && k > 0 && k < spec.parts && (
            <text x={x(k)} y={y + 30} textAnchor="middle" fontSize={13} fill="#7a6748">
              {k}/{spec.parts}
            </text>
          )}
        </g>
      ))}

      {/* jump arcs from 0 to the marker — teaches "count the jumps" */}
      {marked &&
        Array.from({ length: spec.mark! }, (_, k) => (
          <path
            key={k}
            d={`M ${x(k)} ${y - 12} Q ${(x(k) + x(k + 1)) / 2} ${y - 34} ${x(k + 1)} ${y - 12}`}
            fill="none"
            stroke="var(--fm-shade, #ff9f43)"
            strokeWidth={2.5}
          />
        ))}

      {/* marker (Fraction Fox's flag) */}
      {marked && (
        <g>
          <circle cx={x(spec.mark!)} cy={y} r={7} fill="var(--fm-shade, #ff9f43)" stroke="#8d6e3f" strokeWidth={2} />
          <text x={x(spec.mark!)} y={y - 38} textAnchor="middle" fontSize={17} fontWeight={700} fill="#e8842a">
            {spec.label ?? `${spec.mark}/${spec.parts}`} 🚩
          </text>
        </g>
      )}
    </svg>
  );
}
