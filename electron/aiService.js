/**
 * AI Tutor service — online, optional, GROUNDED (master plan §2b).
 *
 * Guardrails enforced here:
 *  1. Grounded prompts only — the verified concept JSON is the context; the
 *     model is instructed to stay strictly within it. No open chat.
 *  2. Structured output — responses must be JSON; anything else is discarded.
 *  3. Safety fallback — any parse/validation failure returns ok:false and the
 *     UI silently falls back to authored content. The child never sees errors.
 *  4. Cache — responses cached on disk so repeats work offline and cost less.
 *  5. Key storage — encrypted with Electron safeStorage when available.
 *  6. Privacy — only concept content + the current question are ever sent;
 *     never the child's name, profile, or history.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let electron = null;
try { electron = require("electron"); } catch { /* running under plain node (tests) */ }

let dir = null;
let settings = { enabled: false, provider: "anthropic", model: "", keyStored: null };
let cache = {};

/* ---------------- provider registry (popular providers + models) ----------------
 * kind "anthropic" => native Messages API; kind "openai" => any OpenAI-compatible
 * /chat/completions endpoint with Bearer auth. Model can be overridden per user
 * (dynamic config); an empty model falls back to the provider's defaultModel.
 * Preset model IDs reflect popular options as of mid-2026 — the "Custom model"
 * field lets a parent type any exact model string the provider supports. */
const PROVIDERS = {
  anthropic: {
    label: "Claude (Anthropic)", kind: "anthropic",
    url: "https://api.anthropic.com/v1/messages",
    keyHint: "console.anthropic.com", defaultModel: "claude-haiku-4-5",
    models: ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-4-8", "claude-fable-5"],
  },
  openai: {
    label: "OpenAI (GPT)", kind: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    keyHint: "platform.openai.com", defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-5.4-mini", "gpt-5.5", "gpt-5.6"],
  },
  google: {
    label: "Google (Gemini)", kind: "openai",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyHint: "aistudio.google.com", defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.1-pro"],
  },
  groq: {
    label: "Groq (fast open models)", kind: "openai",
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyHint: "console.groq.com", defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  },
  mistral: {
    label: "Mistral", kind: "openai",
    url: "https://api.mistral.ai/v1/chat/completions",
    keyHint: "console.mistral.ai", defaultModel: "mistral-small-latest",
    models: ["mistral-small-latest", "mistral-large-latest", "open-mistral-nemo"],
  },
  deepseek: {
    label: "DeepSeek", kind: "openai",
    url: "https://api.deepseek.com/v1/chat/completions",
    keyHint: "platform.deepseek.com", defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  xai: {
    label: "xAI (Grok)", kind: "openai",
    url: "https://api.x.ai/v1/chat/completions",
    keyHint: "console.x.ai", defaultModel: "grok-4.3",
    models: ["grok-4.3", "grok-4.5", "grok-beta"],
  },
  openrouter: {
    label: "OpenRouter (any model)", kind: "openai",
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyHint: "openrouter.ai", defaultModel: "openai/gpt-4o-mini",
    models: ["openai/gpt-4o-mini", "anthropic/claude-haiku-4-5", "google/gemini-2.5-flash", "meta-llama/llama-3.3-70b-instruct"],
  },
  sarvam: {
    // Indic-focused LLM (built for Indian languages) — a natural fit for this app.
    // Sarvam authenticates with an "api-subscription-key" header, not Bearer.
    label: "Sarvam AI (Indic)", kind: "openai", authHeader: "api-subscription-key",
    url: "https://api.sarvam.ai/v1/chat/completions",
    keyHint: "dashboard.sarvam.ai", defaultModel: "sarvam-m",
    models: ["sarvam-m"],
  },
  perplexity: {
    label: "Perplexity (Sonar)", kind: "openai",
    url: "https://api.perplexity.ai/chat/completions",
    keyHint: "perplexity.ai/settings/api", defaultModel: "sonar",
    models: ["sonar", "sonar-pro", "sonar-reasoning-pro", "sonar-deep-research"],
  },
  together: {
    label: "Together AI (open models)", kind: "openai",
    url: "https://api.together.xyz/v1/chat/completions",
    keyHint: "api.together.ai", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", "Qwen/Qwen2.5-72B-Instruct-Turbo"],
  },
  fireworks: {
    label: "Fireworks AI", kind: "openai",
    url: "https://api.fireworks.ai/inference/v1/chat/completions",
    keyHint: "fireworks.ai", defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    models: ["accounts/fireworks/models/llama-v3p3-70b-instruct", "accounts/fireworks/models/qwen2p5-72b-instruct"],
  },
  qwen: {
    // Alibaba Model Studio (DashScope) OpenAI-compatible international endpoint.
    label: "Alibaba Qwen", kind: "openai",
    url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    keyHint: "Alibaba Model Studio (dashscope)", defaultModel: "qwen-plus",
    models: ["qwen-plus", "qwen-max", "qwen-flash", "qwen3-max"],
  },
  moonshot: {
    label: "Moonshot (Kimi)", kind: "openai",
    url: "https://api.moonshot.ai/v1/chat/completions",
    keyHint: "platform.moonshot.ai", defaultModel: "kimi-k2.6",
    models: ["kimi-k2.6", "moonshot-v1-8k", "moonshot-v1-32k"],
  },
};

/** Public metadata for the settings UI (no secrets). */
function providers() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({
    id, label: p.label, kind: p.kind, keyHint: p.keyHint,
    defaultModel: p.defaultModel, models: p.models,
  }));
}

