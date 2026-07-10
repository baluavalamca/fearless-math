/**
 * Media service — optional, online, key-gated. Two capabilities:
 *   1. Illustrated posters via OpenAI Images (gpt-image-1), CACHED on disk per
 *      concept+style so the same picture is reused (never regenerated) next time.
 *   2. Natural Indian voice via Sarvam AI TTS (bulbul), with the renderer falling
 *      back to the built-in browser voice whenever this is unavailable.
 *
 * Guardrails (same spirit as aiService):
 *  - Keys encrypted with Electron safeStorage when available.
 *  - Everything degrades to ok:false; the child never sees an error.
 *  - Images are cached as PNG files; a repeat request returns instantly, offline.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let electron = null;
try { electron = require("electron"); } catch { /* plain node (tests) */ }

let dir = null;
let imgDir = null;
let ttsDir = null;
let settings = {
  // gpt-image-2 (2026) — near-perfect text rendering (incl. Hindi/Bengali), high quality.
  image: { enabled: false, keyStored: null, model: "gpt-image-2", size: "1536x864", quality: "high" },
  voice: { provider: "browser", keyStored: null, model: "bulbul:v3", speaker: "priya", language: "en-IN", pace: 0.95, ver: 0 },
};

/* ---------------- init + settings ---------------- */
function init(dataDir) {
  dir = dataDir;
  imgDir = path.join(dir, "concept-images");
  ttsDir = path.join(dir, "tts-cache");
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(ttsDir, { recursive: true });
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(dir, "media-settings.json"), "utf8"));
    settings = { image: { ...settings.image, ...(saved.image || {}) }, voice: { ...settings.voice, ...(saved.voice || {}) } };
    // One-time upgrade: existing installs saved the old gpt-image-1 default before
    // there was a model chooser — jump them to the newest model + best quality.
    let changed = false;
    if ((saved.image?.ver || 0) < 2) {
      settings.image.model = "gpt-image-2";
      settings.image.quality = "high";
      settings.image.ver = 2;
      changed = true;
    }
    if ((saved.voice?.ver || 0) < 1) {
      // Upgrade older installs to bulbul:v3 (expressive, better quality).
      settings.voice.model = "bulbul:v3";
      settings.voice.ver = 1;
      changed = true;
    }
    if (changed) saveSettings();
  } catch { settings.image.ver = 2; settings.voice.ver = 1; /* first run */ }
}
function saveSettings() {
  fs.writeFileSync(path.join(dir, "media-settings.json"), JSON.stringify(settings, null, 2));
}

function encryptKey(plain) {
  if (electron?.safeStorage?.isEncryptionAvailable()) {
    return "enc:" + electron.safeStorage.encryptString(plain).toString("base64");
  }
  return "b64:" + Buffer.from(plain, "utf8").toString("base64");
}
function decryptKey(stored) {
  if (!stored) return null;
  const kind = stored.slice(0, 4), data = stored.slice(4);
  try {
    if (kind === "enc:") return electron.safeStorage.decryptString(Buffer.from(data, "base64"));
    if (kind === "b64:") return Buffer.from(data, "base64").toString("utf8");
  } catch { /* corrupt */ }
  return null;
}

function configure(cfg = {}) {
  if (cfg.image) {
    const i = cfg.image;
    if (typeof i.enabled === "boolean") settings.image.enabled = i.enabled;
    if (i.model) settings.image.model = i.model;
    if (i.size) settings.image.size = i.size;
    if (i.quality) settings.image.quality = i.quality;
    if (i.apiKey) settings.image.keyStored = encryptKey(i.apiKey.trim());
    if (i.apiKey === "") settings.image.keyStored = null;
  }
  if (cfg.voice) {
    const v = cfg.voice;
    if (v.provider) settings.voice.provider = v.provider;   // "browser" | "sarvam"
    if (v.model) settings.voice.model = v.model;
    if (v.speaker) settings.voice.speaker = v.speaker;
    if (v.language) settings.voice.language = v.language;
    if (typeof v.pace === "number") settings.voice.pace = v.pace;
    if (v.apiKey) settings.voice.keyStored = encryptKey(v.apiKey.trim());
    if (v.apiKey === "") settings.voice.keyStored = null;
  }
  saveSettings();
  return status();
}

