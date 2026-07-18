#!/usr/bin/env node
/**
 * Translation parity validator.
 *
 * Translated packs (hi / te) reuse the SAME concept ids as English and MUST stay
 * structurally identical to the English source — only display text may change.
 * This guards against a translation silently drifting from the math: the answer
 * keys, question ids, question types, mistakeTags and visual components must match
 * English exactly. (Numeric answers must be byte-identical; MCQ answers are labels,
 * so we instead require the answer to be one of the translated option labels and the
 * distractor mistakeTags to match English.)
 *
 * Usage:
 *   node tools/validate-i18n.js \
 *     --en content-packs/cbse-class3-5-en-v1/concepts,content-packs/cbse-pp1-2-en-v1/concepts \
 *     --tr content-packs/cbse-class3-5-hi-v1/concepts,content-packs/cbse-class3-5-te-v1/concepts
 */
const fs = require("fs");
const path = require("path");

let errors = 0;
const fail = (msg) => { errors++; console.error("  ✗ " + msg); };

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1].split(",").filter(Boolean) : [];
}
function loadDir(dir) {
  const out = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    out.set(f, JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  }
  return out;
}
const allQuestions = (c) => [
  ...(c.practice?.easy || []), ...(c.practice?.medium || []),
  ...(c.practice?.challenge || []), ...(c.masteryCheck?.questions || []),
];
const qmap = (c) => new Map(allQuestions(c).map((q) => [q.id, q]));

const enDirs = arg("--en");
const trDirs = arg("--tr");
if (!enDirs.length || !trDirs.length) { console.error("need --en and --tr dirs"); process.exit(2); }

// Build the canonical English concept map.
const en = new Map();
for (const d of enDirs) for (const c of loadDir(d).values()) en.set(c.id, c);

let checked = 0;
for (const dir of trDirs) {
  const lang = /-(hi|te|en)-/.exec(dir)?.[1] || "?";
  for (const [file, c] of loadDir(dir)) {
    checked++;
    const base = en.get(c.id);
    if (!base) { fail(`${lang}/${file}: concept id "${c.id}" has no English source`); continue; }
    if (c.meta?.language !== lang) fail(`${c.id} [${lang}]: meta.language is "${c.meta?.language}", expected "${lang}"`);
    if (c.grade !== base.grade) fail(`${c.id} [${lang}]: grade ${c.grade} ≠ English ${base.grade}`);
    if (c.strand !== base.strand) fail(`${c.id} [${lang}]: strand mismatch`);
    if (JSON.stringify(c.prerequisites) !== JSON.stringify(base.prerequisites)) fail(`${c.id} [${lang}]: prerequisites differ from English`);
    if (c.visual?.component !== base.visual?.component) fail(`${c.id} [${lang}]: visual component differs from English`);

    const eq = qmap(base), tq = qmap(c);
    if (eq.size !== tq.size) fail(`${c.id} [${lang}]: ${tq.size} questions vs English ${eq.size}`);
    for (const [id, be] of eq) {
      const t = tq.get(id);
      if (!t) { fail(`${c.id} [${lang}]: missing question "${id}"`); continue; }
      if (t.type !== be.type) fail(`${c.id}/${id} [${lang}]: type "${t.type}" ≠ English "${be.type}"`);
      if ((t.hintLadder || []).length !== (be.hintLadder || []).length) fail(`${c.id}/${id} [${lang}]: hintLadder length differs`);
      if (be.type === "number") {
        if (String(t.answer) !== String(be.answer)) fail(`${c.id}/${id} [${lang}]: numeric answer "${t.answer}" ≠ English "${be.answer}"`);
      } else if (be.type === "mcq") {
        const labels = (t.options || []).map((o) => o.label);
        if ((t.options || []).length !== (be.options || []).length) fail(`${c.id}/${id} [${lang}]: option count differs`);
        if (!labels.includes(t.answer)) fail(`${c.id}/${id} [${lang}]: answer "${t.answer}" is not one of the options`);
        // 0-warning rule: every distractor (non-answer option) must carry a mistakeTag.
        for (const o of t.options || []) {
          if (o.label !== t.answer && !o.mistakeTag) fail(`${c.id}/${id} [${lang}]: distractor "${o.label}" has no mistakeTag`);
        }
        // The set of distractor mistakeTags must match English (logic keys are shared).
        const setOf = (q) => [...new Set((q.options || []).filter((o) => o.label !== q.answer).map((o) => o.mistakeTag))].sort().join(",");
        if (setOf(t) !== setOf(be)) fail(`${c.id}/${id} [${lang}]: distractor mistakeTags "${setOf(t)}" ≠ English "${setOf(be)}"`);
      }
    }
    // commonMistakes tags must match English exactly.
    const tags = (x) => [...new Set((x.commonMistakes || []).map((m) => m.mistakeTag))].sort().join(",");
    if (tags(c) !== tags(base)) fail(`${c.id} [${lang}]: commonMistakes tags "${tags(c)}" ≠ English "${tags(base)}"`);
  }
}

console.log(`\nFearlessMath i18n parity — ${checked} translated concept(s) checked against English`);
console.log("--------------------------------------------------------");
if (errors) { console.log(`RESULT: FAIL (${errors} mismatch(es))`); process.exit(1); }
console.log("RESULT: PASS (translations structurally match English)");
