/**
 * Video service — optional, offline-friendly. Two capabilities:
 *   1. Let a parent/teacher attach a local MP3/MP4 file to a concept. The picked
 *      file is COPIED into the app's own storage (userData/videos/<conceptId>/)
 *      so playback keeps working even if the original file is later moved,
 *      renamed, or was on a USB drive that gets unplugged.
 *   2. Generate a ready-to-use Google Veo text prompt for a concept. This does
 *      NOT call any paid video-generation API — Veo (as of 2026) only produces
 *      short clips (<=8s per generation) and requires a billed Vertex AI/Gemini
 *      key, so the responsible, zero-cost approach is to hand the parent a
 *      well-formed prompt (Veo's own best practice: ~78-92 words, with a style/
 *      reference term) that they can paste into veo.google or the Gemini app
 *      themselves.
 *
 * Guardrails (same spirit as mediaService/aiService):
 *  - Everything degrades to ok:false; the child never sees a raw error.
 *  - No network calls, no API keys, no billing — this module is pure disk I/O
 *    + string templating.
 */
const fs = require("fs");
const path = require("path");

let electron = null;
try { electron = require("electron"); } catch { /* plain node (tests) */ }

const VIDEO_EXT = [".mp3", ".mp4", ".m4a", ".wav", ".webm", ".mov"];

let dir = null;
let videoDir = null;
let overridesPath = null;
/** Per-install overrides: conceptId -> { localFiles: [{file,name}], youtubeVideos: [{id,url}] }.
 *  Lets a parent attach any number of local files and YouTube links to a
 *  concept without ever touching the app's own bundled content packs — same
 *  "small JSON settings file" pattern as media-settings.json. */
let overrides = {};

/** One-time migration: earlier versions stored a single { localFile,
 *  youtubeUrl, youtubeId } per concept. Fold any of those into the new
 *  array shape so existing installs don't lose what a parent already added. */
function migrateOverrides() {
  let changed = false;
  for (const conceptId of Object.keys(overrides)) {
    const ov = overrides[conceptId];
    if (!ov || typeof ov !== "object") continue;
    const next = { ...ov };
    if (typeof next.localFile === "string") {
      const list = Array.isArray(next.localFiles) ? next.localFiles : [];
      if (!list.some((f) => f.file === next.localFile)) {
        list.push({ file: next.localFile, name: path.basename(next.localFile) });
      }
      next.localFiles = list;
      delete next.localFile;
      changed = true;
    }
    if (typeof next.youtubeId === "string") {
      const list = Array.isArray(next.youtubeVideos) ? next.youtubeVideos : [];
      if (!list.some((v) => v.id === next.youtubeId)) {
        list.push({ id: next.youtubeId, url: next.youtubeUrl || next.youtubeId });
      }
      next.youtubeVideos = list;
      delete next.youtubeUrl;
      delete next.youtubeId;
      changed = true;
    }
    overrides[conceptId] = next;
  }
  if (changed) saveOverrides();
}

/* ---------------- init ---------------- */
function init(dataDir) {
  dir = dataDir;
  videoDir = path.join(dir, "videos");
  fs.mkdirSync(videoDir, { recursive: true });
  overridesPath = path.join(dir, "video-overrides.json");
  try { overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8")) || {}; } catch { overrides = {}; }
  migrateOverrides();
}

function saveOverrides() {
  try { fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2)); } catch { /* best-effort */ }
}

/** All the locally-attached files and YouTube links the parent has added for
 *  this concept on this install (in addition to anything authored in the
 *  content pack — the caller merges those in separately). Always returns
 *  both arrays (possibly empty), never null, to keep renderer code simple. */
function getOverride(conceptId) {
  const ov = overrides[conceptId];
  return {
    localFiles: Array.isArray(ov?.localFiles) ? ov.localFiles : [],
    youtubeVideos: Array.isArray(ov?.youtubeVideos) ? ov.youtubeVideos : [],
  };
}

