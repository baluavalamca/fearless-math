/**
 * AdvancedToolbox — a SECOND, separate popup dock for Class 6 → IIT-JEE math tools.
 * Kept apart from the kid-friendly MathToolbox so the PP1–5 experience stays simple.
 * Everything here is 100% offline: canvas drawing + a small safe expression parser.
 * Phase 1 tools: Grapher, Statistics, Probability, Number Theory, Mensuration,
 * Finance, Fraction/Decimal/Percent + Ratio, Formula Sheet.
 */
import { useEffect, useMemo, useRef, useState } from "react";

/* ---------- shared helpers ---------- */

/** Round nicely and drop trailing zeros. */
function fmt(n: number, dp = 4): string {
  if (!isFinite(n)) return "—";
  const r = Math.round(n * 10 ** dp) / 10 ** dp;
  return String(r);
}

/** Indian-grouped rupee amount, e.g. ₹10,379.18 / ₹5,00,000. */
function inr(n: number): string {
  if (!isFinite(n)) return "—";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Safe recursive-descent evaluator for y = f(x). No eval(). */
function evalFx(srcRaw: string, x: number): number {
  const s = srcRaw
    .replace(/×/g, "*").replace(/÷/g, "/")
    .replace(/π/g, "PI").replace(/√/g, "sqrt")
    .replace(/\s+/g, "");
  let i = 0;
  const funcs: Record<string, (a: number) => number> = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
    log: (a) => Math.log10(a), ln: (a) => Math.log(a),
  };
  function expr(): number {
    let v = term();
    while (s[i] === "+" || s[i] === "-") { const o = s[i++]; const t = term(); v = o === "+" ? v + t : v - t; }
    return v;
  }
  function term(): number {
    let v = unary();
    while (s[i] === "*" || s[i] === "/") { const o = s[i++]; const p = unary(); v = o === "*" ? v * p : v / p; }
    return v;
  }
  // unary minus sits ABOVE power so that -x^2 = -(x^2); power is right-associative.
  function unary(): number { if (s[i] === "-") { i++; return -unary(); } if (s[i] === "+") { i++; return unary(); } return power(); }
  function power(): number { const b = factor(); if (s[i] === "^") { i++; return Math.pow(b, unary()); } return b; }
  function factor(): number {
    if (s[i] === "(") { i++; const v = expr(); if (s[i] === ")") i++; return v; }
    const m = s.slice(i).match(/^[A-Za-z]+/);
    if (m) {
      const name = m[0];
      if (name === "x") { i += 1; return x; }
      if (name === "PI") { i += 2; return Math.PI; }
      if (name === "e") { i += 1; return Math.E; }
      if (funcs[name]) {
        i += name.length; let a: number;
        if (s[i] === "(") { i++; a = expr(); if (s[i] === ")") i++; } else a = unary();
        return funcs[name](a);
      }
      throw new Error("bad name " + name);
    }
    const nm = s.slice(i).match(/^\d*\.?\d+/);
    if (nm) { i += nm[0].length; return parseFloat(nm[0]); }
    throw new Error("parse");
  }
  const r = expr();
  if (i !== s.length) throw new Error("trailing");
  return r;
}

/* ---------- tool registry ---------- */

type ToolId =
  | "grapher" | "stats" | "prob" | "numtheory"
  | "mensuration" | "finance" | "fracpct" | "formula"
  | "trig" | "sequences" | "matrix" | "complex" | "sets" | "calculus"
  | "solver" | "geometry" | "surface3d";

const TOOLS: { id: ToolId; icon: string; label: string; band: string }[] = [
  { id: "grapher", icon: "📈", label: "Graphing", band: "8→JEE" },
  { id: "surface3d", icon: "🧊", label: "3D Surface", band: "12→JEE" },
  { id: "calculus", icon: "∫", label: "Calculus", band: "11→JEE" },
  { id: "solver", icon: "🟰", label: "Equation Solver", band: "8→12" },
  { id: "trig", icon: "📐", label: "Trigonometry", band: "9→JEE" },
  { id: "geometry", icon: "△", label: "Geometry Lab", band: "6→10" },
  { id: "matrix", icon: "▦", label: "Matrices", band: "12→JEE" },
  { id: "complex", icon: "ℂ", label: "Complex + Argand", band: "11→JEE" },
  { id: "sequences", icon: "➕", label: "Sequences AP/GP", band: "10→11" },
  { id: "sets", icon: "⋃", label: "Sets & Venn", band: "11" },
  { id: "stats", icon: "📊", label: "Statistics", band: "6→12" },
  { id: "prob", icon: "🎲", label: "Probability", band: "6→12" },
  { id: "numtheory", icon: "🔢", label: "Number Theory", band: "4→8" },
  { id: "mensuration", icon: "📏", label: "Mensuration", band: "5→10" },
  { id: "finance", icon: "💰", label: "Percent & Money", band: "6→10" },
  { id: "fracpct", icon: "½", label: "Fraction↔%", band: "5→8" },
  { id: "formula", icon: "📖", label: "Formula Sheet", band: "9→JEE" },
];

const HELP: Record<ToolId, { what: string; use: string[]; tip: string }> = {
  grapher: {
    what: "Draws the graph of any function y = f(x) so you can SEE its shape — lines, parabolas, waves.",
    use: ["Type a function like x^2, 2*x+1, or sin(x).", "Add a second function to compare.", "Change the range to zoom in or out."],
    tip: "Use * for multiply and ^ for power. Functions: sin, cos, tan, sqrt, log, ln, abs. Constants: pi, e.",
  },
  stats: {
    what: "Finds the average and spread of a set of numbers, and draws them.",
    use: ["Type numbers separated by commas.", "Read mean, median, mode, range and standard deviation.", "See each value as a bar."],
    tip: "Mean = balance point. Median = middle value. Mode = most common. SD = how spread out the data is.",
  },
  prob: {
    what: "Runs real random trials (coin, dice, spinner) so you compare what SHOULD happen with what DID happen.",
    use: ["Pick coin, one die, two dice, or spinner.", "Press 1 / 10 / 100 to run trials.", "Compare experimental vs theoretical probability."],
    tip: "The more trials you run, the closer the experimental result gets to the theoretical one (Law of Large Numbers).",
  },
  numtheory: {
    what: "Explores whole numbers: primes, factors, HCF/LCM, and counting arrangements.",
    use: ["Check if a number is prime and see its factor tree.", "Find HCF (GCD) and LCM of two numbers.", "Compute nCr, nPr and convert to binary/hex."],
    tip: "HCF × LCM = the product of the two numbers. A prime has exactly two factors: 1 and itself.",
  },
  mensuration: {
    what: "Calculates area, perimeter, surface area and volume — and shows the exact formula used.",
    use: ["Pick a 2D shape or a 3D solid.", "Type the dimensions.", "Read the answer and the formula."],
    tip: "Area is in square units, volume in cube units. Always keep every length in the SAME unit before you calculate.",
  },
  finance: {
    what: "Everyday percentage and money maths: %, interest, EMI, profit/loss and GST.",
    use: ["Percent: X% of Y, or X is what % of Y.", "Interest: simple and compound.", "EMI, Profit/Loss %, and GST."],
    tip: "Simple interest grows in a straight line; compound interest grows faster because it earns interest on interest.",
  },
  fracpct: {
    what: "Converts between fractions, decimals and percentages, and simplifies ratios.",
    use: ["Enter a fraction to get its decimal, %, and simplest form.", "Enter a decimal to get its fraction.", "Simplify a ratio a:b or solve a proportion."],
    tip: "To make a fraction a percent, divide top by bottom then multiply by 100.",
  },
  formula: {
    what: "A searchable formula reference from primary maths all the way to JEE.",
    use: ["Type a keyword like 'area', 'quadratic' or 'derivative'.", "Browse by topic.", "Use it to revise before a test."],
    tip: "Understand WHY a formula works before memorising it — it sticks far better.",
  },
  trig: {
    what: "Shows the unit circle and the sine/cosine waves so trigonometry becomes visual.",
    use: ["Drag the angle slider from 0° to 360°.", "Watch sin, cos and tan change on the circle.", "See where the angle sits on the wave."],
    tip: "On the unit circle, cos θ is the x-coordinate and sin θ is the y-coordinate of the point.",
  },
  sequences: {
    what: "Builds arithmetic (AP) and geometric (GP) sequences: terms, nth term and sum.",
    use: ["Choose AP or GP.", "Enter first term, common difference/ratio, and how many terms.", "Read the terms, nth term and total."],
    tip: "AP adds the same number each time (d). GP multiplies by the same number each time (r).",
  },
  matrix: {
    what: "Adds, multiplies, transposes and inverts 2×2 and 3×3 matrices, and finds the determinant.",
    use: ["Pick 2×2 or 3×3.", "Type the numbers of matrix A (and B for +, −, ×).", "Choose an operation to see the result."],
    tip: "A matrix has an inverse only when its determinant is not zero.",
  },
  complex: {
    what: "Works with complex numbers a + bi and plots them on the Argand plane.",
    use: ["Enter two complex numbers.", "See their sum and product.", "Read modulus, argument and polar form of the first one."],
    tip: "Modulus |z| = √(a²+b²) is the distance from the origin; argument is the angle from the positive x-axis.",
  },
  sets: {
    what: "Finds union, intersection and difference of two sets and draws a Venn diagram.",
    use: ["Type the members of Set A and Set B (commas).", "Read A∪B, A∩B and the differences.", "See the counts inside the Venn circles."],
    tip: "Union ∪ = everything in either set. Intersection ∩ = only what is in BOTH.",
  },
  calculus: {
    what: "Shows what a derivative and an integral really mean — a tangent's slope and the area under a curve.",
    use: ["Type a function like x^2 or sin(x).", "Derivative mode: move the point to see the tangent's slope.", "Area mode: set a and b to shade the integral."],
    tip: "The derivative at a point = slope of the tangent line there. The definite integral = signed area under the curve.",
  },
  solver: {
    what: "Solves equations and SHOWS every step — linear, quadratic and pairs of equations.",
    use: ["Linear: enter a, b, c for ax + b = c.", "Quadratic: enter a, b, c for ax² + bx + c = 0.", "Pair: enter the two equations' coefficients."],
    tip: "For a quadratic, the discriminant D = b²−4ac tells you how many real roots there are before you solve.",
  },
  geometry: {
    what: "A protractor to explore angles, and a triangle solver that finds angles and area from three sides.",
    use: ["Protractor: drag the angle and read acute/right/obtuse.", "Triangle: type the three side lengths.", "Read each angle and the area."],
    tip: "A triangle is only possible if each side is shorter than the sum of the other two (triangle inequality).",
  },
  surface3d: {
    what: "Draws a 3D surface z = f(x, y) as a wireframe you can spin — great for JEE 3D geometry intuition.",
    use: ["Pick or type a function of x and y.", "Drag the rotate slider to spin it.", "See how the height changes across the plane."],
    tip: "z = x² + y² is a bowl (paraboloid); z = x² − y² is a saddle. Rotate to see their shapes clearly.",
  },
};

