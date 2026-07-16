/**
 * Lesson Player — teaches in CPA order, one idea at a time:
 * story → visual → meaning → method(s) → worked examples → practice → mastery.
 * The method switcher is the runtime face of the Methodology Engine.
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { AiStatus, Concept, aiUsable, api } from "../api";
import { VisualRenderer, VisualSpec } from "../components/VisualRenderer";
import { SpeakButton } from "../components/SpeakButton";
import { GeneratedExample, generateExample, hasGenerator } from "../exampleFactory";
import { generatePractice, hasPracticeGen } from "../practiceFactory";
import { autoSpeak, stopSpeaking } from "../speech";
import { Character } from "../components/Characters";
import { ConceptImageModal } from "../components/ConceptImageModal";
import { Flashcards } from "../components/Flashcards";
import { ConceptInfographic } from "../components/ConceptInfographic";
import { Practice } from "./Practice";

type Tab = "story" | "picture" | "gallery" | "meaning" | "steps" | "anotherWay" | "examples" | "flashcards" | "infographic";

const STEP_NAME: Record<string, string> = { story: "Story", picture: "Picture", gallery: "See it", meaning: "Meaning", steps: "Steps", anotherWay: "Another way", examples: "Examples", flashcards: "Cards", infographic: "Poster" };
type UIMethod = { kind: string; name: string; whenToUse: string; steps: string[]; example: string; visual?: unknown };
/** Gather every taught method into one ordered, labeled list — the Methodology Engine. */
function collectMethods(c: Concept): UIMethod[] {
  const out: UIMethod[] = [];
  if (c.abacusMethod) out.push({ kind: "🧮 Abacus", ...c.abacusMethod });
  if (c.mentalMathMethod) out.push({ kind: "🧠 Mental Math", ...c.mentalMathMethod });
  if (c.vedicMethod) out.push({ kind: "⚡ Vedic", ...c.vedicMethod });
  (c.alternateMethods ?? []).forEach((m) => out.push({ kind: "🔀 Another Way", ...m }));
  return out;
}