function status() {
  return {
    image: { enabled: settings.image.enabled, hasKey: !!settings.image.keyStored, model: settings.image.model, size: settings.image.size, quality: settings.image.quality },
    voice: { provider: settings.voice.provider, hasKey: !!settings.voice.keyStored, model: settings.voice.model, speaker: settings.voice.speaker, language: settings.voice.language, pace: settings.voice.pace },
  };
}

/* ---------------- image cache ---------------- */
function safeName(s) { return String(s || "").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80); }
function cachePath(conceptId, style) { return path.join(imgDir, `${safeName(conceptId)}__${safeName(style)}.png`); }

function readCached(conceptId, style) {
  const p = cachePath(conceptId, style);
  if (fs.existsSync(p)) {
    const b64 = fs.readFileSync(p).toString("base64");
    return { ok: true, cached: true, dataUrl: `data:image/png;base64,${b64}` };
  }
  return { ok: false, cached: false };
}

/** Return the cached poster if present (no network). */
function getCachedImage({ conceptId, style }) {
  return readCached(conceptId, style);
}

/** Pick a valid image size for the model. Only gpt-image-2 allows arbitrary
 *  (true 16:9) sizes; older models are restricted to a fixed landscape size. */
function sizeForModel(model) {
  return model === "gpt-image-2" ? "1536x864" /* 16:9 */ : "1536x1024" /* widest gpt-image-1 allows */;
}

/**
 * Generate (or reuse) an illustrated poster.
 * Reuses the cached PNG unless force=true. Requires an OpenAI key.
 */
async function generateImage({ conceptId, style, prompt, force }) {
  if (!force) {
    const hit = readCached(conceptId, style);
    if (hit.ok) return hit;
  }
  const key = decryptKey(settings.image.keyStored);
  if (!settings.image.enabled || !key) {
    return { ok: false, cached: false, error: "no-image-key" };
  }
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.image.model || "gpt-image-2",
        prompt: String(prompt || "").slice(0, 4000),
        size: sizeForModel(settings.image.model || "gpt-image-2"),
        quality: settings.image.quality || "high",
        n: 1,
      }),
    });
    if (!res.ok) {
      let msg = `http-${res.status}`;
      try { const j = await res.json(); msg = j?.error?.message || msg; } catch { /* ignore */ }
      return { ok: false, cached: false, error: msg };
    }
    const j = await res.json();
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) return { ok: false, cached: false, error: "empty-response" };
    fs.writeFileSync(cachePath(conceptId, style), Buffer.from(b64, "base64"));
    return { ok: true, cached: false, dataUrl: `data:image/png;base64,${b64}` };
  } catch (e) {
    return { ok: false, cached: false, error: String(e?.message || e) };
  }
}

/* ---------------- Sarvam TTS (with disk cache) ---------------- */
function ttsCachePath(hash) { return path.join(ttsDir, `${hash}.wav`); }

/** Convert text to speech via Sarvam. Returns base64 WAV, or ok:false to fall back.
 *  Identical requests are served from a disk cache — instant, offline, and free. */
const V2_SPEAKERS = new Set(["anushka", "manisha", "vidya", "arya", "abhilash", "karun", "hitesh"]);
const V3_DEFAULT_SPEAKER = "anushka"; // warm female; auto-mapped to a v3 voice below if needed
const V3_FEMALE = "priya";            // valid v3 warm female fallback

