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
 *
 * All chrome (section labels, buttons, feedback, hint sentences, and the
 * voice-narration connector phrases) is translated en/hi/te via the T table
 * below, following the same per-screen dictionary pattern as Dictionary.tsx
 * and FunFacts.tsx. The concept's own content (whatIsIt, formulas, worked
 * examples, vocabulary, revisionCard…) is already in the active language
 * because it comes from whichever language pack is currently loaded.
 */
import { useEffect, useMemo, useState } from "react";
import { Concept, Question } from "../api";
import { VisualRenderer, VisualSpec } from "./VisualRenderer";
import { MathTex } from "./Math";
import { SpeakButton } from "./SpeakButton";
import { autoSpeak, stopSpeaking } from "../speech";
import { DictLang } from "../data/mathDictionary";

/* ---------------- Fill-in-the-blank generator ---------------- */
interface BlankItem { sentence: string; answer: string; hint?: string }

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:]+$/g, "").replace(/\s+/g, " ");
}

function generateFillBlanksLang(c: Concept, t: T): BlankItem[] {
  const items: BlankItem[] = [];
  for (const v of c.vocabulary.slice(0, 4)) {
    if (!v.term || !v.meaning) continue;
    items.push({ sentence: t.blankMeans(v.meaning), answer: v.term, hint: t.blankStartsWith(v.term[0].toUpperCase()) });
  }
  for (const f of (c.formulas ?? []).slice(0, 3)) {
    if (!f.name || !f.formula) continue;
    items.push({ sentence: t.blankFormulaSentence(f.formula), answer: f.name });
  }
  for (const [i, ex] of c.workedExamples.slice(0, 3).entries()) {
    if (!ex.answer) continue;
    items.push({ sentence: t.blankExampleSentence(i + 1, ex.problem), answer: ex.answer, hint: t.blankLookAtExamples });
  }
  return items.slice(0, 8);
}

/** Back-compat named export (English) — used by earlier tests/tools. */
export function generateFillBlanks(c: Concept): BlankItem[] {
  return generateFillBlanksLang(c, T.en);
}

/* ---------------- Section model ---------------- */
type SectionId = "intro" | "formulas" | "how" | "examples" | "another" | "mistakes" | "mcq" | "blanks" | "glossary" | "summary";
interface Section { id: SectionId; num: string; label: string; icon: string }