/* ---------- Grapher ---------- */

function Grapher() {
  const [f1, setF1] = useState("x^2");
  const [f2, setF2] = useState("");
  const [range, setRange] = useState(10);
  const [warn, setWarn] = useState("");
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const W = cv.width, H = cv.height;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const xmin = -range, xmax = range, ymax = range * H / W, ymin = -ymax;
    const PX = (x: number) => ((x - xmin) / (xmax - xmin)) * W;
    const PY = (y: number) => H - ((y - ymin) / (ymax - ymin)) * H;
    ctx.clearRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = "#e4e9f2"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let g = Math.ceil(xmin); g <= xmax; g++) { ctx.moveTo(PX(g), 0); ctx.lineTo(PX(g), H); }
    for (let g = Math.ceil(ymin); g <= ymax; g++) { ctx.moveTo(0, PY(g)); ctx.lineTo(W, PY(g)); }
    ctx.stroke();
    // axes
    ctx.strokeStyle = "#5b6b86"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, PY(0)); ctx.lineTo(W, PY(0)); ctx.moveTo(PX(0), 0); ctx.lineTo(PX(0), H); ctx.stroke();
    ctx.fillStyle = "#5b6b86"; ctx.font = "11px system-ui";
    ctx.fillText("x", W - 12, PY(0) - 6); ctx.fillText("y", PX(0) + 6, 12);
    // axis tick numbers
    const stepN = range >= 20 ? 5 : range >= 10 ? 2 : 1;
    ctx.fillStyle = "#8494b3"; ctx.font = "10px system-ui"; ctx.textAlign = "center";
    for (let g = Math.ceil(xmin); g <= xmax; g++) if (g !== 0 && g % stepN === 0) ctx.fillText(String(g), PX(g), PY(0) + 12);
    ctx.textAlign = "right";
    for (let g = Math.ceil(ymin); g <= ymax; g++) if (g !== 0 && g % stepN === 0) ctx.fillText(String(g), PX(0) - 4, PY(g) + 3);
    ctx.textAlign = "left";
    // curves
    const plots: [string, string][] = [];
    if (f1.trim()) plots.push([f1, "#2f6bff"]);
    if (f2.trim()) plots.push([f2, "#e8590c"]);
    const bad: string[] = [];
    for (const [expr, color] of plots) {
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
      let pen = false, prevY = 0, finite = 0;
      for (let px = 0; px <= W; px++) {
        const x = xmin + (px / W) * (xmax - xmin);
        let y: number;
        try { y = evalFx(expr, x); } catch { pen = false; continue; }
        if (!isFinite(y)) { pen = false; continue; }
        finite++;
        if (pen && Math.abs(y - prevY) > (ymax - ymin) * 2) { pen = false; } // discontinuity
        const py = PY(y);
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
        prevY = y;
      }
      ctx.stroke();
      if (finite === 0) bad.push(expr);
    }
    setWarn(bad.length ? `Couldn't plot: ${bad.join(", ")} — check the formula.` : "");
  }, [f1, f2, range]);

  return (
    <div className="fm-adv-pad fm-adv-2col">
      <div className="fm-adv-col-left">
        <div className="fm-adv-row">
          <span className="fm-adv-dot" style={{ background: "#2f6bff" }} />
          <input className="fm-adv-input" value={f1} onChange={(e) => setF1(e.target.value)} placeholder="e.g. x^2" aria-label="Function 1" />
        </div>
        <div className="fm-adv-row">
          <span className="fm-adv-dot" style={{ background: "#e8590c" }} />
          <input className="fm-adv-input" value={f2} onChange={(e) => setF2(e.target.value)} placeholder="second function (optional)" aria-label="Function 2" />
        </div>
        <div className="fm-adv-chips">
          {[5, 10, 20].map((r) => (
            <button key={r} className={"fm-adv-chip" + (range === r ? " on" : "")} onClick={() => setRange(r)}>±{r}</button>
          ))}
        </div>
        {warn && <p className="fm-adv-note" style={{ color: "#c92a2a" }}>{warn}</p>}
        <p className="fm-adv-note">Use <code>*</code> for ×, <code>^</code> for power. sin cos tan sqrt log ln abs · pi e</p>
      </div>
      <div className="fm-adv-col-right">
        <canvas ref={ref} width={720} height={560} className="fm-adv-canvas" />
      </div>
    </div>
  );
}

/* ---------- Statistics ---------- */

function StatsTool() {
  const [raw, setRaw] = useState("4, 8, 15, 16, 23, 42");
  const ref = useRef<HTMLCanvasElement | null>(null);
  const data = useMemo(
    () => raw.split(/[,\s]+/).map((s) => parseFloat(s)).filter((n) => isFinite(n)),
    [raw]
  );
  const stats = useMemo(() => {
    const n = data.length;
    if (!n) return null;
    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const freq: Record<number, number> = {};
    data.forEach((v) => (freq[v] = (freq[v] || 0) + 1));
    const maxF = Math.max(...Object.values(freq));
    const modes = maxF > 1 ? Object.keys(freq).filter((k) => freq[+k] === maxF).map(Number) : [];
    const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    return { n, sum, mean, median, modes, range: sorted[n - 1] - sorted[0], sd: Math.sqrt(variance), min: sorted[0], max: sorted[n - 1] };
  }, [data]);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const W = cv.width, H = cv.height; ctx.clearRect(0, 0, W, H);
    if (!data.length || !stats) return;
    const pad = 26, plotH = H - pad - 16;
    const lo = Math.min(0, ...data), hi = Math.max(0, ...data), span = (hi - lo) || 1;
    const Y = (v: number) => pad + ((hi - v) / span) * plotH; // value → y (handles negatives)
    const baseY = Y(0), bw = (W - pad) / data.length;
    data.forEach((v, k) => {
      const x = pad + k * bw + 3, w = Math.max(2, bw - 6);
      ctx.fillStyle = v >= 0 ? "#4c6ef5" : "#f08c00";
      ctx.fillRect(x, Math.min(baseY, Y(v)), w, Math.abs(Y(v) - baseY));
      ctx.fillStyle = "#495057"; ctx.font = "10px system-ui"; ctx.textAlign = "center";
      ctx.fillText(String(v), x + w / 2, H - 5);
    });
    ctx.strokeStyle = "#adb9d4"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(W, baseY); ctx.stroke(); // zero baseline
    const my = Y(stats.mean);
    ctx.strokeStyle = "#12b886"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
    ctx.moveTo(pad, my); ctx.lineTo(W, my); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#0ca678"; ctx.textAlign = "left"; ctx.fillText("mean", 2, my - 3);
  }, [data, stats]);

  return (
    <div className="fm-adv-pad">
      <label className="fm-adv-lbl">Enter numbers (commas)</label>
      <textarea className="fm-adv-input fm-adv-ta" value={raw} onChange={(e) => setRaw(e.target.value)} rows={2} />
      {stats ? (
        <>
          <div className="fm-adv-grid">
            <div className="fm-adv-stat"><b>{fmt(stats.mean)}</b><span>Mean</span></div>
            <div className="fm-adv-stat"><b>{fmt(stats.median)}</b><span>Median</span></div>
            <div className="fm-adv-stat"><b>{stats.modes.length ? stats.modes.join(", ") : "none"}</b><span>Mode</span></div>
            <div className="fm-adv-stat"><b>{fmt(stats.range)}</b><span>Range</span></div>
            <div className="fm-adv-stat"><b>{fmt(stats.sd)}</b><span>Std dev σ</span></div>
            <div className="fm-adv-stat"><b>{stats.n}</b><span>Count</span></div>
          </div>
          <p className="fm-adv-note">σ is the population standard deviation (÷n).</p>
          <canvas ref={ref} width={1040} height={240} className="fm-adv-canvas" />
        </>
      ) : <p className="fm-adv-note">Type some numbers to begin.</p>}
    </div>
  );
}

/* ---------- Probability ---------- */

