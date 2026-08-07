/**
 * Textbook Mode — an alternate, NCERT-guidebook-style presentation of a
 * concept for parents/kids who want the classic "read the chapter, then do
 * the exercises" flow instead of the app's story-first CPA teaching order.
 *
 * Structure (modelled on real NCERT chapters — numbered subsections with
 * definitions/worked examples, a formulas/summary box — PLUS the revision
 * structure of CBSE guide books, which NCERT itself doesn't include:
 * Multiple Choice Questions, Fill in the Blanks, and a standalone Glossary):
 *   1. Introduction
 *   2. Key Formulas & Values      (if the concept has any)
 *   3.. Numbered subtopics: How it works, Worked Examples, Another Way,
 *      Common Mistakes to Avoid   (each only if the concept has content)
 *   +. Multiple Choice Questions
 *   +. Fill in the Blanks
 *   +. Glossary
 *   +. Chapter Summary
 *
 * Deliberately built ENTIRELY by recomposing fields every concept already
 * has (whatIsIt/whyNeeded/realLifeUses/vocabulary/formulas/standardMethod/
 * workedExamples/alternateMethods/commonMistakes/practice/revisionCard) —
 * no new content authoring needed, so it works for all concepts immediately.
 * The one genuinely new piece, Fill in the Blanks, is generated deterministically
 * from those same fields (generateFillBlanks below) rather than authored.
 */
import { useEffect, useMemo, useState } from "react";
import { Concept, Question } from "../api";
import { VisualRenderer, VisualSpec } from "./VisualRenderer";
import { MathTex } from "./Math";
import { SpeakButton } from "./SpeakButton";
import { autoSpeak, stopSpeaking } from "../speech";

/* ---------------- Fill-in-the-blank generator ---------------- */
interface BlankItem { sentence: string; answer: string; hint?: string }

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:]+$/g, "").replace(/\s+/g, " ");
}

export function generateFillBlanks(c: Concept): BlankItem[] {
  const items: BlankItem[] = [];
  for (const v of c.vocabulary.slice(0, 4)) {
    if (!v.term || !v.meaning) continue;
    items.push({ sentence: `______ means: ${v.meaning}`, answer: v.term, hint: `Starts with "${v.term[0].toUpperCase()}"` });
  }
  for (const f of (c.formulas ?? []).slice(0, 3)) {
    if (!f.name || !f.formula) continue;
    items.push({ sentence: `The rule "${f.formula}" is called the ______ formula.`, answer: f.name });
  }
  for (const [i, ex] of c.workedExamples.slice(0, 3).entries()) {
    if (!ex.answer) continue;
    items.push({ sentence: `In Example ${i + 1} (${ex.problem}), the answer is ______.`, answer: ex.answer, hint: `Look at "Worked Examples" above` });
  }
  return items.slice(0, 8);
}

/* ---------------- Section model ---------------- */
type SectionId = "intro" | "formulas" | "how" | "examples" | "another" | "mistakes" | "mcq" | "blanks" | "glossary" | "summary";
interface Section { id: SectionId; num: string; label: string; icon: string }

function buildSections(c: Concept): Section[] {
  const s: Section[] = [];
  let n = 1;
  s.push({ id: "intro", num: `${n++}`, label: "Introduction", icon: "📘" });
  if ((c.formulas?.length ?? 0) > 0) s.push({ id: "formulas", num: `${n++}`, label: "Key Formulas & Values", icon: "📐" });
  s.push({ id: "how", num: `${n++}`, label: "How It Works", icon: "🪜" });
  if (c.workedExamples.length > 0) s.push({ id: "examples", num: `${n++}`, label: "Worked Examples", icon: "✅" });
  const hasAnother = !!(c.abacusMethod || c.mentalMathMethod || c.vedicMethod || (c.alternateMethods?.length ?? 0) > 0);
  if (hasAnother) s.push({ id: "another", num: `${n++}`, label: "Another Way", icon: "🔀" });
  if (c.commonMistakes.length > 0) s.push({ id: "mistakes", num: `${n++}`, label: "Common Mistakes to Avoid", icon: "⚠️" });
  s.push({ id: "mcq", num: `${n++}`, label: "Multiple Choice Questions", icon: "📝" });
  s.push({ id: "blanks", num: `${n++}`, label: "Fill in the Blanks", icon: "✏️" });
  if (c.vocabulary.length > 0) s.push({ id: "glossary", num: `${n++}`, label: "Glossary", icon: "📚" });
  s.push({ id: "summary", num: `${n++}`, label: "Chapter Summary", icon: "🏁" });
  return s;
}