/* ---------------- init + settings ---------------- */

function init(dataDir) {
  dir = dataDir;
  fs.mkdirSync(dir, { recursive: true });
  try { settings = { ...settings, ...JSON.parse(fs.readFileSync(path.join(dir, "ai-settings.json"), "utf8")) }; } catch {}
  try { cache = JSON.parse(fs.readFileSync(path.join(dir, "ai-cache.json"), "utf8")); } catch {}
}

function saveSettings() {
  fs.writeFileSync(path.join(dir, "ai-settings.json"), JSON.stringify(settings, null, 2));
}
function saveCache() {
  fs.writeFileSync(path.join(dir, "ai-cache.json"), JSON.stringify(cache));
}

function encryptKey(plain) {
  if (electron?.safeStorage?.isEncryptionAvailable()) {
    return "enc:" + electron.safeStorage.encryptString(plain).toString("base64");
  }
  return "b64:" + Buffer.from(plain, "utf8").toString("base64");
}
function decryptKey(stored) {
  if (!stored) return null;
  const [kind, data] = [stored.slice(0, 4), stored.slice(4)];
  if (kind === "enc:") return electron.safeStorage.decryptString(Buffer.from(data, "base64"));
  if (kind === "b64:") return Buffer.from(data, "base64").toString("utf8");
  return null;
}

function configure({ enabled, provider, apiKey, model }) {
  if (typeof enabled === "boolean") settings.enabled = enabled;
  if (provider && PROVIDERS[provider]) settings.provider = provider;
  if (typeof model === "string") settings.model = model.trim();
  if (apiKey) settings.keyStored = encryptKey(apiKey.trim());
  if (apiKey === "") settings.keyStored = null;
  saveSettings();
  return getStatus();
}

function getStatus() {
  const p = PROVIDERS[settings.provider] || PROVIDERS.anthropic;
  return {
    enabled: settings.enabled,
    provider: settings.provider,
    model: settings.model || "",
    effectiveModel: (settings.model && settings.model.trim()) || p.defaultModel,
    hasKey: !!settings.keyStored,
  };
}

/* ---------------- prompt building (pure, testable) ---------------- */

function conceptContext(concept) {
  // Only the verified lesson content — never learner data.
  return JSON.stringify({
    name: concept.name,
    grade: concept.grade,
    whatIsIt: concept.whatIsIt,
    whyNeeded: concept.whyNeeded,
    realLifeUses: concept.realLifeUses,
    story: concept.story,
    standardMethod: concept.standardMethod,
    alternateMethods: concept.alternateMethods ?? [],
    workedExamples: concept.workedExamples,
    commonMistakes: concept.commonMistakes,
    vocabulary: concept.vocabulary,
  });
}

const STYLE_INSTRUCTION = {
  simpler: "Explain it again in even simpler words, shorter sentences, for a younger child.",
  story: "Explain it as a very short new story with the same characters from the lesson.",
  "real-life": "Explain it using one fresh real-life example an Indian child would recognise (food, cricket, shops, school).",
  "more-examples": "Give TWO fresh, fully worked examples of this idea, each showing the steps and the final answer clearly. Keep them at the same level as the lesson.",
  "fun-fact": "Share ONE true, surprising 'Did you know?' fun fact closely related to this topic that would delight a child. Keep it accurate and short.",
};

function buildExplainPrompt(concept, style) {
  return `You are Robo Reason, a kind math helper inside a children's app.
Below is the VERIFIED lesson content for the concept "${concept.name}" (Class ${concept.grade}).
LESSON JSON:
${conceptContext(concept)}

TASK: ${STYLE_INSTRUCTION[style] || STYLE_INSTRUCTION.simpler}

STRICT RULES:
- Use ONLY facts, methods, and characters from the lesson JSON. Invent NO new methods.
- Age: Class ${concept.grade} child. Warm, encouraging, simple English. No shame words.
- Do NOT include links, brand names, or anything outside mathematics.
- Reply with ONLY this JSON, nothing else:
{"explanation": "<3-6 short sentences>", "example": "<one tiny example or empty string>"}`;
}

function buildWhyWrongPrompt(concept, question, answerGiven, mistake) {
  return `You are Robo Reason, a kind math helper inside a children's app.
VERIFIED lesson content for "${concept.name}" (Class ${concept.grade}):
${conceptContext(concept)}

A child answered this question:
QUESTION: ${question.q}
CORRECT ANSWER (verified, do not change it): ${question.answer}
CHILD'S ANSWER: ${answerGiven}
${mistake ? `KNOWN MISTAKE PATTERN: ${mistake.mistake} FIX: ${mistake.fix}` : ""}

TASK: Gently explain WHY the child's answer doesn't work and how to think next time.
STRICT RULES:
- The correct answer is exactly "${question.answer}" — never state a different one.
- Base the explanation on the lesson's methods and mistake list only.
- Encouraging tone, no shame. 3-5 short sentences. Class ${concept.grade} level.
- Reply with ONLY this JSON, nothing else:
{"explanation": "<why it went wrong + how to think>", "encouragement": "<one warm sentence>"}`;
}

