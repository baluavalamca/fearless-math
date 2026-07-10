/**
 * Practice Factory — generates UNLIMITED graded practice questions per concept
 * and difficulty level. Every answer is computed by code (correct by
 * construction, fully offline). Mirrors exampleFactory, but returns gradable
 * Question objects (with 3-hint ladders) for the Practice flow.
 *
 * Answers are still judged server-side by logic.checkAnswer (the math-truth
 * layer) — see the practice:submit IPC, which accepts an inline question.
 */
import type { Question } from "./api";
import type { VisualSpec } from "./components/VisualRenderer";

export type Level = "easy" | "medium" | "challenge";
export type GenQuestion = Omit<Question, "id">;
type Gen = (level: Level) => GenQuestion;

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const NAMES = ["Anu", "Ravi", "Meena", "Kiran", "Sana", "Arjun"];
const ITEMS = ["marbles", "laddus", "stickers", "crayons", "mangoes", "shells"];

function num(q: string, answer: number | string, hints: string[], visual?: VisualSpec, explain?: string): GenQuestion {
  return { type: "number", q, answer: String(answer), hintLadder: hints, ...(visual ? { visual } : {}), ...(explain ? { explain } : {}) };
}
function frac(q: string, answer: string, hints: string[], visual?: VisualSpec): GenQuestion {
  return { type: "fraction", q, answer, hintLadder: hints, ...(visual ? { visual } : {}) };
}
function text(q: string, answer: string, hints: string[], visual?: VisualSpec): GenQuestion {
  return { type: "text", q, answer, hintLadder: hints, ...(visual ? { visual } : {}) };
}
function mcq(q: string, answer: string, options: { label: string; mistakeTag?: string }[], hints: string[], visual?: VisualSpec, explain?: string): GenQuestion {
  return { type: "mcq", q, answer, options, hintLadder: hints, ...(visual ? { visual } : {}), ...(explain ? { explain } : {}) };
}
const grid = (rows: number, cols: number) => ({ rows, cols, asGroups: true });
const OBJ_POOL = ["car", "apple", "truck", "duck", "star", "balloon", "banana", "bird", "elephant", "butterfly", "flower", "ball"];
const ORD_WORDS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
const distinct = (pool: string[], n: number) => { const a = pool.slice(); const out: string[] = []; for (let i = 0; i < n; i++) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); return out; };
const track = (terms: (number | string)[], jump?: number): VisualSpec => ({ component: "NumberTrack", props: { tracks: [{ terms, ...(jump != null ? { jump } : {}) }] } });
const objRow = (items: string[], markIndex: number, caption?: string): VisualSpec =>
  ({ component: "ObjectRow", props: { sequences: [{ items, markIndex }] }, ...(caption ? { caption } : {}) });
const arr = (grids: object[], caption?: string): VisualSpec => ({ component: "ArrayGrid", props: { grids }, ...(caption ? { caption } : {}) });
const part = (value: number, label: string, shaded = true) => (shaded ? { value, label } : { value, label, shaded: false });
const barModel = (parts: object[], caption?: string): VisualSpec => ({ component: "BarModel", props: { bars: [{ parts }] }, ...(caption ? { caption } : {}) });
const pvb = (sets: object[], caption?: string): VisualSpec => ({ component: "PlaceValueBlocks", props: { sets }, ...(caption ? { caption } : {}) });
const nline = (parts: number, mark: number, label?: string, caption?: string): VisualSpec =>
  ({ component: "NumberLine", props: { lines: [{ parts, mark, ...(label ? { label } : {}), showLabels: true }] }, ...(caption ? { caption } : {}) });

function toRoman(n: number): string {
  const m: [number, string][] = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let r = ""; for (const [v, s] of m) while (n >= v) { r += s; n -= v; } return r;
}

