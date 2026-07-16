/**
 * FunctionPlot — an offline SVG grapher for senior-secondary maths.
 * Draws real curves (from polynomial coefficients or explicit points) on axes,
 * with optional shaded AREA under a curve (integrals) and a TANGENT line at a
 * point (derivatives). Theme-tokenised so it matches every skin.
 *
 * Spec (per plot):
 *   poly:      coefficients low→high, e.g. [0,0,1] = x², [0,2] = 2x, [1,-5,1] = x²−5x+1
 *   points:    explicit [[x,y],…] (alternative to poly)
 *   domain:    [xmin, xmax]  (default [-4, 4])
 *   shade:     [a, b]        shade the area under the curve from x=a to x=b
 *   tangentAt: x0            draw the tangent line at x = x0 (poly only)
 *   color:     "accent" | "good" | "cool"
 *   label:     short label drawn near the curve
 */

export interface PlotSpec {
  poly?: number[];
  points?: [number, number][];
  domain?: [number, number];
  shade?: [number, number];
  tangentAt?: number;
  label?: string;
  color?: "accent" | "good" | "cool";
}

const COLOR: Record<string, string> = {
  accent: "var(--accent)",
  good: "var(--good)",
  cool: "var(--accent-dark)",
};

const evalPoly = (c: number[], x: number) => c.reduce((s, a, i) => s + a * Math.pow(x, i), 0);
const evalDeriv = (c: number[], x: number) =>
  c.reduce((s, a, i) => (i === 0 ? s : s + i * a * Math.pow(x, i - 1)), 0);

export function FunctionPlot({ plots, caption }: { plots: PlotSpec[]; caption?: string }) {
  const W = 460, H = 300, pad = 30;
  const list = (plots || []).filter((p) => Array.isArray(p.poly) || Array.isArray(p.points));

  // Gather sample points for every plot to auto-scale the window.
  const samples = list.map((p) => {
    const [dx0, dx1] = p.domain ?? [-4, 4];
    if (p.points && p.points.length) return p.points;
    const pts: [number, number][] = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const x = dx0 + ((dx1 - dx0) * i) / N;
      pts.push([x, evalPoly(p.poly!, x)]);
    }
    return pts;
  });

  const allX = samples.flat().map((p) => p[0]);
  const allY = samples.flat().map((p) => p[1]);
  let xmin = Math.min(...allX, -1), xmax = Math.max(...allX, 1);
  let ymin = Math.min(...allY, -1), ymax = Math.max(...allY, 1);
  // pad the y-window a little and always include 0
  ymin = Math.min(ymin, 0); ymax = Math.max(ymax, 0);
  const yspan = (ymax - ymin) || 1; ymin -= yspan * 0.08; ymax += yspan * 0.08;
  if (xmax - xmin < 0.001) { xmin -= 1; xmax += 1; }

  const sx = (x: number) => pad + ((x - xmin) / (xmax - xmin)) * (W - 2 * pad);
  const sy = (y: number) => H - pad - ((y - ymin) / (ymax - ymin)) * (H - 2 * pad);
  const x0 = sx(0), y0 = sy(0);

  const gridXs: number[] = [], gridYs: number[] = [];
  for (let g = Math.ceil(xmin); g <= Math.floor(xmax); g++) gridXs.push(g);
  for (let g = Math.ceil(ymin); g <= Math.floor(ymax); g++) gridYs.push(g);

  return (
    <figure className="fm-visual">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img"
        aria-label={"Graph: " + list.map((p) => p.label ?? "curve").join(", ")}>
        {/* grid */}
        {gridXs.map((g) => (
          <line key={"gx" + g} x1={sx(g)} y1={pad} x2={sx(g)} y2={H - pad}
            stroke="var(--line)" strokeWidth={g === 0 ? 0 : 1} opacity={0.5} />
        ))}
        {gridYs.map((g) => (
          <line key={"gy" + g} x1={pad} y1={sy(g)} x2={W - pad} y2={sy(g)}
            stroke="var(--line)" strokeWidth={g === 0 ? 0 : 1} opacity={0.5} />
        ))}

        {/* shaded areas (integrals) — drawn first, under the curves */}
        {list.map((p, i) => {
          if (!p.shade || !p.poly) return null;
          const [a, b] = p.shade;
          const N = 40; const pts: string[] = [`${sx(a)},${y0}`];
          for (let k = 0; k <= N; k++) {
            const x = a + ((b - a) * k) / N;
            pts.push(`${sx(x)},${sy(evalPoly(p.poly, x))}`);
          }
          pts.push(`${sx(b)},${y0}`);
          return <polygon key={"sh" + i} points={pts.join(" ")}
            fill={COLOR[p.color ?? "accent"]} opacity={0.22} />;
        })}

        {/* axes */}
        <line x1={pad} y1={y0} x2={W - pad} y2={y0} stroke="var(--ink)" strokeWidth={2} />
        <line x1={x0} y1={pad} x2={x0} y2={H - pad} stroke="var(--ink)" strokeWidth={2} />
        <text x={W - pad + 2} y={y0 + 4} fontSize={13} fill="var(--muted)">x</text>
        <text x={x0 - 4} y={pad - 6} fontSize={13} fill="var(--muted)" textAnchor="middle">y</text>

        {/* curves */}
        {samples.map((pts, i) => {
          const p = list[i];
          const d = pts.map((q, k) => `${k === 0 ? "M" : "L"}${sx(q[0]).toFixed(1)},${sy(q[1]).toFixed(1)}`).join(" ");
          return <path key={"c" + i} d={d} fill="none"
            stroke={COLOR[p.color ?? "accent"]} strokeWidth={3} strokeLinejoin="round" />;
        })}

        {/* tangent lines (derivatives) */}
        {list.map((p, i) => {
          if (p.tangentAt === undefined || !p.poly) return null;
          const x1 = p.tangentAt, m = evalDeriv(p.poly, x1), c = evalPoly(p.poly, x1);
          const tl = (x: number) => c + m * (x - x1);
          const a = Math.max(xmin, x1 - 2.2), b = Math.min(xmax, x1 + 2.2);
          return (
            <g key={"tan" + i}>
              <line x1={sx(a)} y1={sy(tl(a))} x2={sx(b)} y2={sy(tl(b))}
                stroke="var(--good)" strokeWidth={2} strokeDasharray="6 4" />
              <circle cx={sx(x1)} cy={sy(c)} r={4.5} fill="var(--good)" stroke="var(--card)" strokeWidth={1.5} />
              <text x={sx(x1) + 8} y={sy(c) - 8} fontSize={12} fontWeight={700} fill="var(--good)">
                slope {Number.isInteger(m) ? m : m.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* labels */}
        {samples.map((pts, i) => {
          const p = list[i]; if (!p.label) return null;
          const mid = pts[Math.floor(pts.length * 0.72)];
          return <text key={"l" + i} x={sx(mid[0]) + 6} y={sy(mid[1]) - 6}
            fontSize={13} fontWeight={700} fill={COLOR[p.color ?? "accent"]}>{p.label}</text>;
        })}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