type ProbMode = "coin" | "die" | "dice2" | "spin";
function ProbTool() {
  const [mode, setMode] = useState<ProbMode>("coin");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [last, setLast] = useState<string>("");

  const outcomes = useMemo<string[]>(() => {
    if (mode === "coin") return ["Heads", "Tails"];
    if (mode === "die") return ["1", "2", "3", "4", "5", "6"];
    if (mode === "spin") return ["Red", "Blue", "Green", "Yellow"];
    return Array.from({ length: 11 }, (_, k) => String(k + 2)); // dice2 sums 2..12
  }, [mode]);

  function reset() { setCounts({}); setLast(""); }
  useEffect(reset, [mode]);

  function roll(times: number) {
    const c = { ...counts };
    let l = "";
    for (let t = 0; t < times; t++) {
      let o: string;
      if (mode === "dice2") o = String((1 + Math.floor(Math.random() * 6)) + (1 + Math.floor(Math.random() * 6)));
      else o = outcomes[Math.floor(Math.random() * outcomes.length)];
      c[o] = (c[o] || 0) + 1; l = o;
    }
    setCounts(c); setLast(l);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  function theo(o: string): number {
    if (mode === "dice2") { const ways = 6 - Math.abs(7 - Number(o)); return ways / 36; }
    return 1 / outcomes.length;
  }
  const maxC = Math.max(1, ...Object.values(counts));

  return (
    <div className="fm-adv-pad">
      <div className="fm-adv-chips">
        {([["coin", "🪙 Coin"], ["die", "🎲 1 Die"], ["dice2", "🎲🎲 2 Dice"], ["spin", "🎡 Spinner"]] as [ProbMode, string][]).map(([m, lbl]) => (
          <button key={m} className={"fm-adv-chip" + (mode === m ? " on" : "")} onClick={() => setMode(m)}>{lbl}</button>
        ))}
      </div>
      <div className="fm-adv-chips">
        <button className="fm-adv-btn" onClick={() => roll(1)}>Run 1</button>
        <button className="fm-adv-btn" onClick={() => roll(10)}>Run 10</button>
        <button className="fm-adv-btn" onClick={() => roll(100)}>Run 100</button>
        <button className="fm-adv-btn ghost" onClick={reset}>Reset</button>
      </div>
      {last && <p className="fm-adv-note">Last: <b>{last}</b> · Total trials: <b>{total}</b></p>}
      <table className="fm-adv-tbl">
        <thead><tr><th>Outcome</th><th>Count</th><th>Experimental</th><th>Theoretical</th></tr></thead>
        <tbody>
          {outcomes.map((o) => (
            <tr key={o}>
              <td>{o}</td>
              <td>
                <span className="fm-adv-bar" style={{ width: `${((counts[o] || 0) / maxC) * 60 + 2}px` }} />
                {counts[o] || 0}
              </td>
              <td>{total ? (((counts[o] || 0) / total) * 100).toFixed(1) + "%" : "—"}</td>
              <td>{(theo(o) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Number theory ---------- */

function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function primeFactors(n: number): number[] {
  const f: number[] = []; let x = Math.abs(Math.floor(n));
  for (let d = 2; d * d <= x; d++) while (x % d === 0) { f.push(d); x /= d; }
  if (x > 1) f.push(x);
  return f;
}
/** Divisors via √n pairing — O(√n) instead of O(n), so big numbers don't freeze the UI. */
function divisors(n: number): number[] {
  const x = Math.abs(Math.floor(n)); if (x === 0) return [];
  const small: number[] = [], big: number[] = [];
  for (let d = 1; d * d <= x; d++) if (x % d === 0) { small.push(d); if (d !== x / d) big.push(x / d); }
  return small.concat(big.reverse());
}
/** Multiplicative nCr / nPr — avoids factorial overflow and precision loss. */
function nCrCalc(n: number, r: number): number {
  if (r < 0 || r > n || n < 0) return 0; r = Math.min(r, n - r); let res = 1;
  for (let k = 0; k < r; k++) res = (res * (n - k)) / (k + 1);
  return Math.round(res);
}
function nPrCalc(n: number, r: number): number {
  if (r < 0 || r > n || n < 0) return 0; let res = 1; for (let k = 0; k < r; k++) res *= n - k; return res;
}
function factorial(n: number): number { let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; }

function NumberTheoryTool() {
  const [n, setN] = useState(60);
  const [a, setA] = useState(12);
  const [b, setB] = useState(18);
  const [nn, setNn] = useState(5);
  const [rr, setRr] = useState(2);

  const pf = primeFactors(n);
  const isPrime = n > 1 && pf.length === 1;
  const factors = divisors(n);
  const g = gcd(a, b), l = a && b ? Math.abs(a * b) / g : 0;
  const nCr = nCrCalc(nn, rr);
  const nPr = nPrCalc(nn, rr);
  const dec = Math.abs(Math.floor(n));
  const factStr = nn < 0 ? "—" : nn > 18 ? "very large (>18!)" : String(factorial(nn));
  const showFactors = factors.length <= 60;

  return (
    <div className="fm-adv-pad">
      <div className="fm-adv-row"><label className="fm-adv-lbl">Number</label>
        <input type="number" className="fm-adv-input sm" value={n} onChange={(e) => setN(+e.target.value)} /></div>
      <div className="fm-adv-card2">
        <p><b>{n}</b> is {isPrime ? "a prime ✅" : n > 1 ? "composite" : "neither prime nor composite"}.</p>
        <p>Prime factorisation: <b>{pf.length ? pf.join(" × ") : "—"}</b></p>
        <p>Factors ({factors.length}): {showFactors ? factors.join(", ") : "too many to list"}</p>
        <p>Binary <b>{dec.toString(2)}</b> · Octal <b>{dec.toString(8)}</b> · Hex <b>{dec.toString(16).toUpperCase()}</b></p>
      </div>
      <div className="fm-adv-row">
        <label className="fm-adv-lbl">HCF / LCM</label>
        <input type="number" className="fm-adv-input sm" value={a} onChange={(e) => setA(+e.target.value)} />
        <input type="number" className="fm-adv-input sm" value={b} onChange={(e) => setB(+e.target.value)} />
      </div>
      <div className="fm-adv-card2"><p>HCF (GCD) = <b>{g}</b> · LCM = <b>{l}</b></p></div>
      <div className="fm-adv-row">
        <label className="fm-adv-lbl">n, r</label>
        <input type="number" className="fm-adv-input sm" value={nn} onChange={(e) => setNn(+e.target.value)} />
        <input type="number" className="fm-adv-input sm" value={rr} onChange={(e) => setRr(+e.target.value)} />
      </div>
      <div className="fm-adv-card2">
        <p>ⁿCᵣ = <b>{nCr}</b> · ⁿPᵣ = <b>{nPr}</b> · {nn}! = <b>{factStr}</b></p>
        {rr > nn && <p className="fm-adv-note">r must be ≤ n for combinations/permutations.</p>}
      </div>
    </div>
  );
}

/* ---------- Mensuration ---------- */

type Shape = { id: string; name: string; dims: string[]; area: (d: number[]) => number; extra: (d: number[]) => string };
const SHAPES: Shape[] = [
  { id: "square", name: "Square", dims: ["side"], area: (d) => d[0] ** 2, extra: (d) => `Perimeter = 4 × ${d[0]} = ${4 * d[0]}` },
  { id: "rect", name: "Rectangle", dims: ["length", "breadth"], area: (d) => d[0] * d[1], extra: (d) => `Perimeter = 2(${d[0]}+${d[1]}) = ${2 * (d[0] + d[1])}` },
  { id: "triangle", name: "Triangle", dims: ["base", "height"], area: (d) => 0.5 * d[0] * d[1], extra: () => `Area = ½ × base × height` },
  { id: "circle", name: "Circle", dims: ["radius"], area: (d) => Math.PI * d[0] ** 2, extra: (d) => `Circumference = 2πr = ${fmt(2 * Math.PI * d[0])}` },
];
const SOLIDS: Shape[] = [
  { id: "cube", name: "Cube", dims: ["side"], area: (d) => d[0] ** 3, extra: (d) => `Surface area = 6a² = ${6 * d[0] ** 2}` },
  { id: "cuboid", name: "Cuboid", dims: ["length", "breadth", "height"], area: (d) => d[0] * d[1] * d[2], extra: (d) => `Surface area = 2(lb+bh+hl) = ${2 * (d[0] * d[1] + d[1] * d[2] + d[2] * d[0])}` },
  { id: "cylinder", name: "Cylinder", dims: ["radius", "height"], area: (d) => Math.PI * d[0] ** 2 * d[1], extra: (d) => `Curved SA = 2πrh = ${fmt(2 * Math.PI * d[0] * d[1])}` },
  { id: "sphere", name: "Sphere", dims: ["radius"], area: (d) => (4 / 3) * Math.PI * d[0] ** 3, extra: (d) => `Surface area = 4πr² = ${fmt(4 * Math.PI * d[0] ** 2)}` },
  { id: "cone", name: "Cone", dims: ["radius", "height"], area: (d) => (1 / 3) * Math.PI * d[0] ** 2 * d[1], extra: (d) => `Slant l = ${fmt(Math.hypot(d[0], d[1]))}` },
];

function MensurationTool() {
  const [is3d, setIs3d] = useState(false);
  const list = is3d ? SOLIDS : SHAPES;
  const [sid, setSid] = useState(list[0].id);
  const shape = list.find((s) => s.id === sid) || list[0];
  const [dims, setDims] = useState<number[]>([5, 5, 5]);
  const d = shape.dims.map((_, k) => dims[k] ?? 1);

  function switchKind(v: boolean) { setIs3d(v); const l = v ? SOLIDS : SHAPES; setSid(l[0].id); }

  return (
    <div className="fm-adv-pad">
      <div className="fm-adv-chips">
        <button className={"fm-adv-chip" + (!is3d ? " on" : "")} onClick={() => switchKind(false)}>2D shape</button>
        <button className={"fm-adv-chip" + (is3d ? " on" : "")} onClick={() => switchKind(true)}>3D solid</button>
      </div>
      <div className="fm-adv-chips">
        {list.map((s) => (
          <button key={s.id} className={"fm-adv-chip" + (sid === s.id ? " on" : "")} onClick={() => setSid(s.id)}>{s.name}</button>
        ))}
      </div>
      {shape.dims.map((name, k) => (
        <div className="fm-adv-row" key={name}>
          <label className="fm-adv-lbl">{name}</label>
          <input type="number" className="fm-adv-input sm" value={d[k]} onChange={(e) => { const c = [...dims]; c[k] = +e.target.value; setDims(c); }} />
        </div>
      ))}
      <div className="fm-adv-card2">
        <p className="fm-adv-big">{is3d ? "Volume" : "Area"} = <b>{fmt(shape.area(d))}</b> {is3d ? "cube" : "sq"} units</p>
        <p className="fm-adv-note">{shape.extra(d)}</p>
      </div>
    </div>
  );
}

/* ---------- Finance / percentage ---------- */

type FinTab = "pct" | "si" | "ci" | "emi" | "pl" | "gst";
function FinanceTool() {
  const [tab, setTab] = useState<FinTab>("pct");
  // percentage
  const [px, setPx] = useState(20), [py, setPy] = useState(150);
  // interest
  const [P, setP] = useState(10000), [R, setR] = useState(8), [T, setT] = useState(3), [ny, setNy] = useState(1);
  // emi
  const [eP, setEP] = useState(500000), [eR, setER] = useState(9), [eN, setEN] = useState(60);
  // profit/loss
  const [cp, setCp] = useState(200), [sp, setSp] = useState(250);
  // gst
  const [amt, setAmt] = useState(1000), [gr, setGr] = useState(18);

  const si = (P * R * T) / 100;
  const ci = P * (1 + R / (100 * ny)) ** (ny * T) - P;
  const mr = eR / 1200; const emi = mr ? (eP * mr * (1 + mr) ** eN) / ((1 + mr) ** eN - 1) : eP / eN;
  const diff = sp - cp; const plPct = cp ? (Math.abs(diff) / cp) * 100 : 0;
  const gst = (amt * gr) / 100;

  return (
    <div className="fm-adv-pad">
      <div className="fm-adv-chips">
        {([["pct", "%"], ["si", "Simple int"], ["ci", "Compound"], ["emi", "EMI"], ["pl", "Profit/Loss"], ["gst", "GST"]] as [FinTab, string][]).map(([t, lbl]) => (
          <button key={t} className={"fm-adv-chip" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{lbl}</button>
        ))}
      </div>
      {tab === "pct" && <>
        <div className="fm-adv-row"><input type="number" className="fm-adv-input sm" value={px} onChange={(e) => setPx(+e.target.value)} /><span className="fm-adv-lbl">% of</span><input type="number" className="fm-adv-input sm" value={py} onChange={(e) => setPy(+e.target.value)} /></div>
        <div className="fm-adv-card2"><p className="fm-adv-big">{px}% of {py} = <b>{fmt((px * py) / 100)}</b></p><p className="fm-adv-note">{px} is <b>{fmt(py ? (px / py) * 100 : 0)}%</b> of {py}</p></div>
      </>}
      {tab === "si" && <>
        <ThreeIn P={P} R={R} T={T} setP={setP} setR={setR} setT={setT} />
        <div className="fm-adv-card2"><p className="fm-adv-big">SI = <b>{inr(si)}</b></p><p className="fm-adv-note">Amount = P + SI = {inr(P + si)} · formula P×R×T/100</p></div>
      </>}
      {tab === "ci" && <>
        <ThreeIn P={P} R={R} T={T} setP={setP} setR={setR} setT={setT} />
        <div className="fm-adv-row"><label className="fm-adv-lbl">compounds/yr</label><input type="number" className="fm-adv-input sm" value={ny} onChange={(e) => setNy(+e.target.value)} /></div>
        <div className="fm-adv-card2"><p className="fm-adv-big">CI = <b>{inr(ci)}</b></p><p className="fm-adv-note">Amount = {inr(P + ci)} · A = P(1 + R/100n)^(nT)</p></div>
      </>}
      {tab === "emi" && <>
        <div className="fm-adv-row"><label className="fm-adv-lbl">Loan ₹</label><input type="number" className="fm-adv-input sm" value={eP} onChange={(e) => setEP(+e.target.value)} /></div>
        <div className="fm-adv-row"><label className="fm-adv-lbl">Rate %/yr</label><input type="number" className="fm-adv-input sm" value={eR} onChange={(e) => setER(+e.target.value)} /></div>
        <div className="fm-adv-row"><label className="fm-adv-lbl">Months</label><input type="number" className="fm-adv-input sm" value={eN} onChange={(e) => setEN(+e.target.value)} /></div>
        <div className="fm-adv-card2"><p className="fm-adv-big">EMI = <b>{inr(emi)}</b>/mo</p><p className="fm-adv-note">Total paid {inr(emi * eN)} · interest {inr(emi * eN - eP)}</p></div>
      </>}
      {tab === "pl" && <>
        <div className="fm-adv-row"><label className="fm-adv-lbl">Cost ₹</label><input type="number" className="fm-adv-input sm" value={cp} onChange={(e) => setCp(+e.target.value)} /></div>
        <div className="fm-adv-row"><label className="fm-adv-lbl">Sell ₹</label><input type="number" className="fm-adv-input sm" value={sp} onChange={(e) => setSp(+e.target.value)} /></div>
        <div className="fm-adv-card2"><p className="fm-adv-big">{diff >= 0 ? "Profit" : "Loss"} = <b>{inr(Math.abs(diff))}</b> ({fmt(plPct, 2)}%)</p></div>
      </>}
      {tab === "gst" && <>
        <div className="fm-adv-row"><label className="fm-adv-lbl">Amount ₹</label><input type="number" className="fm-adv-input sm" value={amt} onChange={(e) => setAmt(+e.target.value)} /></div>
        <div className="fm-adv-row"><label className="fm-adv-lbl">GST %</label><input type="number" className="fm-adv-input sm" value={gr} onChange={(e) => setGr(+e.target.value)} /></div>
        <div className="fm-adv-card2"><p className="fm-adv-big">GST = <b>{inr(gst)}</b></p><p className="fm-adv-note">Total = {inr(amt + gst)}</p></div>
      </>}
    </div>
  );
}
function ThreeIn(p: { P: number; R: number; T: number; setP: (n: number) => void; setR: (n: number) => void; setT: (n: number) => void }) {
  return <>
    <div className="fm-adv-row"><label className="fm-adv-lbl">Principal ₹</label><input type="number" className="fm-adv-input sm" value={p.P} onChange={(e) => p.setP(+e.target.value)} /></div>
    <div className="fm-adv-row"><label className="fm-adv-lbl">Rate %/yr</label><input type="number" className="fm-adv-input sm" value={p.R} onChange={(e) => p.setR(+e.target.value)} /></div>
    <div className="fm-adv-row"><label className="fm-adv-lbl">Years</label><input type="number" className="fm-adv-input sm" value={p.T} onChange={(e) => p.setT(+e.target.value)} /></div>
  </>;
}

/* ---------- Fraction / decimal / percent + ratio ---------- */

function FracPctTool() {
  const [num, setNum] = useState(3), [den, setDen] = useState(4);
  const [ra, setRa] = useState(8), [rb, setRb] = useState(12);
  const g = gcd(num, den) || 1;
  const dec = den ? num / den : NaN;
  const rg = gcd(ra, rb) || 1;

  return (
    <div className="fm-adv-pad">
      <label className="fm-adv-lbl">Fraction → decimal, %, simplest</label>
      <div className="fm-adv-fracbox">
        <input type="number" className="fm-adv-input sm" value={num} onChange={(e) => setNum(+e.target.value)} />
        <span className="fm-adv-fracline">⁄</span>
        <input type="number" className="fm-adv-input sm" value={den} onChange={(e) => setDen(+e.target.value)} />
      </div>
      <div className="fm-adv-card2">
        <p>Decimal = <b>{fmt(dec, 5)}</b></p>
        <p>Percent = <b>{fmt(dec * 100, 3)}%</b></p>
        <p>Simplest form = <b>{num / g}⁄{den / g}</b></p>
      </div>
      <label className="fm-adv-lbl">Ratio a : b → simplest</label>
      <div className="fm-adv-row">
        <input type="number" className="fm-adv-input sm" value={ra} onChange={(e) => setRa(+e.target.value)} />
        <span className="fm-adv-lbl">:</span>
        <input type="number" className="fm-adv-input sm" value={rb} onChange={(e) => setRb(+e.target.value)} />
      </div>
      <div className="fm-adv-card2"><p className="fm-adv-big">{ra} : {rb} = <b>{ra / rg} : {rb / rg}</b></p></div>
    </div>
  );
}

/* ---------- Formula sheet ---------- */

const FORMULAS: { topic: string; items: [string, string][] }[] = [
  { topic: "Mensuration", items: [
    ["Area of rectangle", "l × b"], ["Area of triangle", "½ × base × height"],
    ["Area of circle", "π r²"], ["Circumference", "2 π r"],
    ["Volume of cuboid", "l × b × h"], ["Volume of cylinder", "π r² h"],
    ["Volume of sphere", "4⁄3 π r³"], ["Volume of cone", "1⁄3 π r² h"],
    ["Total SA of cylinder", "2πr(r + h)"], ["SA of sphere", "4 π r²"],
  ]},
  { topic: "Algebra", items: [
    ["(a + b)²", "a² + 2ab + b²"], ["(a − b)²", "a² − 2ab + b²"],
    ["a² − b²", "(a + b)(a − b)"], ["(a + b)³", "a³ + 3a²b + 3ab² + b³"],
    ["a³ + b³", "(a + b)(a² − ab + b²)"], ["Quadratic roots", "x = (−b ± √(b²−4ac)) / 2a"],
    ["Discriminant", "D = b² − 4ac"],
  ]},
  { topic: "Coordinate geometry", items: [
    ["Distance", "√((x₂−x₁)² + (y₂−y₁)²)"], ["Midpoint", "((x₁+x₂)/2, (y₁+y₂)/2)"],
    ["Slope m", "(y₂−y₁)/(x₂−x₁)"], ["Line", "y = m x + c"],
    ["Section formula", "((mx₂+nx₁)/(m+n), (my₂+ny₁)/(m+n))"],
  ]},
  { topic: "Trigonometry", items: [
    ["sin²θ + cos²θ", "1"], ["1 + tan²θ", "sec²θ"], ["1 + cot²θ", "cosec²θ"],
    ["sin(A+B)", "sinA cosB + cosA sinB"], ["cos(A+B)", "cosA cosB − sinA sinB"],
    ["tanθ", "sinθ / cosθ"],
  ]},
  { topic: "Sequences", items: [
    ["AP nth term", "a + (n−1)d"], ["AP sum", "n/2 [2a + (n−1)d]"],
    ["GP nth term", "a r^(n−1)"], ["GP sum", "a(rⁿ−1)/(r−1)"],
    ["Sum 1..n", "n(n+1)/2"], ["Sum of squares", "n(n+1)(2n+1)/6"],
  ]},
  { topic: "Calculus (11–12 / JEE)", items: [
    ["d/dx xⁿ", "n x^(n−1)"], ["d/dx sin x", "cos x"], ["d/dx cos x", "−sin x"],
    ["d/dx eˣ", "eˣ"], ["d/dx ln x", "1/x"],
    ["∫ xⁿ dx", "x^(n+1)/(n+1) + C"], ["∫ 1/x dx", "ln|x| + C"], ["∫ eˣ dx", "eˣ + C"],
  ]},
  { topic: "Probability & Stats", items: [
    ["Probability", "favourable / total outcomes"], ["Mean", "Σx / n"],
    ["Median", "middle value (sorted)"], ["ⁿCᵣ", "n! / (r!(n−r)!)"], ["ⁿPᵣ", "n! / (n−r)!"],
  ]},
];

function FormulaTool() {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const groups = FORMULAS.map((g) => ({
    topic: g.topic,
    items: g.items.filter(([k, v]) => !query || k.toLowerCase().includes(query) || v.toLowerCase().includes(query) || g.topic.toLowerCase().includes(query)),
  })).filter((g) => g.items.length);

  return (
    <div className="fm-adv-pad">
      <input className="fm-adv-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: area, quadratic, derivative…" aria-label="Search formulas" />
      <div className="fm-adv-formscroll">
        {groups.length ? groups.map((g) => (
          <div key={g.topic} className="fm-adv-formgrp">
            <h4>{g.topic}</h4>
            {g.items.map(([k, v]) => (
              <div className="fm-adv-formrow" key={k}><span>{k}</span><b>{v}</b></div>
            ))}
          </div>
        )) : <p className="fm-adv-note">No formula matches “{q}”.</p>}
      </div>
    </div>
  );
}

/* ---------- Trigonometry explorer ---------- */

function TrigTool() {
  const [deg, setDeg] = useState(30);
  const circleRef = useRef<HTMLCanvasElement | null>(null);
  const waveRef = useRef<HTMLCanvasElement | null>(null);
  const rad = (deg * Math.PI) / 180;
  const sin = Math.sin(rad), cos = Math.cos(rad), tan = Math.tan(rad);

  useEffect(() => {
    // unit circle
    const cv = circleRef.current; const ctx = cv?.getContext("2d");
    if (cv && ctx) {
      const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 18;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "#e2e9fb"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
      ctx.strokeStyle = "#adb9d4"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      const px = cx + cos * R, py = cy - sin * R;
      // cos (horizontal) and sin (vertical) legs
      ctx.strokeStyle = "#2f6bff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke();
      ctx.strokeStyle = "#e8590c"; ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
      // radius + arc
      ctx.strokeStyle = "#7b3ff2"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.strokeStyle = "#7b3ff2"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 26, 0, -rad, sin < 0); ctx.stroke();
      ctx.fillStyle = "#1f3b8c"; ctx.beginPath(); ctx.arc(px, py, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.font = "11px system-ui"; ctx.fillStyle = "#2f6bff"; ctx.fillText("cos", (cx + px) / 2 - 8, cy + 14);
      ctx.fillStyle = "#e8590c"; ctx.fillText("sin", px + 4, (cy + py) / 2);
    }
    // sine + cosine wave
    const wv = waveRef.current; const wc = wv?.getContext("2d");
    if (wv && wc) {
      const W = wv.width, H = wv.height, midY = H / 2, amp = H / 2 - 8;
      wc.clearRect(0, 0, W, H);
      wc.strokeStyle = "#e2e9fb"; wc.beginPath(); wc.moveTo(0, midY); wc.lineTo(W, midY); wc.stroke();
      const draw = (fn: (t: number) => number, color: string) => {
        wc.strokeStyle = color; wc.lineWidth = 2; wc.beginPath();
        for (let px = 0; px <= W; px++) { const t = (px / W) * 2 * Math.PI; const y = midY - fn(t) * amp; px ? wc.lineTo(px, y) : wc.moveTo(px, y); }
        wc.stroke();
      };
      draw(Math.sin, "#e8590c"); draw(Math.cos, "#2f6bff");
      const mx = (rad / (2 * Math.PI)) * W;
      wc.strokeStyle = "#7b3ff2"; wc.setLineDash([4, 3]); wc.beginPath(); wc.moveTo(mx, 0); wc.lineTo(mx, H); wc.stroke(); wc.setLineDash([]);
    }
  }, [deg, rad, sin, cos]);

  return (
    <div className="fm-adv-pad">
      <div className="fm-adv-vizrow">
        <div className="fm-adv-col-left">
          <div className="fm-adv-row">
            <label className="fm-adv-lbl">Angle {deg}°</label>
            <input type="range" min={0} max={360} value={deg} onChange={(e) => setDeg(+e.target.value)} style={{ flex: 1 }} />
          </div>
          <div className="fm-adv-grid">
            <div className="fm-adv-stat"><b>{fmt(sin, 3)}</b><span>sin</span></div>
            <div className="fm-adv-stat"><b>{fmt(cos, 3)}</b><span>cos</span></div>
            <div className="fm-adv-stat"><b>{Math.abs(cos) < 1e-9 ? "∞" : fmt(tan, 3)}</b><span>tan</span></div>
          </div>
          <p className="fm-adv-note"><b style={{ color: "#e8590c" }}>sin</b> and <b style={{ color: "#2f6bff" }}>cos</b> waves — purple line is your angle.</p>
        </div>
        <div className="fm-adv-col-right">
          <canvas ref={circleRef} width={380} height={360} className="fm-adv-canvas" />
        </div>
      </div>
      <canvas ref={waveRef} width={1040} height={170} className="fm-adv-canvas" />
    </div>
  );
}

/* ---------- Sequences AP/GP ---------- */

function SequencesTool() {
  const [kind, setKind] = useState<"ap" | "gp">("ap");
  const [a, setA] = useState(2);
  const [step, setStep] = useState(3);
  const [n, setN] = useState(6);
  const terms: number[] = [];
  for (let k = 0; k < Math.max(0, Math.min(n, 30)); k++) terms.push(kind === "ap" ? a + k * step : a * step ** k);
  const nth = kind === "ap" ? a + (n - 1) * step : a * step ** (n - 1);
  const sum = kind === "ap"
    ? (n / 2) * (2 * a + (n - 1) * step)
    : step === 1 ? a * n : a * (step ** n - 1) / (step - 1);

  return (
    <div className="fm-adv-pad">
      <div className="fm-adv-chips">
        <button className={"fm-adv-chip" + (kind === "ap" ? " on" : "")} onClick={() => setKind("ap")}>AP (add)</button>
        <button className={"fm-adv-chip" + (kind === "gp" ? " on" : "")} onClick={() => setKind("gp")}>GP (multiply)</button>
      </div>
      <div className="fm-adv-row"><label className="fm-adv-lbl">First term a</label><input type="number" className="fm-adv-input sm" value={a} onChange={(e) => setA(+e.target.value)} /></div>
      <div className="fm-adv-row"><label className="fm-adv-lbl">{kind === "ap" ? "Difference d" : "Ratio r"}</label><input type="number" className="fm-adv-input sm" value={step} onChange={(e) => setStep(+e.target.value)} /></div>
      <div className="fm-adv-row"><label className="fm-adv-lbl">Terms n</label><input type="number" className="fm-adv-input sm" value={n} onChange={(e) => setN(+e.target.value)} /></div>
      <div className="fm-adv-card2">
        <p>Sequence: <b>{terms.map((t) => fmt(t, 3)).join(", ")}{n > 30 ? " …" : ""}</b></p>
        <p className="fm-adv-big">{n}th term = <b>{fmt(nth, 3)}</b></p>
        <p>Sum of {n} terms = <b>{fmt(sum, 3)}</b></p>
        <p className="fm-adv-note">{kind === "ap" ? "Tₙ = a + (n−1)d · Sₙ = n/2[2a+(n−1)d]" : "Tₙ = a·r^(n−1) · Sₙ = a(rⁿ−1)/(r−1)"}</p>
      </div>
    </div>
  );
}

/* ---------- Matrix calculator ---------- */

type Mat = number[][];
function matMul(A: Mat, B: Mat): Mat { return A.map((row) => B[0].map((_, j) => row.reduce((s, _v, k) => s + row[k] * B[k][j], 0))); }
function transpose(A: Mat): Mat { return A[0].map((_, j) => A.map((row) => row[j])); }
function det(A: Mat): number {
  const n = A.length;
  if (n === 1) return A[0][0];
  if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
  return A[0].reduce((s, v, j) => {
    const minor = A.slice(1).map((row) => row.filter((_, c) => c !== j));
    return s + v * (j % 2 ? -1 : 1) * det(minor);
  }, 0);
}
function inverse(A: Mat): Mat | null {
  const d = det(A); if (Math.abs(d) < 1e-12) return null;
  const n = A.length;
  if (n === 2) return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]];
  const cof: Mat = A.map((_, i) => A.map((_v, j) => {
    const minor = A.filter((_r, r) => r !== i).map((row) => row.filter((_c, c) => c !== j));
    return ((i + j) % 2 ? -1 : 1) * det(minor);
  }));
  return transpose(cof).map((row) => row.map((v) => v / d));
}

function MatrixTool() {
  const [size, setSize] = useState(2);
  const [A, setA] = useState<Mat>([[1, 2, 0], [3, 4, 0], [0, 0, 1]]);
  const [B, setB] = useState<Mat>([[5, 6, 0], [7, 8, 0], [0, 0, 1]]);
  const [op, setOp] = useState<string>("detA");

  const sub = (M: Mat): Mat => M.slice(0, size).map((r) => r.slice(0, size));
  const As = sub(A), Bs = sub(B);
  function setCell(which: "A" | "B", i: number, j: number, v: number) {
    const src = which === "A" ? A : B; const copy = src.map((r) => [...r]); copy[i][j] = v;
    which === "A" ? setA(copy) : setB(copy);
  }

  let result: Mat | number | null = null; let err = "";
  try {
    if (op === "A+B") result = As.map((r, i) => r.map((v, j) => v + Bs[i][j]));
    else if (op === "A-B") result = As.map((r, i) => r.map((v, j) => v - Bs[i][j]));
    else if (op === "A×B") result = matMul(As, Bs);
    else if (op === "detA") result = det(As);
    else if (op === "invA") { result = inverse(As); if (!result) err = "det(A) = 0, so A has no inverse."; }
    else if (op === "Aᵀ") result = transpose(As);
  } catch { err = "Check the matrix values."; }

  const grid = (M: Mat, which: "A" | "B") => (
    <div className="fm-adv-matgrid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {M.slice(0, size).map((row, i) => row.slice(0, size).map((v, j) => (
        <input key={i + "-" + j} type="number" className="fm-adv-input matcell" value={v} onChange={(e) => setCell(which, i, j, +e.target.value)} />
      )))}
    </div>
  );

  return (
    <div className="fm-adv-pad">
      <div className="fm-adv-chips">
        <button className={"fm-adv-chip" + (size === 2 ? " on" : "")} onClick={() => setSize(2)}>2 × 2</button>
        <button className={"fm-adv-chip" + (size === 3 ? " on" : "")} onClick={() => setSize(3)}>3 × 3</button>
      </div>
      <label className="fm-adv-lbl">Matrix A</label>{grid(A, "A")}
      <label className="fm-adv-lbl">Matrix B</label>{grid(B, "B")}
      <div className="fm-adv-chips">
        {["A+B", "A-B", "A×B", "detA", "invA", "Aᵀ"].map((o) => (
          <button key={o} className={"fm-adv-chip" + (op === o ? " on" : "")} onClick={() => setOp(o)}>{o}</button>
        ))}
      </div>
      <div className="fm-adv-card2">
        {err ? <p className="fm-adv-note">{err}</p> : typeof result === "number"
          ? <p className="fm-adv-big">{op} = <b>{fmt(result, 4)}</b></p>
          : result && <div className="fm-adv-matgrid out" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
            {(result as Mat).map((row, i) => row.map((v, j) => <span key={i + "-" + j}>{fmt(v, 3)}</span>))}
          </div>}
      </div>
    </div>
  );
}

/* ---------- Complex numbers + Argand ---------- */

function ComplexTool() {
  const [a, setA] = useState(3), [b, setB] = useState(2);
  const [c, setC] = useState(-1), [d, setD] = useState(4);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const sum = { re: a + c, im: b + d };
  const prod = { re: a * c - b * d, im: a * d + b * c };
  const mod = Math.hypot(a, b);
  const arg = (Math.atan2(b, a) * 180) / Math.PI;
  const fmtC = (re: number, im: number) => `${fmt(re, 3)} ${im >= 0 ? "+" : "−"} ${fmt(Math.abs(im), 3)}i`;

  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext("2d"); if (!cv || !ctx) return;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, sc = 22;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#e2e9fb"; ctx.lineWidth = 1;
    for (let g = -6; g <= 6; g++) { ctx.beginPath(); ctx.moveTo(cx + g * sc, 0); ctx.lineTo(cx + g * sc, H); ctx.moveTo(0, cy + g * sc); ctx.lineTo(W, cy + g * sc); ctx.stroke(); }
    ctx.strokeStyle = "#5b6b86"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    ctx.fillStyle = "#5b6b86"; ctx.font = "10px system-ui"; ctx.fillText("Re", W - 16, cy - 4); ctx.fillText("Im", cx + 4, 10);
    const vec = (re: number, im: number, col: string, lbl: string) => {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + re * sc, cy - im * sc); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + re * sc, cy - im * sc, 4, 0, 2 * Math.PI); ctx.fill();
      ctx.fillText(lbl, cx + re * sc + 5, cy - im * sc - 5);
    };
    vec(a, b, "#2f6bff", "z₁"); vec(c, d, "#e8590c", "z₂"); vec(sum.re, sum.im, "#12b886", "z₁+z₂");
  }, [a, b, c, d, sum.re, sum.im]);

  return (
    <div className="fm-adv-pad fm-adv-2col">
      <div className="fm-adv-col-left">
        <div className="fm-adv-row"><label className="fm-adv-lbl" style={{ color: "#2f6bff" }}>z₁ = a + bi</label>
          <input type="number" className="fm-adv-input sm" value={a} onChange={(e) => setA(+e.target.value)} />
          <input type="number" className="fm-adv-input sm" value={b} onChange={(e) => setB(+e.target.value)} /></div>
        <div className="fm-adv-row"><label className="fm-adv-lbl" style={{ color: "#e8590c" }}>z₂ = c + di</label>
          <input type="number" className="fm-adv-input sm" value={c} onChange={(e) => setC(+e.target.value)} />
          <input type="number" className="fm-adv-input sm" value={d} onChange={(e) => setD(+e.target.value)} /></div>
        <div className="fm-adv-card2">
          <p>z₁ + z₂ = <b>{fmtC(sum.re, sum.im)}</b></p>
          <p>z₁ × z₂ = <b>{fmtC(prod.re, prod.im)}</b></p>
          <p>|z₁| = <b>{fmt(mod, 3)}</b> · arg(z₁) = <b>{fmt(arg, 2)}°</b></p>
          <p className="fm-adv-note">Polar: z₁ = {fmt(mod, 3)}(cos {fmt(arg, 1)}° + i·sin {fmt(arg, 1)}°)</p>
        </div>
      </div>
      <div className="fm-adv-col-right">
        <canvas ref={ref} width={460} height={460} className="fm-adv-canvas" />
      </div>
    </div>
  );
}

