/**
 * ObjectRow — a picture sequence of real objects (3D emoji), so questions about
 * "which is first?", "how many?", "more or fewer?" are SEEN, not read.
 * Interactive: a child can TAP each object to count it aloud (1, 2, 3 …) with a
 * pop badge — turning any picture row into a hands-on counting game.
 */
import { useState } from "react";
import { ObjectIcon } from "./ObjectIcon";
import { speak } from "../speech";

export interface SeqSpec {
  items: string[];        // emoji or object names, e.g. ["car","apple","truck"]
  markIndex?: number;     // 0-based item to highlight
  showOrdinal?: boolean;  // show 1st, 2nd, 3rd under each
  showCount?: boolean;    // show 1, 2, 3 under each
  label?: string;
  sizes?: number[];      // per-item icon size (big/small comparison)
}

const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
const NUM_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const numWord = (n: number) => NUM_WORDS[n] ?? String(n);

// Letter-counting mode (A, B, C …) — kids learn the alphabet order the same way
// they learn 1, 2, 3. The nth tap gets the nth letter.
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const letterFor = (n: number) => LETTERS[(n - 1) % 26]; // n is 1-based
// Spell the letter out warmly so the built-in voice says it clearly.
const LETTER_WORDS: Record<string, string> = {
  A: "ay", B: "bee", C: "see", D: "dee", E: "ee", F: "eff", G: "jee", H: "aitch",
  I: "eye", J: "jay", K: "kay", L: "el", M: "em", N: "en", O: "oh", P: "pee",
  Q: "cue", R: "ar", S: "ess", T: "tee", U: "you", V: "vee", W: "double you",
  X: "eks", Y: "why", Z: "zed",
};
const letterWord = (ch: string) => LETTER_WORDS[ch] ?? ch;

function Row({ s }: { s: SeqSpec }) {
  const [counted, setCounted] = useState<number[]>([]);
  const [letters, setLetters] = useState(false); // false = 1,2,3 (default); true = A,B,C

  function tap(i: number) {
    if (counted.includes(i)) return;
    const order = counted.length + 1;
    setCounted((c) => [...c, i]);
    // say the count aloud in the chosen mode
    speak(letters ? letterWord(letterFor(order)) : numWord(order), undefined, { style: "board" });
  }

  const badge = (order: number) => (letters ? letterFor(order) : order); // 1-based order

  return (
    <div className="fm-objrow">
      {s.items.map((it, i) => {
        const tapped = counted.includes(i);
        return (
          <button
            type="button"
            className={`fm-objtile fm-objtap ${s.markIndex === i ? "mark" : ""} ${tapped ? "tapped" : ""}`}
            key={i}
            style={{ animationDelay: `${i * 90}ms` }}
            onClick={() => tap(i)}
            aria-label={`${it}${tapped ? `, counted ${badge(counted.indexOf(i) + 1)}` : ", tap to count"}`}
          >
            <ObjectIcon name={it} size={s.sizes?.[i] ?? 48} />
            {tapped
              ? <span className="fm-objcount">{badge(counted.indexOf(i) + 1)}</span>
              : s.showOrdinal ? <span className="fm-objbadge">{ORD[i] ?? i + 1 + "th"}</span>
              : s.showCount ? <span className="fm-objbadge">{i + 1}</span>
              : null}
          </button>
        );
      })}
      {s.label && <span className="fm-strip-label">{s.label}</span>}
      <button
        type="button"
        className="fm-objmode"
        onClick={() => { setLetters((v) => !v); setCounted([]); }}
        aria-label={letters ? "Switch to counting with numbers" : "Switch to counting with letters"}
      >
        {letters ? "🔢 1 2 3" : "🔤 A B C"}
      </button>
      {counted.length > 0 && (
        <button type="button" className="fm-objreset" onClick={() => setCounted([])}>↺ count again</button>
      )}
    </div>
  );
}

export function ObjectRow({ sequences, caption }: { sequences: SeqSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      {sequences.map((s, si) => <Row key={si} s={s} />)}
      <figcaption>{caption ? caption + " · " : ""}Tip: tap each picture to count out loud!</figcaption>
    </figure>
  );
}
