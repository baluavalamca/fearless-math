/** Offline SVG bar chart — ninth visual component (Data Newsroom). */

export interface CategorySpec { label: string; value: number; icon?: string }

export function BarChart({
  categories, unit, caption,
}: { categories: CategorySpec[]; unit?: string; caption?: string }) {
  const W = 460, H = 230, padL = 34, padB = 44, padT = 24;
  const max = Math.max(...categories.map((c) => c.value), 1);
  const bw = Math.min(64, (W - padL - 20) / categories.length - 16);
  const scaleY = (H - padT - padB) / max;

  return (
    <figure className="fm-visual">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img"
        aria-label={"Bar chart: " + categories.map((c) => `${c.label} ${c.value}`).join(", ")}>
        {/* axes */}
        <line x1={padL} y1={padT - 8} x2={padL} y2={H - padB} stroke="#8d6e3f" strokeWidth={2.5} />
        <line x1={padL} y1={H - padB} x2={W - 10} y2={H - padB} stroke="#8d6e3f" strokeWidth={2.5} />
        {categories.map((c, i) => {
          const x = padL + 22 + i * ((W - padL - 30) / categories.length);
          const bh = c.value * scaleY;
          return (
            <g key={c.label}>
              <rect x={x} y={H - padB - bh} width={bw} height={bh} rx={7}
                fill={["#ff9f43", "#4a7fd4", "#7d6bd1", "#2e7d32", "#e0525e", "#e8b04b"][i % 6]}
                stroke="#8d6e3f" strokeWidth={2} />
              <text x={x + bw / 2} y={H - padB - bh - 7} textAnchor="middle" fontSize={16} fontWeight={700} fill="#3d2f1e">
                {c.value}
              </text>
              <text x={x + bw / 2} y={H - padB + 18} textAnchor="middle" fontSize={13} fill="#3d2f1e">
                {c.icon ? c.icon + " " : ""}{c.label}
              </text>
            </g>
          );
        })}
        {unit && <text x={padL - 6} y={padT - 12} textAnchor="start" fontSize={12} fill="#7a6748">{unit}</text>}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