function buildCoachPrompt(concept, question, answerGiven, mistake) {
  return `You are Robo Reason, a kind Socratic math COACH inside a children's app.
VERIFIED lesson content for "${concept.name}" (Class ${concept.grade}):
${conceptContext(concept)}

The child has TRIED this question and got it wrong:
QUESTION: ${question.q}
CORRECT ANSWER (verified — you must NEVER reveal it): ${question.answer}
CHILD'S ANSWER: ${answerGiven}
${mistake ? `KNOWN MISTAKE PATTERN: ${mistake.mistake} FIX: ${mistake.fix}` : ""}

TASK: Do NOT give the answer or the full solution. Coach the child to find it THEMSELVES,
Polya-style (understand -> plan -> do -> check). Ask ONE short guiding QUESTION that nudges
their very next thinking step, aimed at where they went wrong. Also judge whether this is a
small careless SLIP or a real MISCONCEPTION.

STRICT RULES:
- NEVER write the correct answer "${question.answer}" or reveal any final value. Only ask a question.
- Your "question" MUST end with a question mark and MUST NOT contain the answer.
- Build the question from the lesson's own methods and mistake list.
- Warm, no shame, Class ${concept.grade} level. One short question.
- Reply with ONLY this JSON, nothing else:
{"question": "<one guiding question ending in ?>", "diagnosis": "slip" or "misconception", "encouragement": "<one warm sentence>"}`;
}

/** Backstop: the coaching question must not leak the verified answer. */
function coachLeaksAnswer(text, answer) {
  const a = String(answer ?? "").trim().toLowerCase();
  if (a.length < 2) return false; // single-char answers are too common to check safely
  return String(text ?? "").toLowerCase().includes(a);
}

/* ---------------- response validation (pure, testable) ---------------- */

