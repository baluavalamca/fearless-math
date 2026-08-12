/**
 * Homework Helper aids — two small, offline, deterministic heuristics that run
 * on the AI-transcribed problem text (no extra AI call, no schema change):
 *
 *  - buildHomeworkVisual(): spots a recognisable pattern in a problem — basic
 *    +, −, ×, ÷, "n/d of X", rectangle/square/triangle/circle area & perimeter,
 *    place value, clock/time arithmetic, 3D solids, dice/probability, or a
 *    y = mx + c line to graph — and turns it into the SAME picture vocabulary
 *    (ArrayGrid/BarModel/AreaModel/PizzaSlices/FractionStrip/GeometryCanvas/
 *    PlaceValueBlocks/ClockFace/Solid3D/DiceViews/FunctionPlot) that worked
 *    examples already use elsewhere in the app (see src/exampleFactory.ts and
 *    src/components/VisualRenderer.tsx), so a child sees the problem, not just
 *    reads it. Anything it can't confidently picture is left alone — no
 *    visual, never a wrong/misleading one (fail-soft, matches VisualRenderer's
 *    own safety boundary).
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

/** "value of the digit 7 in 3,782" / "in 3,782, what is the value of the
 *  digit 7" — both phrasing orders, since AI-transcribed homework text can
 *  put the number before or after the question about it. */
function matchPlaceValue(t: string): { digit: string; nStr: string } | null {
  let m = t.match(/(?:place\s*value|value)\s+of\s+(?:the\s+)?(?:digit\s+)?(\d)\s+in\s+(\d[\d,]*)/i);
  if (m) return { digit: m[1], nStr: m[2].replace(/,/g, "") };
  m = t.match(/in\s+(?:the\s+number\s+)?(\d[\d,]*)[^.?]{0,40}?(?:value|place\s*value)\s+of\s+(?:the\s+)?(?:digit\s+)?(\d)\b/i);
  if (m) return { nStr: m[1].replace(/,/g, ""), digit: m[2] };
  return null;
}

