/**
 * Offline SVG Soroban (Japanese abacus) — shows a number in beads so children
 * can SEE place value the tactile way. Each rod = one digit. Above the bar sits
 * one "heaven" bead worth 5; below sit four "earth" beads worth 1 each. Beads
 * pushed TOWARD the bar are counted.
 */
export interface AbacusSpec { value: number; label?: string }

export function Abacus({
  abaci,
  caption,
}: {
  abaci: AbacusSpec[];
  caption?: string;
}) {
  return (
    <figure className="fm-visual">
      <div className="fm-abacus-row">
        {abaci.map((a, i) => (
          <Soroban key={i} spec={a} />
        ))}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Soroban({ spec }: { spec: AbacusSpec }) {
  const v = Math.max(0, Math.floor(spec.value));
  const digits = String(v).split("").map(Number);
  const cols = Math.max(digits.length, 3);
  const padded = Array(cols - digits.length).fill(0).concat(digits);

  const CW = 46;        // column width
  const W = cols * CW;
  const barY = 66, topY = 8, botY = 208, H = 220;
  const bead = (cx: number, cy: number, active: boolean) => (
    <ellipse cx={cx} cy={cy} rx={16} ry={9}
      fill={active ? "var(--fm-shade, #ff9f43)" : "var(--fm-empty, #fdf3e3)"}
      stroke="#8d6e3f" strokeWidth={2} />
  );

  return (
    <div className="fm-abacus">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
        aria-label={`Abacus showing ${v}`} style={{ maxWidth: Math.min(W, 340) }}>
        {/* frame */}
        <rect x={2} y={2} width={W - 4} height={H - 4} rx={8} fill="none" stroke="#8d6e3f" strokeWidth={3} />
        {/* reckoning bar */}
        <rect x={2} y={barY - 3} width={W - 4} height={6} fill="#8d6e3f" />
        {padded.map((d, c) => {
          const cx = c * CW + CW / 2;
          const heavenActive = d >= 5;
          const earthActive = d % 5;
          return (
            <g key={c}>
              {/* rod */}
              <rect x={cx - 1.5} y={topY} width={3} height={H - topY - 8} fill="#cdb48a" />
              {/* heaven bead: down toward bar when active */}
              {bead(cx, heavenActive ? barY - 14 : topY + 14, heavenActive)}
              {/* four earth beads: pushed up toward bar for earthActive of them */}
              {[0, 1, 2, 3].map((k) => {
                const active = k < earthActive;
                const gap = 21;
                const y = active
                  ? barY + 16 + k * gap                 // active beads stack just under the bar
                  : botY - (3 - k) * gap;                // inactive rest at the bottom
                return <g key={k}>{bead(cx, y, active)}</g>;
              })}
              {/* digit label under each rod */}
              <text x={cx} y={H - 2} textAnchor="middle" fontSize={13} fill="#7a6748" fontWeight={700}>{d}</text>
            </g>
          );
        })}
      </svg>
      <span className="fm-strip-label">{spec.label ?? String(v)}</span>
    </div>
  );
}
