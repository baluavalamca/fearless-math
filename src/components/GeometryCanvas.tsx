/** Offline SVG geometry shapes — seventh visual component. */

export interface ShapeSpec {
  kind: "square" | "rect" | "triangle" | "circle" | "pentagon" | "hexagon";
  w?: number;          // width in units (rect/square)
  h?: number;          // height in units
  label?: string;
  sideLabels?: boolean; // show w/h labels on sides
  unitGrid?: boolean;   // draw unit squares inside (for area)
  mirrorLine?: boolean; // vertical symmetry line
}

const STROKE = "#8d6e3f", FILL = "#ffd18f";

export function GeometryCanvas({ shapes, caption }: { shapes: ShapeSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      <div className="fm-geo-row">
        {shapes.map((s, i) => <Shape key={i} spec={s} />)}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function polygon(n: number, cx: number, cy: number, r: number, rot = -90) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rot + (i * 360) / n) * Math.PI) / 180;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

function Shape({ spec }: { spec: ShapeSpec }) {
  const cell = 26;
  const w = spec.w ?? 4, h = spec.kind === "square" ? (spec.w ?? 3) : (spec.h ?? 3);
  const isBox = spec.kind === "square" || spec.kind === "rect";
  const W = isBox ? w * cell + 60 : 160;
  const H = isBox ? h * cell + 56 : 150;

  return (
    <div className="fm-geo-item">
      <svg viewBox={`0 0 ${W} ${H}`} width={Math.min(W, 260)} role="img"
        aria-label={spec.label ?? spec.kind}>
        {isBox && (
          <>
            <rect x={34} y={26} width={w * cell} height={h * cell} rx={4}
              fill={FILL} stroke={STROKE} strokeWidth={2.5} />
            {spec.unitGrid && (
              <>
                {Array.from({ length: w - 1 }, (_, i) => (
                  <line key={"v" + i} x1={34 + (i + 1) * cell} y1={26} x2={34 + (i + 1) * cell} y2={26 + h * cell} stroke={STROKE} strokeWidth={1} />
                ))}
                {Array.from({ length: h - 1 }, (_, i) => (
                  <line key={"h" + i} x1={34} y1={26 + (i + 1) * cell} x2={34 + w * cell} y2={26 + (i + 1) * cell} stroke={STROKE} strokeWidth={1} />
                ))}
              </>
            )}
            {spec.sideLabels && (
              <>
                <text x={34 + (w * cell) / 2} y={16} textAnchor="middle" fontSize={15} fontWeight={700} fill="#b35f1b">{w}</text>
                <text x={20} y={26 + (h * cell) / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#b35f1b">{h}</text>
              </>
            )}
            {spec.mirrorLine && (
              <line x1={34 + (w * cell) / 2} y1={14} x2={34 + (w * cell) / 2} y2={38 + h * cell}
                stroke="#4a7fd4" strokeWidth={2.5} strokeDasharray="7 5" />
            )}
          </>
        )}
        {spec.kind === "circle" && (
          <circle cx={80} cy={70} r={48} fill={FILL} stroke={STROKE} strokeWidth={2.5} />
        )}
        {spec.kind === "triangle" && (
          <polygon points={polygon(3, 80, 78, 52)} fill={FILL} stroke={STROKE} strokeWidth={2.5} strokeLinejoin="round" />
        )}
        {spec.kind === "pentagon" && (
          <polygon points={polygon(5, 80, 72, 50)} fill={FILL} stroke={STROKE} strokeWidth={2.5} strokeLinejoin="round" />
        )}
        {spec.kind === "hexagon" && (
          <polygon points={polygon(6, 80, 72, 50)} fill={FILL} stroke={STROKE} strokeWidth={2.5} strokeLinejoin="round" />
        )}
        {!isBox && spec.mirrorLine && (
          <line x1={80} y1={12} x2={80} y2={132} stroke="#4a7fd4" strokeWidth={2.5} strokeDasharray="7 5" />
        )}
      </svg>
      {spec.label && <div className="fm-strip-label">{spec.label}</div>}
    </div>
  );
}