/* ---------------- local file attach ---------------- */
/** Opens a native file-picker for MP3/MP4 (+ common variants), copies the chosen
 *  file into userData/videos/<conceptId>/<originalName>, and APPENDS it to
 *  this concept's list of attached files (a parent can add as many as they
 *  like — nothing gets replaced). Returns the RELATIVE path (conceptId/
 *  filename) to store on the concept — never an absolute path, so it stays
 *  portable across reinstalls. */
async function pickAndCopyFile(conceptId) {
  if (!electron || !electron.dialog) return { ok: false, reason: "no-dialog" };
  if (!conceptId || typeof conceptId !== "string") return { ok: false, reason: "bad-concept" };
  try {
    const res = await electron.dialog.showOpenDialog({
      title: "Choose a video or audio file",
      properties: ["openFile"],
      filters: [
        { name: "Video/Audio", extensions: ["mp3", "mp4", "m4a", "wav", "webm", "mov"] },
      ],
    });
    if (res.canceled || !res.filePaths || !res.filePaths.length) return { ok: false, reason: "canceled" };
    const src = res.filePaths[0];
    const ext = path.extname(src).toLowerCase();
    if (!VIDEO_EXT.includes(ext)) return { ok: false, reason: "bad-type" };

    const stat = fs.statSync(src);
    if (stat.size > 300 * 1024 * 1024) return { ok: false, reason: "too-large" }; // 300MB safety cap

    const destDir = path.join(videoDir, conceptId);
    fs.mkdirSync(destDir, { recursive: true });
    let safeName = path.basename(src).replace(/[^a-zA-Z0-9._-]/g, "_");
    let destPath = path.join(destDir, safeName);
    // Don't clobber an existing attached file with the same name — add a
    // numeric suffix so two different picks never overwrite each other.
    if (fs.existsSync(destPath)) {
      const extPart = path.extname(safeName);
      const base = safeName.slice(0, safeName.length - extPart.length);
      let n = 2;
      while (fs.existsSync(path.join(destDir, `${base}_${n}${extPart}`))) n++;
      safeName = `${base}_${n}${extPart}`;
      destPath = path.join(destDir, safeName);
    }
    fs.copyFileSync(src, destPath);

    const localFile = `${conceptId}/${safeName}`;
    const existing = overrides[conceptId] || {};
    const list = Array.isArray(existing.localFiles) ? existing.localFiles : [];
    list.push({ file: localFile, name: path.basename(src) });
    overrides[conceptId] = { ...existing, localFiles: list };
    saveOverrides();
    return { ok: true, localFile, localFiles: list };
  } catch (e) {
    return { ok: false, reason: "copy-failed" };
  }
}

/** Removes one attached local file from this concept's list (and deletes the
 *  copied file from disk, best-effort). Does nothing to files authored in
 *  the content pack — those aren't stored in overrides at all. */
