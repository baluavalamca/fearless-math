#!/usr/bin/env node
/**
 * FearlessMath translation pipeline.
 *
 * Produces a Hindi/Telugu copy of an English concept pack while GUARANTEEING the
 * math stays intact. The script — not the model — owns the JSON structure: it
 * walks a fixed whitelist of PROSE fields, sends only those strings to the LLM,
 * and writes the translations back into a clone of the English concept. So ids,
 * grades, prerequisites, numeric answers, mistakeTags, visual components, formula
 * strings and all numeric props are copied verbatim and can never drift. Run
 * `npm run validate-i18n` afterwards to prove parity.
 *
 * Usage:
 *   FM_TRANSLATE_KEY=sk-... node tools/translate-pack.js \
 *     --src content-packs/cbse-pp1-2-en-v1/concepts \
 *     --lang hi --out content-packs/cbse-pp1-2-hi-v1/concepts
 *
 * Flags:
 *   --src <dir[,dir]>   English concept dir(s)            (required)
 *   --lang hi|te        target language                   (required)
 *   --out <dir>         where to write translated JSON     (required unless --dry)
 *   --only a,b,c        translate only these concept ids
 *   --limit N           translate at most N concepts (smoke test)
 *   --overwrite         replace existing output files (default: skip existing)
 *   --dry               extract + count translatable strings, NO LLM, NO writes
 *
 * Provider (OpenAI-compatible chat completions), via env:
 *   FM_TRANSLATE_KEY    api key                            (required unless --dry)
 *   FM_TRANSLATE_URL    default https://api.openai.com/v1/chat/completions
 *   FM_TRANSLATE_MODEL  default gpt-4o-mini
 */
const fs = require("fs");
const path = require("path");

const LANG_NAME = { hi: "Hindi", te: "Telugu" };

function argVal(flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : undefined; }
const hasFlag = (f) => process.argv.includes(f);

const srcDirs = (argVal("--src") || "").split(",").filter(Boolean);
const lang = argVal("--lang");
const outDir = argVal("--out");
const only = (argVal("--only") || "").split(",").filter(Boolean);
const limit = argVal("--limit") ? parseInt(argVal("--limit"), 10) : Infinity;
const dry = hasFlag("--dry");
const overwrite = hasFlag("--overwrite");

if (!srcDirs.length || !lang || (!outDir && !dry)) {
  console.error("usage: node tools/translate-pack.js --src <dir[,dir]> --lang hi|te --out <dir> [--only ids] [--limit N] [--overwrite] [--dry]");
  process.exit(2);
}
if (!LANG_NAME[lang]) { console.error(`--lang must be one of: ${Object.keys(LANG_NAME).join(", ")}`); process.exit(2); }

// ---- glossary (optional but recommended) -------------------------------------
let glossary = {};
try {
  const gPath = path.join(__dirname, "i18n-glossary", `${lang}.json`);
  const raw = JSON.parse(fs.readFileSync(gPath, "utf8"));
  for (const [k, v] of Object.entries(raw)) if (!k.startsWith("_")) glossary[k] = v;
} catch { /* glossary is optional */ }

// ---- string collection (the whitelist of translatable PROSE fields) ----------
/** Push a translatable string + its writer. Empty/undefined strings are skipped. */
function pushStr(jobs, obj, key) {
  const v = obj[key];
  if (typeof v === "string" && v.trim()) jobs.push({ text: v, set: (t) => { obj[key] = t; } });
}
function pushArr(jobs, arr) {
  if (!Array.isArray(arr)) return;
  arr.forEach((v, i) => { if (typeof v === "string" && v.trim()) jobs.push({ text: v, set: (t) => { arr[i] = t; } }); });
}
/** Visual props: translate label/unit + nested labels, keep every numeric value + expression. */
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
  const mcqAnswers = []; // { q, answerIndex } — re-pointed after option labels are translated

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
  for (const w of c.workedExamples || []) { pushStr(jobs, w, "problem"); pushArr(jobs, w.steps); } // keep .answer
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
    // number-type answers are kept verbatim
  }

  pushStr(jobs, c, "teachBackPrompt");
  if (c.revisionCard) pushStr(jobs, c.revisionCard, "summary");
  if (c.rememberIt) { pushStr(jobs, c.rememberIt, "hook"); pushStr(jobs, c.rememberIt, "unpack"); }
  for (const s of c.studentQuestions || []) { pushStr(jobs, s, "q"); pushStr(jobs, s, "a"); }
  for (const f of c.formulas || []) { pushStr(jobs, f, "name"); pushStr(jobs, f, "remember"); pushStr(jobs, f, "whenToUse"); } // keep .formula

  return { jobs, mcqAnswers };
}

