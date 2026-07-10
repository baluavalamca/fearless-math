/**
 * Math Tools — a friendly dock of the tools kids reach for most. Redesigned as a
 * left tool-rail + spacious stage (clean, uncluttered, big tap targets), with an
 * interactive abacus, times tables to 20, a Roman-numeral converter, and more.
 * Everything works offline.
 */
import { useEffect, useRef, useState } from "react";
import { VisualRenderer, VisualSpec } from "./VisualRenderer";
import { SpeakButton } from "./SpeakButton";

type ToolId =
  | "calc" | "sci" | "abacus" | "counters" | "hundred" | "times" | "roman"
  | "numline" | "placevalue" | "bignum" | "fractions" | "converter" | "clock" | "calendar" | "shapes" | "scratch";

const TOOLS: { id: ToolId; icon: string; label: string }[] = [
  { id: "calc", icon: "🔢", label: "Calculator" },
  { id: "sci", icon: "🧪", label: "Sci Calc" },
  { id: "abacus", icon: "🧮", label: "Abacus" },
  { id: "counters", icon: "🔴", label: "Counters" },
  { id: "hundred", icon: "💯", label: "100 Chart" },
  { id: "times", icon: "✖️", label: "Times Tables" },
  { id: "roman", icon: "🏛️", label: "Roman Numbers" },
  { id: "numline", icon: "📏", label: "Number Line" },
  { id: "placevalue", icon: "🧱", label: "Place Value" },
  { id: "bignum", icon: "🔟", label: "Big Numbers" },
  { id: "fractions", icon: "🍕", label: "Fraction Wall" },
  { id: "converter", icon: "📐", label: "Converter" },
  { id: "clock", icon: "🕐", label: "Clock" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "shapes", icon: "🔺", label: "Shapes" },
  { id: "scratch", icon: "✏️", label: "Scratchpad" },
];

/** Kid-friendly help for every tool: what it is, how to use it, a tip. */
const HELP: Record<ToolId, { what: string; use: string[]; tip: string }> = {
  calc: {
    what: "A simple calculator for adding, subtracting, multiplying and dividing.",
    use: ["Tap the number keys to type a number.", "Tap +, −, × or ÷ to choose what to do.", "Type the next number, then tap = for the answer.", "Tap C to clear and start again."],
    tip: "Perfect for checking your sums quickly.",
  },
  sci: {
    what: "A scientific calculator for bigger maths — powers, roots and trigonometry.",
    use: ["Build your sum by tapping keys; it shows on the screen.", "Use ( ) to group, and ^ for powers like 2^10.", "√ is square root; log and ln are logarithms.", "sin, cos, tan work in DEG or RAD — tap the green button to switch.", "Tap = for the answer, ⌫ to delete, C to clear."],
    tip: "π gives 3.14159…, and % turns a number into hundredths.",
  },
  abacus: {
    what: "A bead frame that shows a number by place value: Thousands, Hundreds, Tens and Ones.",
    use: ["Each coloured rod is one place.", "Tap a bead to slide beads across — the digit (0–9) shows on the right.", "The big number on top is the total.", "Tap 'Clear all' to reset to zero."],
    tip: "See how 2 hundreds + 3 tens + 5 ones makes 235.",
  },
  counters: {
    what: "Two ten-frames to count and picture numbers up to 20.",
    use: ["Tap '+ one' to add a counter, '− one' to take one away.", "Each frame holds 10 — a full frame means ten.", "Tap 'Clear' to empty them."],
    tip: "Ten-frames make 'making ten' and number bonds easy to see.",
  },
  hundred: {
    what: "All the numbers from 1 to 100 in a grid.",
    use: ["Tap any number to highlight it.", "Tap 2s, 3s, 5s or 10s to light up that skip-counting pattern.", "Tap 'Clear taps' to remove your highlights."],
    tip: "Spot the patterns — 10s go straight down, 5s line up in columns.",
  },
  times: {
    what: "The multiplication table for any number from 1 to 20.",
    use: ["Tap a number to choose its table.", "Read down: 4 × 1, 4 × 2, 4 × 3 …", "Answers go all the way to × 20."],
    tip: "Look for patterns — the 9s digits always add up to 9.",
  },
  roman: {
    what: "Turns everyday numbers into Roman numerals, like on old clocks.",
    use: ["Type a number from 1 to 3999.", "See it written in Roman letters.", "The chart shows each letter's value (I=1, V=5, X=10…)."],
    tip: "A smaller letter before a bigger one means subtract — IV is 4.",
  },
  numline: {
    what: "A line to see where a number sits and how numbers are spaced out.",
    use: ["Choose the end (10, 20, 50 or 100).", "Slide the red dot to a number.", "Ticks show each step; big ticks and labels mark the key numbers."],
    tip: "Great for counting on, counting back, and rounding.",
  },
  placevalue: {
    what: "Builds a number from base-ten blocks so you can SEE its value.",
    use: ["Type a number 0–999, or tap +100, +10, +1.", "Green flats are hundreds, blue rods are tens, orange cubes are ones.", "The line below shows the expanded form, e.g. 235 = 200 + 30 + 5."],
    tip: "Blocks make 'why the 5 in 52 means fifty' easy to see.",
  },
  bignum: {
    what: "Shows how BIG numbers are grouped and named — the Indian way (lakh, crore) and the world way (million, billion).",
    use: ["Type a number, or tap a quick amount.", "See it grouped both ways with commas.", "Read its name in each system.", "Tap 🔊 to hear the number said out loud."],
    tip: "1 lakh = 100 thousand · 1 crore = 10 million · 100 crore (1 arab) = 1 billion.",
  },
  fractions: {
    what: "Shows a fraction three ways at once — a circle, a bar, and a number line.",
    use: ["Pick the bottom number (how many equal parts).", "Slide to shade the top number of parts.", "Watch all three pictures change together."],
    tip: "The number line is the strongest way to compare fractions.",
  },
  converter: {
    what: "Changes a measurement from one unit to another — length, weight, capacity, temperature, time, area, speed and money.",
    use: ["Pick a kind: Length, Weight, Capacity, Temperature, Time, Area, Speed or Money.", "Type the amount and choose the 'from' unit.", "Choose the 'to' unit — the answer appears at once.", "Tap ⇄ to swap the two units."],
    tip: "Height uses feet & inches; distance uses miles/km; speed uses km/h. Money rates are approximate!",
  },
  clock: {
    what: "An analogue clock you can set to any time — it also shows AM/PM and whether it's day or night.",
    use: ["Slide 'Hour' and 'Min' to set the hands.", "Tap AM (morning–noon) or PM (noon–midnight).", "Tap 🔊 to HEAR the time said out loud — 'quarter past 3'.", "The panel turns dark 🌙 at night and light ☀️ in the day."],
    tip: "For the long hand, each clock number is 5 minutes.",
  },
  calendar: {
    what: "Explains days, weeks, months, the year, leap years, and how year-counting (BC / AD) began.",
    use: ["📆 Months: fact cards, the 7 days, how many days each month has, and a real month grid (each row is a week).", "🐸 Leap Year: type a year to check if February has 28 or 29 days, with the rule.", "🏛️ BC & AD: a timeline showing how counting years started and what BC, AD, BCE and CE mean.", "Slide 'Weeks' to skip-count into days (7, 14, 21…)."],
    tip: "Knuckle trick: knuckles are 31-day months, dips between are 30 (Feb is special).",
  },
  shapes: {
    what: "Shows common flat (2D) shapes and how many sides they have.",
    use: ["Tap a shape to see it drawn.", "The label names it and gives the number of sides."],
    tip: "Count the sides to name a shape — 3 = triangle, 6 = hexagon.",
  },
  scratch: {
    what: "A blank pad to draw and work out sums by hand.",
    use: ["Pick a pen colour and draw with the mouse.", "Tap 🧽 Rub to erase a little, or 'Clear all' to wipe it.", "Use it to try a sum before you answer."],
    tip: "Drawing your thinking often makes the answer clearer.",
  },
};

