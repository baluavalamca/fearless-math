/**
 * Flashcards — retrieval-practice study cards for a concept.
 * Cards are AUTO-DERIVED from the lesson's own glossary + revision card (plus any
 * authored flashcards), so every concept gets a deck with no extra authoring.
 * Tap to flip; rate "Got it" / "Review" (retrieval practice + spacing = the two
 * memory mechanisms the app's spaced-revision schedule already uses).
 */
import { useMemo, useState } from "react";
import { Concept } from "../api";
import { speak } from "../speech";

export interface Card { front: string; back: string }

/** Build a deck from what the lesson already contains. */
export function deckFor(concept: Concept): Card[] {
  const cards: Card[] = [];
  // 1) authored flashcards first (if any)
  for (const f of concept.flashcards ?? []) cards.push({ front: f.front, back: f.back });
  // 2) glossary terms → "What does X mean?"
  for (const v of concept.vocabulary ?? []) cards.push({ front: `What does “${v.term}” mean?`, back: v.meaning });
  // 3) the big idea
  if (concept.whatIsIt) cards.push({ front: `In one line: what is ${concept.name}?`, back: concept.whatIsIt });
  // 4) a worked example as a Q→A card
  const ex = (concept.workedExamples ?? [])[0];
  if (ex) cards.push({ front: ex.problem, back: `Answer: ${ex.answer}` });
  // 5) a "watch out" card from the mistake clinic
  const m = (concept.commonMistakes ?? [])[0];
  if (m) cards.push({ front: `Common trap: ${m.mistake}`, back: `Fix: ${m.fix}` });
  return cards.slice(0, 12);
}

export function Flashcards({ concept }: { concept: Concept }) {
  const cards = useMemo(() => deckFor(concept), [concept]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [reviewed, setReviewed] = useState(false);

  if (!cards.length) return <p className="fm-callout">No cards for this lesson yet.</p>;

  if (reviewed) {
    return (
      <div className="fm-fc-done">
        <p className="fm-fc-score">🌟 You knew <strong>{known.size}</strong> of <strong>{cards.length}</strong> cards!</p>
        <p className="fm-muted">{known.size === cards.length ? "Perfect — come back in a few days to keep it strong." : "Great start — flip through the ‘review’ ones again."}</p>
        <button className="fm-primary" onClick={() => { setI(0); setFlipped(false); setKnown(new Set()); setReviewed(false); }}>↻ Study again</button>
      </div>
    );
  }

  const card = cards[i];
  const rate = (ok: boolean) => {
    setKnown((k) => { const n = new Set(k); if (ok) n.add(i); else n.delete(i); return n; });
    if (i + 1 >= cards.length) setReviewed(true);
    else { setI(i + 1); setFlipped(false); }
  };

  return (
    <div className="fm-flashcards">
      <p className="fm-fc-progress">Card {i + 1} of {cards.length}</p>
      <button
        type="button"
        className={`fm-fc-card ${flipped ? "flipped" : ""}`}
        onClick={() => { const nx = !flipped; setFlipped(nx); speak(nx ? card.back : card.front, undefined, { style: "board" }); }}
        aria-label={flipped ? "Answer, tap to flip back" : "Question, tap to reveal"}
      >
        <span className="fm-fc-face">
          <span className="fm-fc-tag">{flipped ? "Answer" : "Question"}</span>
          <span className="fm-fc-text">{flipped ? card.back : card.front}</span>
          <span className="fm-fc-hint">{flipped ? "tap to flip back" : "tap to flip"}</span>
        </span>
      </button>
      <div className="fm-fc-actions">
        <button className="fm-secondary" onClick={() => rate(false)}>🔁 Review</button>
        <button className="fm-primary" onClick={() => rate(true)}>✅ Got it</button>
      </div>
    </div>
  );
}
