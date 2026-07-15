/** Plain-node tests for the pure learning logic + content loading. */
const assert = require("assert");
const path = require("path");
const { checkAnswer, masteryResult, unlockedConcepts, nextRevisionAt } = require("../electron/logic");
const { loadPacks } = require("../electron/contentLoader");

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log("  ✓ " + name); }
  catch (e) { console.error("  ✗ " + name + " — " + e.message); process.exitCode = 1; }
}

console.log("\nlogic.checkAnswer");
const mcq = {
  id: "q1", type: "mcq", q: "?", answer: "1/2",
  options: [{ label: "1/2" }, { label: "2/1", mistakeTag: "top-bottom-swapped" }],
  hintLadder: ["a", "b", "c"], explain: "half!"
};
t("mcq correct", () => assert.deepStrictEqual(checkAnswer(mcq, "1/2").correct, true));
t("mcq wrong returns authored mistakeTag", () =>
  assert.strictEqual(checkAnswer(mcq, "2/1").mistakeTag, "top-bottom-swapped"));

const frac = { id: "q2", type: "fraction", q: "?", answer: "2/6", hintLadder: ["a","b","c"] };
t("fraction exact match", () => assert.strictEqual(checkAnswer(frac, " 2 / 6 ").correct, true));
t("fraction equivalent flagged kindly, not wrong-wrong", () =>
  assert.strictEqual(checkAnswer(frac, "1/3").mistakeTag, "equivalent-not-asked"));
t("fraction swapped detected", () =>
  assert.strictEqual(checkAnswer(frac, "6/2").mistakeTag, "top-bottom-swapped"));
t("garbage is not-a-fraction", () =>
  assert.strictEqual(checkAnswer(frac, "banana").mistakeTag, "not-a-fraction"));

const num = { id: "q3", type: "number", q: "?", answer: "360", hintLadder: ["a","b","c"] };
t("number equality", () => assert.strictEqual(checkAnswer(num, "360").correct, true));
t("number wrong", () => assert.strictEqual(checkAnswer(num, "36").correct, false));

console.log("\nlogic.masteryResult");
const concept = {
  masteryCheck: {
    questions: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
    passThreshold: 0.8, requireTeachBack: true,
  },
  revisionCard: { reviewAfterDays: [3, 7, 21] },
  prerequisites: [],
};
const A = (m) => Object.entries(m).map(([questionId, correct]) => ({ questionId, correct }));
t("incomplete when unanswered", () =>
  assert.strictEqual(masteryResult(concept, A({ a: true }), true).status, "incomplete"));
t("4/5 + teach-back = mastered", () =>
  assert.strictEqual(masteryResult(concept, A({ a: true, b: true, c: true, d: true, e: false }), true).status, "mastered"));
t("4/5 without teach-back = pending, not mastered", () => {
  const r = masteryResult(concept, A({ a: true, b: true, c: true, d: true, e: false }), false);
  assert.strictEqual(r.status, "needs-practice");
  assert.strictEqual(r.teachBackPending, true);
});
t("3/5 = needs-practice", () =>
  assert.strictEqual(masteryResult(concept, A({ a: true, b: true, c: true, d: false, e: false }), true).status, "needs-practice"));

console.log("\nlogic.unlockedConcepts");
const graph = [
  { id: "a", prerequisites: [] },
  { id: "b", prerequisites: ["a"] },
  { id: "c", prerequisites: ["a", "b"] },
  { id: "d", prerequisites: ["outside-pack"] },
];
t("no mastery: only roots + unknown-prereq unlocked", () =>
  assert.deepStrictEqual(unlockedConcepts(graph, []), ["a", "d"]));
t("mastering a unlocks b", () =>
  assert.deepStrictEqual(unlockedConcepts(graph, ["a"]), ["a", "b", "d"]));

