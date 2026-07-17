#!/usr/bin/env node
/**
 * FearlessMath content validator (dependency-free).
 * Usage: node validate-content.js <conceptsDir>
 *
 * Checks three layers:
 *  1. STRUCTURE  — required sections of the Concept Contract
 *  2. PEDAGOGY   — fear-free rules (hint ladders, mistakes, real-life uses…)
 *  3. ANSWER KEYS — answers are well-formed, MCQ answers exist among options,
 *                   distractors carry mistakeTags, fraction/number formats valid
 */
const fs = require("fs");
const path = require("path");

const errors = [];
const warnings = [];
let current = "";

const err = (m) => errors.push(`[${current}] ERROR: ${m}`);
const warn = (m) => warnings.push(`[${current}] WARN: ${m}`);

const isStr = (v, min = 1) => typeof v === "string" && v.trim().length >= min;
const isArr = (v, min = 0) => Array.isArray(v) && v.length >= min;
const FRACTION_RE = /^\d+\s*\/\s*\d+$/;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const TAG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function checkQuestion(q, where, mistakeTags) {
  if (!isStr(q.id)) err(`${where}: question missing id`);
  if (!["mcq", "text", "fraction", "number"].includes(q.type))
    err(`${where}/${q.id}: bad type "${q.type}"`);
  if (!isStr(q.q, 5)) err(`${where}/${q.id}: question text too short`);
  if (!isStr(q.answer)) err(`${where}/${q.id}: missing answer`);

  // Fear-free rule: 3 hints before any answer
  if (!isArr(q.hintLadder, 3))
    err(`${where}/${q.id}: hintLadder must have >= 3 hints (fear-free rule)`);

  // Answer-key verification by type
  if (q.type === "fraction" && !FRACTION_RE.test(q.answer))
    err(`${where}/${q.id}: fraction answer "${q.answer}" not in n/m form`);
  if (q.type === "number" && !NUMBER_RE.test(q.answer))
    err(`${where}/${q.id}: numeric answer "${q.answer}" is not a number`);

  if (q.type === "mcq") {
    if (!isArr(q.options, 2)) {
      err(`${where}/${q.id}: mcq needs >= 2 options`);
      return;
    }
    const labels = q.options.map((o) => o.label);
    if (!labels.includes(q.answer))
      err(`${where}/${q.id}: answer "${q.answer}" not among options`);
    if (new Set(labels).size !== labels.length)
      err(`${where}/${q.id}: duplicate option labels`);
    for (const o of q.options) {
      if (o.label === q.answer) continue;
      if (!o.mistakeTag)
        warn(`${where}/${q.id}: distractor "${o.label}" has no mistakeTag (mistake diagnosis weaker)`);
      else if (!mistakeTags.has(o.mistakeTag))
        err(`${where}/${q.id}: mistakeTag "${o.mistakeTag}" not declared in commonMistakes`);
    }
  }
}

function checkMethod(m, where) {
  if (!m) return;
  if (!isStr(m.name) || !isStr(m.whenToUse) || !isArr(m.steps, 1) || !isStr(m.example))
    err(`${where}: method needs name, whenToUse, steps[], example`);
}

