/** AI service tests — pure functions only (no network, no key needed). */
const assert = require("assert");
const {
  buildExplainPrompt, buildWhyWrongPrompt, buildCoachPrompt, buildRephrasePrompt, coachLeaksAnswer, extractJson, validateAiResponse, cacheKey,
  buildHomeworkPrompt, validateHomeworkResponse,
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

console.log("\naiService.rephrase (ask it a different way)");
t("rephrase prompt pins the verified answer and forbids changing the numbers", () => {
  const p = buildRephrasePrompt(concept, question);
  assert.ok(p.includes("LESSON JSON") || p.includes("VERIFIED lesson content"));
  assert.ok(p.includes('exactly "1/2"'));
  assert.ok(p.includes("REWORDING, not creating a new problem"));
});
t("rephrase prompt demands a reworded-question JSON and keeps mcq option labels fixed", () => {
  const p = buildRephrasePrompt(concept, question);
  assert.ok(p.includes('{"question"'));
  const mcq = { ...question, type: "mcq", options: [{ label: "1/2" }, { label: "1/3" }] };
  const p2 = buildRephrasePrompt(concept, mcq);
  assert.ok(p2.includes("OPTIONS") && p2.includes("1/2, 1/3"));
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

console.log("\naiService.homework (photo OCR + solve/coach guardrails)");
t("solve-mode prompt demands full steps + answer JSON, coach-mode demands a question", () => {
  const solveP = buildHomeworkPrompt("solve", 4);
  assert.ok(solveP.includes('"steps"') && solveP.includes('"answer"'));
  const coachP = buildHomeworkPrompt("coach", 4);
  assert.ok(coachP.includes('"question"') && coachP.includes("question mark"));
  assert.ok(/MUST NOT\s+contain or\s+imply the final answer/.test(coachP));
});
t("homework prompt carries the safety refusal gate and never asks for identity", () => {
  const p = buildHomeworkPrompt("coach", 6);
  assert.ok(p.includes('"isMathHomework"'));
  assert.ok(p.includes("unsafe or inappropriate"));
  assert.ok(!/profile|learnerId|child's name/i.test(p.replace("children's learning app", "")));
});
t("validateHomeworkResponse accepts a non-maths refusal with empty problems", () => {
  const v = validateHomeworkResponse({ isMathHomework: false, problems: [] }, "coach");
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.isMathHomework, false);
  assert.deepStrictEqual(v.problems, []);
});
t("validateHomeworkResponse (solve) accepts steps+answer and drops link/oversized junk", () => {
  const v = validateHomeworkResponse({
    isMathHomework: true,
    problems: [
      { problem: "12 + 7 = ?", steps: ["Add the ones: 2+7=9", "Add the tens: 1+0=1"], answer: "19" },
      { problem: "bad one with a link", steps: ["see https://example.com"], answer: "x" },
    ],
  }, "solve");
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.problems.length, 1);
  assert.strictEqual(v.problems[0].answer, "19");
});
t("validateHomeworkResponse (coach) requires a question mark and forbids empty coach fields", () => {
  const ok = validateHomeworkResponse({
    isMathHomework: true,
    problems: [{ problem: "5 x 6 = ?", question: "What does multiplying by 6 mean, six groups of what?", hint: "Think of 5 groups of 6." }],
  }, "coach");
  assert.strictEqual(ok.ok, true);
  const bad = validateHomeworkResponse({
    isMathHomework: true,
    problems: [{ problem: "5 x 6 = ?", question: "The answer is not revealed here.", hint: "" }],
  }, "coach");
  assert.strictEqual(bad.ok, false); // no "?" at the end of the question -> rejected
});
t("validateHomeworkResponse rejects non-JSON and all-invalid-problem responses", () => {
  assert.strictEqual(validateHomeworkResponse(null, "solve").ok, false);
  assert.strictEqual(validateHomeworkResponse({ isMathHomework: true, problems: [] }, "solve").ok, false);
  assert.strictEqual(validateHomeworkResponse({ isMathHomework: true, problems: [{ problem: "x" }] }, "solve").ok, false);
});
t("validateHomeworkResponse caps problems at 5", () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ problem: `${i}+1=?`, steps: ["add"], answer: String(i + 1) }));
  const v = validateHomeworkResponse({ isMathHomework: true, problems: many }, "solve");
  assert.strictEqual(v.problems.length, 5);
});

console.log(`\n${passed} AI tests passed${process.exitCode ? " (with failures)" : ""}`);
