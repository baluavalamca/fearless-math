# FearlessMath 🦊

Fear-free, visual, multi-method math learning for kids (PP1 → Plus Two).
Local-first Electron desktop app — all learning works offline; AI features are optional and online.

## Run it (Windows)

```bash
cd fearless-math
npm install          # first time only (needs Node 18+)
npm run dev          # opens the Electron app with hot reload
```

Other commands:

```bash
npm test                  # 19 pure-logic tests (answer checking, mastery, unlocking, revision)
npm run validate-content  # quality gate: schema + pedagogy rules + answer keys
npm run build             # production renderer build
npm start                 # run against the built renderer
```

If `better-sqlite3` fails to compile on your machine, the app automatically
falls back to a JSON file store — everything still works; install VS Build
Tools later to switch to SQLite (no code change needed).

## Build the Windows installer

```bash
npm run dist          # builds the renderer + creates release/FearlessMath Setup 0.1.0.exe
```

Notes:
- Output lands in `release/`. The NSIS installer lets users pick the install
  folder and creates Desktop + Start Menu shortcuts.
- Content packs ship OUTSIDE the app bundle (in `resources/content-packs/`),
  so new concepts can be delivered by replacing that folder — no reinstall.
- `npm run pack` builds an unpacked folder (faster) for quick smoke-testing.
- First build downloads Electron binaries (~100 MB) — needs internet once.
- The app icon lives in `build/icon.ico` (Fraction Fox — original artwork).

## What's inside

```
electron/
  main.js          app entry, window, IPC registration
  preload.js       the ONLY renderer<->system bridge (contextIsolation on)
  logic.js         pure learning logic: answer checking ("math truth layer"),
                   mastery decision, prerequisite unlocking, spaced revision
  db.js            storage: better-sqlite3 with JSON fallback (same API)
  contentLoader.js loads versioned content packs at startup
src/
  App.tsx                    navigation: WorldMap <-> LessonPlayer
  api.ts                     typed mirror of the preload bridge
  screens/WorldMap.tsx       🌳 Ganita Grove — concepts as stops on a path
  screens/LessonPlayer.tsx   CPA-ordered teaching + method switcher tabs
  screens/Practice.tsx       one question at a time, 3-hint ladder, warm feedback
  components/FractionStrip.tsx  first offline SVG visual component
content-packs/
  cbse-class3-5-en-v1/       pack manifest + concept JSON files
schema/concept.schema.json   the Concept Contract as JSON Schema
tools/validate-content.js    content quality gate (run in CI)
tests/logic.test.js          plain-node tests, no framework needed
```

## Voice & endless examples

- **🔊 Voice readout** on every lesson page, question, and feedback — offline
  text-to-speech via the OS voices (`src/speech.ts`). Math is spoken
  kid-friendly: "3/4" reads as "3 out of 4", "×" as "times".
- **🎲 Example Factory** (`src/exampleFactory.ts`) — every concept's Examples
  tab has a "Show me a new example!" button generating unlimited fresh worked
  examples with story context, steps, and a visual. Answers are computed by
  code, so they are correct by construction — no AI, fully offline.

## The rules the code enforces (Fear-Free Charter)

- Never formula-first: lesson tabs go Story → Picture → Meaning → Steps → Another Way → Examples
- 3 hints before any answer (validator rejects content without them)
- No red X: wrong answers get "let's look again" + the authored fix for that exact mistake
- Mistake diagnosis is offline: MCQ distractors carry `mistakeTag`s mapped to `commonMistakes`
- Mastery = 80% + teach-back ("explain it in your own words") — both required
- Prerequisite gating: a concept unlocks only when its prerequisites are mastered
- Spaced revision: 3 / 7 / 21 days after mastery
- Badges reward behavior (Tried Again, Explained It), never speed

## Adding a concept

1. Copy `content-packs/cbse-class3-5-en-v1/concepts/frac-01-equal-parts.json` as a template.
2. Fill every required section of the Concept Contract.
3. `npm run validate-content` — must PASS.
4. Teacher review → set `meta.reviewStatus: "approved"`.
5. Restart the app; the new stop appears in Ganita Grove.

## Roadmap pointers

See `FearlessMath-Master-Plan-FINAL.md` (delivered alongside this repo) for the
full architecture: remaining visual components, AI tutor guardrails (§2b),
gamification worlds, parent dashboard, upload-to-learn, and Phases 2–4.
