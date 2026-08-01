/** Offline SVG visual: one or more isometric dice, each showing its three
 *  visible faces (top / left / right) — used for "two positions of a dice"
 *  and other non-verbal-reasoning cube problems. */

export interface DiceSpec {
  top: string | number;
  left: string | number;
  right: string | number;
  label?: string;
}

const EDGE = "#6b4a1e";
const TOP_FILL = "#ffe6b3", LEFT_FILL = "#f2b95c", RIGHT_FILL = "#d99a33";

export function DiceViews({ dice, caption }: { dice: DiceSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      <div className="fm-dice-row">
        {dice.map((d, i) => <Die key={i} spec={d} />)}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Die({ spec }: { spec: DiceSpec }) {
  const cx = 110, cy = 90, w = 44, h = 50;
  const A = [cx, cy - h];
  const B = [cx - w, cy - h / 2];
  const C = [cx, cy];
  const D = [cx + w, cy - h / 2];
  const E = [cx - w, cy + h / 2];
  const F = [cx, cy + h];
  const G = [cx + w, cy + h / 2];
  const pts = (p: number[][]) => p.map((q) => q.join(",")).join(" ");

  return (
    <div className="fm-dice-item">
      <svg viewBox="0 0 220 180" width={140} role="img" aria-label={spec.label ?? "dice"}>
        <polygon points={pts([A, D, C, B])} fill={TOP_FILL} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <polygon points={pts([B, C, F, E])} fill={LEFT_FILL} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <polygon points={pts([C, D, G, F])} fill={RIGHT_FILL} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <text x={cx} y={cy - h / 2 + 6} textAnchor="middle" fontSize={22} fontWeight={800} fill="#5c3d10">{spec.top}</text>
        <text x={cx - w / 2 - 2} y={cy + h / 2 + 12} textAnchor="middle" fontSize={22} fontWeight={800} fill="#5c3d10">{spec.left}</text>
        <text x={cx + w / 2 + 2} y={cy + h / 2 + 12} textAnchor="middle" fontSize={22} fontWeight={800} fill="#5c3d10">{spec.right}</text>
      </svg>
      {spec.label && <div className="fm-strip-label">{spec.label}</div>}
    </div>
  );
}