function removeLocalFile(conceptId, localFile) {
  if (!conceptId || typeof conceptId !== "string") return { ok: false, reason: "bad-concept" };
  const existing = overrides[conceptId] || {};
  const list = Array.isArray(existing.localFiles) ? existing.localFiles : [];
  const next = list.filter((f) => f.file !== localFile);
  overrides[conceptId] = { ...existing, localFiles: next };
  saveOverrides();
  try {
    if (typeof localFile === "string" && !localFile.includes("..")) {
      const full = path.join(videoDir, localFile);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
  } catch { /* best-effort */ }
  return { ok: true, localFiles: next };
}

/** Resolves a stored relative path (conceptId/filename) to a `file://` URL the
 *  renderer's <video>/<audio> tag can play. Returns null if missing/invalid. */
function getFileUrl(localFile) {
  if (!localFile || typeof localFile !== "string" || localFile.includes("..")) return null;
  const full = path.join(videoDir, localFile);
  if (!fs.existsSync(full)) return null;
  return `file://${full.replace(/\\/g, "/")}`;
}

/* ---------------- YouTube link attach ---------------- */
/** Pulls the 11-char video ID out of any common YouTube URL shape (watch?v=,
 *  youtu.be/, /embed/, /shorts/, youtube-nocookie.com), or a bare ID typed
 *  directly. Returns null if it doesn't look like a real YouTube ID. */
function extractYoutubeId(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s; // bare ID
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch { /* not a URL */ }
  return null;
}

/** Lets a parent attach as many YouTube videos as they like to ANY concept —
 *  not just ones the content pack pre-authored a video field for. Stored the
 *  same way as local-file overrides (video-overrides.json), appended to a
 *  list rather than replacing, so every concept can collect multiple videos
 *  without touching the content pack. */
function addYoutubeUrl(conceptId, url) {
  if (!conceptId || typeof conceptId !== "string") return { ok: false, reason: "bad-concept" };
  if (!url || !String(url).trim()) return { ok: false, reason: "bad-url" };
  const id = extractYoutubeId(url);
  if (!id) return { ok: false, reason: "bad-url" };
  const existing = overrides[conceptId] || {};
  const list = Array.isArray(existing.youtubeVideos) ? existing.youtubeVideos : [];
  if (list.some((v) => v.id === id)) return { ok: true, youtubeId: id, youtubeVideos: list, duplicate: true };
  const next = [...list, { id, url: String(url).trim() }];
  overrides[conceptId] = { ...existing, youtubeVideos: next };
  saveOverrides();
  return { ok: true, youtubeId: id, youtubeVideos: next };
}

/** Removes one attached YouTube video (by video ID) from this concept's
 *  list. Does nothing to a video authored in the content pack — that isn't
 *  stored in overrides at all. */
function removeYoutubeUrl(conceptId, youtubeId) {
  if (!conceptId || typeof conceptId !== "string") return { ok: false, reason: "bad-concept" };
  const existing = overrides[conceptId] || {};
  const list = Array.isArray(existing.youtubeVideos) ? existing.youtubeVideos : [];
  const next = list.filter((v) => v.id !== youtubeId);
  overrides[conceptId] = { ...existing, youtubeVideos: next };
  saveOverrides();
  return { ok: true, youtubeVideos: next };
}

/* ---------------- Number-to-words (for voice-over scripts only) ----------------
 * Veo's speech synthesis and its habit of burning in captions both stumble on
 * raw digits: "50" comes out misread ("5th zero") or, when Veo tries to caption
 * a spoken word, the letters get scrambled ("right" -> "r i t"). Spelling
 * numbers out as words before they reach a Voice-over line sidesteps both
 * failure modes. Visual "Prompt" lines are left alone on purpose — a big
 * printed digit on a simple prop (e.g. a signboard showing "32") is normal,
 * low-risk on-screen text; it's dense sentence text and mid-word captions that
 * Veo garbles. */
const NUM_ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const NUM_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const NUM_ORDINAL_DEN = {
  2: "half", 3: "third", 4: "quarter", 5: "fifth", 6: "sixth", 7: "seventh",
  8: "eighth", 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth",
};

/** Spells out a non-negative integer (given as a digit string) in English words.
 *  Good enough for a kids' math app — caps out gracefully past a few billion. */
function integerToWords(digitStr) {
  const n = parseInt(digitStr, 10);
  if (!Number.isFinite(n)) return digitStr;
  if (n === 0) return "zero";
  const scales = [[1000000000, "billion"], [1000000, "million"], [1000, "thousand"], [100, "hundred"]];
  const parts = [];
  let rest = n;
  for (const [value, name] of scales) {
    if (rest >= value) {
      parts.push(`${integerToWords(String(Math.floor(rest / value)))} ${name}`);
      rest %= value;
    }
  }
  if (rest > 0) {
    if (rest < 20) {
      parts.push(NUM_ONES[rest]);
    } else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      parts.push(ones ? `${NUM_TENS[tens]}-${NUM_ONES[ones]}` : NUM_TENS[tens]);
    }
  }
  return parts.join(" ").trim();
}

/** Spells out a digit string one digit at a time ("05" -> "zero five") — used
 *  for decimal-fraction digits, where "point one five" is correct and
 *  "point fifteen" is not. */
