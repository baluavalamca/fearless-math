/**
 * Abacus step engine — turns "a op b" into an ordered sequence of abacus frames
 * so the app can show HOW the answer is built on the beads, not just the final
 * result. Implements the real soroban "friend approach" (5-complements and
 * 10-complements) used by abacus tutors, so the moves shown are the same ones
 * a human abacus teacher would narrate:
 *   - 5-complement pairs (borrow/give back the top "5" bead): 1&4, 2&3
 *   - 10-complement pairs (carry/borrow a group to the next rod): 1&9, 2&8, 3&7, 4&6, 5&5
 * Reference: standard soroban curricula (e.g. the "friend approach" taught in
 * Japanese-style abacus lessons for addition/subtraction with regrouping).
 */

export interface AbacusFrame {
  value: number;
  caption: string;
}

export type AbacusOperation =
  | { kind: "addSubtract"; a: number; b: number; op: "add" | "subtract" }
  | { kind: "accumulate"; start: number; startLabel?: string; parts: number[]; partLabels?: string[] };

const PLACE_NAMES = ["ones", "tens", "hundreds", "thousands", "ten-thousands", "lakhs"];
const placeName = (i: number) => PLACE_NAMES[i] ?? `10^${i}`;

function digitsOf(n: number): number[] {
  // index 0 = ones place
  const v = Math.max(0, Math.floor(Math.abs(n)));
  if (v === 0) return [0];
  const out: number[] = [];
  let x = v;
  while (x > 0) { out.push(x % 10); x = Math.floor(x / 10); }
  return out;
}
function fromDigits(d: number[]): number {
  let v = 0;
  for (let i = d.length - 1; i >= 0; i--) v = v * 10 + d[i];
  return v;
}

export function buildAddSteps(a: number, b: number): AbacusFrame[] {
  const digits = digitsOf(a);
  const frames: AbacusFrame[] = [{ value: fromDigits(digits), caption: `Set ${a} on the rods.` }];
  const bd = digitsOf(b);
  let carry = 0;
  const maxLen = Math.max(digits.length, bd.length) + 1;
  for (let i = 0; i < maxLen; i++) {
    const d = (bd[i] ?? 0) + carry;
    if (d === 0) { carry = 0; continue; }
    while (digits.length <= i) digits.push(0);
    const r = digits[i];
    const t = r + d;
    const place = placeName(i);
    if (t <= 9) {
      const re = r % 5, rh = r >= 5 ? 1 : 0;
      const de = d % 5, dh = d >= 5 ? 1 : 0;
      digits[i] = t;
      carry = 0;
      if (re + de <= 4 && rh + dh <= 1) {
        frames.push({ value: fromDigits(digits), caption: `Push ${d} more bead${d === 1 ? "" : "s"} on the ${place} rod.` });
      } else {
        const friend = 5 - d;
        frames.push({ value: fromDigits(digits), caption: `No loose beads left below on the ${place} rod — slide down the top 5-bead, then slide back ${friend} (the 5-friend of ${d}). Net change: +${d}.` });
      }
    } else {
      const friend = 10 - d;
      digits[i] = t - 10;
      carry = 1;
      frames.push({
        value: fromDigits(digits),
        caption: friend === 0
          ? `The ${place} rod is exactly full — send 1 group up to the next rod and this rod resets to 0.`
          : `The ${place} rod overflows past 9 — send 1 group up to the next rod, then slide back ${friend} here (the 10-friend of ${d}).`,
      });
    }
  }
  frames.push({ value: fromDigits(digits), caption: `${a} + ${b} = ${fromDigits(digits)}. Read the beads touching the bar, rod by rod.` });
  return frames;
}

export function buildSubtractSteps(a: number, b: number): AbacusFrame[] {
  const digits = digitsOf(a);
  const frames: AbacusFrame[] = [{ value: fromDigits(digits), caption: `Set ${a} on the rods.` }];
  const bd = digitsOf(b);
  let borrow = 0;
  const maxLen = Math.max(digits.length, bd.length);
  for (let i = 0; i < maxLen; i++) {
    const d = (bd[i] ?? 0) + borrow;
    if (d === 0) { borrow = 0; continue; }
    while (digits.length <= i) digits.push(0);
    const r = digits[i];
    const place = placeName(i);
    if (r >= d) {
      const re = r % 5, rh = r >= 5 ? 1 : 0;
      const de = d % 5, dh = d >= 5 ? 1 : 0;
      digits[i] = r - d;
      borrow = 0;
      if (re >= de && rh >= dh) {
        frames.push({ value: fromDigits(digits), caption: `Slide away ${d} bead${d === 1 ? "" : "s"} from the ${place} rod.` });
      } else {
        const friend = 5 - d;
        frames.push({ value: fromDigits(digits), caption: `Not enough loose beads on the ${place} rod to take ${d} straight away — add ${friend} first (the 5-friend of ${d}), then slide away the top 5-bead.` });
      }
    } else {
      const friend = 10 - d;
      digits[i] = r + 10 - d;
      borrow = 1;
      frames.push({ value: fromDigits(digits), caption: `Not enough on the ${place} rod for ${d} — borrow 1 group from the next rod (that's 10 more here), then slide away ${d}${friend ? `, leaving ${friend} behind` : ""}.` });
    }
  }
  frames.push({ value: fromDigits(digits), caption: `${a} − ${b} = ${fromDigits(digits)}. Read the beads touching the bar, rod by rod.` });
  return frames;
}

export function buildAccumulateSteps(start: number, startLabel: string | undefined, parts: number[], partLabels?: string[]): AbacusFrame[] {
  const frames: AbacusFrame[] = [{ value: start, caption: startLabel ?? `Start at ${start}.` }];
  let value = start;
  parts.forEach((p, i) => {
    value += p;
    const label = partLabels?.[i];
    frames.push({
      value,
      caption: label ?? (p >= 0 ? `Add ${p} more → ${value}.` : `Take away ${-p} → ${value}.`),
    });
  });
  return frames;
}

export function buildAbacusSteps(op: AbacusOperation): AbacusFrame[] {
  if (op.kind === "addSubtract") {
    return op.op === "add" ? buildAddSteps(op.a, op.b) : buildSubtractSteps(op.a, op.b);
  }
  return buildAccumulateSteps(op.start, op.startLabel, op.parts, op.partLabels);
}
