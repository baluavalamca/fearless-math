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
export type SpeakStyle = "story" | "concept" | "board";
interface VoicePreset { rate: number; pitch: number; pace: number; temperature: number }
const PRESETS: Record<SpeakStyle, VoicePreset> = {
  // rate/pitch → browser voice;  pace/temperature → Sarvam bulbul:v3
  story:   { rate: 0.88, pitch: 1.32, pace: 0.82, temperature: 1.0 },
  concept: { rate: 0.95, pitch: 1.15, pace: 0.95, temperature: 0.5 },
  board:   { rate: 0.93, pitch: 1.10, pace: 0.92, temperature: 0.45 },
};

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

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = en.length ? en : voices;
  // Prefer warm, friendly, typically-female voices that sound nicer to kids.
  const warm = /female|zira|heera|swara|kajal|priya|neerja|aria|jenny|samantha|karen|tessa|kids?|child/i;
  const inIndia = pool.filter((v) => v.lang?.toLowerCase().startsWith("en-in"));
  return (
    inIndia.find((v) => warm.test(v.name)) ||
    pool.find((v) => warm.test(v.name)) ||
    inIndia[0] ||
    pool.find((v) => v.lang?.toLowerCase().startsWith("en-gb")) ||
    pool[0]
  );
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