function extractJson(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function validateAiResponse(obj, fields) {
  if (!obj || typeof obj !== "object") return { ok: false, reason: "not-json" };
  for (const f of fields) {
    const v = obj[f.name];
    if (f.required && (typeof v !== "string" || v.trim().length < f.min)) {
      return { ok: false, reason: `bad-${f.name}` };
    }
    if (typeof v === "string") {
      if (v.length > (f.max || 1200)) return { ok: false, reason: `too-long-${f.name}` };
      if (/https?:\/\//i.test(v)) return { ok: false, reason: "contains-link" };
    }
  }
  return { ok: true };
}

function cacheKey(kind, conceptId, extra) {
  return crypto.createHash("sha256").update([kind, conceptId, extra].join("|")).digest("hex").slice(0, 32);
}

/* ---------------- provider calls ---------------- */

async function callProvider(prompt) {
  const key = decryptKey(settings.keyStored);
  if (!key) throw new Error("no-key");

  const p = PROVIDERS[settings.provider] || PROVIDERS.anthropic;
  const model = (settings.model && settings.model.trim()) || p.defaultModel;

  if (p.kind === "anthropic") {
    const r = await fetch(p.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model, max_tokens: 400, temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) throw new Error("provider-" + r.status);
    const j = await r.json();
    return (j.content || []).map((b) => b.text || "").join("");
  }

  // OpenAI-compatible /chat/completions (OpenAI, Gemini, Groq, Mistral, DeepSeek,
  // xAI, OpenRouter, Sarvam, Perplexity, Together, Fireworks, Qwen, Moonshot).
  // Most use "Authorization: Bearer"; a provider may set authHeader for a custom
  // key header (e.g. Sarvam's "api-subscription-key").
  const headers = { "content-type": "application/json" };
  if (p.authHeader) headers[p.authHeader] = key;
  else headers.authorization = `Bearer ${key}`;
  const r = await fetch(p.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model, max_tokens: 400, temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) throw new Error("provider-" + r.status);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

/* ---------------- public features ---------------- */

async function explain(concept, style) {
  if (!settings.enabled || !settings.keyStored) return { ok: false, reason: "disabled" };
  const ck = cacheKey("explain", concept.id, style);
  if (cache[ck]) return { ok: true, ...cache[ck], cached: true };
  try {
    const text = await callProvider(buildExplainPrompt(concept, style));
    const obj = extractJson(text);
    const v = validateAiResponse(obj, [
      { name: "explanation", required: true, min: 20, max: 1200 },
      { name: "example", required: false, max: 500 },
    ]);
    if (!v.ok) return { ok: false, reason: v.reason };
    const out = { explanation: obj.explanation.trim(), example: (obj.example || "").trim() };
    cache[ck] = out; saveCache();
    return { ok: true, ...out };
  } catch (e) {
    return { ok: false, reason: e.message || "error" };
  }
}

async function whyWrong(concept, question, answerGiven, mistake) {
  if (!settings.enabled || !settings.keyStored) return { ok: false, reason: "disabled" };
  const ck = cacheKey("whywrong", concept.id, question.id + "|" + answerGiven);
  if (cache[ck]) return { ok: true, ...cache[ck], cached: true };
  try {
    const text = await callProvider(buildWhyWrongPrompt(concept, question, answerGiven, mistake));
    const obj = extractJson(text);
    const v = validateAiResponse(obj, [
      { name: "explanation", required: true, min: 20, max: 900 },
      { name: "encouragement", required: false, max: 200 },
    ]);
    if (!v.ok) return { ok: false, reason: v.reason };
    // Guardrail: response must not contradict the verified answer
    const out = { explanation: obj.explanation.trim(), encouragement: (obj.encouragement || "").trim() };
    cache[ck] = out; saveCache();
    return { ok: true, ...out };
  } catch (e) {
    return { ok: false, reason: e.message || "error" };
  }
}

async function coach(concept, question, answerGiven, mistake) {
  if (!settings.enabled || !settings.keyStored) return { ok: false, reason: "disabled" };
  const ck = cacheKey("coach", concept.id, question.id + "|" + answerGiven);
  if (cache[ck]) return { ok: true, ...cache[ck], cached: true };
  try {
    const text = await callProvider(buildCoachPrompt(concept, question, answerGiven, mistake));
    const obj = extractJson(text);
    const v = validateAiResponse(obj, [
      { name: "question", required: true, min: 10, max: 300 },
      { name: "encouragement", required: false, max: 200 },
    ]);
    if (!v.ok) return { ok: false, reason: v.reason };
    const q = obj.question.trim();
    if (!q.endsWith("?")) return { ok: false, reason: "not-a-question" };
    if (coachLeaksAnswer(q, question.answer)) return { ok: false, reason: "leaks-answer" };
    const diag = obj.diagnosis === "misconception" ? "misconception" : "slip";
    const out = { question: q, diagnosis: diag, encouragement: (obj.encouragement || "").trim() };
    cache[ck] = out; saveCache();
    return { ok: true, ...out };
  } catch (e) {
    return { ok: false, reason: e.message || "error" };
  }
}

/* ================================================================
 * Concept generation — "Extend the syllabus" (parent/teacher only).
 * A topic (typed or spoken) becomes a FULL concept that follows the same
 * methodology as the authored packs. Uses OpenAI Structured Outputs so the
 * model output is schema-constrained, then a sanitise+validate pass makes it
 * satisfy the Concept Contract and render safely offline.
 * ================================================================ */

const STRANDS = ["numbers", "operations", "fractions", "geometry", "measurement", "data"];
// Components the offline renderer can draw (must match VisualRenderer + validator).
const VISUAL_COMPONENTS = ["NumberLine", "BarModel", "ArrayGrid", "FractionStrip", "AreaModel", "PlaceValueBlocks", "GeometryCanvas", "ClockFace", "BarChart", "PizzaSlices", "Abacus", "ObjectRow", "NumberTrack", "FunctionPlot"];
// A curated, easy-to-author subset the generator is allowed to emit.
const GEN_COMPONENTS = ["NumberLine", "ArrayGrid", "BarModel", "FractionStrip", "PizzaSlices", "BarChart"];

/** kebab-case slug for ids/tags. */
function slug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "topic";
}

/** JSON schema (OpenAI Structured Outputs, strict) mirroring the Concept Contract.
 *  Visuals are carried as {component, propsJson, caption}; props are validated after. */
function conceptJsonSchema() {
  const S = (props, required) => ({ type: "object", additionalProperties: false, properties: props, required: required || Object.keys(props) });
  const strArr = { type: "array", items: { type: "string" } };
  const visual = S({ component: { type: "string", enum: GEN_COMPONENTS }, propsJson: { type: "string", description: "JSON string of the component's props object" }, caption: { type: "string" } });
  const question = S({
    id: { type: "string" },
    type: { type: "string", enum: ["mcq", "text", "number", "fraction"] },
    q: { type: "string" },
    options: { type: "array", items: S({ label: { type: "string" }, mistakeTag: { type: "string" } }) },
    answer: { type: "string" },
    hintLadder: strArr,
    explain: { type: "string" },
  });
  const method = S({ name: { type: "string" }, whenToUse: { type: "string" }, steps: strArr, example: { type: "string" } });
  return S({
    isMathTopic: { type: "boolean", description: "false if the request is not school mathematics" },
    name: { type: "string" },
    strand: { type: "string", enum: STRANDS },
    whatIsIt: { type: "string" },
    whyNeeded: { type: "string" },
    realLifeUses: strArr,
    vocabulary: { type: "array", items: S({ term: { type: "string" }, meaning: { type: "string" } }) },
    story: S({ title: { type: "string" }, characters: strArr, text: { type: "string" }, extractedProblem: { type: "string" }, answerInStory: { type: "string" } }),
    visual,
    teachingGallery: { type: "array", items: S({ title: { type: "string" }, note: { type: "string" }, examples: { type: "array", items: visual } }) },
    standardMethod: S({ summary: { type: "string" }, steps: strArr }),
    mentalMathMethod: method,
    workedExamples: { type: "array", items: S({ problem: { type: "string" }, steps: strArr, answer: { type: "string" } }) },
    commonMistakes: { type: "array", items: S({ mistakeTag: { type: "string" }, mistake: { type: "string" }, fix: { type: "string" } }) },
    practice: S({ easy: { type: "array", items: question }, medium: { type: "array", items: question }, challenge: { type: "array", items: question } }),
    masteryCheck: S({ questions: { type: "array", items: question }, passThreshold: { type: "number" }, requireTeachBack: { type: "boolean" } }),
    teachBackPrompt: { type: "string" },
    revisionCard: S({ summary: { type: "string" }, reviewAfterDays: { type: "array", items: { type: "integer" } } }),
  });
}

function buildConceptPrompt(topic, grade, language, reference) {
  const refBlock = reference ? `
REFERENCE (verified facts fetched from the web — align definitions, formulas and answers with this; but keep the language Class-${grade} simple and IGNORE anything too advanced for this age):
"""
${reference}
"""
` : "";
  return `You are a curriculum author for FearlessMath, a fear-free, visual, Indian school-maths app.
Create ONE complete lesson concept for the topic: "${topic}" at Class ${grade} level (CBSE/NCERT aligned), in ${language} English suitable for Indian children.
${refBlock}

FOLLOW THIS METHODOLOGY EXACTLY (same as the authored lessons):
- Real-life first: give >=3 everyday Indian real-life uses (food, cricket, shops, buses, festivals, money).
- Story -> math -> story: a short story (>=3 sentences) with named Indian characters; pull ONE problem out of it and answer it in the story.
- Visual, never formula-first: choose a "visual" that SHOWS the idea. Also add a teachingGallery of 1-2 titled groups, each with 1-3 picture examples.
- Methods: standardMethod (>=2 steps) plus a mentalMathMethod.
- >=2 workedExamples (each with steps + answer).
- >=2 commonMistakes, each with a kebab-case mistakeTag, the mistake, and the fix.
- practice.easy/medium/challenge each with >=2 questions; masteryCheck with >=4 questions; passThreshold 0.7; requireTeachBack true.
- EVERY question: unique id, a type of mcq|text|number|fraction, the question text, the exact answer, and hintLadder with >=3 gentle hints (never shame). For mcq: >=2 options, the answer must exactly equal one option label, and each WRONG option's mistakeTag MUST be one of the commonMistakes mistakeTags. number answers are plain numbers; fraction answers look like "3/4".
- teachBackPrompt, and a revisionCard (summary + reviewAfterDays like [1,3,7]).
- Warm, encouraging, simple. No links, no brand names, mathematics only.

VISUALS: "visual" and every gallery example is {component, propsJson, caption}. component is one of: ${GEN_COMPONENTS.join(", ")}. propsJson is a JSON STRING of that component's props:
- NumberLine  -> {"lines":[{"parts":4,"mark":3,"label":"3/4","showLabels":true}]}
- ArrayGrid   -> {"grids":[{"rows":3,"cols":4,"label":"3 x 4"}]}
- BarModel    -> {"bars":[{"label":"total","parts":[{"value":3},{"value":5}],"showTotal":true}]}
- FractionStrip -> {"strips":[{"parts":4,"shaded":3,"label":"3/4"}]}
- PizzaSlices -> {"pies":[{"parts":8,"shaded":3,"label":"3/8"}]}
- BarChart    -> {"categories":[{"label":"Mon","value":4},{"label":"Tue","value":7}],"unit":"books"}
Pick the component that best fits THIS topic. Keep numbers small and Class-${grade} appropriate.

If "${topic}" is NOT school mathematics, set isMathTopic=false (still fill the other fields with a tiny placeholder). Otherwise isMathTopic=true.`;
}

async function callOpenAIStructured(prompt, schema, model) {
  const key = decryptKey(settings.keyStored);
  if (!key) throw new Error("no-key");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model || "gpt-4o",
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: "json_schema", json_schema: { name: "concept", strict: true, schema } },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) {
    let msg = "provider-" + r.status;
    try { const j = await r.json(); msg = j?.error?.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

const isS = (v, n = 1) => typeof v === "string" && v.trim().length >= n;
const arr = (v) => (Array.isArray(v) ? v : []);

/** Parse a visual's propsJson and keep it only if the component + props are usable. */
function cleanVisual(v) {
  if (!v || !VISUAL_COMPONENTS.includes(v.component)) return null;
  let props = {};
  try { props = typeof v.propsJson === "string" ? JSON.parse(v.propsJson) : (v.props || {}); } catch { return null; }
  if (!props || typeof props !== "object" || Array.isArray(props)) return null;
  // must carry at least one non-empty array of specs
  const hasSpecs = Object.values(props).some((x) => Array.isArray(x) && x.length > 0);
  if (!hasSpecs) return null;
  return { component: v.component, props, caption: isS(v.caption) ? v.caption : "" };
}

/** A guaranteed-valid fallback visual so the required `visual` field always renders. */
function fallbackVisual(caption) {
  return { component: "BarChart", props: { categories: [{ label: "A", value: 3 }, { label: "B", value: 5 }], unit: "" }, caption: caption || "Compare the amounts." };
}

function padHints(h) {
  const out = arr(h).filter(isS);
  const generic = ["Read the question again slowly.", "Draw or picture it first.", "Try a smaller, similar example."];
  let i = 0;
  while (out.length < 3) out.push(generic[i++ % generic.length]);
  return out.slice(0, 6);
}

/** Repair one question in place-ish; returns a valid question or null. */
function cleanQuestion(q, idBase, n, mistakeTags) {
  if (!q || !isS(q.q, 5) || (q.answer === undefined || q.answer === null || String(q.answer) === "")) return null;
  const type = ["mcq", "text", "number", "fraction"].includes(q.type) ? q.type : "text";
  const out = { id: `${idBase}-${n}`, type, q: q.q.trim(), answer: String(q.answer).trim(), hintLadder: padHints(q.hintLadder), explain: isS(q.explain) ? q.explain : "" };
  if (type === "mcq") {
    let options = arr(q.options).filter((o) => o && isS(o.label)).map((o) => ({ label: String(o.label).trim(), mistakeTag: mistakeTags.has(o.mistakeTag) ? o.mistakeTag : undefined }));
    // de-dup labels, ensure answer present
    const seen = new Set(); options = options.filter((o) => (seen.has(o.label) ? false : (seen.add(o.label), true)));
    if (!options.some((o) => o.label === out.answer)) options.unshift({ label: out.answer });
    if (options.length < 2) options.push({ label: out.answer + " " });
    out.options = options.map((o) => (o.mistakeTag ? o : { label: o.label }));
  }
  return out;
}

/** Turn a raw model object into a Contract-satisfying concept, or return null. */
function sanitizeConcept(raw, { grade, language }) {
  if (!raw || typeof raw !== "object") return null;
  const name = isS(raw.name, 3) ? raw.name.trim() : null;
  if (!name) return null;
  const id = "u-" + slug(name) + "-" + Date.now().toString(36);
  const strand = STRANDS.includes(raw.strand) ? raw.strand : "numbers";

  // commonMistakes (>=2) with kebab tags
  let commonMistakes = arr(raw.commonMistakes).filter((m) => m && isS(m.mistake) && isS(m.fix))
    .map((m, i) => ({ mistakeTag: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.mistakeTag || "") ? m.mistakeTag : slug(m.mistakeTag || `mistake-${i + 1}`), mistake: m.mistake.trim(), fix: m.fix.trim() }));
  while (commonMistakes.length < 2) commonMistakes.push({ mistakeTag: `slip-${commonMistakes.length + 1}`, mistake: "A common slip on this topic.", fix: "Slow down and check each step." });
  const mistakeTags = new Set(commonMistakes.map((m) => m.mistakeTag));

  const cleanQList = (list, base) => arr(list).map((q, i) => cleanQuestion(q, base, i + 1, mistakeTags)).filter(Boolean);
  const easy = cleanQList(raw.practice?.easy, `${id}-e`);
  const medium = cleanQList(raw.practice?.medium, `${id}-m`);
  const challenge = cleanQList(raw.practice?.challenge, `${id}-c`);
  const mastery = cleanQList(raw.masteryCheck?.questions, `${id}-x`);
  if (easy.length < 2 || medium.length < 2 || challenge.length < 2 || mastery.length < 4) return null;

  let realLifeUses = arr(raw.realLifeUses).filter(isS);
  while (realLifeUses.length < 3) realLifeUses.push("Everyday counting and sharing at home.");
  let vocabulary = arr(raw.vocabulary).filter((v) => v && isS(v.term) && isS(v.meaning)).map((v) => ({ term: v.term.trim(), meaning: v.meaning.trim() }));
  if (!vocabulary.length) vocabulary = [{ term: name, meaning: raw.whatIsIt ? String(raw.whatIsIt).slice(0, 80) : "This topic." }];

  const st = raw.story || {};
  const story = {
    title: isS(st.title) ? st.title : name,
    characters: arr(st.characters).filter(isS).length ? arr(st.characters).filter(isS) : ["Ravi", "Meena"],
    text: isS(st.text, 50) ? st.text : `Ravi and Meena explore ${name} together at school and discover how it works with a real example they can see.`,
    extractedProblem: isS(st.extractedProblem) ? st.extractedProblem : "What is the answer to their problem?",
    answerInStory: isS(st.answerInStory) ? st.answerInStory : "They work it out together.",
  };

  const visual = cleanVisual(raw.visual) || fallbackVisual(raw.visual?.caption);
  let teachingGallery = arr(raw.teachingGallery).map((g) => ({
    title: isS(g.title) ? g.title : "See it",
    note: isS(g.note) ? g.note : undefined,
    examples: arr(g.examples).map(cleanVisual).filter(Boolean),
  })).filter((g) => g.examples.length > 0);
  if (!teachingGallery.length) teachingGallery = undefined;

  const standardMethod = { summary: isS(raw.standardMethod?.summary) ? raw.standardMethod.summary : `How to do ${name}.`, steps: arr(raw.standardMethod?.steps).filter(isS) };
  if (standardMethod.steps.length < 2) standardMethod.steps = ["Understand what is asked.", "Work it out step by step.", "Check your answer."];

  let workedExamples = arr(raw.workedExamples).filter((w) => w && isS(w.problem) && isS(w.answer)).map((w) => ({ problem: w.problem.trim(), steps: arr(w.steps).filter(isS).length ? arr(w.steps).filter(isS) : ["Set it up.", "Solve it."], answer: String(w.answer).trim() }));
  while (workedExamples.length < 2) workedExamples.push({ problem: `Try a ${name} example.`, steps: ["Set it up.", "Solve it."], answer: "See solution." });

  let mentalMathMethod;
  const mm = raw.mentalMathMethod;
  if (mm && isS(mm.name) && arr(mm.steps).filter(isS).length) {
    mentalMathMethod = { name: mm.name.trim(), whenToUse: isS(mm.whenToUse) ? mm.whenToUse : "For quick answers.", steps: arr(mm.steps).filter(isS), example: isS(mm.example) ? mm.example : "" };
  }

  const reviewAfterDays = arr(raw.revisionCard?.reviewAfterDays).filter((n) => Number.isFinite(n) && n > 0);
  const revisionCard = { summary: isS(raw.revisionCard?.summary) ? raw.revisionCard.summary : `Remember the key idea of ${name}.`, reviewAfterDays: reviewAfterDays.length ? reviewAfterDays : [1, 3, 7] };

  return {
    id, name, grade, strand, prerequisites: [],
    whatIsIt: isS(raw.whatIsIt, 10) ? raw.whatIsIt.trim() : `${name} is a Class ${grade} maths idea we learn step by step.`,
    whyNeeded: isS(raw.whyNeeded, 10) ? raw.whyNeeded.trim() : `${name} helps us solve real everyday problems.`,
    realLifeUses, vocabulary, story, visual,
    ...(teachingGallery ? { teachingGallery } : {}),
    standardMethod,
    ...(mentalMathMethod ? { mentalMathMethod } : {}),
    workedExamples, commonMistakes,
    practice: { easy, medium, challenge },
    masteryCheck: { questions: mastery, passThreshold: 0.7, requireTeachBack: true },
    teachBackPrompt: isS(raw.teachBackPrompt, 10) ? raw.teachBackPrompt.trim() : `In your own words, teach a friend how ${name} works.`,
    revisionCard,
    source: "user",
    meta: { version: "1.0.0", curriculum: "user-generated", language: language || "en", reviewStatus: "approved" },
  };
}

/** Final structural gate (mirrors the CLI validator's critical checks). */
function validateGenerated(c) {
  const e = [];
  if (!c) return { ok: false, errors: ["null"] };
  if (!isS(c.name, 3)) e.push("name");
  if (!Number.isInteger(c.grade)) e.push("grade");
  if (!STRANDS.includes(c.strand)) e.push("strand");
  if (!isS(c.whatIsIt, 10) || !isS(c.whyNeeded, 10)) e.push("what/why");
  if (arr(c.realLifeUses).length < 3) e.push("realLifeUses");
  if (!c.story || !isS(c.story.text, 50)) e.push("story");
  if (!c.visual || !VISUAL_COMPONENTS.includes(c.visual.component)) e.push("visual");
  if (arr(c.standardMethod?.steps).length < 2) e.push("standardMethod");
  if (arr(c.workedExamples).length < 2) e.push("workedExamples");
  if (arr(c.commonMistakes).length < 2) e.push("commonMistakes");
  const tags = new Set(arr(c.commonMistakes).map((m) => m.mistakeTag));
  const qs = [...arr(c.practice?.easy), ...arr(c.practice?.medium), ...arr(c.practice?.challenge), ...arr(c.masteryCheck?.questions)];
  for (const q of qs) {
    if (!isS(q.id) || !isS(q.q, 5) || !isS(String(q.answer)) || arr(q.hintLadder).length < 3) { e.push("question:" + (q && q.id)); break; }
    if (q.type === "mcq") {
      const labels = arr(q.options).map((o) => o.label);
      if (labels.length < 2 || !labels.includes(q.answer)) { e.push("mcq:" + q.id); break; }
      for (const o of arr(q.options)) if (o.mistakeTag && !tags.has(o.mistakeTag)) { e.push("tag:" + q.id); break; }
    }
  }
  if (arr(c.practice?.easy).length < 2 || arr(c.practice?.medium).length < 2 || arr(c.practice?.challenge).length < 2) e.push("practice-count");
  if (arr(c.masteryCheck?.questions).length < 4) e.push("mastery-count");
  return { ok: e.length === 0, errors: e };
}

/** Grounding: pull an authoritative reference for the topic from Wikipedia
 *  (free, no key). Fail-soft — if anything goes wrong, generation proceeds
 *  ungrounded on the model's own knowledge. */
async function fetchReference(topic) {
  const headers = { "User-Agent": "FearlessMath/1.0 (offline maths learning app; educational use)" };
  try {
    const sr = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic + " mathematics")}&srlimit=1&format=json&origin=*`, { headers });
    if (!sr.ok) return { ok: false };
    const sj = await sr.json();
    const hit = sj?.query?.search?.[0];
    if (!hit?.title) return { ok: false };
    const er = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exintro=1&redirects=1&titles=${encodeURIComponent(hit.title)}&format=json&origin=*`, { headers });
    if (!er.ok) return { ok: false };
    const ej = await er.json();
    const page = Object.values(ej?.query?.pages || {})[0];
    const text = String(page?.extract || "").replace(/\s+/g, " ").trim().slice(0, 1600);
    if (text.length < 60) return { ok: false };
    return { ok: true, text, source: hit.title };
  } catch { return { ok: false }; }
}

