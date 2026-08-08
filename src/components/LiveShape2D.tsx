/**
 * LiveShape2D — a flat shape (circle/rectangle/square/triangle/right-triangle/
 * angle-triangle/clock-face/dot-plot) whose dimensions redraw live as a
 * slider moves. Plain theme-tokenised SVG, same style as FunctionPlot.
 */
const COLOR: Record<string, string> = {
  accent: "var(--accent)",
  good: "var(--good)",
  cool: "var(--accent-dark)",
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

export function LiveShape2D({
  shape,
  params,
  maxExtent = 5,
  color = "accent",
  caption,
}: {
  shape: string;
  params: Record<string, number>;
  /** Largest a dimension can get (sizes the drawing so it never clips). */
  maxExtent?: number;
  color?: "accent" | "good" | "cool";
  caption?: string;
}) {
  const W = 460, H = 300, pad = 46;
  const usable = Math.min(W, H) - pad * 2;
  const scale = usable / (2 * Math.max(maxExtent, 0.1));
  const cx = W / 2, cy = H / 2;
  const stroke = COLOR[color] ?? COLOR.accent;

  // A square is just a rectangle with equal sides — alias it so it reuses
  // the exact same (already-polished) rendering path.
  if (shape === "square") {
    const s = Math.max(params.s ?? params.side ?? 1, 0.1);
    shape = "rectangle";
    params = { w: s, h: s };
  }

  if (shape === "rectangle") {
    // Rectangle gets its own (bigger) margin so arrowed dimension lines and
    // labels always have room outside the shape — never clipped, never squeezed.
    const padR = 56;
    const usableR = Math.min(W, H) - padR * 2;
    const w = Math.max(params.w ?? 1, 0.1), h = Math.max(params.h ?? 1, 0.1);
    // Auto-fit to the CURRENT width/height (not the slider's worst-case max) —
    // the rectangle always fills the canvas nicely, however small or large it is.
    const scaleR = usableR / (2 * Math.max(w, h, 1));
    const pw = w * scaleR, ph = h * scaleR;
    const x = cx - pw / 2, y = cy - ph / 2;

    // Unit grid inside the rectangle — "count the little squares" is how kids
    // actually learn area. Only drawn when cells are big enough to read.
    const cell = scaleR;
    const showGrid = cell >= 12;
    const gridV: number[] = [];
    const gridH: number[] = [];
    if (showGrid) {
      for (let i = 1; i < w; i++) gridV.push(i);
      for (let j = 1; j < h; j++) gridH.push(j);
    }

    return (
      <figure className="fm-visual fm-live-shape2d">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img"
          aria-label={`Rectangle, width ${fmt(w)}, height ${fmt(h)}`}>
          <defs>
            <marker id="fm-live-arrow" viewBox="0 0 10 10" refX="5" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
            </marker>
          </defs>

          <rect x={x} y={y} width={pw} height={ph} fill={stroke} fillOpacity={0.2} stroke={stroke} strokeWidth={3} rx={3} />

          {showGrid && gridV.map((i) => (
            <line key={"gv" + i} x1={x + i * cell} y1={y} x2={x + i * cell} y2={y + ph}
              stroke={stroke} strokeOpacity={0.4} strokeWidth={1} />
          ))}
          {showGrid && gridH.map((j) => (
            <line key={"gh" + j} x1={x} y1={y + j * cell} x2={x + pw} y2={y + j * cell}
              stroke={stroke} strokeOpacity={0.4} strokeWidth={1} />
          ))}

          <line x1={x} y1={y + ph + 20} x2={x + pw} y2={y + ph + 20} stroke="var(--ink)" strokeWidth={1.75}
            markerStart="url(#fm-live-arrow)" markerEnd="url(#fm-live-arrow)" />
          <text x={cx} y={y + ph + 38} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
            w = {fmt(w)}
          </text>

          <line x1={x - 20} y1={y} x2={x - 20} y2={y + ph} stroke="var(--ink)" strokeWidth={1.75}
            markerStart="url(#fm-live-arrow)" markerEnd="url(#fm-live-arrow)" />
          <text x={x - 38} y={cy} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)"
            transform={`rotate(-90 ${x - 38} ${cy})`}>
            h = {fmt(h)}
          </text>
        </svg>
        <figcaption>{caption ?? (showGrid ? "Each little square is 1 unit — count them to find the area!" : `${fmt(w)} × ${fmt(h)}`)}</figcaption>
      </figure>
    );
  }

  if (shape === "triangle") {
    // Base/height triangle (isoceles look) for area-formula teaching:
    // Area = 1/2 x base x height.
    const padT = 56;
    const usableT = Math.min(W, H) - padT * 2;
    const b = Math.max(params.b ?? params.base ?? 1, 0.1);
    const h = Math.max(params.h ?? params.height ?? 1, 0.1);
    const scaleT = usableT / (2 * Math.max(b, h, 1));
    const pb = b * scaleT, ph = h * scaleT;
    const baseY = cy + ph / 2, apexY = baseY - ph;
    const leftX = cx - pb / 2, rightX = cx + pb / 2, apexX = cx;

    return (
      <figure className="fm-visual fm-live-shape2d">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img"
          aria-label={`Triangle, base ${fmt(b)}, height ${fmt(h)}`}>
          <defs>
            <marker id="fm-live-arrow" viewBox="0 0 10 10" refX="5" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
            </marker>
          </defs>

          <polygon points={`${leftX},${baseY} ${rightX},${baseY} ${apexX},${apexY}`}
            fill={stroke} fillOpacity={0.2} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />

          <line x1={apexX} y1={apexY} x2={apexX} y2={baseY} stroke="var(--ink)" strokeWidth={1.75}
            strokeDasharray="6 4" markerStart="url(#fm-live-arrow)" markerEnd="url(#fm-live-arrow)" />
          <text x={apexX + 14} y={(apexY + baseY) / 2} textAnchor="start" fontSize={14} fontWeight={700} fill="var(--ink)">
            h = {fmt(h)}
          </text>

          <line x1={leftX} y1={baseY + 20} x2={rightX} y2={baseY + 20} stroke="var(--ink)" strokeWidth={1.75}
            markerStart="url(#fm-live-arrow)" markerEnd="url(#fm-live-arrow)" />
          <text x={cx} y={baseY + 38} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
            b = {fmt(b)}
          </text>
        </svg>
        <figcaption>{caption ?? "Area = ½ × base × height"}</figcaption>
      </figure>
    );
  }

  if (shape === "right-triangle") {
    // Right angle at bottom-left; legs a (horizontal) and b (vertical) —
    // for Pythagoras: a² + b² = c² (the hypotenuse, computed by the formula panel).
    const padRT = 56;
    const usableRT = Math.min(W, H) - padRT * 2;
    const a = Math.max(params.a ?? 1, 0.1);
    const b = Math.max(params.b ?? 1, 0.1);
    const scaleRT = usableRT / (2 * Math.max(a, b, 1));
    const pa = a * scaleRT, pb = b * scaleRT;
    const x = cx - pa / 2, y = cy - pb / 2;
    const cornerX = x, cornerY = y + pb; // right-angle corner (bottom-left)
    const rightX = x + pa, rightY = y + pb; // end of leg a
    const topX = x, topY = y; // end of leg b
    const rs = 14; // right-angle marker size

    return (
      <figure className="fm-visual fm-live-shape2d">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img"
          aria-label={`Right triangle, legs ${fmt(a)} and ${fmt(b)}`}>
          <defs>
            <marker id="fm-live-arrow" viewBox="0 0 10 10" refX="5" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
            </marker>
          </defs>

          <polygon points={`${cornerX},${cornerY} ${rightX},${rightY} ${topX},${topY}`}
            fill={stroke} fillOpacity={0.2} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />

          {/* small square marking the 90° angle at the corner */}
          <path d={`M${cornerX},${cornerY - rs} L${cornerX + rs},${cornerY - rs} L${cornerX + rs},${cornerY}`}
            fill="none" stroke="var(--ink)" strokeWidth={1.5} />

          <line x1={cornerX} y1={cornerY + 20} x2={rightX} y2={cornerY + 20} stroke="var(--ink)" strokeWidth={1.75}
            markerStart="url(#fm-live-arrow)" markerEnd="url(#fm-live-arrow)" />
          <text x={(cornerX + rightX) / 2} y={cornerY + 38} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
            a = {fmt(a)}
          </text>

          <line x1={cornerX - 20} y1={topY} x2={cornerX - 20} y2={cornerY} stroke="var(--ink)" strokeWidth={1.75}
            markerStart="url(#fm-live-arrow)" markerEnd="url(#fm-live-arrow)" />
          <text x={cornerX - 38} y={(topY + cornerY) / 2} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)"
            transform={`rotate(-90 ${cornerX - 38} ${(topY + cornerY) / 2})`}>
            b = {fmt(b)}
          </text>
        </svg>
        <figcaption>{caption ?? "a² + b² = c² — the hypotenuse c is shown below"}</figcaption>
      </figure>
    );
  }

  if (shape === "angle-triangle") {
    // Angle of elevation from the ground: right angle at bottom-right, where
    // the computed vertical leg (opposite/height) meets the horizontal leg
    // (adjacent, a slider). The angle itself (a slider, in degrees) sits at
    // bottom-left where the hypotenuse (line of sight) meets the ground —
    // for geo-17-trigonometry / geo-21-trig-applications.
    const padAT = 56;
    const usableAT = Math.min(W, H) - padAT * 2;
    const angleDeg = Math.min(Math.max(params.angle ?? 45, 1), 89);
    const adj = Math.max(params.adj ?? 1, 0.1);
    const rad = (angleDeg * Math.PI) / 180;
    const opp = adj * Math.tan(rad);
    const scaleAT = usableAT / (2 * Math.max(adj, opp, 1));
    const pAdj = adj * scaleAT, pOpp = opp * scaleAT;
    const cornerX = cx - pAdj / 2, cornerY = cy + pOpp / 2; // right-angle corner (bottom-right)
    const groundX = cornerX - pAdj, groundY = cornerY; // where angle is marked (bottom-left)
    const topX = cornerX, topY = cornerY - pOpp; // top of vertical leg
    const rs = 14; // right-angle marker size
    const arcR = 26; // angle arc radius

    return (
      <figure className="fm-visual fm-live-shape2d">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img"
          aria-label={`Right triangle, angle ${fmt(angleDeg)} degrees, adjacent ${fmt(adj)}`}>
          <defs>
            <marker id="fm-live-arrow" viewBox="0 0 10 10" refX="5" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
            </marker>
          </defs>

          <polygon points={`${groundX},${groundY} ${cornerX},${cornerY} ${topX},${topY}`}
            fill={stroke} fillOpacity={0.2} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />

          {/* small square marking the 90° angle at the corner */}
          <path d={`M${cornerX - rs},${cornerY} L${cornerX - rs},${cornerY - rs} L${cornerX},${cornerY - rs}`}
            fill="none" stroke="var(--ink)" strokeWidth={1.5} />

          {/* arc marking the angle at ground level */}
          <path d={`M${groundX + arcR},${groundY} A${arcR},${arcR} 0 0 0 ${groundX + arcR * Math.cos(rad)},${groundY - arcR * Math.sin(rad)}`}
            fill="none" stroke="var(--ink)" strokeWidth={1.5} />
          <text x={groundX + arcR + 14} y={groundY - 8} textAnchor="start" fontSize={13} fontWeight={700} fill="var(--ink)">
            {fmt(angleDeg)}°
          </text>

          <line x1={groundX} y1={cornerY + 20} x2={cornerX} y2={cornerY + 20} stroke="var(--ink)" strokeWidth={1.75}
            markerStart="url(#fm-live-arrow)" markerEnd="url(#fm-live-arrow)" />
          <text x={(groundX + cornerX) / 2} y={cornerY + 38} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
            adjacent = {fmt(adj)}
          </text>

          <line x1={cornerX + 20} y1={cornerY} x2={cornerX + 20} y2={topY} stroke="var(--ink)" strokeWidth={1.75}
            markerStart="url(#fm-live-arrow)" markerEnd="url(#fm-live-arrow)" />
          <text x={cornerX + 38} y={(cornerY + topY) / 2} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)"
            transform={`rotate(-90 ${cornerX + 38} ${(cornerY + topY) / 2})`}>
            opposite = {fmt(opp)}
          </text>
        </svg>
        <figcaption>{caption ?? "tan(angle) = opposite ÷ adjacent"}</figcaption>
      </figure>
    );
  }

  if (shape === "clock-face") {
    // Analog clock: hour hand at (hour%12)*30 + minute*0.5 "clock-degrees"
    // (0 = 12 o'clock, clockwise), minute hand at minute*6. A short arc
    // between the hands echoes the |30H - 5.5M| angle shown in the formula
    // panel — for apt-11-clock-aptitude.
    const R = Math.min(W, H) / 2 - 60;
    const hour = Math.min(Math.max(params.hour ?? 3, 0), 12);
    const minute = Math.min(Math.max(params.minute ?? 0, 0), 59);
    const toXY = (deg: number, len: number) => {
      const rad = (deg * Math.PI) / 180;
      return [cx + len * Math.sin(rad), cy - len * Math.cos(rad)];
    };
    const hourDeg = (hour % 12) * 30 + minute * 0.5;
    const minuteDeg = minute * 6;
    const diff = (((minuteDeg - hourDeg) % 360) + 360) % 360;
    const angleBetween = Math.min(diff, 360 - diff);
    const [hx, hy] = toXY(hourDeg, R * 0.5);
    const [mx, my] = toXY(minuteDeg, R * 0.82);
    const arcR = 30;
    const [ax1, ay1] = toXY(hourDeg, arcR);
    const [ax2, ay2] = toXY(minuteDeg, arcR);
    const sweepFlag = diff <= 180 ? 1 : 0;
    const ticks = Array.from({ length: 12 }, (_, i) => i * 30);

    return (
      <figure className="fm-visual fm-live-shape2d">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img"
          aria-label={`Clock at ${Math.round(hour) || 12}:${String(Math.round(minute)).padStart(2, "0")}, angle between hands ${fmt(angleBetween)} degrees`}>
          <circle cx={cx} cy={cy} r={R} fill={stroke} fillOpacity={0.08} stroke={stroke} strokeWidth={3} />
          {ticks.map((deg) => {
            const [tx1, ty1] = toXY(deg, R - 10);
            const [tx2, ty2] = toXY(deg, R - 1);
            const [lx, ly] = toXY(deg, R - 26);
            const label = deg === 0 ? 12 : deg / 30;
            return (
              <g key={deg}>
                <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--ink)" strokeWidth={2} />
                <text x={lx} y={ly + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink)">{label}</text>
              </g>
            );
          })}

          {/* arc marking the angle between the hands */}
          <path d={`M${ax1},${ay1} A${arcR},${arcR} 0 0 ${sweepFlag} ${ax2},${ay2}`}
            fill="none" stroke="var(--good)" strokeWidth={2.5} />

          <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="var(--ink)" strokeWidth={5} strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={mx} y2={my} stroke={stroke} strokeWidth={3} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={5} fill="var(--ink)" />

          <text x={cx} y={cy + R + 34} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--good)">
            angle = {fmt(angleBetween)}°
          </text>
        </svg>
        <figcaption>{caption ?? "Short thick hand = hours, long thin hand = minutes."}</figcaption>
      </figure>
    );
  }

  if (shape === "dot-plot") {
    // Four data values on a number line, with a dashed mean marker — for
    // data-mean-deviation / data-09-statistics-dispersion.
    const padDP = 60;
    const a = params.a ?? 1, b = params.b ?? 3, c = params.c ?? 5, d = params.d ?? 7;
    const vals = [a, b, c, d];
    const mean = (a + b + c + d) / 4;
    const lo = Math.min(...vals, mean) - 1;
    const hi = Math.max(...vals, mean) + 1;
    const axisY = cy + 50;
    const x0 = padDP, x1 = W - padDP;
    const toX = (v: number) => x0 + ((v - lo) / (hi - lo || 1)) * (x1 - x0);

    return (
      <figure className="fm-visual fm-live-shape2d">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img"
          aria-label={`Dot plot of ${fmt(a)}, ${fmt(b)}, ${fmt(c)}, ${fmt(d)}, mean ${fmt(mean)}`}>
          <line x1={x0} y1={axisY} x2={x1} y2={axisY} stroke="var(--ink)" strokeWidth={2} />

          <line x1={toX(mean)} y1={axisY - 76} x2={toX(mean)} y2={axisY + 10} stroke="var(--good)" strokeWidth={2}
            strokeDasharray="5 4" />
          <text x={toX(mean)} y={axisY - 84} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--good)">
            mean = {fmt(mean)}
          </text>

          {vals.map((v, i) => {
            const x = toX(v);
            return (
              <g key={i}>
                <line x1={x} y1={axisY} x2={x} y2={axisY - 6} stroke={stroke} strokeWidth={1.5} />
                <circle cx={x} cy={axisY - 18} r={9} fill={stroke} fillOpacity={0.85} stroke="var(--ink)" strokeWidth={1.5} />
                <text x={x} y={axisY - 32} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ink)">{fmt(v)}</text>
              </g>
            );
          })}
        </svg>
        <figcaption>{caption ?? "Each dot is a value; the dashed line marks the mean."}</figcaption>
      </figure>
    );
  }

  // Default: circle
  const r = Math.max(params.r ?? 1, 0.1);
  const pr = r * scale;
  return (
    <figure className="fm-visual fm-live-shape2d">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label={`Circle, radius ${fmt(r)}`}>
        <circle cx={cx} cy={cy} r={pr} fill={stroke} fillOpacity={0.24} stroke={stroke} strokeWidth={3} />
        <line x1={cx} y1={cy} x2={cx + pr} y2={cy} stroke="var(--ink)" strokeWidth={2} strokeDasharray="5 4" />
        <circle cx={cx} cy={cy} r={3} fill="var(--ink)" />
        <text x={cx + pr / 2} y={cy - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">r = {fmt(r)}</text>
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
