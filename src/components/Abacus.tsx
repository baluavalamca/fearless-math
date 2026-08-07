/**
 * Offline SVG abacus (school counting-frame style) — shows a number in beads so
 * children can SEE place value the tactile way. Each HORIZONTAL wire is one
 * place-value row (ones at the bottom, growing upward for tens, hundreds …).
 * A vertical divider splits every wire into a "heaven" zone (one bead worth 5,
 * left of the divider) and an "earth" zone (four beads worth 1 each, right of
 * the divider). Beads slid TOWARD the divider are counted.
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
    <figure className="fm-visual fm-abacus-figure">
      <p className="fm-abacus-legend">
        🧮 <strong>How to read the abacus:</strong> each horizontal wire is one place-value
        row — ones at the bottom, tens above it, then hundreds, and so on. The single{" "}
        <span className="fm-abacus-swatch" aria-hidden="true" /> bead <strong>left</strong> of
        the divider is worth <strong>5</strong> when slid <strong>right</strong> to touch it;
        each of the four beads <strong>right</strong> of the divider is worth <strong>1</strong>{" "}
        when slid <strong>left</strong> to touch it. Only beads touching the divider are counted
        — add them up per row to get the digit.
      </p>
      <div className="fm-abacus-row">
        {abaci.map((a, i) => (
          <Soroban key={i} spec={a} />
        ))}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

const PLACE_NAMES = ["Ones", "Tens", "Hundreds", "Thousands", "Ten Th.", "Lakh", "Ten Lakh", "Crore"];

function Soroban({ spec }: { spec: AbacusSpec }) {
  const v = Math.max(0, Math.floor(spec.value));
  const digits = String(v).split("").map(Number);
  const rows = Math.max(digits.length, 3);
  const padded = Array(rows - digits.length).fill(0).concat(digits);

  // Horizontal layout: one wire per place-value row (top = highest place,
  // bottom = ones), beads slide left/right toward a shared vertical divider.
  // Sized generously (and backed by a global CSS override, see styles.css) so the
  // abacus is easily readable on its own — not a tiny thumbnail children have to squint at.
  const RH = 70;                          // row height
  const topY = 55;                        // first row's center
  const leftLabelX = 85;                  // right-aligned place-value name
  const barX = 190;                       // vertical divider x
  const heavenRestX = barX - 60, heavenActiveX = barX - 18;
  const earthFarX = barX + 240;
  const rodStartX = 100, rodEndX = earthFarX + 20;
  const resultX = rodEndX + 40;
  const W = resultX + 50;
  const H = topY + (rows - 1) * RH + 60;
  const barTopY = topY - 32, barBotY = topY + (rows - 1) * RH + 32;

  const bead = (cx: number, cy: number, active: boolean) => (
    <ellipse cx={cx} cy={cy} rx={12} ry={21}
      fill={active ? "var(--fm-shade, #ff9f43)" : "var(--fm-empty, #fdf3e3)"}
      stroke="#8d6e3f" strokeWidth={2.4} />
  );

  return (
    <div className="fm-abacus">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
        aria-label={`Abacus showing ${v}`} style={{ maxWidth: Math.min(W, 620) }}>
        {/* frame */}
        <rect x={2} y={2} width={W - 4} height={H - 4} rx={10} fill="none" stroke="#8d6e3f" strokeWidth={3} />
        {/* vertical divider, spanning every row */}
        <rect x={barX - 2} y={barTopY} width={4} height={barBotY - barTopY} fill="#8d6e3f" />
        {padded.map((d, i) => {
          const cy = topY + i * RH;
          const place = rows - 1 - i;
          const heavenActive = d >= 5;
          const earthActive = d % 5;
          return (
            <g key={i}>
              {/* wire */}
              <rect x={rodStartX} y={cy - 2} width={rodEndX - rodStartX} height={4} fill="#cdb48a" />
              {/* place-value label */}
              <text x={leftLabelX} y={cy + 6} textAnchor="end" fontSize={15} fill="#7a6748">
                {PLACE_NAMES[place] ?? `10^${place}`}
              </text>
              {/* heaven bead: slides right toward the divider when active */}
              {bead(heavenActive ? heavenActiveX : heavenRestX, cy, heavenActive)}
              {/* four earth beads: slide left toward the divider for earthActive of them */}
              {[0, 1, 2, 3].map((k) => {
                const active = k < earthActive;
                const gap = 55;
                const x = active
                  ? barX + 21 + k * gap                 // active beads cluster right of the divider
                  : earthFarX - (3 - k) * gap;           // inactive rest further right
                return <g key={k}>{bead(x, cy, active)}</g>;
              })}
              {/* digit result, kept clear of the beads */}
              <text x={resultX} y={cy + 6} textAnchor="start" fontSize={18} fill="#7a6748" fontWeight={700}>{d}</text>
            </g>
          );
        })}
      </svg>
      <span className="fm-strip-label">{spec.label ?? String(v)}</span>
    </div>
  );
}