/* ---------- Sets & Venn ---------- */

function parseSet(s: string): string[] {
  return Array.from(new Set(s.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean)));
}
function SetsTool() {
  const [aRaw, setARaw] = useState("1, 2, 3, 4, 6");
  const [bRaw, setBRaw] = useState("2, 4, 6, 8");
  const ref = useRef<HTMLCanvasElement | null>(null);
  const A = parseSet(aRaw), B = parseSet(bRaw);
  const setB2 = new Set(B), setA2 = new Set(A);
  const inter = A.filter((x) => setB2.has(x));
  const union = Array.from(new Set([...A, ...B]));
  const aOnly = A.filter((x) => !setB2.has(x));
  const bOnly = B.filter((x) => !setA2.has(x));

  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext("2d"); if (!cv || !ctx) return;
    const W = cv.width, H = cv.height; ctx.clearRect(0, 0, W, H);
    const r = 108, cyC = H / 2, cxA = W / 2 - 58, cxB = W / 2 + 58;
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(47,107,255,0.16)"; ctx.strokeStyle = "#2f6bff";
    ctx.beginPath(); ctx.arc(cxA, cyC, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(232,89,12,0.16)"; ctx.strokeStyle = "#e8590c";
    ctx.beginPath(); ctx.arc(cxB, cyC, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1f3b8c"; ctx.font = "bold 15px system-ui"; ctx.textAlign = "center";
    ctx.fillText("A", cxA - 74, cyC - 80); ctx.fillText("B", cxB + 74, cyC - 80);
    ctx.font = "14px system-ui"; ctx.fillStyle = "#22314f";
    ctx.fillText(String(aOnly.length), cxA - 46, cyC + 4);
    ctx.fillText(String(inter.length), W / 2, cyC + 4);
    ctx.fillText(String(bOnly.length), cxB + 46, cyC + 4);
  }, [aRaw, bRaw, aOnly.length, bOnly.length, inter.length]);

  return (
    <div className="fm-adv-pad fm-adv-2col">
      <div className="fm-adv-col-left">
        <label className="fm-adv-lbl">Set A</label>
        <input className="fm-adv-input" value={aRaw} onChange={(e) => setARaw(e.target.value)} />
        <label className="fm-adv-lbl">Set B</label>
        <input className="fm-adv-input" value={bRaw} onChange={(e) => setBRaw(e.target.value)} />
        <div className="fm-adv-card2">
          <p>A ∪ B ({union.length}): <b>{"{" + union.join(", ") + "}"}</b></p>
          <p>A ∩ B ({inter.length}): <b>{"{" + inter.join(", ") + "}"}</b></p>
          <p>A − B: <b>{"{" + aOnly.join(", ") + "}"}</b></p>
          <p>B − A: <b>{"{" + bOnly.join(", ") + "}"}</b></p>
        </div>
      </div>
      <div className="fm-adv-col-right">
        <canvas ref={ref} width={480} height={360} className="fm-adv-canvas" />
      </div>
    </div>
  );
}