console.log("\nlogic.nextRevisionAt");
t("first review 3 days out", () => {
  const d = new Date(nextRevisionAt(concept, "2026-07-02T00:00:00.000Z", 0));
  assert.strictEqual(d.getUTCDate(), 5);
});
t("graduated after all reviews", () =>
  assert.strictEqual(nextRevisionAt(concept, "2026-07-02T00:00:00.000Z", 3), null));

console.log("\ncontentLoader");
const { packs, concepts } = loadPacks(path.join(__dirname, "..", "content-packs"));
t("packs load (Class 3-5 + PP1-2)", () => assert.strictEqual(packs.length, 2));
t("all 136 concepts present across 2 packs", () => assert.strictEqual(concepts.size, 136));
t("every answer key in every concept verifies against itself", () => {
  for (const c of concepts.values()) {
    const all = [...c.practice.easy, ...c.practice.medium, ...c.practice.challenge, ...c.masteryCheck.questions];
    for (const q of all) {
      assert.strictEqual(checkAnswer(q, q.answer).correct, true, `key fails self-check: ${c.id}/${q.id}`);
    }
  }
});
t("every prerequisite either exists in the pack or is a declared external", () => {
  const allowedExternal = new Set(["num-00-counting-to-100"]);
  for (const c of concepts.values())
    for (const p of c.prerequisites)
      assert.ok(concepts.has(p) || allowedExternal.has(p), `${c.id} has unknown prereq ${p}`);
});
t("full path: place value -> add -> subtract/multiply -> divide -> fractions", () => {
  const all = [...concepts.values()];

  const u0 = unlockedConcepts(all, []);
  assert.deepStrictEqual(u0, ["found-01-prenumber"], "pre-number readiness is now the single root");

  // Foundation: pre-number -> counting -> counting-to-100 -> place value
  assert.ok(unlockedConcepts(all, ["found-01-prenumber"]).includes("pp1-01-count-to-10"), "pre-number unlocks counting");
  const uCount = unlockedConcepts(all, ["pp1-01-count-to-10"]);
  assert.ok(uCount.includes("num-00-counting-to-100"), "count-to-10 unlocks counting-to-100");
  const uBridge = unlockedConcepts(all, ["pp1-01-count-to-10", "num-00-counting-to-100"]);
  assert.ok(uBridge.includes("num-01-place-value"), "counting-to-100 unlocks place value");
  assert.ok(!unlockedConcepts(all, ["pp1-01-count-to-10"]).includes("num-01-place-value"),
    "place value stays locked until counting-to-100 is mastered");

  const u1 = unlockedConcepts(all, ["num-01-place-value"]);
  assert.ok(u1.includes("num-02-comparing") && u1.includes("ops-07-addition-regrouping"));
  assert.ok(!u1.includes("ops-09-multiplication-groups"), "multiplication needs addition first");

  const u2 = unlockedConcepts(all, ["num-01-place-value", "ops-07-addition-regrouping"]);
  assert.ok(u2.includes("ops-08-subtraction-regrouping") && u2.includes("ops-09-multiplication-groups"));

  const u3 = unlockedConcepts(all, [
    "num-01-place-value", "ops-07-addition-regrouping", "ops-09-multiplication-groups",
  ]);
  assert.ok(u3.includes("ops-13-division-sharing"));
  assert.ok(!u3.includes("frac-01-equal-parts"), "fractions need comparing + division");

  const u4 = unlockedConcepts(all, [
    "num-01-place-value", "num-02-comparing",
    "ops-07-addition-regrouping", "ops-09-multiplication-groups", "ops-13-division-sharing",
  ]);
  assert.ok(u4.includes("frac-01-equal-parts"));

  const u5 = unlockedConcepts(all, [
    "num-01-place-value", "num-02-comparing",
    "ops-07-addition-regrouping", "ops-09-multiplication-groups", "ops-13-division-sharing",
    "frac-01-equal-parts", "frac-02-numberline", "frac-03-equivalent",
  ]);
  assert.ok(u5.includes("frac-04-comparing"), "chain reaches the end");
});

console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}`);
