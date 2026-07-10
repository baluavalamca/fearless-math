/**
 * Example Factory — generates UNLIMITED fresh worked examples per concept.
 * Every example is computed by code, so answers are correct by construction
 * (no AI, works fully offline). Each has a story context, steps, and a visual.
 */
import { VisualSpec } from "./components/VisualRenderer";

export interface GeneratedExample {
  problem: string;
  steps: string[];
  answer: string;
  visual?: VisualSpec;
}

const ri = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

// Round things read best as a pizza/circle; long or flat things as a bar strip.
const ROUND_FOODS = ["pizza", "roti", "dosa", "chapati", "round cake"];
const BAR_FOODS = ["chocolate bar", "paper strip", "ribbon", "wafer bar", "burfi slab"];
type Cell = { parts: number; shaded: number; label?: string };

/**
 * Pick the fraction visual that MATCHES the object in the problem:
 * a round food -> PizzaSlices (circle), a long/flat food -> FractionStrip (bar).
 * Same data either way, so the picture always fits the story — never forced.
 */
function fractionVisual(thing: string, cells: Cell[], caption: string): VisualSpec {
  return ROUND_FOODS.includes(thing)
    ? { component: "PizzaSlices", props: { pies: cells }, caption }
    : { component: "FractionStrip", props: { strips: cells }, caption };
}

const MULT_CONTEXTS = [
  { group: "baskets", item: "mangoes" },
  { group: "plates", item: "laddus" },
  { group: "packets", item: "biscuits" },
  { group: "rows", item: "chairs" },
  { group: "trays", item: "eggs" },
  { group: "boxes", item: "crayons" },
  { group: "teams", item: "players" },
];

const SHARE_CONTEXTS = [
  { total: "laddus", shares: "friends" },
  { total: "chocolates", shares: "children" },
  { total: "marbles", shares: "cousins" },
  { total: "stickers", shares: "classmates" },
];

const NAMES = ["Anu", "Ravi", "Meena", "Kiran", "Sana", "Arjun"];

function skipCount(step: number, times: number): string {
  return Array.from({ length: times }, (_, i) => step * (i + 1)).join(", ");
}

const ADD_CONTEXTS = [
  { a: "sugar grains in the morning delivery", b: "in the evening delivery", unit: "grains" },
  { a: "runs in the first innings", b: "in the second innings", unit: "runs" },
  { a: "pages read last week", b: "this week", unit: "pages" },
  { a: "rupees for a notebook", b: "for a pencil box", unit: "rupees" },
];

const SUB_CONTEXTS = [
  { have: "acorns in the shop", give: "sold to a customer", left: "acorns left" },
  { have: "rupees paid", give: "the toy costs", left: "rupees change" },
  { have: "pages in the book", give: "pages read", left: "pages left" },
  { have: "runs to chase", give: "runs scored", left: "runs still needed" },
];

