/**
 * Offline SVG "pizza" — a circular fraction visual. Kids read slices of a
 * round pizza (or roti / dosa / cake) far more naturally than a bar strip.
 * Same data model as FractionStrip: parts + shaded, one or more pizzas.
 */
import { useState } from "react";

export interface PieSpec { parts: number; shaded?: number; label?: string }

export function PizzaSlices({
  pies,
  interactive = false,
  caption,
}: {
  pies: PieSpec[];
  interactive?: boolean;
  caption?: string;
}) {
  return (
    <figure className="fm-visual">
      <div className="fm-pie-row">
        {pies.map((p, i) => (
          <Pie key={i} spec={p} interactive={interactive} />
        ))}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** One round pizza cut into `parts` equal slices, `shaded` of them filled. */
function Pie({ spec, interactive }: { spec: PieSpec; interactive: boolean }) {
  const [shaded, setShaded] = useState(spec.shaded ?? 0);
  const parts = Math.max(1, spec.parts);
  const cx = 60, cy = 60, r = 52;

  // Point on the rim at a given slice boundary (start at the top, 12 o'clock).
  const rim = (i: number) => {
    const a = (i / parts) * 2 * Math.PI - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };

  return (
    <div className="fm-pie">
      <svg
        viewBox="0 0 120 120"
        width="100%"
        role="img"
        aria-label={`Pizza cut into ${parts} equal slices, ${shaded} shaded — ${shaded}/${parts}`}
        style={{ maxWidth: 150 }}
      >
        {/* crust */}
        <circle cx={cx} cy={cy} r={r + 3} fill="#e7b76b" />
        {parts === 1 ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={shaded >= 1 ? "var(--fm-shade, #ff9f43)" : "var(--fm-empty, #fdf3e3)"}
            stroke="#8d6e3f"
            strokeWidth={2}
            style={{ cursor: interactive ? "pointer" : "default" }}
            onClick={interactive ? () => setShaded(shaded >= 1 ? 0 : 1) : undefined}
          />
        ) : (
          Array.from({ length: parts }, (_, i) => {
            const [x0, y0] = rim(i);
            const [x1, y1] = rim(i + 1);
            const large = 1 / parts > 0.5 ? 1 : 0;
            const d = `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
            return (
              <path
                key={i}
                d={d}
                fill={i < shaded ? "var(--fm-shade, #ff9f43)" : "var(--fm-empty, #fdf3e3)"}
                stroke="#8d6e3f"
                strokeWidth={2}
                style={{ cursor: interactive ? "pointer" : "default", transition: "fill 150ms" }}
                onClick={interactive ? () => setShaded(i + 1 === shaded ? i : i + 1) : undefined}
              />
            );
          })
        )}
      </svg>
      <span className="fm-strip-label">
        {spec.label ?? (shaded > 0 ? `${shaded}/${parts}` : `${parts} equal slices`)}
      </span>
    </div>
  );
}