export function LessonPlayer({
  concept,
  onExit,
}: {
  concept: Concept;
  onExit: () => void;
}) {
  const [tab, setTab] = useState<Tab>("story");
  const [mode, setMode] = useState<"learn" | "trick" | "practice" | "mastery" | "done">("learn");
  const [masteryMsg, setMasteryMsg] = useState<string | null>(null);
  const [gen, setGen] = useState<GeneratedExample | null>(null);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [aiText, setAiText] = useState<{ explanation: string; example: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [maxStep, setMaxStep] = useState(0);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [imgStyle, setImgStyle] = useState<"story" | "poster" | "board" | null>(null);
  const methods = collectMethods(concept);

  useEffect(() => { api.aiStatus().then(setAi).catch(() => setAi(null)); }, []);

  async function askAi(style: "simpler" | "story" | "real-life" | "more-examples" | "fun-fact") {
    setAiBusy(true);
    setAiText(null);
    const r = await api.aiExplain({ conceptId: concept.id, style });
    setAiBusy(false);
    if (r.ok && r.explanation) {
      setAiText({ explanation: r.explanation, example: r.example ?? "" });
      autoSpeak(r.explanation + (r.example ? " For example: " + r.example : ""));
    } else {
      // Silent fallback to authored content — never an error for the child
      setAiText({ explanation: concept.whatIsIt + " " + concept.whyNeeded, example: "" });
    }
  }

  /** Text of the current tab, for the voice readout. */
  function tabText(): string {
    switch (tab) {
      case "story":
        return `${concept.story.title}. ${concept.story.text} The math inside the story: ${concept.story.extractedProblem} Answer: ${concept.story.answerInStory}`;
      case "picture":
        return concept.visual.caption;
      case "gallery":
        return (concept.teachingGallery ?? [])
          .map((g) => `${g.title}. ${g.note ?? ""} ${g.examples.map((e) => e.caption).join(". ")}`)
          .join(" Next: ");
      case "meaning":
        return `What is it? ${concept.whatIsIt} Why do we need it? ${concept.whyNeeded} Where do we see it in life? ${concept.realLifeUses.join(". ")}`;
      case "steps":
        return `${concept.standardMethod.summary} ${concept.standardMethod.steps.join(" ")}`;
      case "anotherWay":
        return methods
          .map((m) => `${m.kind}. ${m.name}. Best when: ${m.whenToUse}. ${m.steps.join(" ")} Example: ${m.example}`)
          .join(" Next method: ");
      case "examples": {
        const authored = concept.workedExamples
          .map((ex, i) => `Example ${i + 1}: ${ex.problem} ${ex.steps.join(" ")} Answer: ${ex.answer}.`)
          .join(" ");
        const extra = gen ? ` Fresh example: ${gen.problem} ${gen.steps.join(" ")} Answer: ${gen.answer}.` : "";
        return authored + extra;
      }
      case "flashcards":
        return "Flashcards. Flip each card, then rate yourself: got it, or review.";
      case "infographic":
        return `${concept.name} — one-page summary. ${concept.revisionCard.summary}`;
    }
  }

  const tabs = useMemo(() => {
    const t: { id: Tab; label: string }[] = [
      { id: "story", label: "📖 Story" },
      { id: "picture", label: "🖼️ Picture" },
    ];
    if (concept.teachingGallery?.length) t.push({ id: "gallery", label: "👀 See it" });
    t.push({ id: "meaning", label: "💡 Meaning" });
    t.push({ id: "steps", label: "🪜 Steps" });
    if (methods.length) t.push({ id: "anotherWay", label: "🔀 Another Way" });
    t.push({ id: "examples", label: "✅ Examples" });
    // Optional review tabs (do not gate practice) — study cards + a one-page poster.
    t.push({ id: "flashcards", label: "🃏 Cards" });
    t.push({ id: "infographic", label: "📊 Poster" });
    return t;
  }, [concept]);

  // Practice questions: unlimited generated set (>=25/level available) when a
  // generator exists, else the authored questions. Fresh each time the lesson opens.
  const PRACTICE_PER_LEVEL = 10; // humane session size; the generator pool is unlimited
  const practiceQuestions = useMemo(() => {
    if (hasPracticeGen(concept.id)) {
      return [
        ...generatePractice(concept.id, "easy", PRACTICE_PER_LEVEL),
        ...generatePractice(concept.id, "medium", PRACTICE_PER_LEVEL),
        ...generatePractice(concept.id, "challenge", PRACTICE_PER_LEVEL),
      ];
    }
    return [...concept.practice.easy, ...concept.practice.medium, ...concept.practice.challenge];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept.id]);

  // Auto-read: speak the current learn tab when it changes; stop on unmount
  useEffect(() => {
    if (mode === "learn") autoSpeak(tabText());
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mode]);

  // Auto-read the celebration + revision card
  useEffect(() => {
    if (mode === "done" && masteryMsg) {
      autoSpeak(`${masteryMsg} Remember: ${concept.revisionCard.summary}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function finishMastery(teachBackDone: boolean) {
    const r = await api.finishMastery({ conceptId: concept.id, teachBackDone });
    if (r.status === "mastered") {
      setMasteryMsg(`⭐ Mastered! Score ${(r.score! * 100).toFixed(0)}%. ${concept.gameMission?.character ?? "Your guide"} is proud of you!`);
      setMode("done");
    } else if (r.teachBackPending) {
      setMasteryMsg("Almost there — now explain it in your own words!");
    } else {
      setMasteryMsg("Good try! Let's practice a little more — every mistake teaches us something.");
      setMode("practice");
    }
  }

  const stepIdx = tabs.findIndex((t) => t.id === tab);
  // Practice unlocks once the learner has reached "Examples" (the end of the core
  // teaching flow). The Cards + Poster tabs after it are OPTIONAL review, so they
  // never block practice.
  const coreLast = useMemo(() => { const i = tabs.findIndex((t) => t.id === "examples"); return i >= 0 ? i : tabs.length - 1; }, [tabs]);
  useEffect(() => { setMaxStep((m) => Math.max(m, stepIdx)); }, [stepIdx]);
  const canPractice = maxStep >= coreLast;
  const startPractice = () => {
    if (canPractice) { setGateMsg(null); setMode("practice"); }
    else {
      setGateMsg("Let's learn it first! 🦊 Read through to Examples, then Practice opens.");
      setTab(tabs[Math.min(maxStep + 1, coreLast)].id);
    }
  };

  return (
    <div className="fm-lesson">
      <header className="fm-lesson-head">
        <button className="fm-back" onClick={onExit}>← Grove</button>
        {concept.gameMission?.character && (
          <Character
            name={concept.gameMission.character}
            mood={mode === "done" ? "celebrate" : "happy"}
            size={56}
          />
        )}
        <h1>{concept.name}</h1>
        {concept.gameMission && <span className="fm-mission">Mission: {concept.gameMission.title}</span>}
      </header>

      {mode === "learn" && (
        <>
          <nav className="fm-stepper" aria-label="Lesson steps">
            {tabs.map((t, i) => (
              <Fragment key={t.id}>
                {i > 0 && <span className={`fm-step-line ${i <= stepIdx ? "filled" : ""}`} />}
                <button
                  className={`fm-step ${i < stepIdx ? "done" : i === stepIdx ? "current" : "todo"}`}
                  onClick={() => setTab(t.id)}
                >
                  <span className="fm-step-dot">{i < stepIdx ? "✓" : i + 1}</span>
                  <span className="fm-step-label">{STEP_NAME[t.id] ?? t.label}</span>
                </button>
              </Fragment>
            ))}
            <span className="fm-step-line" />
            <button
              className={`fm-step ${canPractice ? "current" : "locked"}`}
              onClick={startPractice}
              title={canPractice ? "Start practice" : "Finish the lesson to unlock practice"}
              aria-disabled={!canPractice}
            >
              <span className="fm-step-dot">{canPractice ? "★" : "🔒"}</span>
              <span className="fm-step-label">Practice</span>
            </button>
          </nav>
          {gateMsg && <p className="fm-gate-msg">{gateMsg}</p>}

          <main className="fm-canvas">
            <div className="fm-canvas-tools">
              <SpeakButton text={tabText()} label="Read this page aloud" style={tab === "story" ? "story" : (tab === "steps" || tab === "anotherWay") ? "board" : "concept"} />
            </div>
            {tab === "story" && (
              <article>
                <h2>{concept.story.title}</h2>
                <div className="fm-guide">
                  {concept.gameMission?.character && (
                    <Character name={concept.gameMission.character} mood="happy" size={56} />
                  )}
                  <p className="fm-bubble fm-story">{concept.story.text}</p>
                </div>
                <div className="fm-callout">
                  <strong>The math inside the story:</strong> {concept.story.extractedProblem}
                  <br /><strong>Answer:</strong> {concept.story.answerInStory}
                </div>
                <button className="fm-picture-btn" onClick={() => setImgStyle("story")}>✨ Picture this story</button>
              </article>
            )}
            {tab === "picture" && <VisualRenderer visual={concept.visual} />}
            {tab === "gallery" && (
              <article className="fm-gallery">
                <p className="fm-gallery-lead">👀 <strong>See it first.</strong> Look at each picture — the word will make sense when you can SEE it.</p>
                {(concept.teachingGallery ?? []).map((g, gi) => (
                  <section className="fm-gallery-group" key={gi}>
                    <h2>{g.title}</h2>
                    {g.note && <p className="fm-gallery-note">{g.note}</p>}
                    <div className="fm-gallery-grid">
                      {g.examples.map((ex, ei) => (
                        <VisualRenderer key={ei} visual={ex as VisualSpec} />
                      ))}
                    </div>
                  </section>
                ))}
              </article>
            )}
            {tab === "meaning" && (
              <article>
                <h2>What is it?</h2><p>{concept.whatIsIt}</p>
                <h2>Why do we need it?</h2><p>{concept.whyNeeded}</p>
                <h2>Where do we see it in life?</h2>
                <ul>{concept.realLifeUses.map((u, i) => <li key={i}>{u}</li>)}</ul>
                <h2>Words to know</h2>
                <div className="fm-vocab-chips">
                  {concept.vocabulary.map((v) => (
                    <span key={v.term} className="fm-vocab-chip"><strong>{v.term}</strong> — {v.meaning}</span>
                  ))}
                </div>
                {(concept.funFacts ?? []).map((f, i) => (
                  <p key={i} className="fm-funfact">💡 <strong>Did you know?</strong> {f}</p>
                ))}
                <button className="fm-picture-btn" onClick={() => setImgStyle("poster")}>✨ Picture this concept</button>
              </article>
            )}
            {tab === "steps" && (
              <article>
                <h2>{concept.standardMethod.summary}</h2>
                <StepReveal steps={concept.standardMethod.steps} />
              </article>
            )}
            {tab === "anotherWay" && methods.length > 0 && (
              <article className="fm-ways">
                <p className="fm-ways-intro">🧭 One problem — <strong>many ways to solve it</strong>. Tap a card to open it and try the way that clicks for you!</p>

                {concept.trickPractice && (
                  <div className="fm-way-card star">
                    <div className="fm-way-top">
                      <span className="fm-way-badge">⭐ Easiest way</span>
                      <span className="fm-way-title">{concept.trickPractice.trick}</span>
                    </div>
                    <p className="fm-way-when">{concept.trickPractice.intro}</p>
                    <button className="fm-primary" onClick={() => setMode("trick")}>Practice this trick ⚡</button>
                  </div>
                )}

                {methods.map((m, i) => (
                  <details className="fm-way-card" key={i} open={i === 0}>
                    <summary className="fm-way-summary">
                      <span className="fm-way-title">{m.kind} · {m.name}</span>
                      <span className="fm-way-chev">▾</span>
                    </summary>
                    <div className="fm-way-body">
                      <p className="fm-way-when">👉 <strong>Use this when:</strong> {m.whenToUse}</p>
                      {m.visual ? <VisualRenderer visual={m.visual as VisualSpec} /> : null}
                      <ol className="fm-way-steps">
                        {m.steps.map((s, si) => <li key={si}>{s}</li>)}
                      </ol>
                      <p className="fm-callout">✏️ See it work: {m.example}</p>
                      <SpeakButton label="Hear this way" style="board" text={`${m.name}. Use this when ${m.whenToUse}. ${m.steps.join(" ")} Example: ${m.example}`} />
                    </div>
                  </details>
                ))}
              </article>
            )}
            {tab === "examples" && (
              <article>
                {concept.workedExamples.map((ex, i) => (
                  <section key={i} className="fm-worked">
                    <h2>Example {i + 1}</h2>
                    <p><strong>{ex.problem}</strong></p>
                    {ex.visual ? <VisualRenderer visual={ex.visual as VisualSpec} /> : null}
                    <StepReveal steps={ex.steps} />
                    <p className="fm-answer">Answer: {ex.answer}</p>
                  </section>
                ))}
                {gen && (
                  <section className="fm-worked fm-generated">
                    <h2>🎲 Fresh Example</h2>
                    <p><strong>{gen.problem}</strong></p>
                    {gen.visual && <VisualRenderer visual={gen.visual} />}
                    <StepReveal key={gen.problem} steps={gen.steps} />
                    <p className="fm-answer">Answer: {gen.answer}</p>
                  </section>
                )}
                {hasGenerator(concept.id) && (
                  <div className="fm-gen-row">
                    <button className="fm-primary" onClick={() => setGen(generateExample(concept.id))}>
                      🎲 {gen ? "Another one, please!" : "Show me a new example!"}
                    </button>
                    <span className="fm-gen-note">Endless practice examples — a new one every click.</span>
                  </div>
                )}
              </article>
            )}
            {tab === "flashcards" && (
              <article>
                <p className="fm-tab-intro">🃏 Flip each card, then rate yourself — the best way to make it stick.</p>
                <Flashcards concept={concept} />
              </article>
            )}
            {tab === "infographic" && (
              <article>
                <ConceptInfographic concept={concept} />
              </article>
            )}
          </main>

          {aiUsable(ai) && (
            <div className="fm-ai-row">
              <span className="fm-ai-label">🤖 Robo can help more:</span>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("simpler")}>Simpler words</button>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("more-examples")}>➕ More examples</button>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("story")}>As a story</button>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("real-life")}>Real-life example</button>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("fun-fact")}>✨ Fun fact</button>
            </div>
          )}
          {aiBusy && <p className="fm-ai-busy">🤖 Robo Reason is thinking…</p>}
          {aiText && (
            <div className="fm-ai-panel">
              <p>{aiText.explanation}</p>
              {aiText.example && <p className="fm-callout">{aiText.example}</p>}
            </div>
          )}

          <footer className="fm-lesson-foot">
            {(() => {
              const ci = tabs.findIndex((t) => t.id === tab);
              return (
                <>
                  <button className="fm-secondary" disabled={ci <= 0}
                    onClick={() => { if (ci > 0) setTab(tabs[ci - 1].id); }}>← Back</button>
                  <span className="fm-foot-spacer" />
                  {ci < tabs.length - 1
                    ? <button className="fm-primary" onClick={() => setTab(tabs[ci + 1].id)}>Next →</button>
                    : <button className="fm-primary" onClick={startPractice}>I'm ready to try! ✏️</button>}
                </>
              );
            })()}
          </footer>
        </>
      )}

      {mode === "trick" && concept.trickPractice && (
        <div className="fm-trick-drill">
          <div className="fm-trick-banner">⚡ Trick drill: <strong>{concept.trickPractice.trick}</strong> — {concept.trickPractice.intro}</div>
          <Practice
            concept={concept}
            context="practice"
            questions={concept.trickPractice.questions}
            onDone={() => setMode("learn")}
            doneLabel="Back to the lesson ←"
          />
        </div>
      )}

      {mode === "practice" && (
        <Practice
          concept={concept}
          context="practice"
          questions={practiceQuestions}
          onDone={() => setMode("mastery")}
          doneLabel="Take the Mastery Mission 🏆"
        />
      )}

      {mode === "mastery" && (
        <>
          <Practice
            concept={concept}
            context="mastery"
            questions={concept.masteryCheck.questions}
            onDone={() => finishMastery(false)}
            doneLabel="Finish Mission"
          />
          {masteryMsg && (
            <div className="fm-teachback">
              <p>{masteryMsg}</p>
              <p className="fm-callout">{concept.teachBackPrompt}</p>
              <button className="fm-primary" onClick={() => finishMastery(true)}>
                I explained it! ✅
              </button>
            </div>
          )}
        </>
      )}

      {mode === "done" && (
        <div className="fm-celebrate">
          {concept.gameMission?.character && (
            <Character name={concept.gameMission.character} mood="celebrate" size={120} />
          )}
          <p>{masteryMsg}</p>
          <p className="fm-callout">📝 Remember card: {concept.revisionCard.summary}</p>
          {concept.realLifeProject && (
            <p className="fm-callout">🏠 Try at home: {concept.realLifeProject}</p>
          )}
          <button className="fm-primary" onClick={onExit}>Back to Ganita Grove 🌳</button>
        </div>
      )}

      {imgStyle && (
        <ConceptImageModal concept={concept} initialStyle={imgStyle} onClose={() => setImgStyle(null)} />
      )}
    </div>
  );
}

/** Progressive disclosure: one step at a time — never a wall of math. */
function StepReveal({ steps }: { steps: string[] }) {
  const [shown, setShown] = useState(1);
  return (
    <div>
      <ol>{steps.slice(0, shown).map((s, i) => <li key={i}>{s}</li>)}</ol>
      {shown < steps.length && (
        <button className="fm-secondary" onClick={() => setShown(shown + 1)}>Next step →</button>
      )}
    </div>
  );
}
