/**
 * Homework Helper aids — two small, offline, deterministic heuristics that run
 * on the AI-transcribed problem text (no extra AI call, no schema change):
 *
 *  - buildHomeworkVisual(): spots a simple +, −, ×, ÷ or "n/d of X" pattern in a
 *    problem and turns it into the SAME kind of picture (ObjectRow/ArrayGrid/
 *    BarModel/PizzaSlices/FractionStrip) that worked examples already use
 *    elsewhere in the app (see src/exampleFactory.ts), so a child sees the
 *    problem, not just reads it. Anything it can't confidently picture is left
 *    alone — no visual, never a wrong/misleading one (fail-soft, matches
 *    VisualRenderer's own safety boundary).
 *
 *  - pickHomeworkTool(): keyword-matches the problem to one relevant tool in
 *    the kid-facing Math Tools dock, so "give me a tool to solve it" is a
 *    single tap instead of hunting through 16 tools.
 */
import type { VisualSpec } from "./components/visualTypes";

function num(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Parses a captured number token as a float (unlike num(), which truncates
 *  via parseInt) so callers can detect "this operand had a decimal point"
 *  before doing integer-only visual math. */
function numF(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

/** Turn a homework problem's arithmetic into the same picture vocabulary the
 *  rest of the app uses for worked examples. Returns null when the problem
 *  doesn't cleanly match one recognised pattern — better no visual than a
 *  confusing or wrong one. */
export function buildHomeworkVisual(problem: string): VisualSpec | null {
  const t = problem || "";

  // "20% of 150" — percentage of a quantity. Reduced to the same fraction
  // picture as "n/d of q" below, since a percent IS that fraction (checked
  // first so the "%" never falls through to a symbolic-operator check).
  const pct = t.match(/(\d+)\s*%\s+of\s+(\d[\d,]*)/i);
  if (pct) {
    const p = num(pct[1]), q = num(pct[2]);
    if (p > 0 && p < 100 && q > 0) {
      const g = gcd(p, 100);
      const n = p / g, d = 100 / g;
      if (d <= 12) {
        const whole = (n * q) % d === 0 ? ` = ${(n * q) / d}` : "";
        const caption = `${p}% of ${q}${whole}`;
        return d <= 8
          ? { component: "PizzaSlices", props: { pies: [{ parts: d, shaded: n, label: `${p}%` }] }, caption }
          : { component: "FractionStrip", props: { strips: [{ parts: d, shaded: n, label: `${p}%` }] }, caption };
      }
    }
    return null;
  }

  // "3/4 of 20" — fraction of a quantity.
  const frac = t.match(/(\d+)\s*\/\s*(\d+)\s+of\s+(\d+)/i);
  if (frac) {
    const n = num(frac[1]), d = num(frac[2]), q = num(frac[3]);
    if (d > 0 && d <= 12) {
      const whole = (n * q) % d === 0 ? ` = ${(n * q) / d}` : "";
      const caption = `${n}/${d} of ${q}${whole}`;
      return d <= 8
        ? { component: "PizzaSlices", props: { pies: [{ parts: d, shaded: n, label: `${n}/${d}` }] }, caption }
        : { component: "FractionStrip", props: { strips: [{ parts: d, shaded: n, label: `${n}/${d}` }] }, caption };
    }
    return null;
  }

  // "20 ÷ 4" / "20/4" as division (checked before the general "/" multiply/×
  // check below since ÷ and a bare "/" both mean division here). The number
  // tokens capture an optional decimal part (even though this visual only
  // handles whole numbers) so a problem like "12.5 ÷ 2.5" can't have its "."
  // silently dropped and get mis-read as the unrelated whole numbers "5 ÷ 2".
  const div = t.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:÷|\/)\s*(\d[\d,]*(?:\.\d+)?)/);
  if (div) {
    if (!Number.isInteger(numF(div[1])) || !Number.isInteger(numF(div[2])))
      return null; // decimal operands — no whole-number picture to draw
    const a = num(div[1]), b = num(div[2]);
    if (b > 0 && a % b === 0) {
      const q = a / b;
      if (b <= 12 && q <= 12) {
        return { component: "ArrayGrid", props: { grids: [{ rows: b, cols: q, asGroups: true }] }, caption: `${a} ÷ ${b} = ${q}` };
      }
    }
    return null;
  }

  // "12 x 6" / "12 × 6" / "12 * 6" — multiplication.
  const mul = t.match(/(\d[\d,]*(?:\.\d+)?)\s*[×xX*]\s*(\d[\d,]*(?:\.\d+)?)/);
  if (mul) {
    if (!Number.isInteger(numF(mul[1])) || !Number.isInteger(numF(mul[2])))
      return null; // e.g. "2.5 x 4" — don't truncate to a wrong "5 x 4" picture
    const a = num(mul[1]), b = num(mul[2]);
    if (a > 0 && a <= 12 && b > 0 && b <= 12) {
      return { component: "ArrayGrid", props: { grids: [{ rows: a, cols: b, asGroups: true }] }, caption: `${a} × ${b} = ${a * b}` };
    }
    return null;
  }

  // "35 - 12" — subtraction (needs whitespace around "-" so "3-digit" etc. never match).
  const sub = t.match(/(\d[\d,]*(?:\.\d+)?)\s+[-−]\s+(\d[\d,]*(?:\.\d+)?)/);
  if (sub) {
    if (!Number.isInteger(numF(sub[1])) || !Number.isInteger(numF(sub[2])))
      return null; // e.g. "12.5 - 3.75" — no whole-number bar to draw
    const a = num(sub[1]), b = num(sub[2]);
    if (a >= b && b >= 0) {
      return {
        component: "BarModel",
        props: { bars: [{ parts: [{ value: a - b, label: String(a - b) }, { value: b, label: `− ${b}`, shaded: false }] }] },
        caption: `${a} − ${b} = ${a - b}`,
      };
    }
    return null;
  }

  // "3457 + 2896" — addition.
  const add = t.match(/(\d[\d,]*(?:\.\d+)?)\s*\+\s*(\d[\d,]*(?:\.\d+)?)/);
  if (add) {
    if (!Number.isInteger(numF(add[1])) || !Number.isInteger(numF(add[2])))
      return null; // e.g. "12.5 + 3.75" — no whole-number bar to draw
    const a = num(add[1]), b = num(add[2]);
    return {
      component: "BarModel",
      props: { bars: [{ parts: [{ value: a, label: String(a) }, { value: b, label: String(b) }] }] },
      caption: `${a} + ${b} = ${a + b}`,
    };
  }

  return null;
}

