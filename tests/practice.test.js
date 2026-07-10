/**
 * Practice generator coverage gate:
 * for every concept with a generator, and every difficulty level,
 * >=25 UNIQUE questions are produced, each with >=3 hints, and every
 * answer self-verifies through the real math-truth layer (logic.checkAnswer).
 */
const { execSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const assert = require("assert");
const { checkAnswer } = require("../electron/logic");

// Transpile the TS practice factory to a temp dir (type-only imports are erased).
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "fmpf-"));
execSync(
  `npx tsc src/practiceFactory.ts --outDir "${OUT}" --module commonjs --target es2019 ` +
  `--jsx react-jsx --esModuleInterop --skipLibCheck --moduleResolution node`,
  { cwd: path.join(__dirname, ".."), stdio: "pipe" }
);
const pf = require(path.join(OUT, "practiceFactory.js"));

let passed = 0;
function t(name, fn) {
  try { fn(); console.log("  ✓ " + name); passed++; }
  catch (e) { console.error("  ✗ " + name + " — " + e.message); process.exitCode = 1; }
}

const LEVELS = ["easy", "medium", "challenge"];
const concepts = pf.practiceConcepts();
console.log(`\npracticeFactory coverage — ${concepts.length} concept(s), gate: >=25 unique/level`);

for (const id of concepts) {
  t(`${id}: >=25 unique/level, self-verifying, >=3 hints`, () => {
    for (const lvl of LEVELS) {
      const qs = pf.generatePractice(id, lvl, 25);
      assert.ok(qs.length >= 25, `${id}/${lvl} produced only ${qs.length}/25 unique`);
      assert.strictEqual(new Set(qs.map((q) => q.id)).size, qs.length, `${id}/${lvl} duplicate ids`);
      assert.strictEqual(new Set(qs.map((q) => q.q)).size, qs.length, `${id}/${lvl} duplicate question texts`);
      for (const q of qs) {
        assert.ok((q.hintLadder || []).length >= 3, `${id}/${lvl}/${q.id} has <3 hints`);
        assert.strictEqual(checkAnswer(q, q.answer).correct, true,
          `${id}/${lvl}/${q.id} answer "${q.answer}" fails self-check: ${q.q}`);
        if (q.type === "mcq")
          assert.ok(q.options.some((o) => o.label === q.answer), `${id}/${lvl}/${q.id} mcq answer not among options`);
      }
    }
  });
}
console.log(`\n${passed} practice-coverage tests passed${process.exitCode ? " (with failures)" : ""}`);
