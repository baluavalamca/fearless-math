/** Store tests — clinic (wrongQuestions) and dashboard (stats) queries. */
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createStore } = require("../electron/db");

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log("  ✓ " + name); }
  catch (e) { console.error("  ✗ " + name + " — " + e.message); process.exitCode = 1; }
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-store-"));
const store = createStore(dir);

console.log(`\nstore (${store.kind})`);

const p = store.getOrCreateDefaultProfile();
t("default profile created", () => assert.ok(p.id));

// Simulate a session: q1 wrong twice then fixed; q2 wrong and never fixed; q3 right first try
store.recordAttempt({ profileId: p.id, conceptId: "frac-01-equal-parts", questionId: "e1", context: "practice", correct: false, hintsUsed: 0, answerGiven: "2/1", mistakeTag: "top-bottom-swapped" });
store.recordAttempt({ profileId: p.id, conceptId: "frac-01-equal-parts", questionId: "e1", context: "practice", correct: false, hintsUsed: 1, answerGiven: "2/2", mistakeTag: "counted-unshaded" });
store.recordAttempt({ profileId: p.id, conceptId: "frac-01-equal-parts", questionId: "e1", context: "clinic", correct: true, hintsUsed: 1, answerGiven: "1/2", mistakeTag: null });
store.recordAttempt({ profileId: p.id, conceptId: "frac-01-equal-parts", questionId: "e2", context: "practice", correct: false, hintsUsed: 2, answerGiven: "wrong", mistakeTag: "unequal-parts-counted" });
store.recordAttempt({ profileId: p.id, conceptId: "ops-09-multiplication-groups", questionId: "e1", context: "practice", correct: true, hintsUsed: 0, answerGiven: "12", mistakeTag: null });

t("wrongQuestions excludes fixed questions", () => {
  const w = store.wrongQuestions(p.id);
  assert.strictEqual(w.length, 1);
  assert.strictEqual(w[0].questionId, "e2");
});
t("wrongQuestions carries last mistake tag and tries", () => {
  const w = store.wrongQuestions(p.id)[0];
  assert.strictEqual(w.lastMistakeTag, "unequal-parts-counted");
  assert.strictEqual(w.tries, 1);
});
t("stats aggregates per concept", () => {
  const s = new Map(store.stats(p.id).map((x) => [x.conceptId, x]));
  const frac = s.get("frac-01-equal-parts");
  assert.strictEqual(frac.attempts, 4);
  assert.strictEqual(Number(frac.correct), 1);
  assert.strictEqual(Number(frac.hints), 4);
  assert.strictEqual(s.get("ops-09-multiplication-groups").attempts, 1);
});
t("badges are idempotent", () => {
  store.awardBadge(p.id, "fixed-my-mistake");
  store.awardBadge(p.id, "fixed-my-mistake");
  assert.strictEqual(store.badges(p.id).filter((b) => b.badge_id === "fixed-my-mistake").length, 1);
});
t("progress upsert round-trips", () => {
  store.upsertProgress(p.id, "frac-01-equal-parts", { status: "mastered", mastery_score: 0.9 });
  const rows = store.getProgress(p.id);
  const row = rows.find((r) => r.concept_id === "frac-01-equal-parts");
  assert.strictEqual(row.status, "mastered");
});

console.log(`\n${passed} store tests passed${process.exitCode ? " (with failures)" : ""}`);