/* ---------- Calculus visualizer ---------- */

function CalculusTool() {
  const [fx, setFx] = useState("x^2");
  const [mode, setMode] = useState<"deriv" | "area">("deriv");
  const [x0, setX0] = useState(1);
  const [aB, setAB] = useState(0);
  const [bB, setBB] = useState(2);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const range = 6;

  const safe = (x: number): number => { try { const y = evalFx(fx, x); return isFinite(y) ? y : NaN; } catch { return NaN; } };
  const h = 1e-4;
  const slope = (safe(x0 + h) - safe(x0 - h)) / (2 * h);
  // trapezoidal integral a..b
  let area = 0; const N = 200; const step = (bB - aB) / N;
  for (let k = 0; k < N; k++) { const y1 = safe(aB + k * step), y2 = safe(aB + (k + 1) * step); if (isFinite(y1) && isFinite(y2)) area += ((y1 + y2) / 2) * step; }

  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext("2d"); if (!cv || !ctx) return;
    const W = cv.width, H = cv.height;
    const xmin = -range, xmax = range, ymax = range * H / W, ymin = -ymax;
    const PX = (x: number) => ((x - xmin) / (xmax - xmin)) * W;
    const PY = (y: number) => H - ((y - ymin) / (ymax - ymin)) * H;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#eef2fc"; for (let g = Math.ceil(xmin); g <= xmax; g++) { ctx.beginPath(); ctx.moveTo(PX(g), 0); ctx.lineTo(PX(g), H); ctx.moveTo(0, PY(g)); ctx.lineTo(W, PY(g)); ctx.stroke(); }
    ctx.strokeStyle = "#5b6b86"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, PY(0)); ctx.lineTo(W, PY(0)); ctx.moveTo(PX(0), 0); ctx.lineTo(PX(0), H); ctx.stroke();
    // area shading
    if (mode === "area") {
      ctx.fillStyle = "rgba(18,184,134,0.25)";
      for (let px = PX(aB); px <= PX(bB); px++) {
        const x = xmin + (px / W) * (xmax - xmin); const y = safe(x); if (!isFinite(y)) continue;
        ctx.fillRect(px, Math.min(PY(0), PY(y)), 1, Math.abs(PY(y) - PY(0)));
      }
    }
    // curve
    ctx.strokeStyle = "#2f6bff"; ctx.lineWidth = 2.5; ctx.beginPath(); let pen = false;
    for (let px = 0; px <= W; px++) { const x = xmin + (px / W) * (xmax - xmin); const y = safe(x); if (!isFinite(y)) { pen = false; continue; } const py = PY(y); pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true; }
    ctx.stroke();
    // tangent
    if (mode === "deriv" && isFinite(slope)) {
      const y0 = safe(x0);
      ctx.strokeStyle = "#e8590c"; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(PX(xmin), PY(y0 + slope * (xmin - x0))); ctx.lineTo(PX(xmax), PY(y0 + slope * (xmax - x0))); ctx.stroke();
      ctx.fillStyle = "#e8590c"; ctx.beginPath(); ctx.arc(PX(x0), PY(y0), 5, 0, 2 * Math.PI); ctx.fill();
    }
  }, [fx, mode, x0, aB, bB, slope]);

  return (
    <div className="fm-adv-pad fm-adv-2col">
      <div className="fm-adv-col-left">
        <div className="fm-adv-row"><span className="fm-adv-dot" style={{ background: "#2f6bff" }} />
          <input className="fm-adv-input" value={fx} onChange={(e) => setFx(e.target.value)} placeholder="e.g. x^2" /></div>
        <div className="fm-adv-chips">
          <button className={"fm-adv-chip" + (mode === "deriv" ? " on" : "")} onClick={() => setMode("deriv")}>Derivative (tangent)</button>
          <button className={"fm-adv-chip" + (mode === "area" ? " on" : "")} onClick={() => setMode("area")}>Integral (area)</button>
        </div>
        {mode === "deriv" ? (
          <div className="fm-adv-row"><label className="fm-adv-lbl">point x = {fmt(x0, 2)}</label>
            <input type="range" min={-range} max={range} step={0.1} value={x0} onChange={(e) => setX0(+e.target.value)} style={{ flex: 1 }} /></div>
        ) : (
          <div className="fm-adv-row"><label className="fm-adv-lbl">from a</label><input type="number" className="fm-adv-input sm" value={aB} onChange={(e) => setAB(+e.target.value)} />
            <label className="fm-adv-lbl">to b</label><input type="number" className="fm-adv-input sm" value={bB} onChange={(e) => setBB(+e.target.value)} /></div>
        )}
        <div className="fm-adv-card2">
          {mode === "deriv"
            ? <p className="fm-adv-big">slope f′({fmt(x0, 2)}) ≈ <b>{fmt(slope, 3)}</b></p>
            : <p className="fm-adv-big">∫ from {fmt(aB, 2)} to {fmt(bB, 2)} ≈ <b>{fmt(area, 3)}</b></p>}
          <p className="fm-adv-note">{mode === "deriv" ? "The orange tangent's steepness IS the derivative." : "Green area above the axis is positive, below is negative."}</p>
        </div>
      </div>
      <div className="fm-adv-col-right">
        <canvas ref={ref} width={720} height={520} className="fm-adv-canvas" />
      </div>
    </div>
  );
}