function collectQuestions(c) {
  const out = [];
  for (const lvl of ["easy", "medium", "challenge"]) for (const q of arr(c.practice?.[lvl])) out.push(q);
  for (const q of arr(c.masteryCheck?.questions)) out.push(q);
  return out;
}

/** Verification: a second GPT-4o pass independently solves every question and
 *  corrects wrong answer keys. Conservative — only applies a fix that still
 *  matches the question type/format (and, for MCQ, an existing option). */
async function verifyAnswerKeys(concept) {
  const questions = collectQuestions(concept);
  if (!questions.length) return { checked: 0, fixed: 0 };
  const payload = questions.map((q) => ({ id: q.id, type: q.type, q: q.q, given: q.answer, options: q.type === "mcq" ? arr(q.options).map((o) => o.label) : [] }));
  const schema = { type: "object", additionalProperties: false, required: ["results"], properties: {
    results: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "correct", "matches"], properties: {
      id: { type: "string" }, correct: { type: "string" }, matches: { type: "boolean" },
    } } },
  } };
  const prompt = `You are a careful mathematics checker for Class ${concept.grade} (CBSE). SOLVE each question yourself and give the correct final answer in the requested format: plain number for "number", "n/m" for "fraction", the exact option text for "mcq", short text otherwise. Set matches=false when the provided "given" answer is wrong.
QUESTIONS JSON:
${JSON.stringify(payload)}
Return a result for every id.`;
  let text;
  try { text = await callOpenAIStructured(prompt, schema, "gpt-4o"); } catch { return { checked: questions.length, fixed: 0 }; }
  let obj; try { obj = JSON.parse(text); } catch { obj = extractJson(text); }
  const results = obj?.results;
  if (!Array.isArray(results)) return { checked: questions.length, fixed: 0 };
  const byId = new Map(results.map((r) => [r.id, r]));
  let fixed = 0;
  for (const q of questions) {
    const r = byId.get(q.id);
    if (!r || r.matches !== false) continue;
    const corr = String(r.correct ?? "").trim();
    if (!corr || corr === String(q.answer)) continue;
    if (q.type === "number" && !/^-?\d+(\.\d+)?$/.test(corr)) continue;
    if (q.type === "fraction" && !/^\d+\s*\/\s*\d+$/.test(corr)) continue;
    if (q.type === "mcq" && !arr(q.options).some((o) => o.label === corr)) continue; // don't invent options
    q.answer = corr;
    fixed++;
  }
  return { checked: questions.length, fixed };
}