function buildSections(c: Concept, t: T): Section[] {
  const s: Section[] = [];
  let n = 1;
  s.push({ id: "intro", num: `${n++}`, label: t.section.intro, icon: "📘" });
  if ((c.formulas?.length ?? 0) > 0) s.push({ id: "formulas", num: `${n++}`, label: t.section.formulas, icon: "📐" });
  s.push({ id: "how", num: `${n++}`, label: t.section.how, icon: "🪜" });
  if (c.workedExamples.length > 0) s.push({ id: "examples", num: `${n++}`, label: t.section.examples, icon: "✅" });
  const hasAnother = !!(c.abacusMethod || c.mentalMathMethod || c.vedicMethod || (c.alternateMethods?.length ?? 0) > 0);
  if (hasAnother) s.push({ id: "another", num: `${n++}`, label: t.section.another, icon: "🔀" });
  if (c.commonMistakes.length > 0) s.push({ id: "mistakes", num: `${n++}`, label: t.section.mistakes, icon: "⚠️" });
  s.push({ id: "mcq", num: `${n++}`, label: t.section.mcq, icon: "📝" });
  s.push({ id: "blanks", num: `${n++}`, label: t.section.blanks, icon: "✏️" });
  if (c.vocabulary.length > 0) s.push({ id: "glossary", num: `${n++}`, label: t.section.glossary, icon: "📚" });
  s.push({ id: "summary", num: `${n++}`, label: t.section.summary, icon: "🏁" });
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
export function TextbookMode({ concept, lang = "en", onExit }: { concept: Concept; lang?: DictLang; onExit: () => void }) {
  const t = T[lang] ?? T.en;
  const sections = useMemo(() => buildSections(concept, t), [concept, t]);
  const [active, setActive] = useState<SectionId>(sections[0].id);
  const [tocOpen, setTocOpen] = useState(true);
  const mcqs = useMemo(() => pickMcqs(concept), [concept]);
  const blanks = useMemo(() => generateFillBlanksLang(concept, t), [concept, t]);

  useEffect(() => { setActive(sections[0].id); }, [concept, sections]);

  const idx = sections.findIndex((s) => s.id === active);
  const section = sections[idx] ?? sections[0];

  const readText = useMemo(() => sectionSpeechText(concept, section.id, mcqs, blanks, t), [concept, section.id, mcqs, blanks, t]);

  useEffect(() => {
    autoSpeak(readText);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readText]);

  const methods = collectTextbookMethods(concept);

  return (
    <div className="fm-textbook">
      <header className="fm-tb-head">
        <button className="fm-back" onClick={onExit}>{t.backToLesson}</button>
        <h1 className="fm-tb-title">📘 {concept.name} <span className="fm-tb-subtitle">— {t.chapterGuide}</span></h1>
        <button className="fm-tb-toc-toggle" onClick={() => setTocOpen((v) => !v)} aria-expanded={tocOpen}>
          {tocOpen ? t.hideContents : t.showContents}
        </button>
      </header>

      <div className="fm-tb-body">
        <nav className={`fm-tb-toc ${tocOpen ? "open" : "closed"}`} aria-label={t.chapterContents}>
          <div className="fm-tb-toc-head">📖 {t.chapterContents}</div>
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
            <SpeakButton text={readText} label={t.readAloud} style="board" />
          </div>
          <article className="fm-tb-section">
            <h2 className="fm-tb-h2"><span className="fm-tb-h2-num">{section.num}</span> {section.icon} {section.label}</h2>
            {section.id === "intro" && <IntroSection concept={concept} t={t} />}
            {section.id === "formulas" && <FormulasSection concept={concept} />}
            {section.id === "how" && <HowSection concept={concept} />}
            {section.id === "examples" && <ExamplesSection concept={concept} t={t} />}
            {section.id === "another" && <AnotherSection methods={methods} t={t} />}
            {section.id === "mistakes" && <MistakesSection concept={concept} />}
            {section.id === "mcq" && <McqSection questions={mcqs} t={t} />}
            {section.id === "blanks" && <BlanksSection items={blanks} t={t} />}
            {section.id === "glossary" && <GlossarySection concept={concept} />}
            {section.id === "summary" && <SummarySection concept={concept} t={t} />}
          </article>

          <footer className="fm-tb-foot">
            <button className="fm-secondary" disabled={idx <= 0} onClick={() => setActive(sections[idx - 1].id)}>{t.previousSection}</button>
            <span className="fm-tb-foot-progress">{idx + 1} / {sections.length}</span>
            {idx < sections.length - 1
              ? <button className="fm-primary" onClick={() => setActive(sections[idx + 1].id)}>{t.nextSection}</button>
              : <button className="fm-primary" onClick={onExit}>{t.finishChapter}</button>}
          </footer>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Sections ---------------- */
function IntroSection({ concept: c, t }: { concept: Concept; t: T }) {
  return (
    <>
      <p className="fm-tb-lead">{c.whatIsIt}</p>
      <h3>{t.whyNeeded}</h3>
      <p>{c.whyNeeded}</p>
      <h3>{t.whereSeeInLife}</h3>
      <ul>{c.realLifeUses.map((u, i) => <li key={i}>{u}</li>)}</ul>
      {c.rememberIt && (
        <div className="fm-remember">
          <span className="fm-remember-badge">{t.rememberIt}</span>
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

function ExamplesSection({ concept: c, t }: { concept: Concept; t: T }) {
  return (
    <>
      {c.workedExamples.map((ex, i) => (
        <section key={i} className="fm-worked fm-tb-example">
          <h3>{t.example} {i + 1}</h3>
          <p><strong>{ex.problem}</strong></p>
          {ex.visual ? <VisualRenderer visual={ex.visual as VisualSpec} /> : null}
          <ol>{ex.steps.map((s, si) => <li key={si}>{s}</li>)}</ol>
          <p className="fm-answer">{t.answer} {ex.answer}</p>
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
  (c.alternateMethods ?? []).forEach((m) => out.push({ kind: "🔀", ...m }));
  return out;
}

function AnotherSection({ methods, t }: { methods: ReturnType<typeof collectTextbookMethods>; t: T }) {
  return (
    <>
      {methods.map((m, i) => (
        <div key={i} className="fm-tb-example">
          <h3>{m.kind} — {m.name}</h3>
          <p className="fm-tb-lead">👉 <strong>{t.useThisWhen}</strong> {m.whenToUse}</p>
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

function McqSection({ questions, t }: { questions: Question[]; t: T }) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  if (!questions.length) return <p className="fm-tb-lead">{t.noMcq}</p>;
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
                {chosen === q.answer ? t.correct : t.notQuite(q.answer)}
                {q.explain ? ` ${q.explain}` : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BlanksSection({ items, t }: { items: BlankItem[]; t: T }) {
  const [vals, setVals] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  if (!items.length) return <p className="fm-tb-lead">{t.noBlanks}</p>;
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
                placeholder={t.typeYourAnswer}
                disabled={isChecked}
                onChange={(e) => setVals((p) => ({ ...p, [i]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && !isChecked) setChecked((p) => ({ ...p, [i]: true })); }}
              />
              {!isChecked
                ? <button className="fm-secondary" onClick={() => setChecked((p) => ({ ...p, [i]: true }))}>{t.check}</button>
                : <span className={`fm-tb-blank-result ${isRight ? "good" : "bad"}`}>{isRight ? t.blankCorrect : t.blankAnswer(it.answer)}</span>}
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

function SummarySection({ concept: c, t }: { concept: Concept; t: T }) {
  return (
    <>
      <div className="fm-callout fm-tb-summary-box">📝 {c.revisionCard.summary}</div>
      {(c.funFacts ?? []).map((f, i) => (
        <p key={i} className="fm-funfact">{t.didYouKnow} {f}</p>
      ))}
      {c.realLifeProject && (
        <p className="fm-callout">{t.tryAtHome} {c.realLifeProject}</p>
      )}
    </>
  );
}

/* ---------------- Voice text per section ---------------- */
function sectionSpeechText(c: Concept, id: SectionId, mcqs: Question[], blanks: BlankItem[], t: T): string {
  switch (id) {
    case "intro":
      return `${c.whatIsIt} ${t.whyNeeded} ${c.whyNeeded} ${t.whereSeeInLife} ${c.realLifeUses.join(". ")}`;
    case "formulas":
      return (c.formulas ?? []).map((f) => `${f.name}: ${f.formula}. ${f.remember ?? ""}`).join(" ");
    case "how":
      return `${c.standardMethod.summary} ${c.standardMethod.steps.join(" ")}`;
    case "examples":
      return c.workedExamples.map((ex, i) => `${t.example} ${i + 1}: ${ex.problem} ${ex.steps.join(" ")} ${t.answer} ${ex.answer}.`).join(" ");
    case "another":
      return collectTextbookMethods(c).map((m) => `${m.name}. ${t.useThisWhen} ${m.whenToUse}. ${m.steps.join(" ")}`).join(` ${t.next} `);
    case "mistakes":
      return c.commonMistakes.map((m) => `${t.watchOut} ${m.mistake} ${t.instead} ${m.fix}`).join(" ");
    case "mcq":
      return t.speechMcqIntro(mcqs.length);
    case "blanks":
      return t.speechBlanksIntro(blanks.length);
    case "glossary":
      return c.vocabulary.map((v) => `${v.term}: ${v.meaning}`).join(". ");
    case "summary":
      return `${t.speechChapterSummary} ${c.revisionCard.summary}`;
  }
}

/* ---------------- UI-chrome translations (en / hi / te) ---------------- */
interface T {
  backToLesson: string;
  chapterGuide: string;
  hideContents: string;
  showContents: string;
  chapterContents: string;
  readAloud: string;
  previousSection: string;
  nextSection: string;
  finishChapter: string;
  section: Record<SectionId, string>;
  whyNeeded: string;
  whereSeeInLife: string;
  rememberIt: string;
  useThisWhen: string;
  example: string;
  answer: string;
  next: string;
  watchOut: string;
  instead: string;
  noMcq: string;
  correct: string;
  notQuite: (answer: string) => string;
  noBlanks: string;
  typeYourAnswer: string;
  check: string;
  blankCorrect: string;
  blankAnswer: (answer: string) => string;
  didYouKnow: string;
  tryAtHome: string;
  blankMeans: (meaning: string) => string;
  blankStartsWith: (letter: string) => string;
  blankFormulaSentence: (formula: string) => string;
  blankExampleSentence: (num: number, problem: string) => string;
  blankLookAtExamples: string;
  speechMcqIntro: (count: number) => string;
  speechBlanksIntro: (count: number) => string;
  speechChapterSummary: string;
}

const T: Record<DictLang, T> = {
  en: {
    backToLesson: "← Back to lesson",
    chapterGuide: "Chapter Guide",
    hideContents: "☰ Hide contents",
    showContents: "☰ Contents",
    chapterContents: "Chapter Contents",
    readAloud: "Read this section aloud",
    previousSection: "← Previous section",
    nextSection: "Next section →",
    finishChapter: "Finish chapter ✅",
    section: {
      intro: "Introduction",
      formulas: "Key Formulas & Values",
      how: "How It Works",
      examples: "Worked Examples",
      another: "Another Way",
      mistakes: "Common Mistakes to Avoid",
      mcq: "Multiple Choice Questions",
      blanks: "Fill in the Blanks",
      glossary: "Glossary",
      summary: "Chapter Summary",
    },
    whyNeeded: "Why do we need it?",
    whereSeeInLife: "Where do we see it in life?",
    rememberIt: "🧠 Remember it",
    useThisWhen: "Use this when:",
    example: "Example",
    answer: "Answer:",
    next: "Next:",
    watchOut: "Watch out:",
    instead: "Instead:",
    noMcq: "No multiple-choice questions available for this chapter yet.",
    correct: "✅ Correct!",
    notQuite: (ans) => `✗ Not quite — the answer is ${ans}.`,
    noBlanks: "No fill-in-the-blank questions available for this chapter yet.",
    typeYourAnswer: "Type your answer",
    check: "Check",
    blankCorrect: "✅ Correct!",
    blankAnswer: (ans) => `✗ Answer: ${ans}`,
    didYouKnow: "💡 Did you know?",
    tryAtHome: "🏠 Try at home:",
    blankMeans: (meaning) => `______ means: ${meaning}`,
    blankStartsWith: (letter) => `Starts with "${letter}"`,
    blankFormulaSentence: (formula) => `The rule "${formula}" is called the ______ formula.`,
    blankExampleSentence: (num, problem) => `In Example ${num} (${problem}), the answer is ______.`,
    blankLookAtExamples: `Look at "Worked Examples" above`,
    speechMcqIntro: (count) => `Multiple choice questions. ${count} questions to try. Read each question and pick your answer.`,
    speechBlanksIntro: (count) => `Fill in the blanks. ${count} sentences to complete. Type the missing word for each one.`,
    speechChapterSummary: "Chapter summary.",
  },
  hi: {
    backToLesson: "← पाठ पर वापस जाएँ",
    chapterGuide: "अध्याय गाइड",
    hideContents: "☰ सामग्री छुपाएँ",
    showContents: "☰ सामग्री",
    chapterContents: "अध्याय सामग्री",
    readAloud: "यह भाग ज़ोर से पढ़ें",
    previousSection: "← पिछला भाग",
    nextSection: "अगला भाग →",
    finishChapter: "अध्याय पूरा करें ✅",
    section: {
      intro: "परिचय",
      formulas: "मुख्य सूत्र और मान",
      how: "यह कैसे काम करता है",
      examples: "हल किए गए उदाहरण",
      another: "एक और तरीका",
      mistakes: "बचने योग्य सामान्य गलतियाँ",
      mcq: "बहुविकल्पीय प्रश्न",
      blanks: "रिक्त स्थान भरें",
      glossary: "शब्दावली",
      summary: "अध्याय सारांश",
    },
    whyNeeded: "हमें इसकी आवश्यकता क्यों है?",
    whereSeeInLife: "हम इसे जीवन में कहाँ देखते हैं?",
    rememberIt: "🧠 याद रखें",
    useThisWhen: "इसका उपयोग कब करें:",
    example: "उदाहरण",
    answer: "उत्तर:",
    next: "आगे:",
    watchOut: "ध्यान दें:",
    instead: "इसके बजाय:",
    noMcq: "इस अध्याय के लिए अभी कोई बहुविकल्पीय प्रश्न उपलब्ध नहीं हैं।",
    correct: "✅ सही!",
    notQuite: (ans) => `✗ सही नहीं — सही उत्तर है ${ans}।`,
    noBlanks: "इस अध्याय के लिए अभी कोई रिक्त-स्थान प्रश्न उपलब्ध नहीं हैं।",
    typeYourAnswer: "अपना उत्तर लिखें",
    check: "जाँचें",
    blankCorrect: "✅ सही!",
    blankAnswer: (ans) => `✗ उत्तर: ${ans}`,
    didYouKnow: "💡 क्या आप जानते हैं?",
    tryAtHome: "🏠 घर पर आज़माएँ:",
    blankMeans: (meaning) => `______ का अर्थ है: ${meaning}`,
    blankStartsWith: (letter) => `"${letter}" से शुरू होता है`,
    blankFormulaSentence: (formula) => `नियम "${formula}" को ______ सूत्र कहते हैं।`,
    blankExampleSentence: (num, problem) => `उदाहरण ${num} (${problem}) में, उत्तर ______ है।`,
    blankLookAtExamples: `ऊपर "हल किए गए उदाहरण" देखें`,
    speechMcqIntro: (count) => `बहुविकल्पीय प्रश्न। कोशिश करने के लिए ${count} प्रश्न हैं। हर प्रश्न पढ़ें और अपना उत्तर चुनें।`,
    speechBlanksIntro: (count) => `रिक्त स्थान भरें। पूरा करने के लिए ${count} वाक्य हैं। हर एक के लिए छूटा हुआ शब्द लिखें।`,
    speechChapterSummary: "अध्याय सारांश।",
  },
  te: {
    backToLesson: "← పాఠానికి తిరిగి వెళ్ళండి",
    chapterGuide: "అధ్యాయ మార్గదర్శి",
    hideContents: "☰ విషయసూచిక దాచు",
    showContents: "☰ విషయసూచిక",
    chapterContents: "అధ్యాయ విషయసూచిక",
    readAloud: "ఈ భాగాన్ని బిగ్గరగా చదవండి",
    previousSection: "← మునుపటి భాగం",
    nextSection: "తదుపరి భాగం →",
    finishChapter: "అధ్యాయం పూర్తి చేయండి ✅",
    section: {
      intro: "పరిచయం",
      formulas: "ముఖ్య సూత్రాలు మరియు విలువలు",
      how: "ఇది ఎలా పనిచేస్తుంది",
      examples: "సాధించిన ఉదాహరణలు",
      another: "మరో మార్గం",
      mistakes: "నివారించవలసిన సాధారణ తప్పులు",
      mcq: "బహుళైచ్ఛిక ప్రశ్నలు",
      blanks: "ఖాళీలను పూరించండి",
      glossary: "పదకోశం",
      summary: "అధ్యాయ సారాంశం",
    },
    whyNeeded: "మనకు ఇది ఎందుకు అవసరం?",
    whereSeeInLife: "దీన్ని జీవితంలో ఎక్కడ చూస్తాము?",
    rememberIt: "🧠 గుర్తుంచుకోండి",
    useThisWhen: "దీన్ని ఎప్పుడు ఉపయోగించాలి:",
    example: "ఉదాహరణ",
    answer: "సమాధానం:",
    next: "తరువాత:",
    watchOut: "గమనించండి:",
    instead: "బదులుగా:",
    noMcq: "ఈ అధ్యాయానికి ఇంకా బహుళైచ్ఛిక ప్రశ్నలు అందుబాటులో లేవు.",
    correct: "✅ సరైనది!",
    notQuite: (ans) => `✗ సరికాదు — సరైన సమాధానం ${ans}.`,
    noBlanks: "ఈ అధ్యాయానికి ఇంకా ఖాళీలను పూరించే ప్రశ్నలు అందుబాటులో లేవు.",
    typeYourAnswer: "మీ సమాధానం టైప్ చేయండి",
    check: "తనిఖీ చేయండి",
    blankCorrect: "✅ సరైనది!",
    blankAnswer: (ans) => `✗ సమాధానం: ${ans}`,
    didYouKnow: "💡 మీకు తెలుసా?",
    tryAtHome: "🏠 ఇంట్లో ప్రయత్నించండి:",
    blankMeans: (meaning) => `______ అంటే: ${meaning}`,
    blankStartsWith: (letter) => `"${letter}"తో మొదలవుతుంది`,
    blankFormulaSentence: (formula) => `"${formula}" నియమాన్ని ______ సూత్రం అంటారు.`,
    blankExampleSentence: (num, problem) => `ఉదాహరణ ${num} (${problem})లో, సమాధానం ______.`,
    blankLookAtExamples: `పైన "సాధించిన ఉదాహరణలు" చూడండి`,
    speechMcqIntro: (count) => `బహుళైచ్ఛిక ప్రశ్నలు. ప్రయత్నించడానికి ${count} ప్రశ్నలు ఉన్నాయి. ప్రతి ప్రశ్నను చదివి మీ సమాధానాన్ని ఎంచుకోండి.`,
    speechBlanksIntro: (count) => `ఖాళీలను పూరించండి. పూర్తి చేయడానికి ${count} వాక్యాలు ఉన్నాయి. ప్రతిదానికి తప్పిపోయిన పదాన్ని టైప్ చేయండి.`,
    speechChapterSummary: "అధ్యాయ సారాంశం.",
  },
};
