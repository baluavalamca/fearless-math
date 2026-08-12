/**
 * Practice screen — fear-free rules enforced in UI:
 * one question at a time, 3 hints before answer, warm feedback,
 * mistakes explained from authored content, never a red X.
 */
import { useEffect, useRef, useState } from "react";
import { AiStatus, Concept, Question, Verdict, aiUsable, api } from "../api";
import { VisualRenderer, VisualSpec } from "../components/VisualRenderer";
import { SpeakButton } from "../components/SpeakButton";
import { Character } from "../components/Characters";
import { ObjectIcon, hasObjectIcon } from "../components/ObjectIcon";
import { autoSpeak, speak, isAutoRead, randomPraise } from "../speech";
import { cheer, bigCheer } from "../celebrate";
import { Level, nextAdaptiveQuestion } from "../practiceFactory";

// How many questions an adaptive session runs for -- same "humane session size"
// as the old fixed 10-easy + 10-medium + 10-challenge ramp (30 total), just
// with the ORDER now driven by the learner's live streak instead of fixed blocks.
const ADAPTIVE_TOTAL = 30;
const LEVELS: Level[] = ["easy", "medium", "challenge"];

export function Practice({
  concept,
  questions,
  context,
  onDone,
  doneLabel,
  adaptive = false,
}: {
  concept: Concept;
  questions: Question[];
  context: "practice" | "mastery";
  onDone: () => void;
  doneLabel: string;
  /** When true, `questions` is just the warm-up seed batch -- Practice grows
   *  its own queue live via practiceFactory, picking easy/medium/challenge
   *  per-question from the learner's recent streak (2 strong -> harder,
   *  2 weak -> easier), instead of a fixed easy->medium->challenge ramp. */
  adaptive?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [answer, setAnswer] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [lastGiven, setLastGiven] = useState("");
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [aiWhy, setAiWhy] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [coach, setCoach] = useState<{ q: string; diag?: string } | null>(null);
  // "Ask it a different way" — same question, fresh wording, for a child stuck on the
  // phrasing rather than the maths. Only the displayed text changes; the answer key is
  // untouched (the original `q` object is still what gets submitted).
  const [rephrased, setRephrased] = useState<string | null>(null);
  const [rephraseBusy, setRephraseBusy] = useState(false);

  // Adaptive difficulty: a growing question pool (seeded from `questions`),
  // plus refs tracking the current level and a streak of strong/weak answers.
  // Refs (not state) so bookkeeping doesn't force extra renders -- only the
  // pool state update in next() actually needs to re-render the UI.
  const [pool, setPool] = useState<Question[]>(questions);
  const levelIdxRef = useRef(0); // 0=easy, 1=medium, 2=challenge
  const streakRef = useRef(0); // positive = correct-streak, negative = struggle-streak
  const seenRef = useRef<Set<string>>(new Set(questions.map((qq) => qq.q)));

  useEffect(() => { api.aiStatus().then(setAi).catch(() => setAi(null)); }, []);

  async function askDifferently() {
    if (!q) return;
    setRephraseBusy(true);
    const r = await api.aiRephrase({ conceptId: concept.id, questionId: q.id, question: q });
    setRephraseBusy(false);
    if (r.ok && r.question) {
      setRephrased(r.question);
      autoSpeak(r.question + (q.type === "mcq" ? " Choices: " + q.options!.map((o) => o.label).join(". Or: ") : ""));
    }
    // Silent fallback on failure — the original wording just stays on screen.
  }

  async function askWhy() {
    if (!q) return;
    setAiBusy(true);
    const r = await api.aiWhyWrong({ conceptId: concept.id, questionId: q.id, answerGiven: lastGiven });
    setAiBusy(false);
    if (r.ok && r.explanation) {
      const text = r.explanation + (r.encouragement ? " " + r.encouragement : "");
      setAiWhy(text);
      autoSpeak(text);
    } else {
      setAiWhy(null); // silent — authored hints already cover the child
    }
  }

  async function askCoach() {
    if (!q) return;
    setAiBusy(true);
    const r = await api.aiCoach({ conceptId: concept.id, questionId: q.id, answerGiven: lastGiven, question: q });
    setAiBusy(false);
    if (r.ok && r.question) {
      setCoach({ q: r.question, diag: r.diagnosis });
      autoSpeak(r.question + (r.encouragement ? " " + r.encouragement : ""));
    } else {
      setCoach(null); // silent fallback to authored hints
    }
  }

  // In adaptive mode `questions` is only the warm-up seed batch -- the real,
  // growing list is `pool` (grown in next()), and the session runs to a fixed
  // total instead of the seed batch's length. `list[idx]` naturally becomes
  // undefined once idx runs past whatever's been generated so far -- same
  // "finished" signal the original `questions[idx]` relied on.
  const list = adaptive ? pool : questions;
  const total = adaptive ? ADAPTIVE_TOTAL : questions.length;
  const q = list[idx];

  // Auto-read: question on arrival, each new hint, and feedback
  useEffect(() => {
    if (!q) return;
    autoSpeak(q.q + (q.type === "mcq" ? " Choices: " + q.options!.map((o) => o.label).join(". Or: ") : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => {
    if (q && hintsShown > 0 && !verdict) autoSpeak("Hint: " + q.hintLadder[hintsShown - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintsShown]);

  useEffect(() => {
    if (!verdict || !q) return;
    if (verdict.correct) {
      cheer(); // confetti
      // Always cheer aloud (kids love the encouragement); add the explanation only
      // when auto-read is on so we don't over-talk.
      const tail = isAutoRead() && verdict.explain ? " " + verdict.explain : "";
      speak(randomPraise() + tail, undefined, { style: "praise" });
    } else {
      autoSpeak(
        `Let's look again together. ${verdict.mistake ? "Robo Reason says: " + verdict.mistake.fix : q.hintLadder[Math.min(hintsShown, q.hintLadder.length - 1)]}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdict]);

  useEffect(() => { if (!q) bigCheer(); }, [q]);

  if (!q) {
    return (
      <div className="fm-celebrate">
        <p>You finished all the questions here! 🎉</p>
        <button className="fm-primary" onClick={onDone}>{doneLabel}</button>
      </div>
    );
  }

  async function submit(given: string) {
    setLastGiven(given);
    const v = await api.submitAnswer({
      conceptId: concept.id,
      questionId: q.id,
      context,
      answer: given,
      hintsUsed: hintsShown,
      question: q, // generated practice is judged from the inline question (still server-side)
    });
    setVerdict(v);
    setAiWhy(null);
    setCoach(null);

    // Adaptive difficulty: track a streak of strong (no hints, correct) vs.
    // weak (wrong, or needed 2+ hints) answers. Two in a row nudges the level
    // up or down; a mixed result resets the streak without changing level.
    if (adaptive) {
      const strong = v.correct && hintsShown === 0;
      const weak = !v.correct || hintsShown >= 2;
      if (strong) streakRef.current = streakRef.current > 0 ? streakRef.current + 1 : 1;
      else if (weak) streakRef.current = streakRef.current < 0 ? streakRef.current - 1 : -1;
      else streakRef.current = 0;
      if (streakRef.current >= 2 && levelIdxRef.current < LEVELS.length - 1) {
        levelIdxRef.current += 1;
        streakRef.current = 0;
      } else if (streakRef.current <= -2 && levelIdxRef.current > 0) {
        levelIdxRef.current -= 1;
        streakRef.current = 0;
      }
    }
  }

  function next() {
    // Grow the pool by one more question, at whatever level the streak has
    // earned, right before advancing -- so `list[idx+1]` is ready the moment
    // the next render reads it.
    if (adaptive && idx + 1 >= pool.length && pool.length < ADAPTIVE_TOTAL) {
      const lvl = LEVELS[levelIdxRef.current];
      const nq = nextAdaptiveQuestion(concept.id, lvl, seenRef.current, pool.length + 1);
      if (nq) {
        seenRef.current.add(nq.q);
        setPool((p) => [...p, nq]);
      }
    }
    setIdx(idx + 1);
    setHintsShown(0);
    setAnswer("");
    setVerdict(null);
    setAiWhy(null);
    setCoach(null);
    setRephrased(null);
  }

  const qVisual = q.visual as VisualSpec | undefined;

  const ruleLine = concept.standardMethod?.summary || concept.whatIsIt;

  return (
    <main className="fm-practice">
      {context === "practice" && (
        <details className="fm-recap">
          <summary>📘 Remember: {concept.name}</summary>
          <p className="fm-recap-what">{concept.whatIsIt}</p>
          {ruleLine && <p className="fm-recap-rule"><strong>Key idea:</strong> {ruleLine}</p>}
          {concept.visual?.component && <VisualRenderer visual={concept.visual as VisualSpec} />}
        </details>
      )}
      <p className="fm-progress">Question {idx + 1} of {total}</p>
      <h2 className="fm-question">
        {rephrased ?? q.q}{" "}
        <SpeakButton
          label="Read the question aloud"
          text={
            (rephrased ?? q.q) +
            (q.type === "mcq" ? " Choices: " + q.options!.map((o) => o.label).join(". Or: ") : "") +
            (hintsShown > 0 ? " Hints so far: " + q.hintLadder.slice(0, hintsShown).join(" Next hint: ") : "")
          }
        />
      </h2>
      {rephrased && <p className="fm-rephrase-note">🔄 Same question, said a different way.</p>}
      {!verdict && aiUsable(ai) && (
        <button className="fm-secondary fm-rephrase-btn" disabled={rephraseBusy} onClick={askDifferently}>
          🔄 {rephraseBusy ? "Robo is rewording…" : rephrased ? "Ask it yet another way" : "Ask it a different way"}
        </button>
      )}

      {qVisual?.component && <VisualRenderer visual={qVisual} />}

      {!verdict && (
        <>
          {q.type === "mcq" ? (
            <div className="fm-options">
              {q.options!.map((o) => (
                <button key={o.label} className="fm-option" onClick={() => submit(o.label)}>
                  {hasObjectIcon(o.label) && <ObjectIcon name={o.label} size={40} />}
                  <span>{o.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="fm-answer-row">
              <input
                className="fm-input"
                value={answer}
                placeholder={q.type === "fraction" ? "like 3/4" : "your answer"}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && answer && submit(answer)}
              />
              <button className="fm-primary" disabled={!answer} onClick={() => submit(answer)}>
                Check ✔
              </button>
            </div>
          )}

          <div className="fm-hints">
            {q.hintLadder.slice(0, hintsShown).map((h, i) => (
              <p key={i} className="fm-hint">💡 Hint {i + 1}: {h}</p>
            ))}
            {hintsShown < q.hintLadder.length && (
              <button className="fm-secondary" onClick={() => setHintsShown(hintsShown + 1)}>
                I'd like a hint 💡
              </button>
            )}
          </div>
        </>
      )}

      {verdict && (
        <div className={`fm-feedback ${verdict.correct ? "good" : "again"}`}>
          <SpeakButton
            label="Read the feedback aloud"
            text={
              verdict.correct
                ? `Wonderful! ${verdict.explain ?? "You got it!"}`
                : `Let's look again together — this is how we learn! ${verdict.mistake ? "Robo Reason says: " + verdict.mistake.fix : q.hintLadder[Math.min(hintsShown, q.hintLadder.length - 1)]}`
            }
          />
          {verdict.correct ? (
            <div className="fm-feedback-row">
              <Character name={concept.gameMission?.character ?? "Robo Reason"} mood="celebrate" size={72} />
              <div>
                <p>🌟 Wonderful! {verdict.explain ?? "You got it!"}</p>
                {hintsShown > 0 && <p className="fm-badge-note">🏅 Badge earned: Tried Again!</p>}
              </div>
            </div>
          ) : (
            <div className="fm-feedback-row">
              <Character name="Robo Reason" mood="think" size={72} />
              <div>
                <p>Let's look again together — this is how we learn! 🤗</p>
                {verdict.mistake && (
                  <p className="fm-fix"><strong>Robo Reason says:</strong> {verdict.mistake.fix}</p>
                )}
                {!verdict.mistake && hintsShown < q.hintLadder.length && (
                  <p className="fm-fix">💡 {q.hintLadder[hintsShown]}</p>
                )}
              </div>
            </div>
          )}
          {!verdict.correct && aiUsable(ai) && (
            <div className="fm-ai-row">
              <button className="fm-secondary" disabled={aiBusy} onClick={askCoach}>
                🤔 {aiBusy ? "Robo is thinking…" : "Coach me (give me a hint, not the answer)"}
              </button>
              <button className="fm-secondary" disabled={aiBusy} onClick={askWhy}>
                🤖 Why is my answer wrong?
              </button>
            </div>
          )}
          {coach && (
            <div className="fm-coach-panel">
              <p className="fm-coach-q">🦊 {coach.q}</p>
              <button className="fm-secondary" onClick={() => setVerdict(null)}>Let me try again 💪</button>
            </div>
          )}
          {aiWhy && <div className="fm-ai-panel">{aiWhy}</div>}
          {verdict.correct ? (
            <button className="fm-primary" onClick={next}>Next question →</button>
          ) : (
            <button className="fm-primary" onClick={() => setVerdict(null)}>Try again 💪</button>
          )}
        </div>
      )}
    </main>
  );
}
