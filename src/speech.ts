/**
 * Offline voice readout using the Web Speech API (works in Electron with
 * the OS's local voices — no internet needed on Windows/macOS).
 * Math text is rewritten kid-friendly before speaking:
 *   "3/4" -> "3 out of 4", "×" -> "times", "÷" -> "divided by".
 */

import { api } from "./api";

let chosenVoice: SpeechSynthesisVoice | null = null;

/* ---- Expressive, style-aware delivery ----
 * The same text is read differently depending on what it is: a story is told
 * slowly and animatedly (like a teacher reading to little ones), while a concept
 * is explained clearly. A warm, higher pitch makes the built-in voice sound
 * friendly to children. */
export type SpeakStyle = "story" | "concept" | "board" | "praise";
interface VoicePreset { rate: number; pitch: number; pace: number; temperature: number }
const PRESETS: Record<SpeakStyle, VoicePreset> = {
  // rate/pitch → browser voice;  pace/temperature → Sarvam bulbul:v3
  // Slower + a warmer, higher pitch reads friendlier to little ones.
  story:   { rate: 0.86, pitch: 1.34, pace: 0.82, temperature: 1.0 },
  concept: { rate: 0.90, pitch: 1.22, pace: 0.94, temperature: 0.5 },
  board:   { rate: 0.90, pitch: 1.18, pace: 0.92, temperature: 0.45 },
  praise:  { rate: 0.98, pitch: 1.38, pace: 1.0,  temperature: 1.15 }, // bright + excited
};

/** Short, varied cheers spoken when a child answers correctly. */
const PRAISES = [
  "Wonderful!", "You did it!", "Brilliant work!", "Yes — that's right!", "Superb!",
  "Well done!", "Amazing!", "You're a maths star!", "Fantastic!", "Great thinking!",
  "Awesome job!", "Perfect!", "Way to go!", "You nailed it!",
];
export function randomPraise(): string {
  return PRAISES[Math.floor(Math.random() * PRAISES.length)];
}

/* ---- Sarvam AI voice (optional, warm Indian voice) with browser fallback ---- */
let sarvamOn = false;
let currentAudio: HTMLAudioElement | null = null;

/** Ask the main process whether the Sarvam voice is configured. Called at
 *  startup and again after the settings screen changes the voice provider. */
export async function refreshVoiceStatus(): Promise<void> {
  try {
    const s = await api.mediaStatus();
    sarvamOn = !!s && s.voice.provider === "sarvam" && s.voice.hasKey && s.online;
  } catch { sarvamOn = false; }
}
if (typeof window !== "undefined" && (window as unknown as { fm?: unknown }).fm) {
  refreshVoiceStatus();
}

// Active read-aloud language (BCP-47). Set when the global language toggle changes
// so the browser voice + Sarvam speak Hindi / Telugu, not English.
let speechLang = "en-IN";
export function setSpeechLang(bcp47: string): void {
  speechLang = bcp47 || "en-IN";
  chosenVoice = pickVoice();
}
export function currentSpeechLang(): string { return speechLang; }

function pickVoice(langOverride?: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const target = (langOverride ?? speechLang).slice(0, 2).toLowerCase(); // "en" | "hi" | "te"
  // Score every voice; the highest wins. "Natural"/"Neural"/"Online" voices are
  // a big quality jump over the old robotic default, so we strongly prefer them,
  // then warm female names, then an Indian → British → US English preference.
  const warm = /female|zira|heera|swara|kajal|priya|neerja|aria|jenny|samantha|karen|tessa|libby|sonia|mia|ava|emma|clara|nova|salli|joanna|kimberly/i;
  const robotic = /david|mark|george|guy|ravi|prabhat|male|richard|william|eric/i;
  const score = (v: SpeechSynthesisVoice): number => {
    const n = (v.name || "").toLowerCase();
    const lang = (v.lang || "").toLowerCase();
    let s = 0;
    if (target !== "en") {
      // Non-English: strongly prefer a voice that actually speaks the target language.
      if (lang.startsWith(target)) s += 80;
      else if (lang.startsWith("en")) s -= 20; // English is a poor stand-in but usable
      else s -= 60;
    } else {
      if (!lang.startsWith("en")) s -= 60;
      if (lang.startsWith("en-in")) s += 14;
      else if (lang.startsWith("en-gb")) s += 9;
      else if (lang.startsWith("en-us")) s += 6;
    }
    if (/natural|neural|online|premium|enhanced/.test(n)) s += 60; // much nicer
    if (warm.test(n)) s += 22;
    if (/child|kid/.test(n)) s += 16;
    if (robotic.test(n)) s -= 18;
    if (v.localService) s += 3; // works fully offline
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
}

// Voices load asynchronously in some engines
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => { chosenVoice = pickVoice(); };
}

/** Rewrite math notation into words a child hears naturally. */
export function mathToSpeech(text: string): string {
  return text
    // strip emojis and symbols that sound weird
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ")
    // fractions: 3/4 -> "3 out of 4"
    .replace(/(\d+)\s*\/\s*(\d+)/g, "$1 out of $2")
    // operators
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/\B=\B/g, " equals ")
    .replace(/->|→/g, " gives ")
    .replace(/₹\s*(\d+)/g, "$1 rupees")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSpeechAvailable(): boolean {
  return sarvamOn || (typeof window !== "undefined" && "speechSynthesis" in window);
}

/** Split long text into speakable chunks at sentence boundaries. This is what
 *  makes the WHOLE story/concept read out: browser voices truncate very long
 *  utterances, and Sarvam caps each request (~1500 chars), so we speak in order. */