function digitsToWords(digitStr) {
  return digitStr.split("").map((d) => NUM_ONES[parseInt(d, 10)] ?? d).join(" ");
}

/** Rewrites any raw digits in a voice-over string into spoken-word form —
 *  currency, percent, degrees, simple a/b fractions, decimals, then plain
 *  integers — so Veo's narrator reads "fifty" instead of stumbling over "50".
 *  Never applied to visual "Prompt" text, only to "Voice-over" text. */
function verbalizeNumbers(text) {
  if (!text) return text;
  let out = String(text);
  out = out.replace(/₹\s?(\d+(?:\.\d+)?)/g, (_, n) => `${verbalizeNumbers(n)} rupees`);
  out = out.replace(/(\d+(?:\.\d+)?)\s?%/g, (_, n) => `${verbalizeNumbers(n)} percent`);
  out = out.replace(/(\d+(?:\.\d+)?)\s?°/g, (_, n) => `${verbalizeNumbers(n)} degrees`);
  out = out.replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (whole, a, b) => {
    const den = parseInt(b, 10);
    const num = parseInt(a, 10);
    if (den === 1) return integerToWords(a);
    const denWord = NUM_ORDINAL_DEN[den];
    if (!denWord) return whole;
    const plural = num === 1 ? denWord : denWord === "half" ? "halves" : `${denWord}s`;
    return `${integerToWords(a)} ${plural}`;
  });
  out = out.replace(/\b(\d+)\s*:\s*(\d+)\b/g, (_, a, b) => `${integerToWords(a)} to ${integerToWords(b)}`);
  out = out.replace(/\b(\d+)\.(\d+)\b/g, (_, i, f) => `${integerToWords(i)} point ${digitsToWords(f)}`);
  out = out.replace(/\b\d+\b/g, (n) => integerToWords(n));
  return out;
}

/** Strips typed-answer format hints like "(write like 1/2)" or "(Type the
 *  value, like seventy)" off the end of a practice question — these are UI
 *  instructions for the on-screen answer box, not something Robo should say. */
function stripFormatHint(text) {
  if (!text) return text;
  return String(text).replace(/\s*\((?:write|type|tap|choose|select|enter|pick|like)\b[^)]*\)\s*$/i, "").trim();
}

/** Spells out common math symbols before verbalizeNumbers runs, so Veo's
 *  narrator says "times" / "equals" / "is not equal to" instead of reading
 *  (or silently dropping) a bare symbol. Applied only to voice-over text. */
const SYMBOL_WORDS = [
  [/≠/g, " is not equal to "],
  [/≤/g, " is less than or equal to "],
  [/≥/g, " is greater than or equal to "],
  [/±/g, " plus or minus "],
  [/→/g, " leads to "],
  [/×/g, " times "],
  [/÷/g, " divided by "],
  [/−/g, " minus "],
  [/\s*\+\s*/g, " plus "],
  [/\s*=\s*/g, " equals "],
];
function verbalizeSymbols(text) {
  if (!text) return text;
  let out = String(text);
  for (const [re, word] of SYMBOL_WORDS) out = out.replace(re, word);
  return out.replace(/\s{2,}/g, " ").trim();
}

/** Full pipeline for turning raw authored content (question text, hints, etc.)
 *  into something safe and natural for Robo to say out loud: drop UI-only
 *  format hints, spell out math symbols, then spell out numbers. */
function humanizeForSpeech(text) {
  return verbalizeNumbers(verbalizeSymbols(stripFormatHint(text)));
}

/* ---------------- Google Veo prompt generation ---------------- */
/** Builds a Veo-ready PROMPT PACK for a concept: six 5-second clips (30s
 *  total) — Welcome, Small Example, Big/Contrasting Example, Practice 1,
 *  Practice 2, Goodbye — each with its own PROMPT (visual direction) and
 *  VOICE-OVER (narration script) line, matching Veo's short-clip sweet spot
 *  (a single generation is most reliable at ~5-8s). Robo (the app's own
 *  mascot) is the consistent on-screen character across every clip, in a
 *  bright 3D-Pixar-style classroom, so the six clips read as one continuous
 *  scene when generated back-to-back with Veo's "Extend" feature.
 *  Content for each clip is pulled from the concept's own authored fields
 *  (rememberIt / whatIsIt / standardMethod / practice / revisionCard) so
 *  the video actually teaches the real lesson rather than a generic
 *  placeholder. Pure string templating — no network call, no cost. */