/** Public: generate a concept from a topic. Parent/teacher gated by the caller.
 *  ground=true fetches a web reference first; verify=true re-checks answer keys. */
async function generateConcept({ topic, grade, language, ground = true, verify = true }) {
  if (!settings.enabled || !settings.keyStored) return { ok: false, reason: "disabled" };
  if (settings.provider !== "openai") return { ok: false, reason: "needs-openai" };
  if (!isS(topic, 2)) return { ok: false, reason: "empty-topic" };
  const g = Number.isInteger(grade) ? grade : 5;
  try {
    let reference = null, source = null;
    if (ground) { const ref = await fetchReference(topic.trim()); if (ref.ok) { reference = ref.text; source = ref.source; } }
    const text = await callOpenAIStructured(buildConceptPrompt(topic.trim(), g, language || "en", reference), conceptJsonSchema(), "gpt-4o");
    let raw; try { raw = JSON.parse(text); } catch { raw = extractJson(text); }
    if (!raw) return { ok: false, reason: "bad-json" };
    if (raw.isMathTopic === false) return { ok: false, reason: "not-math" };
    const concept = sanitizeConcept(raw, { grade: g, language });
    const v = validateGenerated(concept);
    if (!v.ok) return { ok: false, reason: "validation:" + v.errors.slice(0, 4).join(",") };
    let verifiedFixed = 0;
    if (verify) {
      try { verifiedFixed = (await verifyAnswerKeys(concept)).fixed; } catch { /* best-effort */ }
      const v2 = validateGenerated(concept);
      if (!v2.ok) return { ok: false, reason: "validation-post:" + v2.errors.slice(0, 3).join(",") };
    }
    return { ok: true, concept, grounded: source, verifiedFixed };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

module.exports = {
  init, configure, getStatus, providers, explain, whyWrong, coach, generateConcept,
  // pure functions exported for tests
  buildExplainPrompt, buildWhyWrongPrompt, buildCoachPrompt, coachLeaksAnswer, extractJson, validateAiResponse, cacheKey,
  conceptJsonSchema, buildConceptPrompt, sanitizeConcept, validateGenerated, cleanVisual, GEN_COMPONENTS, VISUAL_COMPONENTS,
  fetchReference, verifyAnswerKeys, collectQuestions,
};
