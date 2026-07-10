/** Offline SVG bar model (Singapore-style) — fifth visual component.
 *  Part-whole and comparison bars for word problems and fractions. */

export interface BarPart { value: number; label?: string; shaded?: boolean }
export interface BarSpec { label?: string; parts: BarPart[]; showTotal?: boolean }

export function BarModel({ bars, caption }: { bars: BarSpec[]; caption?: string }) {
  const max = Math.max(...bars.map((b) => b.parts.reduce((s, p) => s + p.value, 0)), 1);
  return (
    <figure className="fm-visual">
      {bars.map((b, i) => <Bar key={i} spec={b} max={max} />)}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Bar({ spec, max }: { spec: BarSpec; max: number }) {
  const W = 440, H = 74, pad = 4;
  const total = spec.parts.reduce((s, p) => s + p.value, 0);
  const scale = (W - pad * 2) / max;

  let x = pad;
  return (
    <div className="fm-strip-row">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W }}
        role="img"
        aria-label={
          (spec.label ? spec.label + ": " : "") +
          spec.parts.map((p) => p.label ?? p.value).join(" plus ") +
          ` makes ${total}`
        }
      >
        {spec.parts.map((p, i) => {
          const w = p.value * scale;
          const el = (
            <g key={i}>
              <rect
                x={x} y={16} width={Math.max(w, 2)} height={36} rx={6}
                fill={p.shaded === false ? "#fdf3e3" : i % 2 === 0 ? "var(--fm-shade, #ff9f43)" : "#ffd18f"}
                stroke="#8d6e3f" strokeWidth={2}
              />
              <text x={x + w / 2} y={38} textAnchor="middle" fontSize={15} fontWeight={700} fill="#3d2f1e">
                {p.label ?? p.value}
              </text>
            </g>
          );
          x += w;
          return el;
        })}
        {spec.showTotal !== false && (
          <>
            {/* total brace below */}
            <path d={`M ${pad} 60 v 6 h ${x - pad * 1} v -6`} fill="none" stroke="#8d6e3f" strokeWidth={2} />
            <text x={(pad + x) / 2} y={72} textAnchor="middle" fontSize={14} fill="#7a6748">
              total {total}
            </text>
          </>
        )}
      </svg>
      {spec.label && <span className="fm-strip-label">{spec.label}</span>}
    </div>
  );
}