async function sarvamTTS({ text, speaker, pace, temperature }) {
  const key = decryptKey(settings.voice.keyStored);
  if (settings.voice.provider !== "sarvam" || !key) return { ok: false, error: "no-voice-key" };
  const model = settings.voice.model || "bulbul:v3";
  const isV3 = model.includes("v3");
  // Pick + guard the speaker so it is always valid for the chosen model.
  let spk = (speaker || settings.voice.speaker || (isV3 ? V3_DEFAULT_SPEAKER : "anushka")).toLowerCase();
  if (isV3 && V2_SPEAKERS.has(spk)) spk = V3_FEMALE;         // v2-only name on v3 → map to a v3 voice
  if (!isV3 && !V2_SPEAKERS.has(spk)) spk = "anushka";       // v3 name on v2 → safe v2 voice
  const usePace = typeof pace === "number" ? pace : (settings.voice.pace || 0.95);
  const useTemp = typeof temperature === "number" ? temperature : 0.6;
  const clean = String(text || "").slice(0, isV3 ? 2400 : 1400);
  if (!clean) return { ok: false, error: "empty-text" };

  // Cache key = everything that changes the audio (incl. expressiveness).
  const hash = crypto.createHash("sha1")
    .update([clean, model, spk, settings.voice.language || "en-IN", usePace, isV3 ? useTemp : ""].join("|"))
    .digest("hex");
  const cp = ttsCachePath(hash);
  if (fs.existsSync(cp)) {
    return { ok: true, cached: true, mime: "audio/wav", audioBase64: fs.readFileSync(cp).toString("base64") };
  }

  const body = {
    text: clean,
    target_language_code: settings.voice.language || "en-IN",
    speaker: spk,
    model,
    pace: usePace,
    speech_sample_rate: 22050,
  };
  if (isV3) body.temperature = useTemp;          // v3: expressiveness
  else body.enable_preprocessing = true;         // v2 only
  try {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "api-subscription-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = `http-${res.status}`;
      try { const j = await res.json(); msg = j?.error?.message || j?.message || msg; } catch { /* ignore */ }
      return { ok: false, error: msg };
    }
    const j = await res.json();
    const audio = j?.audios?.[0];
    if (!audio) return { ok: false, error: "empty-audio" };
    try { fs.writeFileSync(cp, Buffer.from(audio, "base64")); } catch { /* cache best-effort */ }
    return { ok: true, cached: false, mime: "audio/wav", audioBase64: audio };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/* ---------------- Sarvam STT (speech -> text) ---------------- */
/** Transcribe spoken audio (base64 WAV) via Sarvam Saarika. Reuses the Sarvam
 *  voice key. Returns { ok, transcript } or { ok:false, error }. */
async function sarvamTranscribe({ audioBase64, mime, language }) {
  const key = decryptKey(settings.voice.keyStored);
  if (settings.voice.provider !== "sarvam" || !key) return { ok: false, error: "no-voice-key" };
  if (!audioBase64) return { ok: false, error: "no-audio" };
  try {
    const buf = Buffer.from(audioBase64, "base64");
    const form = new FormData();
    form.append("file", new Blob([buf], { type: mime || "audio/wav" }), "speech.wav");
    form.append("model", "saarika:v2.5");
    form.append("language_code", language || "unknown"); // "unknown" => auto-detect
    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": key },
      body: form,
    });
    if (!res.ok) {
      let msg = `http-${res.status}`;
      try { const j = await res.json(); msg = j?.error?.message || j?.message || msg; } catch { /* ignore */ }
      return { ok: false, error: msg };
    }
    const j = await res.json();
    const transcript = (j?.transcript ?? j?.text ?? "").trim();
    if (!transcript) return { ok: false, error: "empty-transcript" };
    return { ok: true, transcript, language: j?.language_code || null };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/** Clear cached posters and/or voice audio. */
function clearCache(what = "all") {
  let removed = 0;
  const wipe = (d) => { try { for (const f of fs.readdirSync(d)) { fs.unlinkSync(path.join(d, f)); removed++; } } catch { /* ignore */ } };
  if (what === "all" || what === "images") wipe(imgDir);
  if (what === "all" || what === "tts") wipe(ttsDir);
  return { ok: true, removed };
}

module.exports = { init, configure, status, getCachedImage, generateImage, sarvamTTS, sarvamTranscribe, clearCache };