export interface HomeworkTool { id: string; label: string; icon: string }

const TOOL_RULES: (HomeworkTool & { test: (t: string) => boolean })[] = [
  { id: "hundred", icon: "💯", label: "100 Chart", test: (t) => /%|\bpercent(age)?\b/i.test(t) },
  { id: "fractions", icon: "🍕", label: "Fraction Wall", test: (t) => /fraction|numerator|denominator|\d\s*\/\s*\d/i.test(t) },
  { id: "roman", icon: "🏛️", label: "Roman Numbers", test: (t) => /roman numeral/i.test(t) },
  // Shapes is checked before the unit converter below: a problem like "area of a
  // rectangle 8 cm by 5 cm" contains both a shape word AND a unit, and the shape
  // is the more specific, more useful match — units alone are too generic a
  // signal once a concrete shape name is present.
  { id: "shapes", icon: "🔺", label: "Shapes", test: (t) => /triangle|square|rectangle|circle|polygon|\bangle|\bside/i.test(t) },
  { id: "clock", icon: "🕐", label: "Clock", test: (t) => /o'clock|\ba\.?m\.?\b|\bp\.?m\.?\b|\bhour|\bminute|\btime\b/i.test(t) },
  { id: "calendar", icon: "📅", label: "Calendar", test: (t) => /calendar|\bdate\b|\bmonth|\bweek\b|\bdays?\b/i.test(t) },
  { id: "converter", icon: "📐", label: "Converter", test: (t) => /\b(cm|km|kg|gram|litre|liter|\bml\b|metre|meter|mm)\b|convert/i.test(t) },
  { id: "times", icon: "✖️", label: "Times Tables", test: (t) => /[×x*]|times table|multiply|multiplication/i.test(t) },
  { id: "placevalue", icon: "🧱", label: "Place Value", test: (t) => /place value|\b\d{4,}\b/.test(t) },
];

/** Match a problem to one relevant Math Tools tool, so a child can tap
 *  straight into a calculator/manipulative instead of hunting for it. */
export function pickHomeworkTool(problem: string): HomeworkTool | null {
  const t = problem || "";
  for (const r of TOOL_RULES) if (r.test(t)) return { id: r.id, label: r.label, icon: r.icon };
  if (/[+\-×x*÷/=]/.test(t)) return { id: "calc", label: "Calculator", icon: "🔢" };
  return null;
}

const TOOL_TOPIC_HINTS: Record<string, string[]> = {
  hundred: ["percent", "percentage"],
  fractions: ["fraction"],
  clock: ["time"],
  calendar: ["calendar", "date"],
  converter: ["measurement", "unit"],
  shapes: ["shape", "geometry"],
  roman: ["roman", "numeral"],
  times: ["multiplication", "times"],
  placevalue: ["place", "value"],
};

/** Lightweight topic keywords for the visual/tool this problem already
 *  matched, fed into matchLesson() as a nudge — not the whole match. Short,
 *  number-heavy problems like "What is 3/4 of 20?" have almost no ordinary
 *  words for the word-overlap matcher to work with (every token is a
 *  stopword or a bare digit), so without a hint Robo can never suggest a
 *  concept for them even though we've already confidently identified the
 *  topic via the visual/tool detectors above. Never changes the visual or
 *  the answer — purely improves which lesson gets suggested.
 *
 *  `problem` is the raw transcribed text: buildHomeworkVisual() deliberately
 *  returns no visual for decimal arithmetic (no whole-number picture to draw
 *  — see there), which would otherwise leave a problem like "12.5 + 3.75"
 *  with zero hints. When that happens we fall back to reading the operator
 *  straight off the problem text and add a "decimal" hint, so Robo can still
 *  point at a Decimals lesson instead of suggesting nothing. */
export function homeworkLessonHints(visual: VisualSpec | null, tool: HomeworkTool | null, problem = ""): string[] {
  const hints: string[] = [];
  const c = visual?.caption || "";
  if (/%/.test(c)) hints.push("percent", "percentage");
  else if (/\bof\b/.test(c)) hints.push("fraction", "quantity");
  else if (visual?.component === "PizzaSlices" || visual?.component === "FractionStrip") hints.push("fraction");
  else if (/÷/.test(c)) hints.push("division", "divide");
  else if (/[×x]/i.test(c)) hints.push("multiplication", "multiply", "times");
  else if (/[−-]/.test(c)) hints.push("subtraction", "subtract");
  else if (/\+/.test(c)) hints.push("addition", "add");
  else if (/\d+\.\d+/.test(problem)) {
    hints.push("decimal", "decimals");
    if (/÷|\//.test(problem)) hints.push("division", "divide");
    else if (/[×x*]/i.test(problem)) hints.push("multiplication", "multiply");
    else if (/[−-]/.test(problem)) hints.push("subtraction", "subtract");
    else if (/\+/.test(problem)) hints.push("addition", "add");
  }
  if (tool) hints.push(...(TOOL_TOPIC_HINTS[tool.id] || []));
  return hints;
}