function ToolHelp({ id }: { id: ToolId }) {
  const h = HELP[id];
  const readText = `${h.what} How to use it. ${h.use.join(". ")}. Tip: ${h.tip}`;
  return (
    <div className="fm-tool-help">
      <div className="fm-help-top">
        <p className="fm-help-what">{h.what}</p>
        <SpeakButton text={readText} label="Read this help aloud" style="concept" />
      </div>
      <h4>How to use it</h4>
      <ol>{h.use.map((u, i) => <li key={i}>{u}</li>)}</ol>
      <p className="fm-help-tip">💡 {h.tip}</p>
    </div>
  );
}

export function MathToolbox() {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<ToolId>("calc");
  const [showHelp, setShowHelp] = useState(false);
  const active = TOOLS.find((t) => t.id === tool)!;
  const pick = (id: ToolId) => { setTool(id); setShowHelp(false); };

  return (
    <>
      {!open && (
        <button className="fm-toolbox-fab" onClick={() => setOpen(true)} title="Math tools">
          🧰 Math Tools
        </button>
      )}
      {open && (
        <div className="fm-toolbox-sheet" role="dialog" aria-label="Math tools">
          <div className="fm-toolbox-top">
            <h2>🧰 Math Tools</h2>
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
                  <span><span aria-hidden>{active.icon}</span> {active.label}</span>
                  <button className={`fm-tool-info ${showHelp ? "on" : ""}`} onClick={() => setShowHelp((v) => !v)}
                    aria-label={showHelp ? "Hide help" : "What is this tool?"} title={showHelp ? "Hide help" : "What is this? How to use it"}>
                    {showHelp ? "✕" : "ⓘ"}
                  </button>
                </header>
                <div className="fm-tool-card-body">
                  {showHelp && <ToolHelp id={tool} />}
                  {tool === "calc" && <Calculator />}
                  {tool === "sci" && <SciCalc />}
                  {tool === "abacus" && <AbacusTool />}
                  {tool === "counters" && <Counters />}
                  {tool === "hundred" && <HundredChart />}
                  {tool === "times" && <TimesTable />}
                  {tool === "roman" && <RomanTool />}
                  {tool === "numline" && <NumberLineTool />}
                  {tool === "placevalue" && <PlaceValueTool />}
                  {tool === "bignum" && <BigNumbersTool />}
                  {tool === "fractions" && <FractionWall />}
                  {tool === "converter" && <ConverterTool />}
                  {tool === "clock" && <ClockTool />}
                  {tool === "calendar" && <CalendarTool />}
                  {tool === "shapes" && <ShapesTool />}
                  {tool === "scratch" && <Scratchpad />}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Calculator ---------------- */
function Calculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const apply = (a: number, b: number, o: string) =>
    o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : b === 0 ? NaN : a / b;
  const fmt = (n: number) => (Number.isNaN(n) ? "Oops!" : String(Math.round(n * 1e6) / 1e6));
  function digit(d: string) {
    if (fresh) { setDisplay(d === "." ? "0." : d); setFresh(false); return; }
    if (d === "." && display.includes(".")) return;
    setDisplay(display.length < 12 ? (display === "0" && d !== "." ? d : display + d) : display);
  }
  function chooseOp(o: string) {
    const cur = parseFloat(display);
    if (prev !== null && op && !fresh) { const r = apply(prev, cur, op); setPrev(r); setDisplay(fmt(r)); }
    else setPrev(cur);
    setOp(o); setFresh(true);
  }
  function equals() { if (prev === null || !op) return; setDisplay(fmt(apply(prev, parseFloat(display), op))); setPrev(null); setOp(null); setFresh(true); }
  function clear() { setDisplay("0"); setPrev(null); setOp(null); setFresh(true); }
  // Physical keyboard support
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9.]$/.test(k)) digit(k);
      else if (k === "+") chooseOp("+");
      else if (k === "-") chooseOp("−");
      else if (k === "*") chooseOp("×");
      else if (k === "/") { e.preventDefault(); chooseOp("÷"); }
      else if (k === "Enter" || k === "=") { e.preventDefault(); equals(); }
      else if (k === "Escape") clear();
      else if (k === "Backspace") setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  const keys = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "=", "+"];
  return (
    <div className="fm-calc">
      <div className="fm-calc-screen">{display}{op && <span className="fm-calc-op"> {op}</span>}</div>
      <div className="fm-calc-keys">
        <button className="fm-calc-clear" onClick={clear}>C</button>
        {keys.map((k) => (
          <button key={k}
            className={"+−×÷".includes(k) ? "fm-calc-opkey" : k === "=" ? "fm-calc-eq" : ""}
            onClick={() => (k === "=" ? equals() : "+−×÷".includes(k) ? chooseOp(k) : digit(k))}>{k}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Scientific calculator ---------------- */
/** Safe recursive-descent evaluator — no eval(). Supports + − × ÷, ^, brackets,
 *  sin cos tan, √, log, ln, π, and percent. */
function evalExpr(input: string, deg: boolean): number {
  const s = input
    .replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")
    .replace(/π/g, "PI").replace(/√/g, "sqrt").replace(/%/g, "/100").replace(/\s+/g, "");
  let i = 0;
  const fn = (name: string, x: number) => {
    const r = deg ? (x * Math.PI) / 180 : x;
    switch (name) {
      case "sin": return Math.sin(r);
      case "cos": return Math.cos(r);
      case "tan": return Math.tan(r);
      case "sqrt": return Math.sqrt(x);
      case "log": return Math.log10(x);
      case "ln": return Math.log(x);
      default: return NaN;
    }
  };
  function expr(): number { let v = term(); while (s[i] === "+" || s[i] === "-") { const o = s[i++]; const t = term(); v = o === "+" ? v + t : v - t; } return v; }
  function term(): number { let v = power(); while (s[i] === "*" || s[i] === "/") { const o = s[i++]; const p = power(); v = o === "*" ? v * p : v / p; } return v; }
  function power(): number { const b = unary(); if (s[i] === "^") { i++; return Math.pow(b, power()); } return b; }
  function unary(): number { if (s[i] === "-") { i++; return -unary(); } if (s[i] === "+") { i++; return unary(); } return factor(); }
  function factor(): number {
    if (s[i] === "(") { i++; const v = expr(); if (s[i] === ")") i++; return v; }
    const m = s.slice(i).match(/^(sqrt|sin|cos|tan|log|ln)/);
    if (m) { i += m[0].length; let a: number; if (s[i] === "(") { i++; a = expr(); if (s[i] === ")") i++; } else { a = unary(); } return fn(m[0], a); }
    if (s.slice(i, i + 2) === "PI") { i += 2; return Math.PI; }
    const nm = s.slice(i).match(/^\d*\.?\d+/);
    if (nm) { i += nm[0].length; return parseFloat(nm[0]); }
    throw new Error("bad");
  }
  const out = expr();
  if (i !== s.length || Number.isNaN(out) || !Number.isFinite(out)) throw new Error("bad");
  return out;
}

function SciCalc() {
  const [expr, setExpr] = useState("");
  const [deg, setDeg] = useState(true);
  const [result, setResult] = useState("");
  const add = (t: string) => { setExpr((e) => (e + t).slice(0, 60)); setResult(""); };
  function equals() {
    if (!expr) return;
    try { const r = evalExpr(expr, deg); setResult(String(Math.round(r * 1e8) / 1e8)); }
    catch { setResult("Oops!"); }
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9.]$/.test(k)) add(k);
      else if (k === "+") add("+");
      else if (k === "-") add("−");
      else if (k === "*") add("×");
      else if (k === "/") { e.preventDefault(); add("÷"); }
      else if (k === "^" || k === "(" || k === ")") add(k);
      else if (k === "Enter" || k === "=") { e.preventDefault(); equals(); }
      else if (k === "Backspace") setExpr((x) => x.slice(0, -1));
      else if (k === "Escape") { setExpr(""); setResult(""); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  const keys: { t: string; ins?: string; cls?: string; act?: () => void }[] = [
    { t: deg ? "DEG" : "RAD", cls: "sci-mode", act: () => setDeg(!deg) },
    { t: "(", ins: "(" }, { t: ")", ins: ")" }, { t: "⌫", cls: "sci-fn", act: () => setExpr((e) => e.slice(0, -1)) }, { t: "C", cls: "sci-clear", act: () => { setExpr(""); setResult(""); } },
    { t: "sin", ins: "sin(", cls: "sci-fn" }, { t: "cos", ins: "cos(", cls: "sci-fn" }, { t: "tan", ins: "tan(", cls: "sci-fn" }, { t: "^", ins: "^", cls: "sci-op" }, { t: "÷", ins: "÷", cls: "sci-op" },
    { t: "√", ins: "√(", cls: "sci-fn" }, { t: "7", ins: "7" }, { t: "8", ins: "8" }, { t: "9", ins: "9" }, { t: "×", ins: "×", cls: "sci-op" },
    { t: "log", ins: "log(", cls: "sci-fn" }, { t: "4", ins: "4" }, { t: "5", ins: "5" }, { t: "6", ins: "6" }, { t: "−", ins: "−", cls: "sci-op" },
    { t: "ln", ins: "ln(", cls: "sci-fn" }, { t: "1", ins: "1" }, { t: "2", ins: "2" }, { t: "3", ins: "3" }, { t: "+", ins: "+", cls: "sci-op" },
    { t: "π", ins: "π", cls: "sci-fn" }, { t: "%", ins: "%", cls: "sci-fn" }, { t: "0", ins: "0" }, { t: ".", ins: "." }, { t: "=", cls: "sci-eq", act: equals },
  ];
  return (
    <div className="fm-sci">
      <div className="fm-sci-screen">
        <div className="fm-sci-expr">{expr || "0"}</div>
        <div className="fm-sci-result">{result && `= ${result}`}</div>
      </div>
      <div className="fm-sci-keys">
        {keys.map((k, idx) => (
          <button key={idx} className={k.cls || ""} onClick={() => (k.act ? k.act() : add(k.ins!))}>{k.t}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Abacus — place-value bead frame (Th / H / T / O) ---------------- */
function AbacusTool() {
  const rods = [
    { key: "th", label: "Thousands", place: 1000, color: "#2f7bd6" },
    { key: "h", label: "Hundreds", place: 100, color: "#3fae4a" },
    { key: "t", label: "Tens", place: 10, color: "#f0a132" },
    { key: "o", label: "Ones", place: 1, color: "#e2352f" },
  ];
  const [counts, setCounts] = useState<Record<string, number>>({ th: 0, h: 2, t: 3, o: 5 });
  const total = rods.reduce((s, r) => s + counts[r.key] * r.place, 0);
  const setRod = (k: string, n: number) => setCounts((p) => ({ ...p, [k]: n }));
  return (
    <div className="fm-tool-col">
      <div className="fm-abacus-total">{total.toLocaleString("en-IN")}</div>
      <p className="fm-tool-hint">Each rod is a place. Tap a bead to slide beads across (0–9 per rod).</p>
      <div className="fm-pvab">
        {rods.map((r) => {
          const active = counts[r.key];
          return (
            <div className="fm-pvab-rod" key={r.key}>
              <span className="fm-pvab-name" style={{ color: r.color }}>{r.label}</span>
              <div className="fm-pvab-beads">
                {Array.from({ length: 9 }, (_, i) => i).map((i) => (
                  <button key={i}
                    className={`fm-pvab-bead ${i < active ? "on" : "off"}`}
                    style={{
                      background: i < active ? r.color : "#efe6d3",
                      borderColor: i < active ? r.color : "#d8caac",
                      marginLeft: i === active && active > 0 && active < 9 ? 16 : 0,
                    }}
                    aria-label={`${r.label} bead`}
                    onClick={() => setRod(r.key, active === i + 1 ? i : i + 1)} />
                ))}
              </div>
              <span className="fm-pvab-digit" style={{ color: r.color }}>{active}</span>
            </div>
          );
        })}
      </div>
      <button className="fm-chip" onClick={() => setCounts({ th: 0, h: 0, t: 0, o: 0 })}>Clear all</button>
    </div>
  );
}

/* ---------------- Counters ---------------- */
function Counters() {
  const [count, setCount] = useState(3);
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        <button className="fm-chip" onClick={() => setCount(Math.max(0, count - 1))}>− one</button>
        <b className="fm-big">{count}</b>
        <button className="fm-chip" onClick={() => setCount(Math.min(20, count + 1))}>+ one</button>
        <button className="fm-chip" onClick={() => setCount(0)}>Clear</button>
      </div>
      <div className="fm-tenframes">
        {[0, 1].map((frame) => (
          <div key={frame} className="fm-tenframe">
            {Array.from({ length: 10 }, (_, i) => frame * 10 + i).map((i) => (
              <span key={i} className={`fm-dot ${i < count ? "on" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Hundred chart ---------------- */
function HundredChart() {
  const [step, setStep] = useState<number>(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const toggle = (n: number) => setPicked((p) => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s; });
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        <span>Skip-count by:</span>
        {[2, 3, 5, 10].map((s) => (
          <button key={s} className={`fm-chip ${step === s ? "on" : ""}`} onClick={() => setStep(step === s ? 0 : s)}>{s}s</button>
        ))}
        <button className="fm-chip" onClick={() => setPicked(new Set())}>Clear taps</button>
      </div>
      <div className="fm-hundred">
        {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`fm-hcell ${step && n % step === 0 ? "skip" : ""} ${picked.has(n) ? "tap" : ""}`}
            onClick={() => toggle(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Times tables (1–20) ---------------- */
function TimesTable() {
  const [n, setN] = useState(2);
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        <span>Table of:</span>
        <div className="fm-num-pick">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((k) => (
            <button key={k} className={`fm-chip ${n === k ? "on" : ""}`} onClick={() => setN(k)}>{k}</button>
          ))}
        </div>
      </div>
      <div className="fm-times-grid">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((i) => (
          <div key={i} className="fm-times-row"><b>{n}</b> × {i} = <b>{n * i}</b></div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Roman numbers ---------------- */
function RomanTool() {
  const [num, setNum] = useState(2024);
  const clamp = Math.min(3999, Math.max(1, Math.floor(num) || 1));
  const toRoman = (n: number) => {
    const map: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let r = ""; for (const [v, s] of map) while (n >= v) { r += s; n -= v; } return r;
  };
  const chart: [string, number][] = [["I", 1], ["V", 5], ["X", 10], ["L", 50], ["C", 100], ["D", 500], ["M", 1000]];
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        <span>Number (1–3999):</span>
        <input className="fm-input" type="number" min={1} max={3999} value={num}
          onChange={(e) => setNum(Math.min(3999, Math.max(1, Number(e.target.value) || 1)))} style={{ maxWidth: 130 }} />
      </div>
      <div className="fm-roman-out">{toRoman(clamp)}</div>
      <div className="fm-tool-row">
        {[1, 4, 9, 14, 40, 90, 400, 2024].map((q) => (
          <button key={q} className="fm-chip" onClick={() => setNum(q)}>{q}</button>
        ))}
      </div>
      <div className="fm-roman-chart">
        {chart.map(([s, v]) => (
          <div key={s} className="fm-roman-cell"><b>{s}</b><span>{v}</span></div>
        ))}
      </div>
      <p className="fm-tool-hint">Bigger letter before smaller → add. Smaller before bigger → subtract (IV = 4).</p>
    </div>
  );
}

/* ---------------- Number line — with a jump (add / subtract) ---------------- */
function NumberLineTool() {
  const [max, setMax] = useState(20);
  const [start, setStart] = useState(3);
  const [jump, setJump] = useState(5);
  const s = Math.min(Math.max(0, start), max);
  const end = Math.max(0, Math.min(max, s + jump));
  const dj = end - s; // the jump that actually fits on the line
  const bandL = (Math.min(s, end) / max) * 100;
  const bandW = (Math.abs(dj) / max) * 100;
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        <span>Count to:</span>
        {[10, 20, 50, 100].map((m) => (
          <button key={m} className={`fm-chip ${max === m ? "on" : ""}`} onClick={() => { setMax(m); setStart((v) => Math.min(v, m)); }}>{m}</button>
        ))}
      </div>
      <div className="fm-numline-sum">
        <b style={{ color: "#3fae4a" }}>{s}</b> {dj >= 0 ? "+" : "−"} <b>{Math.abs(dj)}</b> = <b style={{ color: "#e2352f" }}>{end}</b>
      </div>
      <div className="fm-numline">
        <div className="fm-numline-track">
          <div className={`fm-numline-band ${dj < 0 ? "back" : ""}`} style={{ left: `${bandL}%`, width: `${bandW}%` }} />
          {Array.from({ length: max + 1 }, (_, i) => i).map((i) => {
            const label = max <= 20 || i % (max / 10) === 0;
            return (
              <span key={i} className={`fm-numline-tick ${i % (max <= 20 ? 5 : max / 10) === 0 ? "big" : ""}`} style={{ left: `${(i / max) * 100}%` }}>
                {label && <em>{i}</em>}
              </span>
            );
          })}
          <span className="fm-numline-marker start" style={{ left: `${(s / max) * 100}%` }}><span className="fm-numline-bubble green">{s}</span></span>
          <span className="fm-numline-marker" style={{ left: `${(end / max) * 100}%` }}><span className="fm-numline-bubble">{end}</span></span>
        </div>
      </div>
      <div className="fm-tool-row">
        <span>Start:</span>
        <input type="range" min={0} max={max} value={s} onChange={(e) => setStart(Number(e.target.value))} style={{ flex: 1, maxWidth: 300 }} />
        <b className="fm-big" style={{ color: "#3fae4a" }}>{s}</b>
      </div>
      <div className="fm-tool-row">
        <span>Jump:</span>
        <input type="range" min={-max} max={max} value={jump} onChange={(e) => setJump(Number(e.target.value))} style={{ flex: 1, maxWidth: 300 }} />
        <b className="fm-big">{jump >= 0 ? `+${jump}` : jump}</b>
      </div>
    </div>
  );
}

/* ---------------- Place value — base-ten (Dienes) blocks ---------------- */
function PlaceValueTool() {
  const [num, setNum] = useState(235);
  const h = Math.floor(num / 100), t = Math.floor((num % 100) / 10), o = num % 10;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        <span>Number (0–999):</span>
        <input className="fm-input" type="number" min={0} max={999} value={num}
          onChange={(e) => setNum(Math.max(0, Math.min(999, Number(e.target.value) || 0)))} style={{ maxWidth: 130 }} />
        {[100, 10, 1].map((s) => (
          <button key={s} className="fm-chip" onClick={() => setNum((n) => Math.min(999, n + s))}>+{s}</button>
        ))}
        <button className="fm-chip" onClick={() => setNum(0)}>0</button>
      </div>
      <div className="fm-b10">
        <div className="fm-b10-col">
          <div className="fm-b10-stack">
            {Array.from({ length: h }, (_, i) => (
              <div className="fm-flat" key={i}>{Array.from({ length: 100 }, (_, j) => <span key={j} />)}</div>
            ))}
            {h === 0 && <div className="fm-b10-none">—</div>}
          </div>
          <div className="fm-b10-label hundreds">{plural(h, "hundred")}</div>
        </div>
        <div className="fm-b10-col">
          <div className="fm-b10-stack row">
            {Array.from({ length: t }, (_, i) => (
              <div className="fm-rodten" key={i}>{Array.from({ length: 10 }, (_, j) => <span key={j} />)}</div>
            ))}
            {t === 0 && <div className="fm-b10-none">—</div>}
          </div>
          <div className="fm-b10-label tens">{plural(t, "ten")}</div>
        </div>
        <div className="fm-b10-col">
          <div className="fm-b10-units">
            {Array.from({ length: o }, (_, i) => <span className="fm-unit" key={i} />)}
            {o === 0 && <div className="fm-b10-none">—</div>}
          </div>
          <div className="fm-b10-label ones">{plural(o, "one")}</div>
        </div>
      </div>
      <div className="fm-b10-eq"><b>{num}</b> = {h * 100} + {t * 10} + {o}</div>
    </div>
  );
}

/* ---------------- Big Numbers — Indian (lakh/crore) & International names ---------------- */
function indianWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) parts.push(`${crore} crore`);
  if (lakh) parts.push(`${lakh} lakh`);
  if (thousand) parts.push(`${thousand} thousand`);
  if (hundred) parts.push(`${hundred} hundred`);
  if (n) parts.push(`${n}`);
  return parts.join(" ");
}
function intlWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  const tril = Math.floor(n / 1e12); n %= 1e12;
  const bil = Math.floor(n / 1e9); n %= 1e9;
  const mil = Math.floor(n / 1e6); n %= 1e6;
  const th = Math.floor(n / 1e3); n %= 1e3;
  if (tril) parts.push(`${tril} trillion`);
  if (bil) parts.push(`${bil} billion`);
  if (mil) parts.push(`${mil} million`);
  if (th) parts.push(`${th} thousand`);
  if (n) parts.push(`${n}`);
  return parts.join(" ");
}
function BigNumbersTool() {
  const [cur, setCur] = useState("₹");
  const [num, setNum] = useState(12345678);
  const n = Math.max(0, Math.min(999999999999999, Math.floor(num || 0)));
  const ind = n.toLocaleString("en-IN");
  const intl = n.toLocaleString("en-US");
  const iWords = indianWords(n);
  const wWords = intlWords(n);
  const say = `${cur === "₹" ? "rupees " : ""}${n.toLocaleString("en-US")}. In the Indian way: ${iWords}. In the world way: ${wWords}.`;
  const picks: [number, string][] = [[1000, "1 thousand"], [100000, "1 lakh"], [1000000, "1 million"], [10000000, "1 crore"], [1000000000, "1 billion"]];
  const table: [string, string, string][] = [
    ["1,000", "1 thousand (hazaar)", "1 thousand"],
    ["1,00,000", "1 lakh", "100 thousand"],
    ["10,00,000", "10 lakh", "1 million"],
    ["1,00,00,000", "1 crore", "10 million"],
    ["1,00,00,00,000", "1 arab (100 crore)", "1 billion"],
    ["1,00,00,00,00,00,000", "1 lakh crore", "1 trillion"],
  ];
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        {["₹", "$", "€"].map((s) => (
          <button key={s} className={`fm-chip ${cur === s ? "on" : ""}`} onClick={() => setCur(s)}>{s}</button>
        ))}
        <input className="fm-input" type="number" min={0} value={num}
          onChange={(e) => setNum(Number(e.target.value) || 0)} style={{ maxWidth: 200 }} />
        <SpeakButton text={say} label="Say the number" style="concept" />
      </div>
      <div className="fm-bignum-cards">
        <div className="fm-bignum-card ind">
          <h4>🇮🇳 Indian system</h4>
          <div className="fm-bignum-val">{cur} {ind}</div>
          <div className="fm-bignum-words">{iWords}</div>
        </div>
        <div className="fm-bignum-card intl">
          <h4>🌍 International system</h4>
          <div className="fm-bignum-val">{cur} {intl}</div>
          <div className="fm-bignum-words">{wWords}</div>
        </div>
      </div>
      <div className="fm-tool-row">
        {picks.map(([v, l]) => <button key={v} className="fm-chip" onClick={() => setNum(v)}>{l}</button>)}
      </div>
      <div className="fm-bignum-table">
        <div className="fm-bignum-tr head"><span>Number</span><span>🇮🇳 Indian</span><span>🌍 World</span></div>
        {table.map(([a, b, c]) => <div className="fm-bignum-tr" key={a}><span>{a}</span><span>{b}</span><span>{c}</span></div>)}
      </div>
    </div>
  );
}

/* ---------------- Fractions — circle + bar + number line ---------------- */
function FractionWall() {
  const [d, setD] = useState(4);
  const [n, setN] = useState(3);
  const [view, setView] = useState<"single" | "wall">("single");
  const shaded = Math.min(n, d);
  const pct = (shaded / d) * 100;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = shaded > 0 ? gcd(shaded, d) : 1;
  const simplest = g > 1 ? `${shaded / g}/${d / g}` : null;
  const WALL = [1, 2, 3, 4, 5, 6, 8, 10, 12];
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        <button className={`fm-chip ${view === "single" ? "on" : ""}`} onClick={() => setView("single")}>One fraction</button>
        <button className={`fm-chip ${view === "wall" ? "on" : ""}`} onClick={() => setView("wall")}>Compare wall</button>
      </div>
      {view === "wall" ? (
        <div className="fm-frac-wallview">
          {WALL.map((den) => (
            <div className="fm-frac-wallrow" key={den}>
              <span className="fm-frac-wallname">{den === 1 ? "1 whole" : `1/${den}`}</span>
              <div className="fm-frac-wallbar" style={{ gridTemplateColumns: `repeat(${den}, 1fr)` }}>
                {Array.from({ length: den }, (_, i) => <span key={i}>{den <= 6 ? `1/${den}` : ""}</span>)}
              </div>
            </div>
          ))}
          <p className="fm-tool-hint">The more parts, the SMALLER each piece — 1/12 is tiny next to 1/2.</p>
        </div>
      ) : (
      <>
      <div className="fm-tool-row">
        <span>Parts (bottom):</span>
        {[2, 3, 4, 5, 6, 8, 10, 12].map((k) => (
          <button key={k} className={`fm-chip ${d === k ? "on" : ""}`} onClick={() => { setD(k); setN(Math.min(n, k)); }}>{k}</button>
        ))}
      </div>
      <div className="fm-tool-row">
        <span>Shaded (top):</span>
        <input type="range" min={0} max={d} value={shaded} onChange={(e) => setN(Number(e.target.value))} style={{ flex: 1, maxWidth: 320 }} />
        <b className="fm-frac-big">{shaded}/{d}</b>
        {simplest && <span className="fm-frac-simplest">= {simplest}</span>}
      </div>
      <div className="fm-frac-models">
        {/* Circle (pie) */}
        <div className="fm-frac-circle" style={{ background: `conic-gradient(#ff9f43 ${pct}%, #fff 0)` }}>
          <div className="fm-frac-circle-lines">
            {Array.from({ length: d }, (_, i) => (
              <span key={i} style={{ transform: `rotate(${(i / d) * 360}deg)` }} />
            ))}
          </div>
          <div className="fm-frac-badge">{shaded}/{d}</div>
        </div>
        {/* Bar */}
        <div className="fm-frac-bar" style={{ gridTemplateColumns: `repeat(${d}, 1fr)` }}>
          {Array.from({ length: d }, (_, i) => <span key={i} className={i < shaded ? "on" : ""} />)}
        </div>
      </div>
      {/* Number line 0..1 (the most powerful fraction model) */}
      <div className="fm-frac-line">
        <div className="fm-frac-track">
          {Array.from({ length: d + 1 }, (_, i) => (
            <span key={i} className="fm-frac-tick" style={{ left: `${(i / d) * 100}%` }} />
          ))}
          <span className="fm-frac-fill" style={{ width: `${pct}%` }} />
          <span className="fm-frac-marker" style={{ left: `${pct}%` }} />
        </div>
        <div className="fm-frac-ends"><span>0</span><span>1</span></div>
      </div>
      </>
      )}
    </div>
  );
}

/* ---------------- Measurement converter ---------------- */
const CONV: Record<string, { icon: string; base: string; units: Record<string, number>; ref: string[] }> = {
  // Length includes metric + imperial (inch/foot/yard/mile) for height & distance.
  Length: {
    icon: "📏", base: "cm",
    units: { mm: 0.1, cm: 1, m: 100, km: 100000, inch: 2.54, foot: 30.48, yard: 91.44, mile: 160934.4 },
    ref: ["10 mm = 1 cm", "100 cm = 1 m", "1000 m = 1 km", "1 inch = 2.54 cm", "12 inch = 1 foot", "1 mile ≈ 1.6 km"],
  },
  Weight: {
    icon: "⚖️", base: "g",
    units: { mg: 0.001, g: 1, kg: 1000, ounce: 28.3495, pound: 453.592 },
    ref: ["1000 mg = 1 g", "1000 g = 1 kg", "1 ounce ≈ 28 g", "1 pound ≈ 454 g"],
  },
  Capacity: { icon: "🥤", base: "mL", units: { mL: 1, L: 1000, gallon: 3785.41 }, ref: ["1000 mL = 1 L", "1 gallon ≈ 3.79 L"] },
  Temperature: { icon: "🌡️", base: "°C", units: { "°C": 0, "°F": 0, K: 0 }, ref: ["freezes 0°C = 32°F", "boils 100°C = 212°F", "body ≈ 37°C = 98.6°F"] },
  Time: {
    icon: "⏱️", base: "sec",
    units: { sec: 1, min: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31536000 },
    ref: ["60 sec = 1 min", "60 min = 1 hour", "24 hours = 1 day", "7 days = 1 week", "≈30 days = 1 month", "365 days = 1 year"],
  },
  Area: {
    icon: "🟩", base: "m²",
    units: { "cm²": 0.0001, "m²": 1, "km²": 1000000, hectare: 10000, acre: 4046.86, "foot²": 0.092903 },
    ref: ["10,000 cm² = 1 m²", "10,000 m² = 1 hectare", "1 km² = 100 hectare", "1 acre ≈ 4047 m²"],
  },
  Speed: {
    icon: "🚗", base: "m/s",
    units: { "m/s": 1, "km/h": 0.277778, "miles/h": 0.44704, knot: 0.514444 },
    ref: ["1 m/s = 3.6 km/h", "1 mile/h ≈ 1.6 km/h", "1 knot ≈ 1.85 km/h"],
  },
  // Money: factor = ₹ value of 1 unit. APPROXIMATE (rates change every day!).
  Money: {
    icon: "💰", base: "INR",
    units: { "₹ INR": 1, "$ USD": 95, "€ EUR": 109, "£ GBP": 127, "AED": 26, "A$ AUD": 62, "C$ CAD": 67, "S$ SGD": 74, "¥ CNY": 13, "¥ JPY": 0.59 },
    ref: ["≈ approx — real rates change daily", "$1 ≈ ₹95", "€1 ≈ ₹109", "£1 ≈ ₹127"],
  },
};
/** Temperature needs formulas (offsets), not simple factors. */
function tempConvert(v: number, from: string, to: string): number {
  const c = from === "°C" ? v : from === "°F" ? (v - 32) * 5 / 9 : v - 273.15;
  return to === "°C" ? c : to === "°F" ? c * 9 / 5 + 32 : c + 273.15;
}
function ConverterTool() {
  const cats = Object.keys(CONV);
  const [cat, setCat] = useState("Length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("cm");
  const [val, setVal] = useState(1);
  const c = CONV[cat];
  const units = Object.keys(c.units);
  const pickCat = (k: string) => { setCat(k); const u = Object.keys(CONV[k].units); setFrom(u[0]); setTo(u[Math.min(1, u.length - 1)]); };
  const isTemp = cat === "Temperature";
  const raw = isTemp ? tempConvert(val, from, to) : (val * c.units[from]) / c.units[to];
  const result = Number.isFinite(raw) ? String(Number(raw.toFixed(isTemp ? 1 : 6))) : "—";
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        {cats.map((k) => (
          <button key={k} className={`fm-chip ${cat === k ? "on" : ""}`} onClick={() => pickCat(k)}>{CONV[k].icon} {k}</button>
        ))}
      </div>
      <div className="fm-conv">
        <input className="fm-input fm-conv-val" type="number" value={val}
          onChange={(e) => setVal(Number(e.target.value) || 0)} />
        <select className="fm-input" value={from} onChange={(e) => setFrom(e.target.value)}>
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <button className="fm-conv-swap" title="Swap" onClick={() => { setFrom(to); setTo(from); }}>⇄</button>
        <span className="fm-conv-eq">=</span>
        <b className="fm-conv-result">{result}</b>
        <select className="fm-input" value={to} onChange={(e) => setTo(e.target.value)}>
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="fm-conv-ref">
        {c.ref.map((r) => <span key={r} className="fm-conv-refcell">{r}</span>)}
      </div>
    </div>
  );
}

/* ---------------- Clock — with AM/PM, greetings, day/night ---------------- */
const DAY_PARTS = [
  { key: "morning", emoji: "🌅", name: "Morning", greet: "Good morning!", when: "5 AM – 12", night: false },
  { key: "afternoon", emoji: "🌤️", name: "Afternoon", greet: "Good afternoon!", when: "12 – 5 PM", night: false },
  { key: "evening", emoji: "🌆", name: "Evening", greet: "Good evening!", when: "5 – 9 PM", night: false },
  { key: "night", emoji: "🌙", name: "Night", greet: "Good night!", when: "9 PM – 5 AM", night: true },
];
function partOfDay(h24: number) {
  if (h24 >= 5 && h24 < 12) return DAY_PARTS[0];
  if (h24 >= 12 && h24 < 17) return DAY_PARTS[1];
  if (h24 >= 17 && h24 < 21) return DAY_PARTS[2];
  return DAY_PARTS[3];
}
/** Say the time the way people speak it: "quarter past 3", "half past 9", "20 minutes to 4". */
function timePhrase(hour: number, minute: number, partName: string): string {
  const next = hour === 12 ? 1 : hour + 1;
  let base: string;
  if (minute === 0) base = `${hour} o'clock`;
  else if (minute === 15) base = `quarter past ${hour}`;
  else if (minute === 30) base = `half past ${hour}`;
  else if (minute === 45) base = `quarter to ${next}`;
  else if (minute < 30) base = `${minute} minutes past ${hour}`;
  else base = `${60 - minute} minutes to ${next}`;
  const suffix = partName === "Night" ? "at night" : `in the ${partName.toLowerCase()}`;
  return `It's ${base}, ${suffix}.`;
}
function ClockTool() {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(false);
  const h24 = (hour % 12) + (pm ? 12 : 0);
  const part = partOfDay(h24);
  const spec: VisualSpec = { component: "ClockFace", props: { clocks: [{ hour, minute, label: "" }] }, caption: "" };
  const timeStr = `${hour}:${String(minute).padStart(2, "0")} ${pm ? "PM" : "AM"}`;
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        <span>Hour:</span>
        <input type="range" min={1} max={12} value={hour} onChange={(e) => setHour(Number(e.target.value))} />
        <b className="fm-big">{hour}</b>
        <span>Min:</span>
        <input type="range" min={0} max={55} step={5} value={minute} onChange={(e) => setMinute(Number(e.target.value))} />
        <b className="fm-big">{String(minute).padStart(2, "0")}</b>
        <button className={`fm-chip ${!pm ? "on" : ""}`} onClick={() => setPm(false)}>AM</button>
        <button className={`fm-chip ${pm ? "on" : ""}`} onClick={() => setPm(true)}>PM</button>
      </div>
      <div className={`fm-clockpanel ${part.night ? "night" : "day"}`}>
        <div className="fm-tool-visual fm-clock-face"><VisualRenderer visual={spec} /></div>
        <div className="fm-clock-time">{timeStr} <span className="fm-clock-emoji">{part.emoji}</span></div>
        <div className="fm-clock-greet">{part.greet} <small>it's {part.name.toLowerCase()}</small></div>
      </div>
      <div className="fm-clock-say">
        <span>🗣️ “{timePhrase(hour, minute, part.name)}”</span>
        <SpeakButton text={timePhrase(hour, minute, part.name)} label="Say the time" style="concept" />
      </div>
      <div className="fm-clock-parts">
        {DAY_PARTS.map((p) => (
          <div key={p.key} className={`fm-clock-part ${p.night ? "night" : ""} ${p.key === part.key ? "on" : ""}`}>
            <span className="fm-clock-part-emoji">{p.emoji}</span>
            <b>{p.name}</b>
            <span className="fm-clock-part-when">{p.when}</span>
          </div>
        ))}
      </div>
      <p className="fm-tool-hint">AM = morning to noon. PM = noon to midnight. The Sun is up in the day; the Moon at night 🌙.</p>
    </div>
  );
}

/* ---------------- Calendar — days, weeks, months, year ---------------- */
const CAL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CAL_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** ISO-8601 week number (weeks start Monday; week 1 holds the first Thursday). */
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  return 1 + Math.round((date.getTime() - firstThu.getTime()) / (7 * 24 * 3600 * 1000));
}

function CalendarTool() {
  const today = new Date();
  const YEAR = today.getFullYear();
  const [sub, setSub] = useState<"months" | "leap" | "era">("months");
  const [m, setM] = useState(today.getMonth());
  const [weeks, setWeeks] = useState(3);
  const [checkYear, setCheckYear] = useState(2024);
  const daysIn = new Date(YEAR, m + 1, 0).getDate();
  const first = new Date(YEAR, m, 1).getDay();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const isThisMonth = m === today.getMonth();
  const todayStr = `${CAL_DOW[today.getDay()]} ${today.getDate()} ${CAL_MONTHS[today.getMonth()].slice(0, 3)} ${YEAR}`;
  const weekNo = isoWeek(today);
  const monthDays = [31, isLeap(YEAR) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const facts: [string, string][] = [["7 days", "= 1 week"], ["12 months", "= 1 year"], ["52 weeks", "≈ 1 year"], ["365 days", "= 1 year"]];
  const ly = isLeap(checkYear);

  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        <button className={`fm-chip ${sub === "months" ? "on" : ""}`} onClick={() => setSub("months")}>📆 Months</button>
        <button className={`fm-chip ${sub === "leap" ? "on" : ""}`} onClick={() => setSub("leap")}>🐸 Leap Year</button>
        <button className={`fm-chip ${sub === "era" ? "on" : ""}`} onClick={() => setSub("era")}>🏛️ BC & AD</button>
      </div>

      {sub === "months" && (
        <>
          <div className="fm-cal-today">📌 Today: <b>{todayStr}</b> · Week <b>{weekNo}</b> of {YEAR}</div>
          <div className="fm-cal-facts">
            {facts.map(([a, b]) => <div className="fm-cal-fact" key={a}><b>{a}</b>{b}</div>)}
          </div>
          <div className="fm-cal-weekstrip">
            {CAL_DOW.map((d, i) => <span key={d}>{i + 1}<b>{d}</b></span>)}
          </div>
          {/* How many days in each month */}
          <div className="fm-cal-monthdays">
            {CAL_MONTHS.map((name, i) => (
              <button key={name} className={`fm-cal-md ${m === i ? "on" : ""} ${monthDays[i] === 31 ? "d31" : monthDays[i] === 30 ? "d30" : "d28"}`} onClick={() => setM(i)}>
                <b>{name.slice(0, 3)}</b><span>{monthDays[i]}</span>
              </button>
            ))}
          </div>
          <p className="fm-tool-hint">Knuckle trick: knuckles = 31 days, dips between = 30. February is the odd one (28, or 29 in a leap year).</p>
          <div className="fm-cal-title">{CAL_MONTHS[m]} {YEAR} — <b>{daysIn} days</b></div>
          <div className="fm-cal-grid">
            {CAL_DOW.map((d) => <span className="fm-cal-hd" key={d}>{d}</span>)}
            {cells.map((c, idx) => (
              <span key={idx} className={`fm-cal-day ${c ? "" : "blank"} ${c && isThisMonth && c === today.getDate() ? "today" : ""}`}>{c || ""}</span>
            ))}
          </div>
          <div className="fm-tool-row">
            <span>Count weeks:</span>
            <input type="range" min={1} max={12} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} style={{ flex: 1, maxWidth: 280 }} />
            <b className="fm-big">{weeks}</b>
            <span>= <b style={{ color: "#b4620a" }}>{weeks * 7} days</b></span>
          </div>
          <div className="fm-cal-track">{Array.from({ length: weeks }, (_, i) => <span key={i}>{(i + 1) * 7}</span>)}</div>
        </>
      )}

      {sub === "leap" && (
        <div className="fm-tool-col">
          <p className="fm-help-what" style={{ textAlign: "center" }}>Earth takes about <b>365¼ days</b> to circle the Sun. Those extra quarters add up, so every 4 years we add <b>one extra day</b> — 29 February. That year is a <b>leap year</b> (366 days).</p>
          <div className="fm-tool-row">
            <span>Check a year:</span>
            <input className="fm-input" type="number" value={checkYear} onChange={(e) => setCheckYear(Math.max(1, Math.floor(Number(e.target.value) || 1)))} style={{ maxWidth: 130 }} />
          </div>
          <div className={`fm-leap-out ${ly ? "yes" : "no"}`}>
            {checkYear} is {ly ? "a LEAP year 🐸 — February has 29 days" : "NOT a leap year — February has 28 days"}
          </div>
          <div className="fm-tool-row">
            {[2024, 2026, 2000, 1900, 2100].map((y) => <button key={y} className="fm-chip" onClick={() => setCheckYear(y)}>{y}</button>)}
          </div>
          <div className="fm-leap-rule">
            <p><b>The rule</b> (check in order):</p>
            <ol>
              <li>Divisible by <b>4</b>? → leap year…</li>
              <li>…but divisible by <b>100</b>? → NOT a leap year…</li>
              <li>…unless divisible by <b>400</b>? → leap year after all.</li>
            </ol>
            <p className="fm-tool-hint">So 2000 was a leap year, but 1900 and 2100 are not.</p>
          </div>
        </div>
      )}

      {sub === "era" && (
        <div className="fm-tool-col">
          <p className="fm-help-what" style={{ textAlign: "center" }}>To count years, people needed a <b>“year 1”</b> to start from. About 1500 years ago a monk, <b>Dionysius</b>, chose the year he worked out as the birth of Jesus.</p>
          <div className="fm-era-line">
            {["3 BC", "2 BC", "1 BC"].map((y) => <span key={y} className="fm-era-cell bc">{y}</span>)}
            <span className="fm-era-split">no year 0</span>
            {["AD 1", "AD 2", "AD 3"].map((y) => <span key={y} className="fm-era-cell ad">{y}</span>)}
          </div>
          <div className="fm-era-notes">
            <p><b>AD</b> = <i>Anno Domini</i>, Latin for “in the year of the Lord” — years <b>after</b> the start, counting up (AD 1, AD 2 … today is AD 2026).</p>
            <p><b>BC</b> = “Before Christ” — years <b>before</b> the start, counting <b>backwards</b> (…3 BC, 2 BC, 1 BC).</p>
            <p>There is <b>no year 0</b>: 1 BC is followed straight by AD 1.</p>
            <p>Many people now say <b>BCE</b> (Before Common Era) and <b>CE</b> (Common Era) — the same years: <b>2026 CE = AD 2026</b>.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Shapes ---------------- */
const SHAPES: { kind: string; label: string }[] = [
  { kind: "triangle", label: "Triangle (3)" },
  { kind: "square", label: "Square (4)" },
  { kind: "rect", label: "Rectangle" },
  { kind: "pentagon", label: "Pentagon (5)" },
  { kind: "hexagon", label: "Hexagon (6)" },
  { kind: "circle", label: "Circle" },
];
function ShapesTool() {
  const [kind, setKind] = useState("triangle");
  const cur = SHAPES.find((s) => s.kind === kind)!;
  const spec: VisualSpec = { component: "GeometryCanvas", props: { shapes: [{ kind, w: 5, h: 3, label: cur.label }] }, caption: cur.label };
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        {SHAPES.map((s) => (
          <button key={s.kind} className={`fm-chip ${kind === s.kind ? "on" : ""}`} onClick={() => setKind(s.kind)}>{s.label}</button>
        ))}
      </div>
      <div className="fm-tool-visual"><VisualRenderer visual={spec} /></div>
    </div>
  );
}

/* ---------------- Scratchpad ---------------- */
let scratchSaved: string | null = null; // persists the drawing across tool switches

function Scratchpad() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState("#2f2a26");
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, c.width, c.height);
    if (scratchSaved) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = scratchSaved; }
  }, []);
  const save = () => { try { scratchSaved = ref.current!.toDataURL(); } catch { /* ignore */ } };
  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ref.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true; const ctx = ref.current!.getContext("2d")!; const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineWidth = color === "#fffdf8" ? 22 : 4; ctx.lineCap = "round"; ctx.strokeStyle = color;
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const ctx = ref.current!.getContext("2d")!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  function up() { if (drawing.current) { drawing.current = false; save(); } }
  function clearPad() { const c = ref.current!; const ctx = c.getContext("2d")!; ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, c.width, c.height); scratchSaved = null; }
  const colors = ["#2f2a26", "#e2352f", "#2f7bd6", "#3fae4a", "#f0a132"];
  return (
    <div className="fm-tool-col">
      <div className="fm-tool-row">
        {colors.map((c) => (
          <button key={c} aria-label={`pen ${c}`} className={`fm-pen ${color === c ? "on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />
        ))}
        <button className={`fm-chip ${color === "#fffdf8" ? "on" : ""}`} onClick={() => setColor("#fffdf8")}>🧽 Rub</button>
        <button className="fm-chip" onClick={clearPad}>Clear all</button>
      </div>
      <canvas ref={ref} width={720} height={340} className="fm-scratch"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
    </div>
  );
}
