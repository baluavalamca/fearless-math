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

/** Turn a homework problem's arithmetic into the same picture vocabulary the
 *  rest of the app uses for worked examples. Returns null when the problem
 *  doesn't cleanly match one recognised pattern — better no visual than a
 *  confusing or wrong one. */
export function buildHomeworkVisual(problem: string): VisualSpec | null {
  const t = problem || "";

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
  // check below since ÷ and a bare "/" both mean division here).
  const div = t.match(/(\d[\d,]*)\s*(?:÷|\/)\s*(\d[\d,]*)/);
  if (div) {
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
  const mul = t.match(/(\d[\d,]*)\s*[×xX*]\s*(\d[\d,]*)/);
  if (mul) {
    const a = num(mul[1]), b = num(mul[2]);
    if (a > 0 && a <= 12 && b > 0 && b <= 12) {
      return { component: "ArrayGrid", props: { grids: [{ rows: a, cols: b, asGroups: true }] }, caption: `${a} × ${b} = ${a * b}` };
    }
    return null;
  }

  // "35 - 12" — subtraction (needs whitespace around "-" so "3-digit" etc. never match).
  const sub = t.match(/(\d[\d,]*)\s+[-−]\s+(\d[\d,]*)/);
  if (sub) {
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
  const add = t.match(/(\d[\d,]*)\s*\+\s*(\d[\d,]*)/);
  if (add) {
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
  { id: "fractions", icon: "🍕", label: "Fraction Wall", test: (t) => /fraction|numerator|denominator|\d\s*\/\s*\d/i.test(t) },
  { id: "clock", icon: "🕐", label: "Clock", test: (t) => /o'clock|\ba\.?m\.?\b|\bp\.?m\.?\b|\bhour|\bminute|\btime\b/i.test(t) },
  { id: "calendar", icon: "📅", label: "Calendar", test: (t) => /calendar|\bdate\b|\bmonth|\bweek\b|\bdays?\b/i.test(t) },
  { id: "converter", icon: "📐", label: "Converter", test: (t) => /\b(cm|km|kg|gram|litre|liter|\bml\b|metre|meter|mm)\b|convert/i.test(t) },
  { id: "shapes", icon: "🔺", label: "Shapes", test: (t) => /triangle|square|rectangle|circle|polygon|\bangle|\bside/i.test(t) },
  { id: "roman", icon: "🏛️", label: "Roman Numbers", test: (t) => /roman numeral/i.test(t) },
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
