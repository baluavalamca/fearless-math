/** Offline SVG fraction strip — first of the six visual components. */
import { useState } from "react";

export interface StripSpec { parts: number; shaded?: number; label?: string }

export function FractionStrip({
  strips,
  interactive = false,
  caption,
}: {
  strips: StripSpec[];
  interactive?: boolean;
  caption?: string;
}) {
  return (
    <figure className="fm-visual">
      {strips.map((s, i) => (
        <Strip key={i} spec={s} interactive={interactive} />
      ))}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Strip({ spec, interactive }: { spec: StripSpec; interactive: boolean }) {
  const [shaded, setShaded] = useState(spec.shaded ?? 0);
  const W = 420, H = 56, gap = 4;
  const pw = (W - gap * (spec.parts - 1)) / spec.parts;

  return (
    <div className="fm-strip-row">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Strip with ${spec.parts} equal parts, ${shaded} shaded — ${shaded}/${spec.parts}`}
        style={{ maxWidth: W }}
      >
        {Array.from({ length: spec.parts }, (_, i) => (
          <rect
            key={i}
            x={i * (pw + gap)}
            y={4}
            width={pw}
            height={H - 8}
            rx={8}
            fill={i < shaded ? "var(--fm-shade, #ff9f43)" : "var(--fm-empty, #fdf3e3)"}
            stroke="#8d6e3f"
            strokeWidth={2}
            style={{ cursor: interactive ? "pointer" : "default", transition: "fill 150ms" }}
            onClick={interactive ? () => setShaded(i + 1 === shaded ? i : i + 1) : undefined}
          />
        ))}
      </svg>
      <span className="fm-strip-label">
        {spec.label ?? (shaded > 0 ? `${shaded}/${spec.parts}` : `${spec.parts} equal parts`)}
      </span>
    </div>
  );
}
