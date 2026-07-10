/** AI service tests — pure functions only (no network, no key needed). */
const assert = require("assert");
const {
  buildExplainPrompt, buildWhyWrongPrompt, buildCoachPrompt, coachLeaksAnswer, extractJson, validateAiResponse, cacheKey,
} = require("../electron/aiService");

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log("  ✓ " + name); }
  catch (e) { console.error("  ✗ " + name + " — " + e.message); process.exitCode = 1; }
}

const concept = {
  id: "frac-01-equal-parts", name: "Equal Parts", grade: 3,
  whatIsIt: "w", whyNeeded: "y", realLifeUses: ["a"], vocabulary: [],
  story: { title: "s" }, standardMethod: { steps: [] },
  workedExamples: [], commonMistakes: [{ mistakeTag: "x", mistake: "m", fix: "f" }],
};
const question = { id: "e1", q: "What fraction?", answer: "1/2" };

console.log("\naiService.prompts (grounding guardrails)");
t("explain prompt embeds the verified lesson content", () => {
  const p = buildExplainPrompt(concept, "story");
  assert.ok(p.includes("Equal Parts") && p.includes("LESSON JSON"));
  assert.ok(p.includes("ONLY facts, methods, and characters from the lesson"));
});
t("explain prompt demands strict JSON output", () =>
  assert.ok(buildExplainPrompt(concept, "simpler").includes('{"explanation"')));
t("why-wrong prompt pins the verified answer and forbids changing it", () => {
  const p = buildWhyWrongPrompt(concept, question, "2/1", concept.commonMistakes[0]);
  assert.ok(p.includes('exactly "1/2"') && p.includes("never state a different one"));
  assert.ok(p.includes("CHILD'S ANSWER: 2/1"));
});
t("prompts never contain learner identity fields", () => {
  const p = buildExplainPrompt(concept, "simpler") + buildWhyWrongPrompt(concept, question, "x", null);
  assert.ok(!/profile|learnerId|child's name/i.test(p.replace("children's app", "")));
});

console.log("\naiService.coach (Socratic guardrails)");
t("coach prompt grounds in lesson and forbids revealing the answer", () => {
  const p = buildCoachPrompt(concept, question, "2/1", concept.commonMistakes[0]);
  assert.ok(p.includes("LESSON JSON") || p.includes("VERIFIED lesson content"));
  assert.ok(p.includes("NEVER") && p.includes('"1/2"'));
  assert.ok(p.includes("guiding QUESTION") || p.includes("guiding question"));
});
t("coach prompt demands a question-shaped JSON", () => {
  const p = buildCoachPrompt(concept, question, "2/1", null);
  assert.ok(p.includes('"question"') && p.includes("question mark"));
});
t("coachLeaksAnswer catches a leaked answer and ignores single chars", () => {
  assert.strictEqual(coachLeaksAnswer("Is it really 1/2 of the whole?", "1/2"), true);
  assert.strictEqual(coachLeaksAnswer("How many equal parts are there?", "1/2"), false);
  assert.strictEqual(coachLeaksAnswer("Count 5 things — how many groups?", "5"), false);
});

console.log("\naiService.validation (safety guardrails)");
t("extracts JSON from noisy model output", () => {
  const o = extractJson('Sure! Here you go:\n{"explanation":"because parts must be equal and the same size always","example":""} hope that helps');
  assert.strictEqual(typeof o.explanation, "string");
});
t("rejects non-JSON output", () => assert.strictEqual(extractJson("I cannot answer"), null));
t("rejects too-short explanation", () => {
  const v = validateAiResponse({ explanation: "hi" }, [{ name: "explanation", required: true, min: 20 }]);
  assert.deepStrictEqual(v.ok, false);
});
t("rejects output containing links", () => {
  const v = validateAiResponse(
    { explanation: "go to https://example.com for more on equal parts today" },
    [{ name: "explanation", required: true, min: 20 }]);
  assert.strictEqual(v.reason, "contains-link");
});
t("accepts valid response", () => {
  const v = validateAiResponse(
    { explanation: "Equal parts means every piece is exactly the same size, like fair shares of a roti." },
    [{ name: "explanation", required: true, min: 20 }]);
  assert.strictEqual(v.ok, true);
});
t("cache key is stable and distinct", () => {
  assert.strictEqual(cacheKey("explain", "c1", "story"), cacheKey("explain", "c1", "story"));
  assert.notStrictEqual(cacheKey("explain", "c1", "story"), cacheKey("explain", "c1", "simpler"));
});

console.log(`\n${passed} AI tests passed${process.exitCode ? " (with failures)" : ""}`);