function validateConcept(file) {
  current = path.basename(file);
  let c;
  try {
    c = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    err(`invalid JSON: ${e.message}`);
    return null;
  }

  // 1. STRUCTURE
  if (!TAG_RE.test(c.id || "")) err("id missing or not kebab-case");
  if (!isStr(c.name, 3)) err("name missing");
  if (!Number.isInteger(c.grade) || c.grade < 0 || c.grade > 12) err("grade must be 0-12");
  if (!["numbers","operations","fractions","geometry","measurement","data"].includes(c.strand))
    err(`strand "${c.strand}" invalid`);
  if (!Array.isArray(c.prerequisites)) err("prerequisites must be an array");

  if (!isStr(c.whatIsIt, 10)) err("whatIsIt missing/too short");
  if (!isStr(c.whyNeeded, 10)) err("whyNeeded missing/too short");

  // 2. PEDAGOGY
  if (!isArr(c.realLifeUses, 3)) err("realLifeUses needs >= 3 examples (real-life-first rule)");
  if (!isArr(c.vocabulary, 1)) err("vocabulary needs >= 1 term");
  if (!c.story || !isStr(c.story.text, 50) || !isStr(c.story.extractedProblem) || !isStr(c.story.answerInStory))
    err("story needs text(>=50 chars), extractedProblem, answerInStory (story->math->story rule)");
  if (!c.visual || !c.visual.component)
    err("visual explanation required (never formula-first rule)");
  else if (!["NumberLine","BarModel","ArrayGrid","FractionStrip","AreaModel","PlaceValueBlocks","GeometryCanvas","ClockFace","BarChart","PizzaSlices","Abacus","ObjectRow","NumberTrack","FunctionPlot","Solid3D","Scene3D"].includes(c.visual.component))
    err(`visual.component "${c.visual.component}" is not a built component`);
  const COMP = ["NumberLine","BarModel","ArrayGrid","FractionStrip","AreaModel","PlaceValueBlocks","GeometryCanvas","ClockFace","BarChart","PizzaSlices","Abacus","ObjectRow","NumberTrack","FunctionPlot","Solid3D","Scene3D"];
  if (c.teachingGallery !== undefined) {
    if (!Array.isArray(c.teachingGallery)) err("teachingGallery must be an array of {title, examples[]}");
    else c.teachingGallery.forEach((g, gi) => {
      if (!isStr(g.title)) err(`teachingGallery[${gi}].title required`);
      if (!isArr(g.examples, 1)) err(`teachingGallery[${gi}].examples needs >=1 example`);
      else g.examples.forEach((e, ei) => {
        if (!e.component || !COMP.includes(e.component)) err(`teachingGallery[${gi}].examples[${ei}].component "${e && e.component}" is not a built component`);
        if (!isStr(e.caption)) err(`teachingGallery[${gi}].examples[${ei}].caption required`);
      });
    });
  }
  if (!c.standardMethod || !isArr(c.standardMethod.steps, 2)) err("standardMethod with >=2 steps required");
  if (!isArr(c.workedExamples, 2)) err("need >= 2 workedExamples (worked-example-first rule)");
  if (c.trickPractice !== undefined) {
    const tp = c.trickPractice;
    if (!isStr(tp.trick)) err("trickPractice.trick (name) required");
    if (!isStr(tp.intro)) err("trickPractice.intro required");
    if (!isArr(tp.questions, 3)) err("trickPractice.questions needs >= 3 drill questions");
    else tp.questions.forEach((q, qi) => {
      if (!isStr(q.id)) err(`trickPractice.questions[${qi}].id required`);
      if (!isStr(q.q)) err(`trickPractice.questions[${qi}].q required`);
      if (q.answer === undefined || q.answer === null || String(q.answer) === "") err(`trickPractice.questions[${qi}].answer required`);
      if (!isArr(q.hintLadder, 1)) err(`trickPractice.questions[${qi}].hintLadder needs >= 1 hint (the trick steps)`);
    });
  }
  if (!isArr(c.commonMistakes, 2)) err("need >= 2 commonMistakes (mistake clinic)");
  if (!isStr(c.teachBackPrompt, 10)) err("teachBackPrompt required (teach-back = mastery)");
  if (!c.revisionCard || !isStr(c.revisionCard.summary) || !isArr(c.revisionCard.reviewAfterDays, 1))
    err("revisionCard with summary + reviewAfterDays required (spaced revision)");

  // Optional study-toolkit extras (fun facts + authored flashcards).
  if (c.funFacts !== undefined) {
    if (!Array.isArray(c.funFacts) || !c.funFacts.every((f) => isStr(f, 5)))
      err("funFacts must be an array of non-empty strings");
  }
  if (c.flashcards !== undefined) {
    if (!Array.isArray(c.flashcards) || !c.flashcards.every((f) => f && isStr(f.front) && isStr(f.back)))
      err("flashcards must be an array of { front, back } strings");
  }
  // Optional learning-support layers (memory hook, curiosity FAQ, formula cards).
  if (c.rememberIt !== undefined) {
    if (!c.rememberIt || !isStr(c.rememberIt.hook, 2)) err("rememberIt.hook (memory mnemonic) required when rememberIt present");
  }
  if (c.studentQuestions !== undefined) {
    if (!Array.isArray(c.studentQuestions) || !c.studentQuestions.every((x) => x && isStr(x.q, 3) && isStr(x.a, 3)))
      err("studentQuestions must be an array of { q, a } strings");
  }
  if (c.formulas !== undefined) {
    if (!Array.isArray(c.formulas) || !c.formulas.every((f) => f && isStr(f.name) && isStr(f.formula)))
      err("formulas must be an array of { name, formula } (remember?, whenToUse? optional)");
  }

  checkMethod(c.mentalMathMethod, "mentalMathMethod");
  checkMethod(c.abacusMethod, "abacusMethod");
  checkMethod(c.vedicMethod, "vedicMethod");
  (c.alternateMethods || []).forEach((m, i) => checkMethod(m, `alternateMethods[${i}]`));

  const mistakeTags = new Set((c.commonMistakes || []).map((m) => m.mistakeTag).filter(Boolean));
  for (const m of c.commonMistakes || []) {
    if (!m.mistakeTag || !TAG_RE.test(m.mistakeTag)) err("commonMistakes: mistakeTag missing/not kebab-case");
    if (!isStr(m.mistake) || !isStr(m.fix)) err("commonMistakes: mistake + fix text required");
  }

  // 3. QUESTIONS + ANSWER KEYS
  const ids = new Set();
  const allQ = [];
  for (const lvl of ["easy", "medium", "challenge"]) {
    const list = c.practice && c.practice[lvl];
    if (!isArr(list, 2)) { err(`practice.${lvl} needs >= 2 questions`); continue; }
    list.forEach((q) => { allQ.push([q, `practice.${lvl}`]); });
  }
  if (!c.masteryCheck || !isArr(c.masteryCheck.questions, 4))
    err("masteryCheck needs >= 4 questions");
  else {
    if (!(c.masteryCheck.passThreshold >= 0.7)) err("masteryCheck.passThreshold must be >= 0.7");
    if (c.masteryCheck.requireTeachBack !== true) err("masteryCheck.requireTeachBack must be true");
    c.masteryCheck.questions.forEach((q) => allQ.push([q, "masteryCheck"]));
  }
  for (const [q, where] of allQ) {
    if (q.id) {
      if (ids.has(q.id)) err(`duplicate question id "${q.id}"`);
      ids.add(q.id);
    }
    checkQuestion(q, where, mistakeTags);
  }

  // meta
  if (!c.meta || !isStr(c.meta.version) || !isStr(c.meta.curriculum) || !isStr(c.meta.language))
    err("meta.version/curriculum/language required");
  else if (!["draft", "in_review", "approved"].includes(c.meta.reviewStatus))
    err("meta.reviewStatus must be draft|in_review|approved");

  return c;
}

