#!/usr/bin/env node
/**
 * Manual (no-API) translation helper — companion to translate-pack.js.
 *
 * Used when no LLM key is configured. It exposes the SAME whitelist of
 * translatable prose fields (collectJobs) as translate-pack.js, but instead of
 * calling an LLM it lets a human/agent supply the translated strings directly
 * as a plain ordered JSON array. This keeps the same structural-fidelity
 * guarantee (the script owns the JSON shape; only whitelisted prose strings
 * are ever touched) while the actual translation work happens outside the
 * script.
 *
 * Usage:
 *   node tools/manual-i18n.js dump  --src <en-concept.json> --out <jobs.json>
 *   node tools/manual-i18n.js apply --src <en-concept.json> --translations <jobs.json> --lang hi|te --out <out-concept.json>
 *
 * `dump` writes { id, texts: string[] } — texts is the ordered list to translate.
 * `apply` expects a JSON file containing EITHER a bare string[] (same order/
 * length as dump produced) or { id, texts: string[] } (dump's own shape, with
 * `texts` overwritten in place with translations) and writes the translated
 * concept clone.
 */
const fs = require("fs");

function argVal(flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : undefined; }
const mode = process.argv[2];
const src = argVal("--src");
const out = argVal("--out");

if (!["dump", "apply"].includes(mode) || !src || !out) {
  console.error("usage: node tools/manual-i18n.js dump|apply --src <en-concept.json> --out <file> [--translations <file>] [--lang hi|te]");
  process.exit(2);
}

// ---- string collection (mirrors translate-pack.js's collectJobs exactly) ----
function pushStr(jobs, obj, key) {
  const v = obj[key];
  if (typeof v === "string" && v.trim()) jobs.push({ text: v, set: (t) => { obj[key] = t; } });
}
function pushArr(jobs, arr) {
  if (!Array.isArray(arr)) return;
  arr.forEach((v, i) => { if (typeof v === "string" && v.trim()) jobs.push({ text: v, set: (t) => { arr[i] = t; } }); });
}
function pushProps(jobs, props) {
  if (!props || typeof props !== "object") return;
  pushStr(jobs, props, "label");
  pushStr(jobs, props, "unit");
  for (const list of ["categories", "lines", "grids"]) {
    if (Array.isArray(props[list])) for (const item of props[list]) if (item && typeof item === "object") pushStr(jobs, item, "label");
  }
}
function collectJobs(c) {
  const jobs = [];
  const mcqAnswers = [];

  pushStr(jobs, c, "name");
  pushStr(jobs, c, "whatIsIt");
  pushStr(jobs, c, "whyNeeded");
  pushArr(jobs, c.realLifeUses);
  for (const v of c.vocabulary || []) { pushStr(jobs, v, "term"); pushStr(jobs, v, "meaning"); }
  if (c.story) {
    pushStr(jobs, c.story, "title");
    pushArr(jobs, c.story.characters);
    pushStr(jobs, c.story, "text");
    pushStr(jobs, c.story, "extractedProblem");
    pushStr(jobs, c.story, "answerInStory");
  }
  if (c.visual) { pushStr(jobs, c.visual, "caption"); pushProps(jobs, c.visual.props); }
  for (const g of c.teachingGallery || []) {
    pushStr(jobs, g, "title"); pushStr(jobs, g, "note");
    for (const ex of g.examples || []) { pushStr(jobs, ex, "caption"); pushProps(jobs, ex.props); }
  }
  if (c.standardMethod) { pushStr(jobs, c.standardMethod, "summary"); pushArr(jobs, c.standardMethod.steps); }
  for (const alt of c.alternateMethods || []) {
    pushStr(jobs, alt, "name"); pushStr(jobs, alt, "whenToUse"); pushArr(jobs, alt.steps); pushStr(jobs, alt, "example");
  }
  for (const w of c.workedExamples || []) { pushStr(jobs, w, "problem"); pushArr(jobs, w.steps); } // keep .answer
  for (const t of c.trickPractice ? [c.trickPractice] : []) {
    pushStr(jobs, t, "trick"); pushStr(jobs, t, "intro");
    for (const q of t.questions || []) {
      pushStr(jobs, q, "q"); pushArr(jobs, q.hintLadder); pushStr(jobs, q, "explain");
    }
  }
  for (const m of c.commonMistakes || []) { pushStr(jobs, m, "mistake"); pushStr(jobs, m, "fix"); } // keep .mistakeTag

  const questions = [
    ...((c.practice && c.practice.easy) || []),
    ...((c.practice && c.practice.medium) || []),
    ...((c.practice && c.practice.challenge) || []),
    ...((c.masteryCheck && c.masteryCheck.questions) || []),
  ];
  for (const q of questions) {
    pushStr(jobs, q, "q");
    pushArr(jobs, q.hintLadder);
    if (q.type === "mcq" && Array.isArray(q.options)) {
      const answerIndex = q.options.findIndex((o) => o.label === q.answer);
      for (const o of q.options) pushStr(jobs, o, "label"); // keep o.mistakeTag
      if (answerIndex >= 0) mcqAnswers.push({ q, answerIndex });
    }
  }

  pushStr(jobs, c, "teachBackPrompt");
  if (c.revisionCard) pushStr(jobs, c.revisionCard, "summary");
  if (c.rememberIt) { pushStr(jobs, c.rememberIt, "hook"); pushStr(jobs, c.rememberIt, "unpack"); }
  for (const s of c.studentQuestions || []) { pushStr(jobs, s, "q"); pushStr(jobs, s, "a"); }
  for (const f of c.formulas || []) { pushStr(jobs, f, "name"); pushStr(jobs, f, "remember"); pushStr(jobs, f, "whenToUse"); } // keep .formula
  if (c.gameMission) { pushStr(jobs, c.gameMission, "title"); pushStr(jobs, c.gameMission, "brief"); }
  pushStr(jobs, c, "realLifeProject");

  return { jobs, mcqAnswers };
}

const c = JSON.parse(fs.readFileSync(src, "utf8"));
const { jobs, mcqAnswers } = collectJobs(c);

if (mode === "dump") {
  fs.writeFileSync(out, JSON.stringify({ id: c.id, texts: jobs.map((j) => j.text) }, null, 2) + "\n", "utf8");
  console.log(`${c.id}: ${jobs.length} translatable strings → ${out}`);
  process.exit(0);
}

// ---- apply ----
const lang = argVal("--lang");
const trFile = argVal("--translations");
if (!lang || !trFile) { console.error("apply needs --lang hi|te and --translations <file>"); process.exit(2); }
const raw = JSON.parse(fs.readFileSync(trFile, "utf8"));
const texts = Array.isArray(raw) ? raw : raw.texts;
if (!Array.isArray(texts)) { console.error("translations file must be a string[] or { texts: string[] }"); process.exit(2); }
if (texts.length !== jobs.length) {
  console.error(`length mismatch: source has ${jobs.length} strings, translations file has ${texts.length}`);
  process.exit(1);
}
jobs.forEach((j, i) => j.set(String(texts[i])));
for (const { q, answerIndex } of mcqAnswers) q.answer = q.options[answerIndex].label;
c.meta = { ...(c.meta || {}), language: lang };
fs.writeFileSync(out, JSON.stringify(c, null, 2) + "\n", "utf8");
console.log(`✓ ${c.id} (${jobs.length} strings) → ${out}`);