export function generateExample(conceptId: string): GeneratedExample | null {
  switch (conceptId) {
    case "geo-02-perimeter": {
      const l = ri(4, 12), b = ri(2, l - 1);
      const thing = pick(["garden", "playground", "photo frame", "carrom board"]);
      return {
        problem: `A rectangular ${thing} is ${l} m long and ${b} m wide. What is its perimeter?`,
        steps: [
          `Finger-walk all four sides: ${l}, ${b}, ${l}, ${b}.`,
          `Shortcut: 2 × (${l} + ${b}) = 2 × ${l + b}.`,
          `Perimeter = ${2 * (l + b)} metres of walking!`,
        ],
        answer: String(2 * (l + b)),
        visual: { component: "GeometryCanvas", props: { shapes: [{ kind: "rect", w: l, h: b, sideLabels: true }] }, caption: `2 × (${l}+${b}) = ${2 * (l + b)}` },
      };
    }

    case "geo-03-area": {
      const l = ri(3, 9), b = ri(2, 6);
      const thing = pick(["floor", "courtyard", "notice board", "chocolate bar"]);
      return {
        problem: `A ${thing} is ${l} units long and ${b} units wide. How many unit squares cover it (its area)?`,
        steps: [
          `The squares sit in ${b} equal rows of ${l} — an array!`,
          `Area = length × breadth = ${l} × ${b}.`,
          `${l * b} SQUARE units. (Edge questions add; inside questions multiply!)`,
        ],
        answer: String(l * b),
        visual: { component: "GeometryCanvas", props: { shapes: [{ kind: "rect", w: l, h: b, unitGrid: true, sideLabels: true }] }, caption: `${l} × ${b} = ${l * b} square units` },
      };
    }

    case "ops-12-mult-2x2": {
      const t1 = ri(1, 3) * 10, o1 = ri(1, 9);
      const t2 = ri(1, 2) * 10, o2 = ri(1, 9);
      const a = t1 + o1, b2 = t2 + o2;
      return {
        problem: `${a} × ${b2} = ? (Two ropes — four patches!)`,
        steps: [
          `Break both: ${a} = ${t1}+${o1}, ${b2} = ${t2}+${o2}.`,
          `Patches: ${t1}×${t2}=${t1 * t2}, ${t1}×${o2}=${t1 * o2}, ${o1}×${t2}=${o1 * t2}, ${o1}×${o2}=${o1 * o2}.`,
          `Add all four: ${t1 * t2} + ${t1 * o2} + ${o1 * t2} + ${o1 * o2} = ${a * b2}.`,
        ],
        answer: String(a * b2),
        visual: { component: "AreaModel", props: { models: [{ rowParts: [t1, o1], colParts: [t2, o2] }] }, caption: `${a} × ${b2} = ${a * b2}` },
      };
    }

    case "ops-14-long-division": {
      const d = ri(3, 6), q = ri(12, 26);
      const total = d * q;
      const c = pick(SHARE_CONTEXTS);
      return {
        problem: `${total} ${c.total} shared equally among ${d} ${c.shares}. How many each?`,
        steps: [
          `Share the TENS of ${total} among ${d} first, trade any leftover ten into ones.`,
          `Chunk check: ${d} × ${Math.floor(q / 10) * 10} = ${d * Math.floor(q / 10) * 10}, leaving ${total - d * Math.floor(q / 10) * 10} to share → ${q - Math.floor(q / 10) * 10} more each.`,
          `${total} ÷ ${d} = ${q}. Bodyguard: ${q} × ${d} = ${total} ✓`,
        ],
        answer: String(q),
      };
    }

    case "num-03-rounding": {
      const tens = ri(2, 8) * 10;
      const ones = pick([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const n = tens + ones;
      const up = ones >= 5;
      const rounded = up ? tens + 10 : tens;
      return {
        problem: `Round ${n} to the nearest ten.`,
        steps: [
          `${n} sits between ${tens} and ${tens + 10}.`,
          `Look at the ONES digit: ${ones} — that is ${up ? "5-or-more" : "4-or-less"}.`,
          `So round ${up ? "UP" : "DOWN"}: ${n} → ${rounded}.`,
        ],
        answer: String(rounded),
        visual: { component: "NumberLine", props: { lines: [{ parts: 10, mark: ones, label: String(n), showLabels: false }] }, caption: `Think of ${tens} to ${tens + 10}: ${n} is closer to ${rounded}.` },
      };
    }

    case "frac-05-adding-like": {
      const b = pick([5, 6, 7, 8, 9, 10]);
      const t1 = ri(1, b - 2), t2 = ri(1, b - t1 - 1);
      const item = pick([...ROUND_FOODS, ...BAR_FOODS]);
      return {
        problem: `${t1}/${b} of a ${item} + ${t2}/${b} of the same ${item} = ?`,
        steps: [
          `Bottoms match (${b}) — same-size pieces, so just count!`,
          `Add the tops: ${t1} + ${t2} = ${t1 + t2}.`,
          `Keep the bottom: ${t1 + t2}/${b}. (Nobody re-cut the ${item}!)`,
        ],
        answer: `${t1 + t2}/${b}`,
        visual: fractionVisual(item, [
          { parts: b, shaded: t1, label: `${t1}/${b}` },
          { parts: b, shaded: t2, label: `+ ${t2}/${b}` },
          { parts: b, shaded: t1 + t2, label: `= ${t1 + t2}/${b}` },
        ], "Same-size parts — tops add, the bottom stays."),
      };
    }

    case "ops-11-area-multiplication": {
      const one = ri(3, 7);
      const tensPart = ri(2, 6) * 10, onesPart = ri(2, 9);
      const big = tensPart + onesPart;
      const c = pick(MULT_CONTEXTS);
      return {
        problem: `${one} ${c.group} with ${big} ${c.item} in each. How many ${c.item} in total?`,
        steps: [
          `Break apart by place value: ${big} = ${tensPart} + ${onesPart}.`,
          `Big patch: ${one} × ${tensPart} = ${one * tensPart}.`,
          `Small patch: ${one} × ${onesPart} = ${one * onesPart}.`,
          `Add the partials: ${one * tensPart} + ${one * onesPart} = ${one * big}.`,
        ],
        answer: String(one * big),
        visual: { component: "AreaModel", props: { models: [{ rowParts: [one], colParts: [tensPart, onesPart] }] }, caption: `${one} × ${big} = ${one * big}` },
      };
    }

    case "ops-15-word-problems": {
      const kind = pick(["join", "remove", "build", "share", "two-step"]);
      if (kind === "join") {
        const a = ri(15, 48), b = ri(15, 48);
        return {
          problem: `Anu read ${a} pages on Saturday and ${b} on Sunday. How many pages altogether?`,
          steps: [
            "What happens? Two amounts JOIN into one total.",
            "Joining → ADD.",
            `${a} + ${b} = ${a + b}. Sense check: bigger than both parts ✓`,
          ],
          answer: String(a + b),
          visual: { component: "BarModel", props: { bars: [{ parts: [{ value: a, label: String(a) }, { value: b, label: String(b) }] }] } },
        };
      }
      if (kind === "remove") {
        const a = ri(40, 90), b = ri(12, a - 10);
        return {
          problem: `A bus had ${a} passengers; ${b} got down. How many are still on the bus?`,
          steps: [
            "What happens? People LEAVE — removing → SUBTRACT.",
            `${a} − ${b} = ${a - b}.`,
            `Check by adding back: ${a - b} + ${b} = ${a} ✓`,
          ],
          answer: String(a - b),
          visual: { component: "BarModel", props: { bars: [{ parts: [{ value: a - b, label: `left ${a - b}` }, { value: b, label: `down ${b}`, shaded: false }] }] } },
        };
      }
      if (kind === "build") {
        const g = ri(3, 8), e = ri(6, 15);
        return {
          problem: `A hall has ${g} rows with ${e} chairs in each row. How many chairs in all?`,
          steps: [
            "'Each' with the total UNKNOWN → building equal groups → MULTIPLY.",
            `${g} × ${e} = ${g * e}.`,
            "Sense check: the total is bigger than one row ✓",
          ],
          answer: String(g * e),
        };
      }
      if (kind === "share") {
        const d = ri(4, 9), q = ri(4, 12), total = d * q;
        return {
          problem: `${total} students travel ${q} to a van. How many vans are needed?`,
          steps: [
            "'Each' with the total KNOWN → breaking into equal groups → DIVIDE.",
            `${total} ÷ ${q} = ${d} (twin: ${q} × ${d} = ${total}).`,
            "Sense check: fewer vans than students ✓",
          ],
          answer: String(d),
        };
      }
      const r = ri(3, 6), e2 = ri(5, 9), eaten = ri(5, r * e2 - 5);
      return {
        problem: `A tray has ${r} rows of ${e2} laddus. ${eaten} laddus are eaten. How many are left?`,
        steps: [
          `Step 1 — equal rows build the total: ${r} × ${e2} = ${r * e2}.`,
          `Step 2 — 'eaten' removes: ${r * e2} − ${eaten} = ${r * e2 - eaten}.`,
          "Sense check: left is smaller than the start ✓",
        ],
        answer: String(r * e2 - eaten),
      };
    }

    case "ops-07-addition-regrouping": {
      const t1 = ri(2, 6), o1 = ri(4, 9);
      const t2 = ri(1, 8 - t1), o2 = ri(10 - o1, 9); // guarantees a carry
      const n1 = t1 * 10 + o1, n2 = t2 * 10 + o2, sum = n1 + n2;
      const c = pick(ADD_CONTEXTS);
      const onesSum = o1 + o2;
      return {
        problem: `${n1} ${c.a} and ${n2} ${c.b}. How many ${c.unit} in total?`,
        steps: [
          `Ones first: ${o1} + ${o2} = ${onesSum} → write ${onesSum % 10}, carry 1 (a real ten!).`,
          `Tens: ${t1} + ${t2} + 1(carry) = ${t1 + t2 + 1}.`,
          `Answer: ${sum} ${c.unit}.`,
          `Estimate check: about ${Math.round(n1 / 10) * 10} + ${n2} = ${Math.round(n1 / 10) * 10 + n2} — close ✓`,
        ],
        answer: String(sum),
        visual: {
          component: "PlaceValueBlocks",
          props: { sets: [
            { tens: t1, ones: o1, label: String(n1) },
            { tens: t2, ones: o2, label: `+ ${n2}` },
            { tens: Math.floor(sum / 10), ones: sum % 10, label: `= ${sum}` },
          ] },
          caption: `${o1}+${o2}=${onesSum} ones → regroup into 1 ten and ${onesSum % 10} ones.`,
        },
      };
    }

    case "ops-08-subtraction-regrouping": {
      const mt = ri(4, 9), mo = ri(0, 4);
      const st = ri(1, mt - 1), so = ri(mo + 1, 9); // guarantees a borrow
      const m = mt * 10 + mo, s = st * 10 + so, d = m - s;
      const c = pick(SUB_CONTEXTS);
      return {
        problem: `${m} ${c.have}; ${s} ${c.give}. How many ${c.left}?`,
        steps: [
          `Ones: ${mo} − ${so} won't go → borrow! Tens ${mt}→${mt - 1}, ones ${mo}→${mo + 10}.`,
          `Ones now: ${mo + 10} − ${so} = ${mo + 10 - so}.`,
          `Tens: ${mt - 1} − ${st} = ${mt - 1 - st}.`,
          `Answer: ${d}. Check by adding back: ${d} + ${s} = ${m} ✓`,
        ],
        answer: String(d),
        visual: {
          component: "PlaceValueBlocks",
          props: { sets: [
            { tens: mt, ones: mo, label: String(m) },
            { tens: mt - 1, ones: mo + 10, label: "after unbundling" },
            { tens: Math.floor(d / 10), ones: d % 10, label: `− ${s} → ${d}` },
          ] },
          caption: `One ten unbundled into 10 ones — a trade, not a gift!`,
        },
      };
    }

    case "ops-09-multiplication-groups": {
      const a = ri(2, 6), b = ri(2, 9), c = pick(MULT_CONTEXTS);
      return {
        problem: `There are ${a} ${c.group} with ${b} ${c.item} in each. How many ${c.item} in total?`,
        steps: [
          `The groups are equal: ${a} ${c.group}, ${b} in each.`,
          `Multiplication sentence: ${a} × ${b}.`,
          `Jump count by ${b}: ${skipCount(b, a)}.`,
          `Total: ${a} × ${b} = ${a * b} ${c.item}.`,
        ],
        answer: String(a * b),
        visual: { component: "ArrayGrid", props: { grids: [{ rows: a, cols: b, asGroups: true }] }, caption: `${a} ${c.group} of ${b} = ${a * b}` },
      };
    }

    case "ops-13-division-sharing": {
      const d = ri(2, 6), q = ri(2, 6), total = d * q;
      if (Math.random() < 0.5) {
        const c = pick(SHARE_CONTEXTS);
        return {
          problem: `${total} ${c.total} are shared equally among ${d} ${c.shares}. How many does each get?`,
          steps: [
            `Total ÷ shares: ${total} ÷ ${d}.`,
            `Twin trick — think multiplication: ${d} × ? = ${total}.`,
            `Jump by ${d}: ${skipCount(d, q)} — that took ${q} jumps.`,
            `${total} ÷ ${d} = ${q} each. Fair sharing done!`,
          ],
          answer: String(q),
          visual: { component: "ArrayGrid", props: { grids: [{ rows: d, cols: q, asGroups: true }] }, caption: `${total} ÷ ${d} = ${q} each` },
        };
      }
      const item = pick(["eggs", "mangoes", "pencils", "buns"]);
      return {
        problem: `${total} ${item} are packed ${q} to a box. How many boxes are filled?`,
        steps: [
          `Grouping: take out ${q} at a time.`,
          `Measure out: ${skipCount(q, d)}.`,
          `That made ${d} groups.`,
          `${total} ÷ ${q} = ${d} boxes.`,
        ],
        answer: String(d),
        visual: { component: "ArrayGrid", props: { grids: [{ rows: d, cols: q, asGroups: true }] }, caption: `${total} ÷ ${q} = ${d} boxes` },
      };
    }

    case "frac-01-equal-parts": {
      const p = pick([2, 3, 4, 6, 8]), s = ri(1, p - 1), who = pick(NAMES);
      const thing = pick([...ROUND_FOODS, ...BAR_FOODS]);
      return {
        problem: `A ${thing} is cut into ${p} equal pieces. ${who} takes ${s} ${s === 1 ? "piece" : "pieces"}. What fraction of the ${thing} is that?`,
        steps: [
          `Are the parts equal? Yes — ${p} equal pieces.`,
          `Total equal parts = ${p} → bottom number.`,
          `${who} took ${s} → top number.`,
          `${who} has ${s}/${p} of the ${thing}.`,
        ],
        answer: `${s}/${p}`,
        visual: fractionVisual(thing, [{ parts: p, shaded: s, label: `${s}/${p}` }], `${s} out of ${p} equal parts = ${s}/${p}`),
      };
    }

    case "frac-02-numberline": {
      const p = pick([2, 3, 4, 5, 6, 8]), m = ri(1, p - 1);
      return {
        problem: `A number line from 0 to 1 is cut into ${p} equal jumps. A flag stands after ${m} ${m === 1 ? "jump" : "jumps"} from 0. What number is the flag on?`,
        steps: [
          `Equal jumps between 0 and 1: ${p} → bottom number.`,
          `Jumps from 0 to the flag: ${m} → top number.`,
          `Count hops, not posts!`,
          `The flag is on ${m}/${p}.`,
        ],
        answer: `${m}/${p}`,
        visual: { component: "NumberLine", props: { lines: [{ parts: p, mark: m, showLabels: true }] }, caption: `${m} of ${p} equal jumps = ${m}/${p}` },
      };
    }

    case "frac-03-equivalent": {
      const bases: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5]];
      const [a, b] = pick(bases), k = pick([2, 3, 4]);
      return {
        problem: `Fill in the missing number: ${a}/${b} = ?/${b * k}`,
        steps: [
          `The bottom went from ${b} to ${b * k}. What was it multiplied by? ${b} × ${k} = ${b * k}, so by ${k}.`,
          `Do the SAME to the top: ${a} × ${k} = ${a * k}.`,
          `Both multiplied by ${k} — the amount is unchanged.`,
          `${a}/${b} = ${a * k}/${b * k}.`,
        ],
        answer: `${a * k}/${b * k}`,
        visual: {
          component: "FractionStrip",
          props: { strips: [{ parts: b, shaded: a, label: `${a}/${b}` }, { parts: b * k, shaded: a * k, label: `${a * k}/${b * k}` }] },
          caption: "Same amount, different name — the shading lines up!",
        },
      };
    }

    case "frac-04-comparing": {
      const kind = pick(["same-bottom", "same-top", "unit"]);
      if (kind === "same-bottom") {
        const b = pick([5, 6, 7, 8]);
        let t1 = ri(1, b - 1), t2 = ri(1, b - 1);
        if (t1 === t2) t2 = t1 === b - 1 ? t1 - 1 : t1 + 1;
        const big = Math.max(t1, t2);
        return {
          problem: `Which is bigger: ${t1}/${b} or ${t2}/${b}?`,
          steps: [
            `The bottoms are the SAME (${b}) — pieces are the same size.`,
            `Compare the tops: ${Math.max(t1, t2)} > ${Math.min(t1, t2)}.`,
            `${big}/${b} is bigger.`,
          ],
          answer: `${big}/${b}`,
          visual: { component: "FractionStrip", props: { strips: [{ parts: b, shaded: t1, label: `${t1}/${b}` }, { parts: b, shaded: t2, label: `${t2}/${b}` }] }, caption: "Same-size parts — the longer bar wins. Just count them!" },
        };
      }
      if (kind === "same-top") {
        const t = ri(1, 3);
        const [b1, b2] = pick([[4, 8], [3, 6], [5, 10], [2, 4]] as [number, number][]);
        return {
          problem: `Which is bigger: ${t}/${b1} or ${t}/${b2}?`,
          steps: [
            `Same TOPS (${t}) — same number of pieces taken.`,
            `But which pieces are bigger — ${b1}-cuts or ${b2}-cuts? Fewer cuts = bigger pieces.`,
            `${t}/${b1} has the bigger pieces, so ${t}/${b1} is bigger.`,
          ],
          answer: `${t}/${b1}`,
          visual: { component: "PizzaSlices", props: { pies: [{ parts: b1, shaded: t, label: `${t}/${b1}` }, { parts: b2, shaded: t, label: `${t}/${b2}` }] }, caption: "Bigger bottom = smaller slices. Remember the thin pizza slice!" },
        };
      }
      const [b1, b2] = pick([[2, 4], [3, 6], [2, 8], [4, 8], [3, 12]] as [number, number][]);
      return {
        problem: `Same pizza! Which is MORE: 1/${b1} or 1/${b2}?`,
        steps: [
          `One piece each — but from different cuttings.`,
          `${b1} cuts make bigger pieces than ${b2} cuts.`,
          `1/${b1} is more. The bigger bottom made smaller pieces!`,
        ],
        answer: `1/${b1}`,
        visual: { component: "PizzaSlices", props: { pies: [{ parts: b1, shaded: 1, label: `1/${b1}` }, { parts: b2, shaded: 1, label: `1/${b2}` }] }, caption: `1/${b1} > 1/${b2}` },
      };
    }

    default:
      return null;
  }
}

export function hasGenerator(conceptId: string): boolean {
  return [
    "num-03-rounding",
    "ops-07-addition-regrouping", "ops-08-subtraction-regrouping",
    "ops-09-multiplication-groups", "ops-11-area-multiplication",
    "ops-12-mult-2x2", "ops-13-division-sharing", "ops-14-long-division",
    "ops-15-word-problems",
    "frac-01-equal-parts", "frac-02-numberline", "frac-03-equivalent",
    "frac-04-comparing", "frac-05-adding-like",
    "geo-02-perimeter", "geo-03-area",
  ].includes(conceptId);
}