/* ---------- Equation solver (with steps) ---------- */

type SolveKind = "linear" | "quad" | "simul";
function EquationSolver() {
  const [kind, setKind] = useState<SolveKind>("quad");
  // linear ax + b = c
  const [la, setLa] = useState(2), [lb, setLb] = useState(3), [lc, setLc] = useState(11);
  // quad ax^2+bx+c=0
  const [qa, setQa] = useState(1), [qb, setQb] = useState(-5), [qc, setQc] = useState(6);
  // simultaneous
  const [a1, setA1] = useState(2), [b1, setB1] = useState(1), [c1, setC1] = useState(8);
  const [a2, setA2] = useState(1), [b2, setB2] = useState(-1), [c2, setC2] = useState(1);

  function linearSteps(): string[] {
    if (la === 0) return ["a = 0, so this is not a linear equation in x."];
    return [
      `Start:  ${la}x + ${lb} = ${lc}`,
      `Subtract ${lb}:  ${la}x = ${lc - lb}`,
      `Divide by ${la}:  x = ${fmt((lc - lb) / la, 4)}`,
    ];
  }
  function quadSteps(): string[] {
    if (qa === 0) return ["a = 0 — this is linear, not quadratic. Use the Linear tab."];
    const D = qb * qb - 4 * qa * qc;
    const out = [`${qa}x² + ${qb}x + ${qc} = 0`, `Discriminant D = b²−4ac = ${qb}²−4·${qa}·${qc} = ${fmt(D)}`];
    if (D > 0) {
      const r1 = (-qb + Math.sqrt(D)) / (2 * qa), r2 = (-qb - Math.sqrt(D)) / (2 * qa);
      out.push("D > 0 → two distinct real roots.", `x = (−b ± √D)/2a = (${-qb} ± ${fmt(Math.sqrt(D), 4)})/${2 * qa}`, `x₁ = ${fmt(r1, 4)},  x₂ = ${fmt(r2, 4)}`);
    } else if (D === 0) {
      out.push("D = 0 → one repeated real root.", `x = −b/2a = ${fmt(-qb / (2 * qa), 4)}`);
    } else {
      const re = -qb / (2 * qa), im = Math.sqrt(-D) / (2 * qa);
      out.push("D < 0 → two complex roots.", `x = ${fmt(re, 3)} ± ${fmt(im, 3)}i`);
    }
    return out;
  }
  function simulSteps(): string[] {
    const D = a1 * b2 - a2 * b1;
    const out = [`${a1}x + ${b1}y = ${c1}`, `${a2}x + ${b2}y = ${c2}`, `D = a₁b₂ − a₂b₁ = ${a1}·${b2} − ${a2}·${b1} = ${D}`];
    if (D === 0) { out.push("D = 0 → no unique solution (parallel or same line)."); return out; }
    const x = (c1 * b2 - c2 * b1) / D, y = (a1 * c2 - a2 * c1) / D;
    out.push(`x = (c₁b₂ − c₂b₁)/D = ${fmt(x, 4)}`, `y = (a₁c₂ − a₂c₁)/D = ${fmt(y, 4)}`);
    return out;
  }
  const steps = kind === "linear" ? linearSteps() : kind === "quad" ? quadSteps() : simulSteps();

  const numIn = (v: number, set: (n: number) => void) => <input type="number" className="fm-adv-input sm" value={v} onChange={(e) => set(+e.target.value)} />;

  return (
    <div className="fm-adv-pad">
      <div className="fm-adv-chips">
        <button className={"fm-adv-chip" + (kind === "linear" ? " on" : "")} onClick={() => setKind("linear")}>Linear</button>
        <button className={"fm-adv-chip" + (kind === "quad" ? " on" : "")} onClick={() => setKind("quad")}>Quadratic</button>
        <button className={"fm-adv-chip" + (kind === "simul" ? " on" : "")} onClick={() => setKind("simul")}>Two equations</button>
      </div>
      {kind === "linear" && <div className="fm-adv-row">{numIn(la, setLa)}<span>x +</span>{numIn(lb, setLb)}<span>=</span>{numIn(lc, setLc)}</div>}
      {kind === "quad" && <div className="fm-adv-row">{numIn(qa, setQa)}<span>x² +</span>{numIn(qb, setQb)}<span>x +</span>{numIn(qc, setQc)}<span>= 0</span></div>}
      {kind === "simul" && <>
        <div className="fm-adv-row">{numIn(a1, setA1)}<span>x +</span>{numIn(b1, setB1)}<span>y =</span>{numIn(c1, setC1)}</div>
        <div className="fm-adv-row">{numIn(a2, setA2)}<span>x +</span>{numIn(b2, setB2)}<span>y =</span>{numIn(c2, setC2)}</div>
      </>}
      <div className="fm-adv-card2">
        <ol className="fm-adv-steps">{steps.map((s, k) => <li key={k}>{s}</li>)}</ol>
      </div>
    </div>
  );
}

