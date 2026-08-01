/** Offline SVG visual for non-verbal reasoning: mirror/water images, figure
 *  series (shape rotation/count patterns), and paper-folding diagrams.
 *  One flexible component so the validator/renderer only need one new name. */

export interface FigurePanelSpec {
  label?: string;                 // caption under the panel, e.g. "Original", "Mirror image"
  kind: "text" | "shape" | "fold";
  text?: string;                  // for kind "text": the letters/word/digits shown
  flip?: "h" | "v" | "hv" | "none"; // h = mirror (left-right), v = water (upside-down)
  shapeKind?: "triangle" | "square" | "circle" | "pentagon" | "star" | "arrow";
  rotate?: number;                // degrees, for figure-series rotation patterns
  count?: number;                 // repeat the shape this many times (counting-figures patterns)
  foldLines?: 1 | 2;               // for kind "fold": how many creases to draw
  punch?: { x: number; y: number }[]; // punch-hole dot positions (0..1 fractions of the folded square)
  unfolded?: boolean;              // draw the full unfolded square with holes mirrored across the fold lines
  dashed?: boolean;                // draw shape outline only (ghost/answer panel)
}

const STROKE = "#8d6e3f", FILL = "#ffd18f", FOLD = "#4a7fd4", PUNCH = "#c0392b";

export function ReasoningFigure({ panels, caption }: { panels: FigurePanelSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      <div className="fm-rf-row">
        {panels.map((p, i) => <Panel key={i} spec={p} />)}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function flipTransform(flip: FigurePanelSpec["flip"], cx: number, cy: number) {
  if (flip === "h") return `translate(${cx * 2},0) scale(-1,1)`;
  if (flip === "v") return `translate(0,${cy * 2}) scale(1,-1)`;
  if (flip === "hv") return `translate(${cx * 2},${cy * 2}) scale(-1,-1)`;
  return undefined;
}

function polygon(n: number, cx: number, cy: number, r: number, rot = -90) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rot + (i * 360) / n) * Math.PI) / 180;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

function starPoints(cx: number, cy: number, rOuter: number, rInner: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = ((-90 + (i * 360) / 10) * Math.PI) / 180;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

function Shape({ kind, cx, cy, r }: { kind: NonNullable<FigurePanelSpec["shapeKind"]>; cx: number; cy: number; r: number }) {
  if (kind === "circle") return <circle cx={cx} cy={cy} r={r} fill={FILL} stroke={STROKE} strokeWidth={2.5} />;
  if (kind === "triangle") return <polygon points={polygon(3, cx, cy, r)} fill={FILL} stroke={STROKE} strokeWidth={2.5} strokeLinejoin="round" />;
  if (kind === "square") return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={FILL} stroke={STROKE} strokeWidth={2.5} />;
  if (kind === "pentagon") return <polygon points={polygon(5, cx, cy, r)} fill={FILL} stroke={STROKE} strokeWidth={2.5} strokeLinejoin="round" />;
  if (kind === "star") return <polygon points={starPoints(cx, cy, r, r * 0.45)} fill={FILL} stroke={STROKE} strokeWidth={2.5} strokeLinejoin="round" />;
  // arrow
  return <polygon points={`${cx - r},${cy - r * 0.35} ${cx + r * 0.2},${cy - r * 0.35} ${cx + r * 0.2},${cy - r} ${cx + r},${cy} ${cx + r * 0.2},${cy + r} ${cx + r * 0.2},${cy + r * 0.35} ${cx - r},${cy + r * 0.35}`}
    fill={FILL} stroke={STROKE} strokeWidth={2.5} strokeLinejoin="round" />;
}

function Panel({ spec }: { spec: FigurePanelSpec }) {
  const W = 120, H = 120, cx = W / 2, cy = H / 2;

  return (
    <div className="fm-rf-panel">
      <svg viewBox={`0 0 ${W} ${H}`} width={110} role="img" aria-label={spec.label ?? spec.kind}>
        {spec.kind === "text" && (
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize={44} fontWeight={800}
            fill={spec.dashed ? "none" : "#3a5a9c"} stroke={spec.dashed ? "#3a5a9c" : "none"} strokeWidth={spec.dashed ? 1.5 : 0}
            transform={flipTransform(spec.flip, cx, cy)}>
            {spec.text}
          </text>
        )}
        {spec.kind === "shape" && spec.shapeKind && (
          <g transform={[
            spec.rotate ? `rotate(${spec.rotate} ${cx} ${cy})` : "",
            flipTransform(spec.flip, cx, cy) ?? "",
          ].filter(Boolean).join(" ") || undefined}
            opacity={spec.dashed ? 0.35 : 1}>
            {spec.count && spec.count > 1
              ? Array.from({ length: spec.count }, (_, i) => {
                  const cols = Math.min(spec.count!, 3);
                  const col = i % cols, row = Math.floor(i / cols);
                  const r = 14;
                  const startX = cx - ((cols - 1) * 30) / 2;
                  return <Shape key={i} kind={spec.shapeKind!} cx={startX + col * 30} cy={cy - 14 + row * 30} r={r} />;
                })
              : <Shape kind={spec.shapeKind} cx={cx} cy={cy} r={34} />}
          </g>
        )}
        {spec.kind === "fold" && <FoldDiagram spec={spec} W={W} H={H} />}
      </svg>
      {spec.label && <div className="fm-strip-label">{spec.label}</div>}
    </div>
  );
}

function FoldDiagram({ spec, W, H }: { spec: FigurePanelSpec; W: number; H: number }) {
  const pad = 14;
  const x0 = pad, y0 = pad, size = W - pad * 2;
  const midX = x0 + size / 2, midY = y0 + size / 2;
  const dots = spec.punch ?? [];
  // When unfolded, mirror each punch dot across every fold line that was creased.
  const allDots: { x: number; y: number }[] = [];
  for (const d of dots) {
    const px = x0 + d.x * size, py = y0 + d.y * size;
    allDots.push({ x: px, y: py });
    if (spec.unfolded) {
      if (spec.foldLines === 1 || spec.foldLines === 2) allDots.push({ x: x0 + size - (px - x0), y: py }); // mirror across vertical fold
      if (spec.foldLines === 2) {
        allDots.push({ x: px, y: y0 + size - (py - y0) }); // mirror across horizontal fold
        allDots.push({ x: x0 + size - (px - x0), y: y0 + size - (py - y0) });
      }
    }
  }
  return (
    <>
      <rect x={x0} y={y0} width={size} height={size} fill="#fff8ea" stroke={STROKE} strokeWidth={2.5} />
      {!spec.unfolded && spec.foldLines && (
        <line x1={midX} y1={y0} x2={midX} y2={y0 + size} stroke={FOLD} strokeWidth={2} strokeDasharray="5 4" />
      )}
      {!spec.unfolded && spec.foldLines === 2 && (
        <line x1={x0} y1={midY} x2={x0 + size} y2={midY} stroke={FOLD} strokeWidth={2} strokeDasharray="5 4" />
      )}
      {spec.unfolded && spec.foldLines && (
        <line x1={midX} y1={y0} x2={midX} y2={y0 + size} stroke={FOLD} strokeWidth={1} strokeDasharray="3 5" opacity={0.5} />
      )}
      {spec.unfolded && spec.foldLines === 2 && (
        <line x1={x0} y1={midY} x2={x0 + size} y2={midY} stroke={FOLD} strokeWidth={1} strokeDasharray="3 5" opacity={0.5} />
      )}
      {allDots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={5} fill={PUNCH} />)}
    </>
  );
}
