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

/* ---------------- Adaptive spaced repetition (SM-2 style) ----------------
 * Classic SM-2 (SuperMemo-2): each review is scored 0-5 ("quality"). A quality
 * below 3 means the child effectively forgot it — repetitions reset and the
 * next review is tomorrow. A quality of 3+ grows the interval — first using
 * the concept's own authored reviewAfterDays[0] (so content authoring still
 * matters for the very first check-in), then via the SM-2 ease-factor growth
 * curve — so a concept a child nails every time drifts to longer and longer
 * gaps, while one they keep fumbling gets reviewed more often. This replaces
 * the old fixed reviewAfterDays[reviewsDone] schedule, which was identical
 * for every learner and never adapted to how a specific child was doing. */
const SM2_MIN_EASE = 1.3;
const SM2_DEFAULT_EASE = 2.5;

/** Map a mastery/revision outcome to an SM-2 quality score (0-5).
 *  `score` is the fraction correct (0..1); `teachBackDone` and `forgot` are
 *  extra signals for the top and bottom of the scale. */
function masteryQuality({ score, teachBackDone, forgot }) {
  if (forgot) return 1; // failed a revision check on something once mastered — clearly forgotten
  if (score == null) return 3;
  if (score >= 0.95 && teachBackDone) return 5;
  if (score >= 0.9) return 4;
  return 3; // just cleared the mastery bar
}

/**
 * SM-2 review update. `prev` is the learner's current SRS state for this
 * concept — { easeFactor, intervalDays, repetitions } (all optional; a
 * first-ever review defaults sensibly). Returns the new state plus the next
 * revision date, computed from `fromISO` (defaults to now).
 */
function sm2Update(prev, quality, { fromISO, firstIntervalDays = 3 } = {}) {
  const q = Math.max(0, Math.min(5, quality));
  let ease = prev?.easeFactor ?? SM2_DEFAULT_EASE;
  let reps = prev?.repetitions ?? 0;
  let interval;

  if (q < 3) {
    reps = 0;
    interval = 1; // forgotten — check again tomorrow, no matter how far along they were
  } else {
    if (reps === 0) interval = firstIntervalDays;
    else if (reps === 1) interval = Math.max(6, firstIntervalDays * 2);
    else interval = Math.round((prev?.intervalDays || firstIntervalDays) * ease);
    reps += 1;
  }

  ease = Math.max(SM2_MIN_EASE, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  const from = new Date(fromISO || new Date().toISOString());
  from.setDate(from.getDate() + interval);

  return {
    easeFactor: Math.round(ease * 100) / 100,
    intervalDays: interval,
    repetitions: reps,
    nextRevisionAt: from.toISOString(),
  };
}

module.exports = {
  normalize, parseFraction, checkAnswer, masteryResult, unlockedConcepts,
  masteryQuality, sm2Update,
};