/* ---------- Geometry lab: protractor + triangle ---------- */

function GeometryTool() {
  const [tab, setTab] = useState<"angle" | "triangle">("angle");
  const [ang, setAng] = useState(60);
  const [sa, setSa] = useState(3), [sb, setSb] = useState(4), [sc, setSc] = useState(5);
  const angRef = useRef<HTMLCanvasElement | null>(null);
  const triRef = useRef<HTMLCanvasElement | null>(null);

  const kindOf = (a: number) => a === 90 ? "Right angle" : a === 180 ? "Straight angle" : a < 90 ? "Acute angle" : a < 180 ? "Obtuse angle" : "Reflex angle";
  const valid = sa + sb > sc && sb + sc > sa && sa + sc > sb && sa > 0 && sb > 0 && sc > 0;
  const s = (sa + sb + sc) / 2;
  const area = valid ? Math.sqrt(s * (s - sa) * (s - sb) * (s - sc)) : 0;
  const clamp1 = (v: number) => Math.max(-1, Math.min(1, v)); // guard float error before acos
  const angA = valid ? (Math.acos(clamp1((sb * sb + sc * sc - sa * sa) / (2 * sb * sc))) * 180) / Math.PI : 0;
  const angB = valid ? (Math.acos(clamp1((sa * sa + sc * sc - sb * sb) / (2 * sa * sc))) * 180) / Math.PI : 0;
  const angC = valid ? 180 - angA - angB : 0;

  useEffect(() => {
    const cv = angRef.current; const ctx = cv?.getContext("2d"); if (!cv || !ctx) return;
    const W = cv.width, H = cv.height, ox = 40, oy = H - 30, L = W - 90;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#5b6b86"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + L, oy); ctx.stroke(); // base arm
    const r = (ang * Math.PI) / 180;
    ctx.strokeStyle = "#2f6bff"; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + L * Math.cos(r), oy - L * Math.sin(r)); ctx.stroke(); // rotating arm
    ctx.strokeStyle = "#e8590c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 34, 0, -r, true); ctx.stroke();
    ctx.fillStyle = "#1f3b8c"; ctx.font = "bold 13px system-ui"; ctx.fillText(ang + "°", ox + 40, oy - 12);
  }, [ang]);

  useEffect(() => {
    const cv = triRef.current; const ctx = cv?.getContext("2d"); if (!cv || !ctx) return;
    const W = cv.width, H = cv.height; ctx.clearRect(0, 0, W, H);
    if (!valid) { ctx.fillStyle = "#c92a2a"; ctx.font = "13px system-ui"; ctx.fillText("Not a valid triangle (triangle inequality).", 14, H / 2); return; }
    // place: side c along bottom from A(0,0) to B(c,0); C from angles
    const Ax = 0, Ay = 0, Bx = sc, By = 0;
    const Cx = sb * Math.cos((angA * Math.PI) / 180), Cy = sb * Math.sin((angA * Math.PI) / 180);
    const xs = [Ax, Bx, Cx], ys = [Ay, By, Cy];
    const maxX = Math.max(...xs), minX = Math.min(...xs), maxY = Math.max(...ys), minY = Math.min(...ys);
    const scale = Math.min((W - 40) / (maxX - minX || 1), (H - 40) / (maxY - minY || 1));
    const TX = (x: number) => 20 + (x - minX) * scale, TY = (y: number) => H - 20 - (y - minY) * scale;
    ctx.strokeStyle = "#2f6bff"; ctx.fillStyle = "rgba(47,107,255,0.12)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(TX(Ax), TY(Ay)); ctx.lineTo(TX(Bx), TY(By)); ctx.lineTo(TX(Cx), TY(Cy)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1f3b8c"; ctx.font = "bold 12px system-ui";
    ctx.fillText("A " + fmt(angA, 1) + "°", TX(Ax) - 4, TY(Ay) + 16);
    ctx.fillText("B " + fmt(angB, 1) + "°", TX(Bx) - 10, TY(By) + 16);
    ctx.fillText("C " + fmt(angC, 1) + "°", TX(Cx) - 10, TY(Cy) - 6);
  }, [sa, sb, sc, valid, angA, angB, angC]);

  return (
    <div className="fm-adv-pad">
      <div className="fm-adv-chips">
        <button className={"fm-adv-chip" + (tab === "angle" ? " on" : "")} onClick={() => setTab("angle")}>Protractor</button>
        <button className={"fm-adv-chip" + (tab === "triangle" ? " on" : "")} onClick={() => setTab("triangle")}>Triangle solver</button>
      </div>
      {tab === "angle" ? (
        <div className="fm-adv-vizrow">
          <div className="fm-adv-col-left">
            <div className="fm-adv-row"><label className="fm-adv-lbl">Angle {ang}°</label>
              <input type="range" min={0} max={360} value={ang} onChange={(e) => setAng(+e.target.value)} style={{ flex: 1 }} /></div>
            <div className="fm-adv-card2"><p className="fm-adv-big">{kindOf(ang)}</p>
              <p className="fm-adv-note">Acute &lt; 90° · Right = 90° · Obtuse 90–180° · Straight = 180° · Reflex &gt; 180°</p></div>
          </div>
          <div className="fm-adv-col-right">
            <canvas ref={angRef} width={460} height={360} className="fm-adv-canvas" />
          </div>
        </div>
      ) : (
        <div className="fm-adv-vizrow">
          <div className="fm-adv-col-left">
            <div className="fm-adv-row"><label className="fm-adv-lbl">Sides a, b, c</label>
              <input type="number" className="fm-adv-input sm" value={sa} onChange={(e) => setSa(+e.target.value)} />
              <input type="number" className="fm-adv-input sm" value={sb} onChange={(e) => setSb(+e.target.value)} />
              <input type="number" className="fm-adv-input sm" value={sc} onChange={(e) => setSc(+e.target.value)} /></div>
            <div className="fm-adv-card2">
              {valid ? <>
                <p>Angles: A = <b>{fmt(angA, 2)}°</b>, B = <b>{fmt(angB, 2)}°</b>, C = <b>{fmt(angC, 2)}°</b></p>
                <p className="fm-adv-big">Area = <b>{fmt(area, 3)}</b> sq units</p>
                <p className="fm-adv-note">Angles via cosine rule · Area via Heron's formula</p>
              </> : <p className="fm-adv-note">Those three sides can't form a triangle.</p>}
            </div>
          </div>
          <div className="fm-adv-col-right">
            <canvas ref={triRef} width={460} height={360} className="fm-adv-canvas" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 3D surface plotter (no external libs) ---------- */

/** Evaluator supporting x and y. */
function evalXY(srcRaw: string, x: number, y: number): number {
  const s = srcRaw.replace(/×/g, "*").replace(/÷/g, "/").replace(/π/g, "PI").replace(/√/g, "sqrt").replace(/\s+/g, "");
  let i = 0;
  const funcs: Record<string, (a: number) => number> = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
    log: (a) => Math.log10(a), ln: (a) => Math.log(a),
  };
  function expr(): number { let v = term(); while (s[i] === "+" || s[i] === "-") { const o = s[i++]; const t = term(); v = o === "+" ? v + t : v - t; } return v; }
  function term(): number { let v = unary(); while (s[i] === "*" || s[i] === "/") { const o = s[i++]; const p = unary(); v = o === "*" ? v * p : v / p; } return v; }
  function unary(): number { if (s[i] === "-") { i++; return -unary(); } if (s[i] === "+") { i++; return unary(); } return power(); }
  function power(): number { const b = factor(); if (s[i] === "^") { i++; return Math.pow(b, unary()); } return b; }
  function factor(): number {
    if (s[i] === "(") { i++; const v = expr(); if (s[i] === ")") i++; return v; }
    const m = s.slice(i).match(/^[A-Za-z]+/);
    if (m) {
      const name = m[0];
      if (name === "x") { i += 1; return x; }
      if (name === "y") { i += 1; return y; }
      if (name === "PI") { i += 2; return Math.PI; }
      if (name === "e") { i += 1; return Math.E; }
      if (funcs[name]) { i += name.length; let a: number; if (s[i] === "(") { i++; a = expr(); if (s[i] === ")") i++; } else a = unary(); return funcs[name](a); }
      throw new Error("name");
    }
    const nm = s.slice(i).match(/^\d*\.?\d+/); if (nm) { i += nm[0].length; return parseFloat(nm[0]); }
    throw new Error("parse");
  }
  const r = expr(); if (i !== s.length) throw new Error("trailing"); return r;
}

function Surface3DTool() {
  const [fxy, setFxy] = useState("x^2 + y^2");
  const [az, setAz] = useState(45);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const presets = ["x^2 + y^2", "x^2 - y^2", "sin(x)*cos(y)", "sin(sqrt(x^2+y^2))"];

  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext("2d"); if (!cv || !ctx) return;
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2 + 30;
    ctx.clearRect(0, 0, W, H);
    const N = 22, span = 3;
    const A = (az * Math.PI) / 180, el = (28 * Math.PI) / 180;
    const cosA = Math.cos(A), sinA = Math.sin(A), cosE = Math.cos(el), sinE = Math.sin(el);
    // sample grid + track z-range
    const Z: number[][] = []; let zmin = Infinity, zmax = -Infinity;
    for (let ix = 0; ix <= N; ix++) {
      Z[ix] = [];
      for (let iy = 0; iy <= N; iy++) {
        const x = -span + (2 * span * ix) / N, y = -span + (2 * span * iy) / N;
        let z: number; try { z = evalXY(fxy, x, y); } catch { z = NaN; }
        if (!isFinite(z)) z = NaN;
        Z[ix][iy] = z;
        if (isFinite(z)) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
      }
    }
    const zr = zmax - zmin || 1, scale = 42, zScale = 60 / zr;
    const proj = (ix: number, iy: number): [number, number, number] | null => {
      const z = Z[ix][iy]; if (!isFinite(z)) return null;
      const x = -span + (2 * span * ix) / N, y = -span + (2 * span * iy) / N;
      const zc = (z - (zmin + zmax) / 2) * zScale / scale * span; // centred height in world units
      const xr = x * cosA - y * sinA, yr = x * sinA + y * cosA;
      const yv = yr * cosE - zc * sinE, zv = yr * sinE + zc * cosE;
      void yv;
      return [cx + xr * scale, cy - zv * scale, z];
    };
    const colorFor = (z: number) => { const t = (z - zmin) / zr; const r = Math.round(40 + t * 200), b = Math.round(240 - t * 160); return `rgb(${r},${90 + Math.round(t * 60)},${b})`; };
    ctx.lineWidth = 1;
    for (let ix = 0; ix < N; ix++) for (let iy = 0; iy < N; iy++) {
      const p = proj(ix, iy), pr = proj(ix + 1, iy), pd = proj(ix, iy + 1);
      if (p && pr) { ctx.strokeStyle = colorFor((p[2] + pr[2]) / 2); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(pr[0], pr[1]); ctx.stroke(); }
      if (p && pd) { ctx.strokeStyle = colorFor((p[2] + pd[2]) / 2); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(pd[0], pd[1]); ctx.stroke(); }
    }
  }, [fxy, az]);

  return (
    <div className="fm-adv-pad fm-adv-2col">
      <div className="fm-adv-col-left">
        <div className="fm-adv-row"><label className="fm-adv-lbl">z = f(x,y)</label>
          <input className="fm-adv-input" value={fxy} onChange={(e) => setFxy(e.target.value)} placeholder="e.g. x^2 + y^2" /></div>
        <div className="fm-adv-chips">
          {presets.map((p) => <button key={p} className={"fm-adv-chip" + (fxy === p ? " on" : "")} onClick={() => setFxy(p)}>{p}</button>)}
        </div>
        <div className="fm-adv-row"><label className="fm-adv-lbl">Rotate {az}°</label>
          <input type="range" min={0} max={360} value={az} onChange={(e) => setAz(+e.target.value)} style={{ flex: 1 }} /></div>
        <p className="fm-adv-note">Colour = height. Spin to see the shape (bowl, saddle, ripples…).</p>
      </div>
      <div className="fm-adv-col-right">
        <canvas ref={ref} width={620} height={500} className="fm-adv-canvas" />
      </div>
    </div>
  );
}

/* ---------- shell ---------- */

function renderTool(id: ToolId) {
  switch (id) {
    case "grapher": return <Grapher />;
    case "surface3d": return <Surface3DTool />;
    case "calculus": return <CalculusTool />;
    case "solver": return <EquationSolver />;
    case "trig": return <TrigTool />;
    case "geometry": return <GeometryTool />;
    case "matrix": return <MatrixTool />;
    case "complex": return <ComplexTool />;
    case "sequences": return <SequencesTool />;
    case "sets": return <SetsTool />;
    case "stats": return <StatsTool />;
    case "prob": return <ProbTool />;
    case "numtheory": return <NumberTheoryTool />;
    case "mensuration": return <MensurationTool />;
    case "finance": return <FinanceTool />;
    case "fracpct": return <FracPctTool />;
    case "formula": return <FormulaTool />;
  }
}

export function AdvancedToolbox() {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<ToolId>("grapher");
  const [showHelp, setShowHelp] = useState(false);
  const meta = TOOLS.find((t) => t.id === tool)!;
  const help = HELP[tool];

  const pick = (id: ToolId) => { setTool(id); setShowHelp(false); };

  return (
    <>
      {!open && (
        <button className="fm-adv-fab" onClick={() => setOpen(true)} title="Advanced maths tools, Class 6 to JEE">
          🎓 Advanced <span className="fm-adv-fab-sub">6→JEE</span>
        </button>
      )}
      {open && (
        /* Reuses the SAME shell classes as the kids Math Tools popup for a consistent look */
        <div className="fm-toolbox-sheet fm-adv-theme" role="dialog" aria-label="Advanced math tools">
          <div className="fm-toolbox-top">
            <h2>🎓 Advanced Math <small className="fm-adv-sub">Class 6 → JEE</small></h2>
            <button className="fm-modal-x" aria-label="Close tools" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="fm-toolbox-main">
            <nav className="fm-tool-rail" aria-label="Choose a tool">
              {TOOLS.map((t) => (
                <button key={t.id} className={`fm-tool-tile ${tool === t.id ? "active" : ""}`} onClick={() => pick(t.id)}>
                  <span className="fm-tool-tile-icon" aria-hidden>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
            <section className="fm-tool-stage">
              <div className="fm-tool-card">
                <header className="fm-tool-card-head">
                  <span><span aria-hidden>{meta.icon}</span> {meta.label}</span>
                  <button className={`fm-tool-info ${showHelp ? "on" : ""}`} onClick={() => setShowHelp((v) => !v)}
                    aria-label={showHelp ? "Hide help" : "What is this tool?"} title={showHelp ? "Hide help" : "What is this? How to use it"}>
                    {showHelp ? "✕" : "ⓘ"}
                  </button>
                </header>
                <div className="fm-tool-card-body">
                  {showHelp ? (
                    <div className="fm-adv-help">
                      <p><b>What is it?</b> {help.what}</p>
                      <p><b>How to use:</b></p>
                      <ol>{help.use.map((u, k) => <li key={k}>{u}</li>)}</ol>
                      <p className="fm-adv-tip">💡 {help.tip}</p>
                    </div>
                  ) : renderTool(tool)}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