// ---- LLM call ---------------------------------------------------------------
async function translateBatch(texts) {
  const url = process.env.FM_TRANSLATE_URL || "https://api.openai.com/v1/chat/completions";
  const key = process.env.FM_TRANSLATE_KEY;
  const model = process.env.FM_TRANSLATE_MODEL || "gpt-4o-mini";
  const glossLines = Object.entries(glossary).map(([e, t]) => `  "${e}" → "${t}"`).join("\n");
  const system =
    `You are an expert mathematics teacher translating a children's maths lesson app into ${LANG_NAME[lang]} for Indian school students. ` +
    `Translate each string naturally and simply for the grade level. RULES:\n` +
    `- Keep ALL numbers, digits, mathematical symbols, operators, variables, formulas and LaTeX EXACTLY as-is (do not localise digits).\n` +
    `- Keep units/abbreviations sensible; do not add or remove information.\n` +
    `- Use this fixed terminology where it applies:\n${glossLines || "  (none)"}\n` +
    `- Return ONLY a JSON array of strings, same length and order as the input, translations only — no commentary.`;
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(texts) },
    ],
    temperature: 0.2,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  let content = j.choices?.[0]?.message?.content || "";
  const m = content.match(/\[[\s\S]*\]/);
  if (m) content = m[0];
  const arr = JSON.parse(content);
  if (!Array.isArray(arr) || arr.length !== texts.length) throw new Error(`expected ${texts.length} translations, got ${Array.isArray(arr) ? arr.length : "non-array"}`);
  return arr.map(String);
}
async function translateAll(texts) {
  const BATCH = 40;
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    let tr;
    try { tr = await translateBatch(slice); }
    catch (e) { // one retry
      await new Promise((r) => setTimeout(r, 1500));
      tr = await translateBatch(slice);
    }
    out.push(...tr);
  }
  return out;
}

// ---- main -------------------------------------------------------------------
(async () => {
  const files = [];
  for (const dir of srcDirs) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) files.push(path.join(dir, f));
  }
  if (outDir && !dry) fs.mkdirSync(outDir, { recursive: true });

  let done = 0, skipped = 0, totalStrings = 0;
  for (const file of files) {
    if (done >= limit) break;
    const c = JSON.parse(fs.readFileSync(file, "utf8"));
    if (only.length && !only.includes(c.id)) continue;
    const outPath = outDir ? path.join(outDir, path.basename(file)) : null;
    if (!dry && !overwrite && outPath && fs.existsSync(outPath)) { skipped++; continue; }

    const { jobs, mcqAnswers } = collectJobs(c);
    totalStrings += jobs.length;

    if (dry) {
      console.log(`  ${c.id.padEnd(34)} ${String(jobs.length).padStart(4)} strings`);
      done++;
      continue;
    }

    const translated = await translateAll(jobs.map((j) => j.text));
    jobs.forEach((j, i) => j.set(translated[i]));
    for (const { q, answerIndex } of mcqAnswers) q.answer = q.options[answerIndex].label; // re-point to translated label
    c.meta = { ...(c.meta || {}), language: lang };

    fs.writeFileSync(outPath, JSON.stringify(c, null, 2) + "\n", "utf8");
    console.log(`  ✓ ${c.id}  (${jobs.length} strings) → ${outPath}`);
    done++;
  }

  console.log("\n--------------------------------------------------------");
  console.log(dry
    ? `DRY RUN: ${done} concept(s), ${totalStrings} translatable strings total (no LLM called, nothing written)`
    : `Translated ${done} concept(s) into ${LANG_NAME[lang]}${skipped ? `, skipped ${skipped} existing` : ""}. Next: npm run validate-i18n`);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