/** Turn a homework problem's arithmetic (or geometry / place value / time /
 *  solids / dice / line-graphing) into the same picture vocabulary the rest
 *  of the app uses for worked examples. Returns null when the problem doesn't
 *  cleanly match one recognised pattern — better no visual than a confusing
 *  or wrong one. */
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

  // "area of a rectangle 8 cm by 5 cm" / "perimeter of a rectangle 8cm x 5cm"
  // — draws the actual rectangle (with a unit grid when small enough) instead
  // of leaving a geometry problem with no picture, which used to be the most
  // common "why is there no visual?" gap.
  const rectAP = t.match(/(area|perimeter)\s+of\s+(?:a|the)\s+rectangle\D*?(\d+(?:\.\d+)?)\s*(cm|m|mm|km|in|ft|inches|feet)?\s*(?:by|x|×|\*)\s*(\d+(?:\.\d+)?)\s*(cm|m|mm|km|in|ft|inches|feet)?/i);
  if (rectAP) {
    const op = rectAP[1].toLowerCase();
    const w = numF(rectAP[2]), h = numF(rectAP[4]);
    const unit = rectAP[3] || rectAP[5] || "";
    if (Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= 20 && h <= 20) {
      const grid = w <= 10 && h <= 10;
      const caption = op === "area"
        ? `${w} × ${h} = ${w * h}${unit ? " " + unit + "²" : ""}`
        : `2 × (${w} + ${h}) = ${2 * (w + h)}${unit ? " " + unit : ""}`;
      return {
        component: "GeometryCanvas",
        props: { shapes: [{ kind: "rect", w, h, sideLabels: true, unitGrid: grid, label: `${w}${unit ? " " + unit : ""} × ${h}${unit ? " " + unit : ""}` }] },
        caption,
      };
    }
    return null;
  }

  // "area of a square 6 cm" / "perimeter of a square with side 6 cm".
  const sq = t.match(/(area|perimeter)\s+of\s+(?:a|the)\s+square\D*?(?:side\s*(?:of\s*)?)?(\d+(?:\.\d+)?)\s*(cm|m|mm|km|in|ft|inches|feet)?/i);
  if (sq) {
    const op = sq[1].toLowerCase();
    const s = numF(sq[2]);
    const unit = sq[3] || "";
    if (Number.isInteger(s) && s > 0 && s <= 20) {
      const caption = op === "area"
        ? `${s} × ${s} = ${s * s}${unit ? " " + unit + "²" : ""}`
        : `4 × ${s} = ${4 * s}${unit ? " " + unit : ""}`;
      return {
        component: "GeometryCanvas",
        props: { shapes: [{ kind: "square", w: s, sideLabels: true, unitGrid: s <= 10, label: `${s}${unit ? " " + unit : ""} side` }] },
        caption,
      };
    }
    return null;
  }

  // "area of a triangle with base 6 cm and height 4 cm".
  const tri = t.match(/area\s+of\s+(?:a|the)\s+triangle\D*?base\D*?(\d+(?:\.\d+)?)\D*?height\D*?(\d+(?:\.\d+)?)/i);
  if (tri) {
    const b = numF(tri[1]), h = numF(tri[2]);
    if (b > 0 && h > 0 && b <= 50 && h <= 50) {
      return {
        component: "GeometryCanvas",
        props: { shapes: [{ kind: "triangle", label: `base ${b}, height ${h}` }] },
        caption: `½ × ${b} × ${h} = ${(b * h) / 2}`,
      };
    }
    return null;
  }

  // "area/circumference of a circle with radius 7 cm" — shape only, no
  // computed answer (π-rounding conventions vary, so we don't risk
  // contradicting the AI's own stated answer).
  const circ = t.match(/circle\D*?radius\D*?(\d+(?:\.\d+)?)/i);
  if (circ) {
    const r = numF(circ[1]);
    if (r > 0 && r <= 100000) {
      return { component: "GeometryCanvas", props: { shapes: [{ kind: "circle", label: `radius ${r}` }] }, caption: `radius = ${r}` };
    }
    return null;
  }

  // "what is the value of the digit 7 in 3,782?" — place-value blocks for the
  // number, capped at 4 digits (thousands/hundreds/tens/ones is all
  // PlaceValueBlocks can represent — a 5+ digit number would have to silently
  // drop its leading digits, so we skip rather than mislead).
  const pv = matchPlaceValue(t);
  if (pv) {
    const { digit, nStr } = pv;
    if (nStr.length <= 4 && nStr.includes(digit)) {
      const s = nStr.padStart(4, "0");
      const idx = nStr.indexOf(digit);
      const power = nStr.length - 1 - idx;
      const value = Number(digit) * Math.pow(10, power);
      return {
        component: "PlaceValueBlocks",
        props: { sets: [{ thousands: +s[0] || undefined, hundreds: +s[1] || undefined, tens: +s[2] || undefined, ones: +s[3] || undefined, label: nStr }] },
        caption: `The digit ${digit} in ${nStr} is worth ${value}.`,
      };
    }
    return null;
  }

  // "write 3,782 in expanded form" / "expand 3782".
  const expMatch = t.match(/(?:expanded form of|expand)\s+(\d[\d,]*)/i) || t.match(/(\d[\d,]*)\s+in\s+expanded\s+form/i);
  if (expMatch) {
    const nStr = expMatch[1].replace(/,/g, "");
    if (nStr.length >= 2 && nStr.length <= 4) {
      const s = nStr.padStart(4, "0");
      const parts = [1000, 100, 10, 1].map((mult, i) => +s[i] * mult).filter((v) => v > 0);
      return {
        component: "PlaceValueBlocks",
        props: { sets: [{ thousands: +s[0] || undefined, hundreds: +s[1] || undefined, tens: +s[2] || undefined, ones: +s[3] || undefined, label: nStr }] },
        caption: `${nStr} = ${parts.join(" + ")}`,
      };
    }
    return null;
  }

  // "a movie starts at 4:15 pm and runs for 2 hours — what time does it end?"
  // — shows a start clock and an end clock rather than leaving a time-
  // arithmetic word problem with no picture. Without an am/pm token the face
  // still renders, just without the am/pm flip in the label.
  const timeAdd = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?[^.?]{0,40}?(?:for|runs?|lasts?)\s*(\d+)\s*hours?/i);
  if (timeAdd) {
    const h = parseInt(timeAdd[1], 10), m = parseInt(timeAdd[2], 10);
    const ampm = (timeAdd[3] || "").toLowerCase();
    const addH = parseInt(timeAdd[4], 10);
    if (h >= 1 && h <= 12 && m >= 0 && m < 60 && addH > 0 && addH <= 23) {
      const fmt = (h24: number) => {
        const suffix = h24 >= 12 ? "pm" : "am";
        let h12 = h24 % 12; if (h12 === 0) h12 = 12;
        return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
      };
      const startH24 = ampm === "pm" ? (h % 12) + 12 : h % 12;
      const endH24 = (startH24 + addH) % 24;
      const startLabel = ampm ? fmt(startH24) : `${h}:${String(m).padStart(2, "0")}`;
      const endLabel = ampm ? fmt(endH24) : `${(endH24 % 12) || 12}:${String(m).padStart(2, "0")}`;
      return {
        component: "ClockFace",
        props: { clocks: [{ hour: startH24, minute: m, label: `Start: ${startLabel}` }, { hour: endH24, minute: m, label: `End: ${endLabel}` }] },
        caption: `${startLabel} + ${addH}h = ${endLabel}`,
      };
    }
    return null;
  }

  // "how many faces does a cube have?" — shows the actual 3D solid; the
  // face/edge/vertex count itself stays the AI's job in the worked steps.
  const solidMatch = t.match(/\b(cube|cuboid|rectangular prism|cylinder|cone|sphere|pyramid|prism)\b/i);
  if (solidMatch && /\b(faces?|edges?|vertices|vertex|corners?)\b/i.test(t)) {
    const key = solidMatch[1].toLowerCase();
    const kind = key === "rectangular prism" ? "cuboid" : key;
    return { component: "Solid3D", props: { solids: [{ kind, label: solidMatch[1] }] }, caption: solidMatch[1][0].toUpperCase() + solidMatch[1].slice(1) };
  }

  // "probability of rolling a 3 on a die" — a schematic die face; opposite-
  // face accuracy doesn't matter for this quick visual aid.
  if (/\b(die|dice)\b/i.test(t)) {
    const specific = t.match(/rolling\s+an?\s*(\d)/i) || t.match(/rolls?\s+a\s*(\d)/i);
    const top = specific ? parseInt(specific[1], 10) : 1;
    if (top >= 1 && top <= 6) {
      const others = [1, 2, 3, 4, 5, 6].filter((n) => n !== top);
      return {
        component: "DiceViews",
        props: { dice: [{ top, left: others[0], right: others[1], label: "a standard die" }] },
        caption: "A six-sided die has faces numbered 1–6.",
      };
    }
  }

  // "graph the line y = 2x + 3" — only triggers with an explicit graph/plot
  // instruction, so an incidental "y = ..." in a different kind of problem
  // never gets misread as a graphing request.
  if (/\b(graph|plot|draw the line)\b/i.test(t)) {
    const lineEq = t.match(/y\s*=\s*(-?\d*)\s*x\s*([+-]\s*\d+)?/i);
    if (lineEq) {
      const mStr = lineEq[1];
      const m = mStr === "" ? 1 : mStr === "-" ? -1 : parseInt(mStr, 10);
      const c = lineEq[2] ? parseInt(lineEq[2].replace(/\s+/g, ""), 10) : 0;
      if (Number.isFinite(m) && Number.isFinite(c) && Math.abs(m) <= 20 && Math.abs(c) <= 50) {
        const eqLabel = `y = ${m === 1 ? "" : m === -1 ? "-" : m}x${c > 0 ? ` + ${c}` : c < 0 ? ` - ${Math.abs(c)}` : ""}`;
        return {
          component: "FunctionPlot",
          props: { plots: [{ poly: [c, m], domain: [-10, 10], label: eqLabel }] },
          caption: eqLabel,
        };
      }
    }
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
    // Bigger multiplication (e.g. "23 × 14") doesn't fit a 12×12 array grid —
    // show the partial-products area model instead of leaving no picture.
    if (a > 0 && b > 0 && a <= 99 && b <= 99) {
      const decompose = (n: number): number[] => {
        if (n < 10) return [n];
        const tens = Math.floor(n / 10) * 10, ones = n % 10;
        return ones === 0 ? [tens] : [tens, ones];
      };
      return {
        component: "AreaModel",
        props: { models: [{ rowParts: decompose(a), colParts: decompose(b) }] },
        caption: `${a} × ${b} = ${a * b}`,
      };
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
  // signal once a concrete shape name is present. Also covers 3D solids (cube,
  // cuboid, cylinder, cone, sphere, pyramid, prism) so "how many faces does a
  // cube have" gets the same Shapes tool suggestion as 2D shape problems.
  { id: "shapes", icon: "🔺", label: "Shapes", test: (t) => /triangle|square|rectangle|circle|polygon|cube|cuboid|cylinder|cone|sphere|pyramid|prism|\bangle|\bside/i.test(t) },
  { id: "clock", icon: "🕐", label: "Clock", test: (t) => /o'clock|\ba\.?m\.?\b|\bp\.?m\.?\b|\bhour|\bminute|\btime\b/i.test(t) },
  { id: "calendar", icon: "📅", label: "Calendar", test: (t) => /calendar|\bdate\b|\bmonth|\bweek\b|\bdays?\b/i.test(t) },
  { id: "converter", icon: "📐", label: "Converter", test: (t) => /\b(cm|km|kg|gram|litre|liter|\bml\b|metre|meter|mm)\b|convert/i.test(t) },
  { id: "times", icon: "✖️", label: "Times Tables", test: (t) => /[×x*]|times table|multiply|multiplication/i.test(t) },
  // Also matches "value of the digit 7 in 3,782" / "3,782 in expanded form" —
  // the same phrasing buildHomeworkVisual() recognises for PlaceValueBlocks —
  // so the tool suggestion and the visual always agree on the topic.
  { id: "placevalue", icon: "🧱", label: "Place Value", test: (t) => /place\s*value|expanded\s*form|value\s+of\s+(?:the\s+)?(?:digit\s+)?\d+\s+in\s+\d|\b\d{4,}\b/i.test(t) },
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

/** Shape-kind → plain-English word, used to sharpen the lesson-match hint for
 *  GeometryCanvas visuals (e.g. "rectangle" scores higher against a concept
 *  named "Rectangles" than the generic "shapes" hint alone would). */
const SHAPE_WORD: Record<string, string> = { rect: "rectangle", square: "square", triangle: "triangle", circle: "circle" };

/** Lightweight topic keywords for the visual/tool this problem already
 *  matched, fed into matchLesson() as a nudge — not the whole match. Short,
 *  number-heavy problems like "What is 3/4 of 20?" have almost no ordinary
 *  words for the word-overlap matcher to work with (every token is a
 *  stopword or a bare digit), so without a hint Robo can never suggest a
 *  concept for them even though we've already confidently identified the
 *  topic via the visual/tool detectors above. Never changes the visual or
 *  the answer — purely improves which lesson gets suggested.
 *
 *  The new visual categories (geometry, place value, clock, solids, dice,
 *  graphing) are checked by component type FIRST, before the older
 *  caption-symbol checks — a geometry caption like "8 × 5 = 40" would
 *  otherwise wrongly read as a generic "multiplication" hint instead of the
 *  much more useful "area"/"shapes" one.
 *
 *  `problem` is the raw transcribed text: buildHomeworkVisual() deliberately
 *  returns no visual for decimal arithmetic (no whole-number picture to draw
 *  — see there), which would otherwise leave a problem like "12.5 + 3.75"
 *  with zero hints. When that happens we fall back to reading the operator
 *  straight off the problem text and add a "decimal" hint, so Robo can still
 *  point at a Decimals lesson instead of suggesting nothing. */
export function homeworkLessonHints(visual: VisualSpec | null, tool: HomeworkTool | null, problem = ""): string[] {
  const hints: string[] = [];
  const comp = visual?.component;
  const c = visual?.caption || "";

  if (comp === "GeometryCanvas") {
    hints.push("shapes", "geometry", "area", "perimeter");
    const kind = (visual?.props?.shapes as Array<{ kind?: string }> | undefined)?.[0]?.kind;
    if (kind && SHAPE_WORD[kind]) hints.push(SHAPE_WORD[kind]);
  } else if (comp === "PlaceValueBlocks") {
    hints.push("place", "value", "digit");
  } else if (comp === "ClockFace") {
    hints.push("time", "clock");
  } else if (comp === "Solid3D") {
    hints.push("solid", "shapes", "3d", "faces", "edges", "vertices");
  } else if (comp === "DiceViews") {
    hints.push("probability", "chance", "dice");
  } else if (comp === "FunctionPlot") {
    hints.push("graph", "line", "equation", "function");
  } else if (/%/.test(c)) hints.push("percent", "percentage");
  else if (/\bof\b/.test(c)) hints.push("fraction", "quantity");
  else if (comp === "PizzaSlices" || comp === "FractionStrip") hints.push("fraction");
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