const GENERATORS: Record<string, Gen> = {
  // ---------------- PP1–2 numbers ----------------
  "pp1-01-count-to-10": (lvl) => {
    const n = lvl === "easy" ? ri(1, 5) : lvl === "medium" ? ri(4, 8) : ri(7, 10);
    const e = pick(OBJ_POOL);
    const phrase = pick([`How many ${e} do you see?`, `Count the ${e}. How many are there?`, `How many ${e} can you count?`, `Look and count the ${e}. How many?`]);
    return num(phrase, n,
      ["Touch each one and say a number.", "Count in order to the very last one.", "The LAST number you say is how many."],
      objRow(Array(n).fill(e), -1, "Touch each one and count: 1, 2, 3..."));
  },
  "pp1-02-more-fewer": (lvl) => {
    const hi = lvl === "easy" ? ri(3, 6) : lvl === "medium" ? ri(5, 9) : ri(6, 10);
    const lo = ri(1, hi - 1);
    const ask = pick(["more", "fewer"]);
    const answer = ask === "more" ? hi : lo;
    const other = ask === "more" ? lo : hi;
    return mcq(`Which group has ${ask.toUpperCase()}: a group of ${hi} or a group of ${lo}?`, String(answer),
      [{ label: String(answer) }, { label: String(other), mistakeTag: "more-fewer-swapped" }],
      ["Count both groups.", `${ask === "more" ? "More" : "Fewer"} means the ${ask === "more" ? "bigger" : "smaller"} number.`, `${answer} it is.`],
      { component: "ObjectRow", props: { sequences: [{ items: Array(hi).fill("apple") }, { items: Array(lo).fill("ball") }] }, caption: "Which row has more? Count each one." });
  },
  "pp1-03-add-within-10": (lvl) => {
    const cap = lvl === "easy" ? 5 : lvl === "medium" ? 8 : 10;
    const a = ri(1, cap - 1), b = ri(1, cap - a);
    const big = Math.max(a, b), small = Math.min(a, b);
    const hints = [`Hold the bigger number, ${big}, in your head.`, `Count on ${small} more.`, `${big} and ${small} more.`];
    const vis = barModel([part(big, String(big)), part(small, `and ${small}`)]);
    if (Math.random() < 0.6) {
      const nm = pick(NAMES), it = pick(ITEMS);
      return num(`${nm} has ${a} ${it} and gets ${b} more. How many ${it} altogether?`, a + b, hints, vis);
    }
    return num(`${a} + ${b} = ?`, a + b, hints, vis);
  },
  "pp1-04-subtract-within-10": (lvl) => {
    const cap = lvl === "easy" ? 5 : lvl === "medium" ? 8 : 10;
    const a = ri(2, cap), b = ri(1, a);
    const hints = [`Start at ${a}.`, `Count back ${b}.`, `Check: your answer + ${b} should make ${a}.`];
    const vis = barModel([part(a - b, `${a - b} left`), part(b, `take ${b}`, false)]);
    if (Math.random() < 0.6) {
      const nm = pick(NAMES), it = pick(ITEMS);
      return num(`${nm} had ${a} ${it} and gave away ${b}. How many ${it} are left?`, a - b, hints, vis);
    }
    return num(`${a} − ${b} = ?`, a - b, hints, vis);
  },

  // ---------------- Numbers (Class 3–5) ----------------
  "num-00-counting-to-100": (lvl) => {
    const cap = lvl === "easy" ? 30 : lvl === "medium" ? 70 : 100;
    const kind = pick(["after", "before", "tens"]);
    if (kind === "after") { const n = ri(1, cap - 1); return num(`What number comes right after ${n}?`, n + 1, ["'After' means one more.", `Count on from ${n}.`, `${n} and one more.`]); }
    if (kind === "before") { const n = ri(2, cap); return num(`What number comes right before ${n}?`, n - 1, ["'Before' means one less.", `Step back from ${n}.`, `${n} take away 1.`]); }
    const k = ri(1, Math.floor(cap / 10) - 3 < 1 ? 1 : Math.floor(cap / 10) - 3);
    const seq = [10 * k, 10 * (k + 1), 10 * (k + 2)];
    return num(`Skip-count by tens: ${seq.join(", ")}, __?`, 10 * (k + 3), ["Each jump adds one ten.", `${seq[2]} and ten more.`, "Keep the ones at zero."], nline(10, (k + 3) % 10 || 10, "jumps of ten"));
  },
  "num-01-place-value": (lvl) => {
    const digits = lvl === "easy" ? 2 : lvl === "medium" ? 3 : 4;
    const n = ri(Math.pow(10, digits - 1), Math.pow(10, digits) - 1);
    const s = String(n); const pos = ri(0, s.length - 1);
    const d = Number(s[pos]); const power = s.length - 1 - pos; const value = d * Math.pow(10, power);
    const placeName = ["ones", "tens", "hundreds", "thousands"][power];
    return num(`In the number ${n}, what is the PLACE VALUE of the digit ${d} (the ${placeName} place)?`, value,
      [`The digit ${d} sits in the ${placeName} place.`, `Place value = digit × its place (${d} × ${Math.pow(10, power)}).`, `So it is worth ${value}.`],
      pvb([{ tens: Math.floor((value % 100) / 10), ones: value % 10, label: String(value) }]));
  },
  "num-02-comparing": (lvl) => {
    const cap = lvl === "easy" ? 99 : lvl === "medium" ? 999 : 99999;
    let a = ri(10, cap), b = ri(10, cap); if (a === b) b = a + 1;
    return text(`Put the correct sign between ${a} and ${b}. Type > or <   (${a} __ ${b})`, a > b ? ">" : "<",
      ["Compare how many digits first, then left to right.", `Which is bigger, ${a} or ${b}?`, a > b ? "The first is bigger, so >." : "The first is smaller, so <."]);
  },
  "num-03-rounding": (lvl) => {
    if (lvl === "challenge") {
      const n = ri(120, 980); const rounded = Math.round(n / 100) * 100;
      return num(`Round ${n} to the nearest hundred.`, rounded, [`${n} is between ${Math.floor(n / 100) * 100} and ${Math.ceil(n / 100) * 100}.`, `Look at the TENS digit: ${Math.floor(n / 10) % 10}.`, `${Math.floor(n / 10) % 10 >= 5 ? "5 or more → round up." : "4 or less → round down."} → ${rounded}.`]);
    }
    const hi = lvl === "easy" ? 99 : 999; const n = ri(11, hi); const rounded = Math.round(n / 10) * 10;
    const ones = n % 10;
    return num(`Round ${n} to the nearest ten.`, rounded, [`${n} is between ${Math.floor(n / 10) * 10} and ${Math.ceil(n / 10) * 10}.`, `Look at the ONES digit: ${ones}.`, `${ones >= 5 ? "5 or more → round up." : "4 or less → round down."} → ${rounded}.`], nline(10, ones, String(n)));
  },
  "num-04-place-value-6digit": (lvl) => {
    const digits = lvl === "easy" ? 4 : lvl === "medium" ? 5 : 6;
    const n = ri(Math.pow(10, digits - 1), Math.pow(10, digits) - 1);
    const s = String(n); const pos = ri(0, s.length - 1);
    const d = Number(s[pos]); const power = s.length - 1 - pos; const value = d * Math.pow(10, power);
    const placeName = ["ones", "tens", "hundreds", "thousands", "ten thousands", "lakhs"][power];
    return num(`In ${n}, what is the place value of the digit ${d} (${placeName} place)?`, value,
      [`The digit ${d} is in the ${placeName} place.`, `Place value = ${d} × ${Math.pow(10, power)}.`, `= ${value}.`]);
  },
  "num-05-even-odd": (lvl) => {
    const cap = lvl === "easy" ? 40 : lvl === "medium" ? 99 : 999;
    const n = ri(1, cap);
    const vis = n <= 12 ? objRow(Array(n).fill("laddu"), -1, "Try to make pairs of two. Is one left over (odd) or none left (even)?") : undefined;
    return text(`Is ${n} even or odd? (type "even" or "odd")`, n % 2 === 0 ? "even" : "odd",
      ["Look at the ONES digit only.", "Ends in 0,2,4,6,8 → even. Ends in 1,3,5,7,9 → odd.", `${n} ends in ${n % 10}, so it is ${n % 2 === 0 ? "even" : "odd"}.`], vis);
  },
  "num-06-roman-numerals": (lvl) => {
    if (lvl === "challenge") { const n = ri(1, 39); return text(`Write ${n} in Roman numerals.`, toRoman(n), ["Build from big to small: X=10, V=5, I=1.", "Remember 4=IV and 9=IX (small before big subtracts).", `${n} = ${toRoman(n)}.`]); }
    const n = lvl === "easy" ? ri(1, 30) : ri(1, 39);
    return num(`Decode this Roman numeral: ${toRoman(n)} = ?`, n, ["Big→small means ADD; small before big means SUBTRACT.", "IV=4, IX=9, XL=40.", `${toRoman(n)} = ${n}.`]);
  },

  // ---------------- Operations ----------------
  "ops-07-addition-regrouping": (lvl) => {
    const rng: [number, number] = lvl === "easy" ? [10, 49] : lvl === "medium" ? [25, 199] : [125, 899];
    let a = ri(rng[0], rng[1]), b = ri(rng[0], rng[1]);
    if ((a % 10) + (b % 10) < 10) b += 10 - (b % 10) + ri(0, Math.min(9, (rng[1] - b) % 10 || 0)); // nudge toward a carry
    return num(`${a} + ${b} = ?`, a + b, ["Add the ONES first; regroup if they reach ten.", `Ones: ${a % 10} + ${b % 10}.`, "Then add the tens (and any carry)."],
      pvb([{ tens: Math.floor(a / 10) % 10, ones: a % 10, label: String(a) }, { tens: Math.floor(b / 10) % 10, ones: b % 10, label: `+ ${b}` }]));
  },
  "ops-08-subtraction-regrouping": (lvl) => {
    const rng: [number, number] = lvl === "easy" ? [11, 49] : lvl === "medium" ? [30, 199] : [130, 899];
    let a = ri(rng[0] + 10, rng[1]), b = ri(rng[0], a - 1);
    return num(`${a} − ${b} = ?`, a - b, ["Line up ones and tens.", "If the top ones are smaller, borrow one ten.", `Check by adding back: answer + ${b} = ${a}.`]);
  },
  "ops-09-multiplication-groups": (lvl) => {
    const [ha, hb]: [number, number] = lvl === "easy" ? [7, 7] : lvl === "medium" ? [9, 6] : [12, 9];
    const a = ri(2, ha), b = ri(2, hb);
    return num(`${a} × ${b} = ?`, a * b, [`${a} equal groups of ${b}.`, `Skip-count by ${b}: ${Array.from({ length: a }, (_, i) => b * (i + 1)).join(", ")}.`, `= ${a * b}.`],
      arr([grid(a, b)]));
  },
  "ops-10-tables-patterns": (lvl) => {
    const t = lvl === "easy" ? ri(2, 5) : lvl === "medium" ? ri(4, 9) : ri(6, 12);
    const k = ri(2, 8);
    return num(`Skip-count the ${t}s: ${[t, 2 * t, 3 * t].join(", ")}, ... What is the ${k}th number?`, t * k,
      [`Each jump adds ${t}.`, `The ${k}th number is ${t} × ${k}.`, `= ${t * k}.`], track([t, 2 * t, 3 * t, "…", "?"], t));
  },
  "ops-11-area-multiplication": (lvl) => {
    const one = lvl === "easy" ? ri(2, 5) : ri(3, 8);
    const tens = (lvl === "easy" ? ri(1, 3) : ri(2, 6)) * 10, ones = ri(2, 9);
    const big = tens + ones;
    return num(`${one} × ${big} = ?`, one * big, [`Split ${big} into ${tens} + ${ones}.`, `${one}×${tens} = ${one * tens}, ${one}×${ones} = ${one * ones}.`, `Add the parts: ${one * big}.`],
      { component: "AreaModel", props: { models: [{ rowParts: [one], colParts: [tens, ones] }] }, caption: `${one} × ${big} = ${one * big}` });
  },
  "ops-12-mult-2x2": (lvl) => {
    const t1 = ri(1, lvl === "easy" ? 2 : 4) * 10, o1 = ri(1, 9);
    const t2 = ri(1, lvl === "challenge" ? 4 : 2) * 10, o2 = ri(1, 9);
    const a = t1 + o1, b = t2 + o2;
    return num(`${a} × ${b} = ?`, a * b, [`Break both into tens+ones: ${a}=${t1}+${o1}, ${b}=${t2}+${o2}.`, "Multiply the four patches and add them.", `= ${a * b}.`],
      { component: "AreaModel", props: { models: [{ rowParts: [t1, o1], colParts: [t2, o2] }] }, caption: `${a} × ${b} = ${a * b}` });
  },
  "ops-13-division-sharing": (lvl) => {
    const d = ri(2, lvl === "easy" ? 6 : lvl === "medium" ? 8 : 12);
    const q = ri(2, lvl === "easy" ? 7 : lvl === "medium" ? 9 : 12);
    const total = d * q;
    return num(`${total} shared equally among ${d} — how many each?`, q, [`Think: ${d} × ? = ${total}.`, `Skip-count by ${d} up to ${total}.`, `${total} ÷ ${d} = ${q}.`],
      arr([grid(d, q)]));
  },
  "ops-14-long-division": (lvl) => {
    const d = ri(2, lvl === "easy" ? 5 : lvl === "medium" ? 8 : 9);
    const q = ri(lvl === "easy" ? 11 : lvl === "medium" ? 21 : 41, lvl === "easy" ? 25 : lvl === "medium" ? 60 : 120);
    const total = d * q;
    return num(`${total} ÷ ${d} = ?`, q, ["Share the biggest place first, then trade down.", `Bodyguard check: ${d} × your answer should be ${total}.`, `${total} ÷ ${d} = ${q}.`]);
  },
  "ops-15-word-problems": (lvl) => {
    const kind = pick(lvl === "challenge" ? ["join", "remove", "build", "share", "two-step"] : ["join", "remove", "build", "share"]);
    const name = pick(["Anu", "Ravi", "Meena", "Kiran"]);
    if (kind === "join") { const a = ri(12, 48), b = ri(12, 48); return num(`${name} read ${a} pages on Saturday and ${b} on Sunday. How many altogether?`, a + b, ["Two amounts JOIN → add.", `${a} + ${b}.`, "Answer is bigger than both parts."]); }
    if (kind === "remove") { const a = ri(40, 90), b = ri(12, a - 10); return num(`A bus had ${a} passengers; ${b} got down. How many are still on?`, a - b, ["People LEAVE → subtract.", `${a} − ${b}.`, "Check by adding back."]); }
    if (kind === "build") { const g = ri(3, 8), e = ri(6, 12); return num(`A hall has ${g} rows with ${e} chairs each. How many chairs?`, g * e, ["Equal groups, total unknown → multiply.", `${g} × ${e}.`, "Bigger than one row."]); }
    if (kind === "share") { const d = ri(4, 9), q = ri(4, 10), total = d * q; return num(`${total} students travel ${q} to a van. How many vans?`, d, ["Equal groups, total known → divide.", `${total} ÷ ${q}.`, "Fewer vans than students."]); }
    const r = ri(3, 6), e = ri(5, 9), eaten = ri(5, r * e - 5);
    return num(`A tray has ${r} rows of ${e} laddus. ${eaten} are eaten. How many are left?`, r * e - eaten, [`Step 1: ${r} × ${e} = ${r * e}.`, `Step 2: ${r * e} − ${eaten}.`, "Two steps: build, then remove."]);
  },
  // ---------------- Fractions ----------------
  "frac-01-equal-parts": (lvl) => {
    const parts = pick(lvl === "easy" ? [2, 3, 4] : lvl === "medium" ? [3, 4, 5, 6] : [6, 8, 10, 12]);
    const shaded = ri(1, parts - 1);
    const round = pick([true, false]);
    const food = round ? pick(["pizza", "roti", "dosa", "cake"]) : pick(["chocolate bar", "paper strip", "ribbon"]);
    const cells = [{ parts, shaded, label: `${shaded}/${parts}` }];
    const vis: VisualSpec = round
      ? { component: "PizzaSlices", props: { pies: cells }, caption: `${shaded} of ${parts} equal slices` }
      : { component: "FractionStrip", props: { strips: cells }, caption: `${shaded} of ${parts} equal parts` };
    return frac(`A ${food} is cut into ${parts} equal parts. ${shaded} ${shaded === 1 ? "part is" : "parts are"} taken. What fraction is that?`,
      `${shaded}/${parts}`, ["Bottom = total equal parts.", "Top = the parts taken.", `${shaded} taken out of ${parts} = ${shaded}/${parts}.`], vis);
  },
  "frac-02-numberline": (lvl) => {
    const parts = pick(lvl === "easy" ? [2, 3, 4] : lvl === "medium" ? [4, 5, 6] : [6, 8, 10]);
    const m = ri(1, parts - 1);
    const marker = pick(["flag", "dot", "frog", "ant", "star"]);
    return frac(`A number line from 0 to 1 is cut into ${parts} equal jumps. A ${marker} sits after ${m} ${m === 1 ? "jump" : "jumps"}. What number is it on?`,
      `${m}/${parts}`, ["Bottom = equal jumps from 0 to 1.", "Top = jumps to the marker.", `Count hops, not posts: ${m}/${parts}.`],
      nline(parts, m, `${m}/${parts}`));
  },
  "frac-03-equivalent": (lvl) => {
    const bases: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 6], [5, 6]];
    const [a, b] = pick(bases);
    const k = lvl === "easy" ? ri(2, 4) : lvl === "medium" ? ri(2, 5) : ri(3, 6);
    return frac(`Fill in the missing number: ${a}/${b} = ?/${b * k}`, `${a * k}/${b * k}`,
      [`The bottom went ×${k} (${b}→${b * k}).`, `Do the SAME to the top: ${a}×${k}.`, `= ${a * k}/${b * k}.`],
      { component: "FractionStrip", props: { strips: [{ parts: b, shaded: a, label: `${a}/${b}` }, { parts: b * k, shaded: a * k, label: `${a * k}/${b * k}` }] }, caption: "Same amount, more pieces." });
  },
  "frac-04-comparing": (lvl) => {
    const b = pick(lvl === "easy" ? [4, 5, 6] : lvl === "medium" ? [5, 6, 7, 8] : [7, 8, 9, 10]);
    let t1 = ri(1, b - 1), t2 = ri(1, b - 1);
    if (t1 === t2) t2 = t1 === b - 1 ? t1 - 1 : t1 + 1;
    const big = Math.max(t1, t2);
    return frac(`Which is bigger: ${t1}/${b} or ${t2}/${b}? (type the bigger one)`, `${big}/${b}`,
      [`Same bottom (${b}) — same-size pieces.`, `Compare the tops: ${Math.max(t1, t2)} > ${Math.min(t1, t2)}.`, `${big}/${b} is bigger.`],
      { component: "FractionStrip", props: { strips: [{ parts: b, shaded: t1, label: `${t1}/${b}` }, { parts: b, shaded: t2, label: `${t2}/${b}` }] }, caption: "Longer bar wins." });
  },
  "frac-05-adding-like": (lvl) => {
    const b = pick(lvl === "easy" ? [4, 5, 6, 7] : lvl === "medium" ? [6, 7, 8] : [8, 9, 10, 12]);
    const t1 = ri(1, b - 2), t2 = ri(1, b - t1 - 1);
    const round = pick([true, false]);
    const cells = [{ parts: b, shaded: t1, label: `${t1}/${b}` }, { parts: b, shaded: t2, label: `+ ${t2}/${b}` }, { parts: b, shaded: t1 + t2, label: `= ${t1 + t2}/${b}` }];
    const vis: VisualSpec = round
      ? { component: "PizzaSlices", props: { pies: cells }, caption: "Tops add, bottom stays." }
      : { component: "FractionStrip", props: { strips: cells }, caption: "Tops add, bottom stays." };
    return frac(`${t1}/${b} + ${t2}/${b} = ?`, `${t1 + t2}/${b}`,
      [`Bottoms match (${b}) — same-size pieces.`, `Add the tops: ${t1} + ${t2}.`, `Keep the bottom: ${t1 + t2}/${b}.`], vis);
  },

  // ---------------- Decimals ----------------
  "dec-01-decimal-tenths": (lvl) => {
    const n = ri(1, 9);
    const form = pick(["strip", "fraction", "words"]);
    const val = `0.${n}`;
    const q = form === "strip" ? `A strip is cut into 10 equal parts and ${n} are shaded. Write it as a decimal.`
      : form === "fraction" ? `Write ${n}/10 as a decimal.` : `Write "${n} tenths" as a decimal.`;
    return num(q, val, ["Each part is one tenth (0.1).", `${n} tenths = ${n}/10.`, `Zero wholes, ${n} tenths = ${val}.`],
      { component: "FractionStrip", props: { strips: [{ parts: 10, shaded: n, label: val }] }, caption: `${n} tenths = ${val}` });
  },
  "dec-02-money-decimals": (lvl) => {
    const rup = ri(0, lvl === "easy" ? 9 : lvl === "medium" ? 40 : 200);
    const paise = pick([5, 10, 20, 25, 50, 75, 90]);
    const val = (rup + paise / 100).toFixed(2);
    return num(`${rup} rupees and ${paise} paise = ₹? (write as a decimal)`, val,
      ["100 paise = 1 rupee.", `Rupees left of the dot, paise as hundredths right of it.`, `= ₹${val}.`]);
  },
  "dec-03-hundredths": (lvl) => {
    const n = ri(1, lvl === "easy" ? 30 : lvl === "medium" ? 99 : 99);
    const val = (n / 100).toFixed(2);
    return num(`Write ${n}/100 as a decimal.`, val, ["Hundredths sit in the second place after the dot.", `${n} hundredths.`, `= ${val}.`]);
  },
  "dec-04-fraction-decimal-link": (lvl) => {
    if (pick([true, false])) { const n = ri(1, 9); return frac(`Write 0.${n} as a fraction over 10.`, `${n}/10`, ["The first place after the dot is tenths.", `0.${n} means ${n} tenths.`, `= ${n}/10.`]); }
    const n = ri(1, 99); const val = (n / 100).toFixed(2);
    return num(`Write ${n}/100 as a decimal.`, val, ["Hundredths = two places after the dot.", `${n} hundredths.`, `= ${val}.`]);
  },

  // ---------------- Measurement ----------------
  "meas-01-units": (lvl) => {
    const kind = pick(["m-cm", "cm-mm", "kg-g", "km-m", "l-ml"]);
    const n = ri(1, lvl === "easy" ? 9 : lvl === "medium" ? 40 : 99);
    const map: Record<string, [number, string, string]> = {
      "m-cm": [100, "metres", "centimetres"], "cm-mm": [10, "centimetres", "millimetres"],
      "kg-g": [1000, "kilograms", "grams"], "km-m": [1000, "kilometres", "metres"], "l-ml": [1000, "litres", "millilitres"],
    };
    const [f, big, small] = map[kind];
    return num(`How many ${small} are in ${n} ${big}?`, n * f, [`1 ${big.slice(0, -1)} = ${f} ${small}.`, `So ${n} × ${f}.`, `= ${n * f} ${small}.`]);
  },
  "meas-02-time": (lvl) => {
    const kind = pick(["hours-min", "hm-min", "half", "quarter"]);
    if (kind === "hours-min") { const h = ri(1, 12); return num(`How many minutes are in ${h} ${h === 1 ? "hour" : "hours"}?`, h * 60, ["1 hour = 60 minutes.", `${h} × 60.`, `= ${h * 60} minutes.`]); }
    if (kind === "half") { const h = ri(1, 11); return num(`How many minutes is "half past ${h}" past the hour?`, 30, ["Half of an hour.", "Half of 60.", "= 30 minutes."]); }
    if (kind === "quarter") { const q = pick(["past", "to"]); return num(`How many minutes is "quarter ${q}" the hour?`, q === "past" ? 15 : 45, ["A quarter of 60 is 15.", q === "past" ? "Quarter past = 15 minutes after." : "Quarter to = 60 − 15.", `= ${q === "past" ? 15 : 45} minutes.`]); }
    const h = ri(1, 5), m = pick([5, 10, 15, 20, 25, 40, 45, 50]);
    return num(`How many minutes in all is ${h} ${h === 1 ? "hour" : "hours"} and ${m} minutes?`, h * 60 + m, [`${h} hours = ${h * 60} minutes.`, `Add the extra ${m} minutes.`, `= ${h * 60 + m} minutes.`]);
  },

  // ---------------- Geometry (numeric) ----------------
  "geo-02-perimeter": (lvl) => {
    const l = ri(lvl === "easy" ? 3 : 5, lvl === "easy" ? 9 : lvl === "medium" ? 15 : 25);
    const b = ri(2, l - 1);
    const thing = pick(["garden", "photo frame", "carrom board", "playground"]);
    return num(`A rectangular ${thing} is ${l} m long and ${b} m wide. What is its perimeter (all four sides)?`,
      2 * (l + b), ["Perimeter = walk all four sides.", `2 × (${l} + ${b}).`, `= ${2 * (l + b)} m.`],
      { component: "GeometryCanvas", props: { shapes: [{ kind: "rect", w: l, h: b, sideLabels: true }] }, caption: `2 × (${l}+${b}) = ${2 * (l + b)}` });
  },
  "geo-03-area": (lvl) => {
    const l = ri(lvl === "easy" ? 2 : 4, lvl === "easy" ? 8 : lvl === "medium" ? 10 : 16);
    const b = ri(2, lvl === "easy" ? 6 : 9);
    return num(`A rectangle is ${l} units long and ${b} units wide. What is its area (unit squares inside)?`,
      l * b, ["Area = rows × columns of unit squares.", `${l} × ${b}.`, `= ${l * b} square units.`],
      { component: "GeometryCanvas", props: { shapes: [{ kind: "rect", w: l, h: b, unitGrid: true, sideLabels: true }] }, caption: `${l} × ${b} = ${l * b}` });
  },
  // ---------------- Class 5 additions ----------------
  "num-16-factors-multiples": (lvl) => {
    const kinds = lvl === "easy" ? ["multiple", "factor-mcq"] : lvl === "medium" ? ["multiple", "prime", "factor-count"] : ["lcm", "hcf", "factor-count"];
    const kind = pick(kinds);
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const factorCount = (x: number) => { let n = 0; for (let i = 1; i <= x; i++) if (x % i === 0) n++; return n; };
    if (kind === "multiple") { const n = ri(2, lvl === "easy" ? 9 : 12), k = ri(2, 9); return num(`What is the ${k}th multiple of ${n}?`, n * k, [`Skip-count by ${n}.`, `${n} × ${k}.`, `= ${n * k}.`]); }
    if (kind === "factor-mcq") { const f = ri(2, 6), other = f * ri(2, 4), n = f * ri(2, 5); return mcq(`Which is a FACTOR of ${n}?`, String(f), [{ label: String(f) }, { label: String(n * 2), mistakeTag: "factor-multiple-swapped" }, { label: String(other + 1), mistakeTag: "missed-factor-pair" }], ["A factor divides it exactly.", `Does ${n} ÷ it leave nothing?`, `${f} works.`]); }
    if (kind === "prime") { const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23]; const usePrime = pick([true, false]); const n = usePrime ? pick(primes) : pick([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21]); return text(`Is ${n} prime or composite?`, factorCount(n) === 2 ? "prime" : "composite", ["Count the factors.", "Exactly two (1 and itself) → prime.", "More than two → composite."]); }
    if (kind === "factor-count") { const n = ri(4, lvl === "challenge" ? 40 : 24); return num(`How many factors does ${n} have?`, factorCount(n), ["List numbers that divide it exactly.", "Factors come in pairs.", `Count them for ${n}.`]); }
    if (kind === "lcm") { const a = ri(2, 8), b = ri(2, 9); return num(`LCM (lowest common multiple) of ${a} and ${b}?`, (a * b) / gcd(a, b), ["List multiples of each.", "Find the first shared one.", `= ${(a * b) / gcd(a, b)}.`]); }
    const a = ri(4, 24), b = ri(4, 24); return num(`HCF (highest common factor) of ${a} and ${b}?`, gcd(a, b), ["List factors of each.", "Find the biggest shared one.", `= ${gcd(a, b)}.`]);
  },
  "geo-05-angles": (lvl) => {
    if (Math.random() < 0.2) { const f = pick([["right", 90], ["straight", 180], ["full turn", 360]] as [string, number][]); return num(`How many degrees is a ${f[0]} angle?`, f[1], ["Right = 90, straight = 180, full = 360.", `Think of the ${f[0]}.`, `= ${f[1]}°.`]); }
    const bucket = pick(lvl === "easy" ? ["acute", "obtuse"] : ["acute", "obtuse", "right", "straight"]);
    const d = bucket === "acute" ? ri(10, 80) : bucket === "obtuse" ? ri(100, 170) : bucket === "right" ? 90 : 180;
    const ans = d < 90 ? "acute" : d === 90 ? "right" : d < 180 ? "obtuse" : "straight";
    return text(`An angle of ${d}° — is it acute, right, obtuse, or straight?`, ans, ["Compare to a square corner (90°).", "Smaller → acute; bigger (under 180) → obtuse.", `${d}° is ${ans}.`]);
  },
  "num-17-patterns": (lvl) => {
    if (lvl === "challenge" && Math.random() < 0.5) { const r = pick([2, 3]), s = ri(1, 4); const seq = [s, s * r, s * r * r, s * r * r * r]; return num(`What comes next: ${seq.join(", ")}, __?`, s * r ** 4, [`How do you get from one term to the next?`, `Each term is × ${r}.`, `${seq[3]} × ${r}.`], track([...seq, "?"])); }
    const grow = pick([true, false]) && lvl !== "easy" ? false : true;
    const d = ri(2, lvl === "easy" ? 6 : 12), s = ri(1, 12);
    if (grow) { const seq = [s, s + d, s + 2 * d, s + 3 * d]; return num(`What comes next: ${seq.join(", ")}, __?`, s + 4 * d, ["Find the gap between terms.", `The rule is add ${d}.`, `${seq[3]} + ${d}.`], track([...seq, "?"], d)); }
    const st = ri(40, 99), seq = [st, st - d, st - 2 * d, st - 3 * d]; return num(`What comes next: ${seq.join(", ")}, __?`, st - 4 * d, ["Growing or shrinking?", `The rule is subtract ${d}.`, `${seq[3]} − ${d}.`], track([...seq, "?"]));
  },
  "dec-05-decimal-operations": (lvl) => {
    if (lvl === "challenge" && Math.random() < 0.3) { const t = ri(1, 9); return num(`0.${t} × 10 = ?`, t, ["×10 shifts each digit one place bigger.", "The dot moves right one place.", `0.${t} → ${t}.`]); }
    const hund = lvl !== "easy" && Math.random() < 0.5;
    const denom = hund ? 100 : 10, hi = hund ? 95 : 9;
    let a = ri(1, hi), b = ri(1, hi);
    const op = pick(["+", "−"]);
    if (op === "−" && b > a) { const t = a; a = b; b = t; }
    const res = op === "+" ? a + b : a - b;
    const fmt = (x: number) => String(x / denom);
    return num(`${fmt(a)} ${op} ${fmt(b)} = ?`, fmt(res), ["Line up the dots.", `Work the ${hund ? "hundredths" : "tenths"} like whole numbers.`, "Bring the dot straight down."]);
  },
  "frac-06-fraction-of-quantity": (lvl) => {
    const b = pick(lvl === "easy" ? [2, 3, 4, 5] : lvl === "medium" ? [3, 4, 5] : [4, 5, 6]);
    const t = lvl === "easy" ? 1 : ri(1, b - 1);
    const m = ri(2, lvl === "easy" ? 8 : 10), n = b * m;
    return num(`What is ${t}/${b} of ${n}?`, t * m, [`Split ${n} into ${b} equal parts: ${n} ÷ ${b} = ${m}.`, `Take the top number of parts: ${t}.`, `${m} × ${t} = ${t * m}.`]);
  },
  "meas-03-maps-scale": (lvl) => {
    const unit = pick(["km", "m"]);
    const s = pick(lvl === "easy" ? [2, 3, 5, 10] : lvl === "medium" ? [4, 5, 6, 10] : [15, 20, 25, 50]);
    if (lvl !== "easy" && Math.random() < 0.4) { const cm = ri(2, 9), real = s * cm; return num(`Scale 1 cm = ${s} ${unit}. The real distance is ${real} ${unit}. How many cm on the map?`, cm, ["Real → map: DIVIDE by the scale.", `${real} ÷ ${s}.`, `= ${cm} cm.`]); }
    const cm = ri(2, 9); return num(`Scale 1 cm = ${s} ${unit}. The map shows ${cm} cm. What is the real distance in ${unit}?`, s * cm, ["Map → real: MULTIPLY by the scale.", `${cm} × ${s}.`, `= ${s * cm} ${unit}.`]);
  },
  "meas-04-volume": (lvl) => {
    if (lvl !== "easy" && Math.random() < 0.3) { const area = ri(4, 20), h = ri(2, 6); return num(`A box has base area ${area} and height ${h}. What is its volume (cubic units)?`, area * h, ["Volume = base area × height.", `${area} × ${h}.`, `= ${area * h}.`]); }
    const L = ri(2, lvl === "easy" ? 5 : lvl === "medium" ? 7 : 9), B = ri(2, lvl === "easy" ? 4 : 6), H = ri(1, lvl === "easy" ? 3 : 5);
    return num(`A box is ${L} long, ${B} wide and ${H} high. Volume in cubic units?`, L * B * H, [`One layer: ${L} × ${B} = ${L * B}.`, `${H} layers high.`, `${L * B} × ${H} = ${L * B * H}.`]);
  },
  // ---------------- Foundation module (PP1-Class 2) ----------------
  "found-02-numbers-11-20": (lvl) => {
    const form = pick(["decompose", "compose", "more-than-ten"]);
    const n = ri(11, 19);
    if (form === "decompose") return num(`${n} is one ten and how many ones?`, n - 10, ["Bundle ten first.", "Count the leftover ones.", `${n} = ten and ${n - 10}.`], pvb([{ tens: 1, ones: n - 10, label: String(n) }]));
    if (form === "compose") return num(`One ten and ${n - 10} ones make which number?`, n, ["Start at ten.", `Add the ${n - 10} ones.`, `Ten and ${n - 10} = ${n}.`], pvb([{ tens: 1, ones: n - 10, label: String(n) }]));
    return num(`How many more than 10 is ${n}?`, n - 10, ["Count up from ten.", `Ten to ${n}.`, `That is ${n - 10}.`]);
  },
  "found-03-number-bonds": (lvl) => {
    const N = lvl === "easy" ? pick([6, 7, 8, 9, 10]) : lvl === "medium" ? ri(8, 15) : ri(10, 20);
    const known = ri(0, N);
    return num(`${N} is made of ${known} and __?`, N - known, [`The whole is ${N}, one part is ${known}.`, `Whole − part: ${N} − ${known}.`, `= ${N - known}.`], barModel([part(known, String(known)), part(N - known, String(N - known))]));
  },
  "found-05-skip-counting": (lvl) => {
    const S = pick([2, 5, 10]);
    const k = ri(1, 10);
    const seq = [S * k, S * (k + 1), S * (k + 2)];
    return num(`Skip count by ${S}s: ${seq.join(", ")}, __?`, S * (k + 3), [`Each jump adds ${S}.`, `${seq[2]} + ${S}.`, `= ${S * (k + 3)}.`], track([...seq, "?"], S));
  },
  "found-06-add-sub-within-20": (lvl) => {
    if (pick(["+", "−"]) === "+") {
      const a = ri(6, 9), b = ri(11 - a, 9);
      return num(`${a} + ${b} = ?`, a + b, [`${a} needs ${10 - a} to make ten.`, `Take ${10 - a} from ${b}, ${b - (10 - a)} left.`, `Ten and ${b - (10 - a)} = ${a + b}.`], nline(10, (a + b) % 10, `${a}+${b}`));
    }
    const m = ri(11, 18), sub = ri(m - 9, 9);
    return num(`${m} − ${sub} = ?`, m - sub, [`Break back to ten first.`, `Then take away the rest.`, `= ${m - sub}.`]);
  },
  "found-07-add-sub-within-100": (lvl) => {
    if (pick(["+", "−"]) === "+") {
      const t1 = ri(1, 4), o1 = ri(0, 4), t2 = ri(1, 5 - t1 < 1 ? 1 : 5 - t1), o2 = ri(0, 4);
      const a = t1 * 10 + o1, b = t2 * 10 + o2;
      return num(`${a} + ${b} = ?`, a + b, [`Ones: ${o1} + ${o2} = ${o1 + o2}.`, `Tens: ${t1 * 10} + ${t2 * 10} = ${(t1 + t2) * 10}.`, `Together = ${a + b}.`], pvb([{ tens: t1, ones: o1, label: String(a) }, { tens: t2, ones: o2, label: `+${b}` }]));
    }
    const t1 = ri(3, 9), o1 = ri(2, 9), t2 = ri(1, t1 - 1), o2 = ri(0, o1);
    const a = t1 * 10 + o1, b = t2 * 10 + o2;
    return num(`${a} − ${b} = ?`, a - b, [`Ones: ${o1} − ${o2} = ${o1 - o2}.`, `Tens: ${t1 * 10} − ${t2 * 10} = ${(t1 - t2) * 10}.`, `Together = ${a - b}.`]);
  },
  "found-08-money": (lvl) => {
    if (pick(["sum", "change"]) === "sum") {
      const a = pick([5, 10, 20, 50]), b = pick([1, 2, 5, 10, 20]);
      return num(`₹${a} and ₹${b} together = how many rupees?`, a + b, ["Add the VALUES, not the count.", `${a} + ${b}.`, `= ₹${a + b}.`], barModel([part(a, `₹${a}`), part(b, `₹${b}`)]));
    }
    const price = ri(3, lvl === "easy" ? 9 : lvl === "medium" ? 45 : 90);
    const paid = pick([10, 20, 50, 100].filter((p) => p > price));
    return num(`Pay ₹${paid} for a ₹${price} item. Change in rupees?`, paid - price, ["Change = paid − price.", `${paid} − ${price}.`, `= ₹${paid - price}.`]);
  },
  "found-09-calendar": (lvl) => {
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const kind = pick(["day-after", "day-before", "month-after", "month-before", "count"]);
    if (kind === "day-after") { const i = ri(0, 6); return text(`What day comes right after ${DAYS[i]}?`, DAYS[(i + 1) % 7], ["Say the days in order.", `After ${DAYS[i]} comes...`, DAYS[(i + 1) % 7] + "."]); }
    if (kind === "day-before") { const i = ri(0, 6); return text(`What day comes right before ${DAYS[i]}?`, DAYS[(i + 6) % 7], ["Say the days in order.", `Just before ${DAYS[i]}...`, DAYS[(i + 6) % 7] + "."]); }
    if (kind === "month-after") { const i = ri(0, 11); return text(`What month comes right after ${MONTHS[i]}?`, MONTHS[(i + 1) % 12], ["Say the months in order.", `After ${MONTHS[i]}...`, MONTHS[(i + 1) % 12] + "."]); }
    if (kind === "month-before") { const i = ri(0, 11); return text(`What month comes right before ${MONTHS[i]}?`, MONTHS[(i + 11) % 12], ["Say the months in order.", `Just before ${MONTHS[i]}...`, MONTHS[(i + 11) % 12] + "."]); }
    return pick([true, false]) ? num(`How many days are in a week?`, 7, ["Monday to Sunday.", "Count them.", "Seven."]) : num(`How many months are in a year?`, 12, ["January to December.", "Count them.", "Twelve."]);
  },
  "found-04-ordinals": (lvl) => {
    const n = lvl === "easy" ? ri(3, 5) : lvl === "medium" ? ri(4, 6) : ri(5, 7);
    const items = distinct(OBJ_POOL, n);
    const pos = ri(1, n);
    return text(
      `In this row of ${n} things, counting from the LEFT, what position is the ${items[pos - 1]} in? (first, second, third...)`,
      ORD_WORDS[pos - 1],
      ["The first one is at the very start on the left.", "Count along: first, second, third...", `Stop at the ${items[pos - 1]}.`],
      objRow(items, pos - 1, "Which position is the highlighted one? Count from the left."));
  },
};

export function hasPracticeGen(conceptId: string): boolean {
  return conceptId in GENERATORS;
}

/** Concept ids that have a practice generator (for coverage tests/reporting). */
export function practiceConcepts(): string[] {
  return Object.keys(GENERATORS);
}

/** Generate up to n UNIQUE questions for a concept + level, with stable ids. */
export function generatePractice(conceptId: string, level: Level, n = 25): Question[] {
  const gen = GENERATORS[conceptId];
  if (!gen) return [];
  const out: Question[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < n && tries < n * 40; tries++) {
    const g = gen(level);
    if (seen.has(g.q)) continue;
    seen.add(g.q);
    out.push({ ...g, id: `${conceptId}-${level}-gen-${out.length + 1}` });
  }
  return out;
}
