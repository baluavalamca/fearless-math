/**
 * Practice screen — fear-free rules enforced in UI:
 * one question at a time, 3 hints before answer, warm feedback,
 * mistakes explained from authored content, never a red X.
 */
import { useEffect, useState } from "react";
import { AiStatus, Concept, Question, Verdict, aiUsable, api } from "../api";
import { VisualRenderer, VisualSpec } from "../components/VisualRenderer";
import { SpeakButton } from "../components/SpeakButton";
import { Character } from "../components/Characters";
import { ObjectIcon, hasObjectIcon } from "../components/ObjectIcon";
import { autoSpeak, speak, isAutoRead, randomPraise } from "../speech";
import { cheer, bigCheer } from "../celebrate";

export function Practice({
  concept,
  questions,
  context,
  onDone,
  doneLabel,
}: {
  concept: Concept;
  questions: Question[];
  context: "practice" | "mastery";
  onDone: () => void;
  doneLabel: string;
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

  useEffect(() => { api.aiStatus().then(setAi).catch(() => setAi(null)); }, []);

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

  const q = questions[idx];

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
  }

  function next() {
    setIdx(idx + 1);
    setHintsShown(0);
    setAnswer("");
    setVerdict(null);
    setAiWhy(null);
    setCoach(null);
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
      <p className="fm-progress">Question {idx + 1} of {questions.length}</p>
      <h2 className="fm-question">
        {q.q}{" "}
        <SpeakButton
          label="Read the question aloud"
          text={
            q.q +
            (q.type === "mcq" ? " Choices: " + q.options!.map((o) => o.label).join(". Or: ") : "") +
            (hintsShown > 0 ? " Hints so far: " + q.hintLadder.slice(0, hintsShown).join(" Next hint: ") : "")
          }
        />
      </h2>

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