// ---- main ----
const dirs = process.argv.slice(2);
if (!dirs.length) { console.error("Usage: node validate-content.js <conceptsDir> [<conceptsDir> ...]"); process.exit(2); }

const seen = new Map();      // conceptId -> file (for duplicate detection)
const prereqs = new Map();   // conceptId -> string[] (for dangling detection)
let count = 0;

for (const dir of dirs) {
  let files;
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")); }
  catch { console.error("Cannot read directory: " + dir); process.exit(2); }
  for (const f of files) {
    const c = validateConcept(path.join(dir, f));
    if (c && c.id) {
      current = f;
      if (seen.has(c.id)) err(`duplicate concept id "${c.id}" (also in ${seen.get(c.id)})`);
      seen.set(c.id, f);
      prereqs.set(c.id, Array.isArray(c.prerequisites) ? c.prerequisites : []);
    }
    count++;
  }
}

// Cross-cutting: every prerequisite must reference a known concept id.
for (const [id, ps] of prereqs) {
  for (const p of ps) {
    if (!seen.has(p)) { current = id; err(`dangling prerequisite "${p}" — no concept with that id exists in any pack`); }
  }
}

console.log(`\nFearlessMath content validation — ${count} concept(s) checked across ${dirs.length} pack(s)`);
console.log("-".repeat(56));
if (warnings.length) { console.log("Warnings:"); warnings.forEach((w) => console.log("  " + w)); }
if (errors.length) {
  console.log("Errors:"); errors.forEach((e) => console.log("  " + e));
  console.log(`\nRESULT: FAIL (${errors.length} error(s), ${warnings.length} warning(s))`);
  process.exit(1);
} else {
  console.log(`RESULT: PASS (${warnings.length} warning(s))`);
  process.exit(0);
}