export function chunkText(text: string, max = 280): string[] {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean ? [clean] : [];
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) || [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) { chunks.push(cur.trim()); cur = ""; }
    if (s.length > max) {
      // A single very long sentence — split on commas / spaces as a last resort.
      const parts = s.match(new RegExp(`.{1,${max}}(\\s|,|$)`, "g")) || [s];
      for (const p of parts) chunks.push(p.trim());
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}

let speakToken = 0; // bumping this cancels any in-flight sequence
let keepAlive: ReturnType<typeof setInterval> | null = null;

// Chromium/Electron bug: speechSynthesis silently stops after ~15s and onend
// never fires. Pinging pause()+resume() keeps it alive so long text finishes.
function startKeepAlive(): void {
  stopKeepAlive();
  keepAlive = setInterval(() => {
    try {
      if (window.speechSynthesis.speaking) { window.speechSynthesis.pause(); window.speechSynthesis.resume(); }
    } catch { /* ignore */ }
  }, 9000);
}
function stopKeepAlive(): void {
  if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
}

function browserSpeakOne(text: string, token: number, preset: VoicePreset, done: () => void): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) { done(); return; }
  if (!chosenVoice) chosenVoice = pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  if (chosenVoice) u.voice = chosenVoice;
  u.rate = preset.rate;
  u.pitch = preset.pitch;
  const finish = () => { stopKeepAlive(); if (token === speakToken) done(); };
  u.onend = finish;
  u.onerror = finish;
  startKeepAlive();
  window.speechSynthesis.speak(u);
}

function speakOne(text: string, token: number, style: SpeakStyle, preset: VoicePreset, done: () => void): void {
  if (token !== speakToken) return; // cancelled
  if (sarvamOn) {
    api.sarvamSpeak({ text, style, pace: preset.pace, temperature: preset.temperature })
      .then((r) => {
        if (token !== speakToken) return;
        if (r.ok && r.audioBase64) {
          const audio = new Audio(`data:${r.mime || "audio/wav"};base64,${r.audioBase64}`);
          currentAudio = audio;
          audio.onended = () => { if (token === speakToken) { currentAudio = null; done(); } };
          audio.onerror = () => { currentAudio = null; browserSpeakOne(text, token, preset, done); };
          audio.play().catch(() => { currentAudio = null; browserSpeakOne(text, token, preset, done); });
        } else {
          browserSpeakOne(text, token, preset, done);
        }
      })
      .catch(() => { if (token === speakToken) browserSpeakOne(text, token, preset, done); });
    return;
  }
  browserSpeakOne(text, token, preset, done);
}

/** Add gentle storytelling pauses so a story is TOLD, not read flat. */
function addStoryPauses(text: string): string {
  return text
    .replace(/([.!?])\s+/g, "$1 … ")   // a beat after each sentence
    .replace(/,\s+/g, ", ")             // keep commas natural
    .replace(/\s+…\s+/g, " … ");
}

export function speak(text: string, onEnd?: () => void, opts?: { style?: SpeakStyle }): void {
  stopSpeaking();               // cancels any previous sequence + bumps token
  const token = speakToken;
  const style: SpeakStyle = opts?.style ?? "concept";
  const preset = PRESETS[style];
  let prepared = mathToSpeech(text);
  if (style === "story") prepared = addStoryPauses(prepared);
  const chunks = chunkText(prepared);
  if (!chunks.length) { onEnd?.(); return; }
  let i = 0;
  const next = () => {
    if (token !== speakToken) return;         // cancelled mid-way
    if (i >= chunks.length) { onEnd?.(); return; }
    speakOne(chunks[i++], token, style, preset, next);
  };
  next();
}

export function stopSpeaking(): void {
  speakToken++; // invalidate any in-flight chunk sequence
  stopKeepAlive();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  if (currentAudio) { try { currentAudio.pause(); } catch { /* ignore */ } currentAudio = null; }
}

/* ---- Auto-read mode (persisted): app speaks screens as they appear ---- */
const AUTO_KEY = "fm_autoread";

export function isAutoRead(): boolean {
  return localStorage.getItem(AUTO_KEY) === "1";
}

export function setAutoRead(on: boolean): void {
  localStorage.setItem(AUTO_KEY, on ? "1" : "0");
  if (!on) stopSpeaking();
}

/** Speak only when auto-read is enabled. */
export function autoSpeak(text: string): void {
  if (isAutoRead() && text) speak(text);
}

/**
 * Pronounce one short phrase in a SPECIFIC language (BCP-47), independent of the
 * app's global read-aloud language. Used by the Trilingual Dictionary so the
 * English / Telugu / Hindi buttons each speak in their own voice. Uses the browser
 * voices directly (works offline); if the OS has no Telugu/Hindi voice installed it
 * falls back to the default voice, which is a device limitation, not an app bug.
 */
export function speakInLang(text: string, bcp47: string, onEnd?: () => void): void {
  stopSpeaking();
  const token = speakToken;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) { onEnd?.(); return; }
  // Only strip emojis/symbols; do NOT apply the English word-substitutions (they'd
  // corrupt Hindi/Telugu pronunciation).
  const clean = (text || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ").replace(/\s+/g, " ").trim();
  if (!clean) { onEnd?.(); return; }
  const u = new SpeechSynthesisUtterance(clean);
  const v = pickVoice(bcp47);
  if (v) u.voice = v;
  u.lang = bcp47;
  u.rate = 0.9;
  u.pitch = 1.12;
  const finish = () => { stopKeepAlive(); if (token === speakToken) onEnd?.(); };
  u.onend = finish;
  u.onerror = finish;
  startKeepAlive();
  window.speechSynthesis.speak(u);
}