function buildVeoPrompt(concept) {
  const title = concept.name || concept.id || "this math idea";

  const hook =
    concept.rememberIt?.hook ||
    concept.whyNeeded ||
    concept.whatIsIt ||
    `why ${title.toLowerCase()} matters`;

  const steps = Array.isArray(concept.standardMethod?.steps)
    ? concept.standardMethod.steps.map((s) => String(s).trim().replace(/\.+\s*$/, "")).filter(Boolean)
    : [];
  const step1 = steps[0] || concept.standardMethod?.summary || concept.whatIsIt || `the first idea behind ${title.toLowerCase()}`;
  const step2 = steps[1] || concept.standardMethod?.summary || `how to use ${title.toLowerCase()} step by step`;

  const easyQ = concept.practice?.easy?.[0];
  const mediumQ = concept.practice?.medium?.[0] || concept.practice?.easy?.[1];

  const recap =
    concept.revisionCard?.summary ||
    concept.rememberIt?.unpack ||
    concept.standardMethod?.summary ||
    step2;

  const CLASSROOM = "in a bright, futuristic classroom with a large glowing screen behind it";
  const ROBO = "a friendly, cute robot named Robo";
  const NO_CAPTIONS = "(no subtitles, no on-screen captions of the spoken words)";
  const say = (words) => `Robo says (single speaker, warm and slow): "${humanizeForSpeech(words)}" ${NO_CAPTIONS}`;
  const titleSpoken = humanizeForSpeech(title);
  // Question text carries UI-only format hints ("(write like 1/2)") meant for the
  // typed-answer box, not for Robo to read aloud — strip those before they land
  // inside a spoken sentence, where the generic end-of-string stripper in
  // humanizeForSpeech() would no longer be able to find them.
  const easyQClean = easyQ ? stripFormatHint(easyQ.q) : null;
  const mediumQClean = mediumQ ? stripFormatHint(mediumQ.q) : null;

  const clips = [
    {
      label: "Clip 1 (0-5s): The Welcome",
      prompt:
        `3D Pixar-style animation. ${ROBO} stands ${CLASSROOM}. Robo waves happily at the camera, big ` +
        `friendly eyes, warm expressive animation. Continuous smooth camera pan. No on-screen text anywhere.`,
      voiceOver: say(`Hi friends! I'm Robo! Today we're going to learn about ${titleSpoken}. ${hook}`),
    },
    {
      label: "Clip 2 (5-10s): The First Idea",
      prompt:
        `Continuous shot in the same bright classroom. Robo points at the glowing screen, where a simple, ` +
        `easy-to-follow picture or diagram lights up in sync with what Robo is saying — one clear visual ` +
        `only, no sentences or words rendered on screen.`,
      voiceOver: say(`Let's start simple. ${step1}.`),
    },
    {
      label: "Clip 3 (10-15s): The Next Idea",
      prompt:
        `Continuous shot. Robo watches excitedly and gestures as the screen updates with a second, slightly ` +
        `bigger or contrasting picture that builds on the first one, still one clear visual at a time, no ` +
        `on-screen text.`,
      voiceOver: say(`Now here's the next part. ${step2}.`),
    },
    {
      label: "Clip 4 (15-20s): Practice Time",
      prompt:
        `Continuous shot. Robo points at the glowing screen, where a single large, simple printed number ` +
        `(like a signboard or scoreboard digit — not a sentence) appears. Robo tilts its head as if ` +
        `thinking, then nods and smiles as a green checkmark and a little sparkle effect appear next to it.`,
      voiceOver: easyQClean
        ? say(`Let's try one together. ${easyQClean} ... That's it — ${easyQ.answer}!`)
        : say(`Let's try a practice question together. Can you work it out with me?`),
    },
    {
      label: "Clip 5 (20-25s): One More Practice",
      prompt:
        `Continuous shot. A new single large printed number appears on the glowing screen the same way as ` +
        `before. Robo cheers and jumps slightly with excitement as the checkmark and sparkle effect appear.`,
      voiceOver: mediumQClean
        ? say(`You're doing great! One more: ${mediumQClean} ... Yes! ${mediumQ.answer}! Well done!`)
        : say(`You're doing great! Let's try one more together — I know you can do it!`),
    },
    {
      label: "Clip 6 (25-30s): The Goodbye",
      prompt:
        `Continuous shot in the same classroom, the glowing screen visible in the background. Robo turns back ` +
        `to face the camera, clapping its metal hands happily, and waves goodbye. Smooth fade out. No on-screen text.`,
      voiceOver: say(`Great job today! Remember: ${recap}. See you next time — bye bye!`),
    },
  ];

  const header =
    `Google Veo prompt pack — 6 clips x 5s each (30s total), with voice-over scripts. Generate each clip in ` +
    `order (Clip 1 first, then use Veo's "Extend" on each result for Clips 2-6) so Robo and the classroom stay ` +
    `consistent throughout:\n` +
    `  1. Paste "Clip 1" into veo.google or the Gemini app and generate it.\n` +
    `  2. On that result, tap "Extend" and paste "Clip 2" — do NOT start a new generation.\n` +
    `  3. Keep tapping "Extend" and pasting the next clip (3, 4, 5, then 6) in order.\n` +
    `  4. Clip 6 is what gives the video its goodbye/ending — don't stop before it.\n` +
    `Global rules baked into every clip below: Robo is the ONLY character and the only voice — one speaker, ` +
    `no narrator, no background music, no extra sound effects competing with the dialogue. Numbers in the ` +
    `voice-over are spelled out as words (e.g. "fifty", not "50") so they're read correctly; numbers shown ` +
    `on screen stay as short printed digits on simple props only — never as sentences or captions.\n\n` +
    `Each clip below has a PROMPT (what to paste as the visual direction) and a VOICE-OVER (the narration ` +
    `script to speak slowly and warmly, like reading to a young child).`;

  const footer =
    `Tips for the most accurate result (Veo is a generative model — no prompt guarantees a perfect take ` +
    `every single time):\n` +
    `  - Generate each clip 2-3 times and keep the best take; accuracy varies generation to generation.\n` +
    `  - If a word still comes out wrong, try spelling it phonetically in the Voice-over line and regenerate.\n` +
    `  - For lessons where every word must be exact, you can mute Veo's built-in audio on export and record ` +
    `your own narration over it instead — reading the Voice-over lines aloud, or using this app's own ` +
    `"Speak" voice.`;

  return { header, clips, footer };
}

/** Flattens the {header, clips, footer} parts into the single plain-text block
 *  used for the "Copy all" action and for the static concept.video.veoPrompt
 *  field stored in content-pack JSON (back-compat with older content/readers
 *  that only expect a string). */
function flattenVeoPrompt(parts) {
  const body = parts.clips
    .map((c) => `${c.label}\nPrompt: ${c.prompt}\nVoice-over: ${c.voiceOver}`)
    .join("\n\n");
  return `${parts.header}\n\n${body}\n\n${parts.footer}`;
}

async function generateVeoPrompt(concept) {
  if (!concept || typeof concept !== "object") return { ok: false, reason: "bad-concept" };
  try {
    const parts = buildVeoPrompt(concept);
    return {
      ok: true,
      prompt: flattenVeoPrompt(parts),
      header: parts.header,
      clips: parts.clips,
      footer: parts.footer,
    };
  } catch {
    return { ok: false, reason: "generate-failed" };
  }
}

module.exports = {
  init, pickAndCopyFile, removeLocalFile, getFileUrl, generateVeoPrompt, getOverride,
  addYoutubeUrl, removeYoutubeUrl, extractYoutubeId,
};
