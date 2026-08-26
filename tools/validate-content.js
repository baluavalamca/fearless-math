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
  if (!Number.isInteger(c.grade) || c.grade < 0 || c.grade > 13) err("grade must be 0-13");
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
  else if (!["NumberLine","BarModel","ArrayGrid","FractionStrip","AreaModel","PlaceValueBlocks","GeometryCanvas","ClockFace","BarChart","PizzaSlices","Abacus","ObjectRow","NumberTrack","FunctionPlot","Solid3D","Scene3D","ReasoningFigure","DiceViews","TallyMarks"].includes(c.visual.component))
    err(`visual.component "${c.visual.component}" is not a built component`);
  const COMP = ["NumberLine","BarModel","ArrayGrid","FractionStrip","AreaModel","PlaceValueBlocks","GeometryCanvas","ClockFace","BarChart","PizzaSlices","Abacus","ObjectRow","NumberTrack","FunctionPlot","Solid3D","Scene3D","ReasoningFigure","DiceViews","TallyMarks"];
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
  if (c.liveSim !== undefined) {
    const ls = c.liveSim;
    const KIND = ["solid3d", "graph2d", "shape2d"];
    if (!isStr(ls.title)) err("liveSim.title required");
    if (!KIND.includes(ls.kind)) err(`liveSim.kind "${ls.kind}" must be one of ${KIND.join(", ")}`);
    if (!isStr(ls.shape)) err("liveSim.shape required");
    if (!isArr(ls.sliders, 1)) {
      err("liveSim.sliders needs >= 1 slider");
    } else {
      const keys = new Set();
      ls.sliders.forEach((s, si) => {
        if (!isStr(s.key)) err(`liveSim.sliders[${si}].key required`);
        else keys.add(s.key);
        if (!isStr(s.label)) err(`liveSim.sliders[${si}].label required`);
        if (typeof s.min !== "number" || typeof s.max !== "number" || s.min >= s.max)
          err(`liveSim.sliders[${si}]: min must be < max (got ${s.min}..${s.max})`);
        if (typeof s.default !== "number" || s.default < s.min || s.default > s.max)
          err(`liveSim.sliders[${si}]: default must be within [min,max]`);
      });
      if (!isArr(ls.formulas, 1)) {
        err("liveSim.formulas needs >= 1 formula");
      } else {
        const allowedVars = new Set([...keys, "PI"]);
        // Must mirror LIVE_EXPR_FUNCTIONS in src/liveExpr.ts — the whitelisted
        // function-call names the safe evaluator supports.
        const allowedFns = new Set(["sqrt", "abs", "sin", "cos", "tan", "min", "max"]);
        ls.formulas.forEach((f, fi) => {
          if (!isStr(f.name)) err(`liveSim.formulas[${fi}].name required`);
          if (!isStr(f.expr)) { err(`liveSim.formulas[${fi}].expr required`); return; }
          if (!/^[A-Za-z0-9_+\-*/^(),.\s]+$/.test(f.expr))
            err(`liveSim.formulas[${fi}].expr "${f.expr}" has characters outside the safe arithmetic grammar`);
          const idents = f.expr.match(/[A-Za-z_]+/g) || [];
          idents.forEach((id) => {
            if (allowedFns.has(id)) return; // whitelisted function name, not a variable
            if (!allowedVars.has(id)) err(`liveSim.formulas[${fi}].expr uses undeclared variable "${id}" (not a slider key or PI)`);
          });
        });
      }
    }
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
  // Optional per-concept video resource (local file / YouTube link / Veo prompt).
  if (c.video !== undefined) {
    const v = c.video;
    if (!v || typeof v !== "object") {
      err("video must be an object");
    } else {
      if (v.time !== undefined && (typeof v.time !== "number" || v.time < 0)) err("video.time must be a non-negative number (seconds)");
      if (v.localFile !== undefined && !isStr(v.localFile)) err("video.localFile must be a string");
      if (v.youtubeUrl !== undefined && (!isStr(v.youtubeUrl) || !/^https?:\/\//i.test(v.youtubeUrl))) err("video.youtubeUrl must be a valid http(s) URL");
      if (v.veoPrompt !== undefined && !isStr(v.veoPrompt, 10)) err("video.veoPrompt must be a non-empty string");
    }
  }

  // Optional activity-book style practice (dot-to-dot, tracing, maze, color-by-answer, match-up).
  if (c.activityBook !== undefined) {
    const ab = c.activityBook;
    if (!ab || typeof ab !== "object") {
      err("activityBook must be an object");
    } else {
      // Light question check reused across sub-types (relaxed vs. main practice pool,
      // same spirit as trickPractice — the visual/game itself carries the fear-free loop).
      const checkGameQ = (q, where) => {
        if (!q || typeof q !== "object") { err(`${where}: question required`); return; }
        if (!isStr(q.id)) err(`${where}.id required`);
        if (!isStr(q.q, 3)) err(`${where}.q required`);
        if (q.answer === undefined || q.answer === null || String(q.answer) === "") err(`${where}.answer required`);
        if (!isArr(q.hintLadder, 1)) err(`${where}.hintLadder needs >= 1 hint`);
      };
      const pctPt = (p, where) => {
        if (!p || typeof p.x !== "number" || typeof p.y !== "number" || p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100)
          err(`${where}: x/y must be numbers 0-100 (percent coords)`);
      };

      if (ab.dotToDot !== undefined) {
        const d = ab.dotToDot;
        if (!isStr(d.title)) err("activityBook.dotToDot.title required");
        if (!isStr(d.instructions)) err("activityBook.dotToDot.instructions required");
        if (!isArr(d.dots, 4)) err("activityBook.dotToDot.dots needs >= 4 dots to be worth revealing a picture");
        else d.dots.forEach((dot, i) => { pctPt(dot, `activityBook.dotToDot.dots[${i}]`); if (!isStr(dot.label)) err(`activityBook.dotToDot.dots[${i}].label required`); });
      }
      if (ab.traceIt !== undefined) {
        const t = ab.traceIt;
        if (!isStr(t.title)) err("activityBook.traceIt.title required");
        if (!isStr(t.instructions)) err("activityBook.traceIt.instructions required");
        if (!isStr(t.glyph)) err("activityBook.traceIt.glyph required");
        if (!isArr(t.points, 3)) err("activityBook.traceIt.points needs >= 3 points to trace a stroke");
        else t.points.forEach((p, i) => pctPt(p, `activityBook.traceIt.points[${i}]`));
      }
      if (ab.maze !== undefined) {
        const m = ab.maze;
        if (!isStr(m.title)) err("activityBook.maze.title required");
        if (!isStr(m.instructions)) err("activityBook.maze.instructions required");
        if (!isStr(m.goalLabel)) err("activityBook.maze.goalLabel required");
        if (!isArr(m.forks, 2)) err("activityBook.maze.forks needs >= 2 forks to feel like a maze");
        else m.forks.forEach((f, i) => {
          checkGameQ(f.q, `activityBook.maze.forks[${i}].q`);
          if (!Array.isArray(f.branches) || f.branches.length !== 2 || !f.branches.every((b) => isStr(b)))
            err(`activityBook.maze.forks[${i}].branches must be exactly [label, label]`);
          if (f.correctBranch !== 0 && f.correctBranch !== 1) err(`activityBook.maze.forks[${i}].correctBranch must be 0 or 1`);
        });
      }
      if (ab.colorByAnswer !== undefined) {
        const cb = ab.colorByAnswer;
        if (!isStr(cb.title)) err("activityBook.colorByAnswer.title required");
        if (!isStr(cb.instructions)) err("activityBook.colorByAnswer.instructions required");
        if (!isArr(cb.legend, 2)) err("activityBook.colorByAnswer.legend needs >= 2 colors");
        else cb.legend.forEach((l, i) => {
          if (!isStr(l.key)) err(`activityBook.colorByAnswer.legend[${i}].key required`);
          if (!isStr(l.color)) err(`activityBook.colorByAnswer.legend[${i}].color required`);
          if (!isStr(l.matchAnswer)) err(`activityBook.colorByAnswer.legend[${i}].matchAnswer required`);
        });
        const legendAnswers = new Set((cb.legend || []).map((l) => String(l.matchAnswer)));
        if (!isArr(cb.regions, 2)) err("activityBook.colorByAnswer.regions needs >= 2 regions");
        else cb.regions.forEach((r, i) => {
          if (!isStr(r.id)) err(`activityBook.colorByAnswer.regions[${i}].id required`);
          if (!isStr(r.d)) err(`activityBook.colorByAnswer.regions[${i}].d (SVG path) required`);
          checkGameQ(r.q, `activityBook.colorByAnswer.regions[${i}].q`);
          if (r.q && r.q.answer !== undefined && legendAnswers.size && !legendAnswers.has(String(r.q.answer)))
            err(`activityBook.colorByAnswer.regions[${i}]: answer "${r.q.answer}" doesn't match any legend.matchAnswer`);
        });
      }
      if (ab.matchUp !== undefined) {
        const mu = ab.matchUp;
        if (!isStr(mu.title)) err("activityBook.matchUp.title required");
        if (!isStr(mu.instructions)) err("activityBook.matchUp.instructions required");
        if (!isArr(mu.pairs, 3)) err("activityBook.matchUp.pairs needs >= 3 pairs");
        else mu.pairs.forEach((p, i) => {
          if (!isStr(p.id)) err(`activityBook.matchUp.pairs[${i}].id required`);
          if (!isStr(p.left)) err(`activityBook.matchUp.pairs[${i}].left required`);
          if (!isStr(p.right)) err(`activityBook.matchUp.pairs[${i}].right required`);
        });
      }
      if (!ab.dotToDot && !ab.traceIt && !ab.maze && !ab.colorByAnswer && !ab.matchUp)
        err("activityBook present but empty — include at least one of dotToDot/traceIt/maze/colorByAnswer/matchUp");
    }
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