/** Pull a small, varied MCQ set out of whatever practice/mastery pools exist. */
function pickMcqs(c: Concept, count = 8): Question[] {
  const pools = [...c.practice.easy, ...c.practice.medium, ...c.masteryCheck.questions, ...c.practice.challenge];
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of pools) {
    if (q.type !== "mcq" || !q.options?.length) continue;
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
    if (out.length >= count) break;
  }
  return out;
}

/* ---------------- Component ---------------- */
export function TextbookMode({ concept, onExit }: { concept: Concept; onExit: () => void }) {
  const sections = useMemo(() => buildSections(concept), [concept]);
  const [active, setActive] = useState<SectionId>(sections[0].id);
  const [tocOpen, setTocOpen] = useState(true);
  const mcqs = useMemo(() => pickMcqs(concept), [concept]);
  const blanks = useMemo(() => generateFillBlanks(concept), [concept]);

  useEffect(() => { setActive(sections[0].id); }, [concept, sections]);

  const idx = sections.findIndex((s) => s.id === active);
  const section = sections[idx] ?? sections[0];

  const readText = useMemo(() => sectionSpeechText(concept, section.id, mcqs, blanks), [concept, section.id, mcqs, blanks]);

  useEffect(() => {
    autoSpeak(readText);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readText]);

  const methods = collectTextbookMethods(concept);

  return (
    <div className="fm-textbook">
      <header className="fm-tb-head">
        <button className="fm-back" onClick={onExit}>← Back to lesson</button>
        <h1 className="fm-tb-title">📘 {concept.name} <span className="fm-tb-subtitle">— Chapter Guide</span></h1>
        <button className="fm-tb-toc-toggle" onClick={() => setTocOpen((v) => !v)} aria-expanded={tocOpen}>
          {tocOpen ? "☰ Hide contents" : "☰ Contents"}
        </button>
      </header>

      <div className="fm-tb-body">
        <nav className={`fm-tb-toc ${tocOpen ? "open" : "closed"}`} aria-label="Chapter contents">
          <div className="fm-tb-toc-head">📖 Chapter Contents</div>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <button
                  className={`fm-tb-toc-item ${s.id === active ? "active" : ""} ${i < idx ? "visited" : ""}`}
                  onClick={() => setActive(s.id)}
                >
                  <span className="fm-tb-toc-num">{s.num}</span>
                  <span className="fm-tb-toc-icon">{s.icon}</span>
                  <span className="fm-tb-toc-label">{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="fm-tb-page">
          <div className="fm-tb-page-tools">
            <SpeakButton text={readText} label="Read this section aloud" style="board" />
          </div>
          <article className="fm-tb-section">
            <h2 className="fm-tb-h2"><span className="fm-tb-h2-num">{section.num}</span> {section.icon} {section.label}</h2>
            {section.id === "intro" && <IntroSection concept={concept} />}
            {section.id === "formulas" && <FormulasSection concept={concept} />}
            {section.id === "how" && <HowSection concept={concept} />}
            {section.id === "examples" && <ExamplesSection concept={concept} />}
            {section.id === "another" && <AnotherSection methods={methods} concept={concept} />}
            {section.id === "mistakes" && <MistakesSection concept={concept} />}
            {section.id === "mcq" && <McqSection questions={mcqs} />}
            {section.id === "blanks" && <BlanksSection items={blanks} />}
            {section.id === "glossary" && <GlossarySection concept={concept} />}
            {section.id === "summary" && <SummarySection concept={concept} />}
          </article>

          <footer className="fm-tb-foot">
            <button className="fm-secondary" disabled={idx <= 0} onClick={() => setActive(sections[idx - 1].id)}>← Previous section</button>
            <span className="fm-tb-foot-progress">{idx + 1} / {sections.length}</span>
            {idx < sections.length - 1
              ? <button className="fm-primary" onClick={() => setActive(sections[idx + 1].id)}>Next section →</button>
              : <button className="fm-primary" onClick={onExit}>Finish chapter ✅</button>}
          </footer>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Sections ---------------- */
function IntroSection({ concept: c }: { concept: Concept }) {
  return (
    <>
      <p className="fm-tb-lead">{c.whatIsIt}</p>
      <h3>Why do we need it?</h3>
      <p>{c.whyNeeded}</p>
      <h3>Where do we see it in life?</h3>
      <ul>{c.realLifeUses.map((u, i) => <li key={i}>{u}</li>)}</ul>
      {c.rememberIt && (
        <div className="fm-remember">
          <span className="fm-remember-badge">🧠 Remember it</span>
          <p className="fm-remember-hook">{c.rememberIt.hook}</p>
          {c.rememberIt.unpack && <p className="fm-remember-unpack">{c.rememberIt.unpack}</p>}
        </div>
      )}
    </>
  );
}

function FormulasSection({ concept: c }: { concept: Concept }) {
  return (
    <div className="fm-formulas">
      {(c.formulas ?? []).map((f, i) => (
        <div key={i} className="fm-formula-card">
          <div className="fm-formula-top">
            <span className="fm-formula-name">{f.name}</span>
            <span className="fm-formula-eq"><MathTex>{f.formula}</MathTex></span>
          </div>
          {f.remember && <p className="fm-formula-remember">🧠 {f.remember}</p>}
          {f.whenToUse && <p className="fm-formula-when">👉 {f.whenToUse}</p>}
        </div>
      ))}
    </div>
  );
}

function HowSection({ concept: c }: { concept: Concept }) {
  return (
    <>
      <p className="fm-tb-lead">{c.standardMethod.summary}</p>
      <ol className="fm-tb-steps">{c.standardMethod.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <div className="fm-tb-visual"><VisualRenderer visual={c.visual as VisualSpec} /></div>
    </>
  );
}

function ExamplesSection({ concept: c }: { concept: Concept }) {
  return (
    <>
      {c.workedExamples.map((ex, i) => (
        <section key={i} className="fm-worked fm-tb-example">
          <h3>Example {i + 1}</h3>
          <p><strong>{ex.problem}</strong></p>
          {ex.visual ? <VisualRenderer visual={ex.visual as VisualSpec} /> : null}
          <ol>{ex.steps.map((s, si) => <li key={si}>{s}</li>)}</ol>
          <p className="fm-answer">Answer: {ex.answer}</p>
        </section>
      ))}
    </>
  );
}

function collectTextbookMethods(c: Concept) {
  const out: { kind: string; name: string; whenToUse: string; steps: string[]; example: string; visual?: unknown }[] = [];
  if (c.abacusMethod) out.push({ kind: "🧮 Abacus", ...c.abacusMethod });
  if (c.mentalMathMethod) out.push({ kind: "🧠 Mental Math", ...c.mentalMathMethod });
  if (c.vedicMethod) out.push({ kind: "⚡ Vedic", ...c.vedicMethod });
  (c.alternateMethods ?? []).forEach((m) => out.push({ kind: "🔀 Another Way", ...m }));
  return out;
}

function AnotherSection({ methods }: { methods: ReturnType<typeof collectTextbookMethods>; concept: Concept }) {
  return (
    <>
      {methods.map((m, i) => (
        <div key={i} className="fm-tb-example">
          <h3>{m.kind} — {m.name}</h3>
          <p className="fm-tb-lead">👉 <strong>Use this when:</strong> {m.whenToUse}</p>
          {m.visual ? <VisualRenderer visual={m.visual as VisualSpec} /> : null}
          <ol>{m.steps.map((s, si) => <li key={si}>{s}</li>)}</ol>
          <p className="fm-callout">✏️ {m.example}</p>
        </div>
      ))}
    </>
  );
}

function MistakesSection({ concept: c }: { concept: Concept }) {
  return (
    <div className="fm-tb-mistakes">
      {c.commonMistakes.map((m, i) => (
        <div key={i} className="fm-tb-mistake-card">
          <p className="fm-tb-mistake-wrong">❌ {m.mistake}</p>
          <p className="fm-tb-mistake-fix">✅ {m.fix}</p>
        </div>
      ))}
    </div>
  );
}

function McqSection({ questions }: { questions: Question[] }) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  if (!questions.length) return <p className="fm-tb-lead">No multiple-choice questions available for this chapter yet.</p>;
  return (
    <div className="fm-tb-mcq-list">
      {questions.map((q, i) => {
        const chosen = picked[q.id];
        return (
          <div key={q.id} className="fm-tb-mcq-card">
            <p className="fm-tb-mcq-q"><strong>{i + 1}.</strong> {q.q}</p>
            <div className="fm-tb-mcq-options">
              {(q.options ?? []).map((opt) => {
                const isChosen = chosen === opt.label;
                const isCorrect = opt.label === q.answer;
                const show = chosen != null;
                return (
                  <button
                    key={opt.label}
                    className={`fm-tb-mcq-opt ${show && isChosen ? (isCorrect ? "correct" : "wrong") : ""} ${show && !isChosen && isCorrect ? "reveal-correct" : ""}`}
                    onClick={() => setPicked((p) => ({ ...p, [q.id]: opt.label }))}
                    disabled={show}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {chosen != null && (
              <p className={`fm-tb-mcq-feedback ${chosen === q.answer ? "good" : "bad"}`}>
                {chosen === q.answer ? "✅ Correct!" : `✗ Not quite — the answer is ${q.answer}.`}
                {q.explain ? ` ${q.explain}` : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BlanksSection({ items }: { items: BlankItem[] }) {
  const [vals, setVals] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  if (!items.length) return <p className="fm-tb-lead">No fill-in-the-blank questions available for this chapter yet.</p>;
  return (
    <div className="fm-tb-blanks-list">
      {items.map((it, i) => {
        const isChecked = checked[i];
        const val = vals[i] ?? "";
        const isRight = isChecked && normalize(val) === normalize(it.answer);
        return (
          <div key={i} className="fm-tb-blank-card">
            <p className="fm-tb-blank-sentence"><strong>{i + 1}.</strong> {it.sentence}</p>
            <div className="fm-tb-blank-row">
              <input
                className="fm-input fm-tb-blank-input"
                value={val}
                placeholder="Type your answer"
                disabled={isChecked}
                onChange={(e) => setVals((p) => ({ ...p, [i]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && !isChecked) setChecked((p) => ({ ...p, [i]: true })); }}
              />
              {!isChecked
                ? <button className="fm-secondary" onClick={() => setChecked((p) => ({ ...p, [i]: true }))}>Check</button>
                : <span className={`fm-tb-blank-result ${isRight ? "good" : "bad"}`}>{isRight ? "✅ Correct!" : `✗ Answer: ${it.answer}`}</span>}
            </div>
            {it.hint && !isChecked && <p className="fm-tb-blank-hint">💡 {it.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}

function GlossarySection({ concept: c }: { concept: Concept }) {
  const sorted = [...c.vocabulary].sort((a, b) => a.term.localeCompare(b.term));
  return (
    <dl className="fm-tb-glossary">
      {sorted.map((v) => (
        <div key={v.term} className="fm-tb-glossary-item">
          <dt>{v.term}</dt>
          <dd>{v.meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

function SummarySection({ concept: c }: { concept: Concept }) {
  return (
    <>
      <div className="fm-callout fm-tb-summary-box">📝 {c.revisionCard.summary}</div>
      {(c.funFacts ?? []).map((f, i) => (
        <p key={i} className="fm-funfact">💡 <strong>Did you know?</strong> {f}</p>
      ))}
      {c.realLifeProject && (
        <p className="fm-callout">🏠 <strong>Try at home:</strong> {c.realLifeProject}</p>
      )}
    </>
  );
}

/* ---------------- Voice text per section ---------------- */
function sectionSpeechText(c: Concept, id: SectionId, mcqs: Question[], blanks: BlankItem[]): string {
  switch (id) {
    case "intro":
      return `${c.whatIsIt} Why do we need it? ${c.whyNeeded} Where do we see it in life? ${c.realLifeUses.join(". ")}`;
    case "formulas":
      return (c.formulas ?? []).map((f) => `${f.name}: ${f.formula}. ${f.remember ?? ""}`).join(" ");
    case "how":
      return `${c.standardMethod.summary} ${c.standardMethod.steps.join(" ")}`;
    case "examples":
      return c.workedExamples.map((ex, i) => `Example ${i + 1}: ${ex.problem} ${ex.steps.join(" ")} Answer: ${ex.answer}.`).join(" ");
    case "another":
      return collectTextbookMethods(c).map((m) => `${m.name}. Use this when ${m.whenToUse}. ${m.steps.join(" ")}`).join(" Next: ");
    case "mistakes":
      return c.commonMistakes.map((m) => `Watch out: ${m.mistake} Instead: ${m.fix}`).join(" ");
    case "mcq":
      return `Multiple choice questions. ${mcqs.length} questions to try. Read each question and pick your answer.`;
    case "blanks":
      return `Fill in the blanks. ${blanks.length} sentences to complete. Type the missing word for each one.`;
    case "glossary":
      return c.vocabulary.map((v) => `${v.term}: ${v.meaning}`).join(". ");
    case "summary":
      return `Chapter summary. ${c.revisionCard.summary}`;
  }
}
