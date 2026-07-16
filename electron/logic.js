/**
 * Pure learning logic — no Electron, no DB. Unit-testable with plain Node.
 * The local "math truth layer": answers are judged here, never by AI.
 */

/** Normalize a free-text answer for comparison. */
function normalize(s) {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parse "a/b" into [a, b] or null. */
function parseFraction(s) {
  const m = String(s ?? "").trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
}

/**
 * Check a child's answer against the authored key.
 * Returns { correct, mistakeTag|null, explain|null }.
 * - mcq: exact option match; wrong options carry authored mistakeTags
 * - fraction: exact parts match (2/6 is the expected canonical form for
 *   "2 of 6 parts"; equivalence like 1/3 is a LATER concept and is flagged
 *   as 'equivalent-not-asked' so the UI can respond kindly, not as wrong-wrong)
 * - number: numeric equality
 * - text: normalized string match
 */
function checkAnswer(question, given) {
  const g = normalize(given);
  const key = normalize(question.answer);

  if (question.type === "mcq") {
    if (g === key) return { correct: true, mistakeTag: null, explain: question.explain || null };
    const opt = (question.options || []).find((o) => normalize(o.label) === g);
    return { correct: false, mistakeTag: opt?.mistakeTag || null, explain: null };
  }

  if (question.type === "fraction") {
    const want = parseFraction(question.answer);
    const got = parseFraction(given);
    if (!got) return { correct: false, mistakeTag: "not-a-fraction", explain: null };
    if (want && got[0] === want[0] && got[1] === want[1])
      return { correct: true, mistakeTag: null, explain: question.explain || null };
    if (want && got[0] * want[1] === got[1] * want[0])
      return { correct: false, mistakeTag: "equivalent-not-asked", explain: null };
    if (want && got[0] === want[1] && got[1] === want[0])
      return { correct: false, mistakeTag: "top-bottom-swapped", explain: null };
    return { correct: false, mistakeTag: null, explain: null };
  }

  if (question.type === "number") {
    if (g === "") return { correct: false, mistakeTag: null, explain: null };
    const a = Number(g), b = Number(key);
    if (!Number.isFinite(a) || !Number.isFinite(b))
      return { correct: false, mistakeTag: null, explain: null };
    // Exact for integers/clean decimals; a tiny relative epsilon only absorbs
    // floating-point representation error (e.g. 0.1+0.2) — never accepts a near-miss.
    const correct = a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
    return { correct, mistakeTag: null, explain: correct ? question.explain || null : null };
  }

  return { correct: g === key, mistakeTag: null, explain: null };
}

/**
 * Mastery decision from mastery-check attempts.
 * attempts: [{questionId, correct}], teachBackDone: boolean
 */
function masteryResult(concept, attempts, teachBackDone) {
  const qs = concept.masteryCheck.questions;
  const byQ = new Map(attempts.map((a) => [a.questionId, a.correct]));
  const answered = qs.filter((q) => byQ.has(q.id));
  if (answered.length < qs.length) return { status: "incomplete", score: null };
  const score = qs.filter((q) => byQ.get(q.id)).length / qs.length;
  const passedScore = score >= concept.masteryCheck.passThreshold;
  const passed = passedScore && (!concept.masteryCheck.requireTeachBack || teachBackDone);
  return {
    status: passed ? "mastered" : "needs-practice",
    score,
    teachBackPending: passedScore && concept.masteryCheck.requireTeachBack && !teachBackDone,
  };
}

/** Which concepts are unlocked, given mastered set + prerequisite graph. */
function unlockedConcepts(allConcepts, masteredIds) {
  const mastered = new Set(masteredIds);
  const known = new Set(allConcepts.map((c) => c.id));
  return allConcepts
    .filter((c) => c.prerequisites.every((p) => mastered.has(p) || !known.has(p)))
    .map((c) => c.id);
}

/** Spaced revision: next review date from the card + how many reviews done. */
function nextRevisionAt(concept, masteredAtISO, reviewsDone) {
  const days = concept.revisionCard.reviewAfterDays;
  if (reviewsDone >= days.length) return null; // graduated
  const d = new Date(masteredAtISO);
  d.setDate(d.getDate() + days[reviewsDone]);
  return d.toISOString();
}

module.exports = { normalize, parseFraction, checkAnswer, masteryResult, unlockedConcepts, nextRevisionAt };
