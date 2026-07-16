# FearlessMath → FearlessLearn: Multi-Subject Expansion Plan

Goal: extend the app beyond mathematics to **Science, Social Science, Computers/IT, GK, and the
senior-secondary stream subjects (Science/Commerce/Humanities)** — everything except languages —
from **PP1 to Class 12**, following CBSE/NCERT.

This is a **platform change plus a large content program**. This doc explains (a) how the app is
currently coupled to "maths", (b) the integration design, (c) exactly how data is added, and
(d) a phased, honest implementation plan. A realistic full build is **1,500–3,000+ lessons** across
subjects — so the strategy is: generalize the engine once, prove it with one subject slice, then
scale content with an AI-assisted, verified authoring pipeline.

---

## 1. Where the app is coupled to "maths" today

| Layer | Current (math-only) assumption | Needs to become |
|---|---|---|
| Concept JSON | `strand ∈ {numbers, operations, fractions, geometry, measurement, data}` | add a `subject` field; strands become per-subject chapter groups |
| Validator (`tools/validate-content.js`) | requires `story.extractedProblem/answerInStory`, numeric/fraction answer formats, a math `visual.component` | subject-aware: relax "extract a maths problem", allow text/mcq answers, allow image/diagram visuals |
| Visual components | `NumberLine, PizzaSlices, GeometryCanvas, FunctionPlot…` (all maths) | add `LabeledDiagram, Timeline, MapView, Flowchart, ImageCard` for science/social |
| `practiceFactory.ts` | numeric generators keyed by concept id | non-math practice is authored MCQ/short-answer (no generator needed) |
| WorldMap (`src/screens/WorldMap.tsx`) | one subject; "worlds" = maths strands; class tabs only | add a **Subject switcher** above class tabs; worlds become per-subject |
| Loader (`electron/main.js`) | merges all `content-packs/*/concepts/*.json` into one map; cards expose `strand, grade` | also expose `subject`; nothing else changes (packs already auto-merge) |
| AI tutor/generator (`electron/aiService.js`) | math-tutor prompts; `generateConcept` gated to maths | subject-aware prompts + grounding so non-math lessons generate + verify |

Good news: the **pack-loading model already scales** — every `content-packs/<pack>/concepts/*.json`
is auto-merged by id. Adding a subject = adding new packs + a `subject` field, not rewiring loading.

---

## 2. Integration design (minimal-disruption, additive)

**2.1 One new field: `subject`.**
Every concept gains `"subject": "maths" | "science" | "evs" | "social" | "history" | "geography" |
"civics" | "economics" | "computers" | "gk" | …`. All 146 existing math concepts default to
`"maths"` (a one-line migration). The loader passes `subject` through to concept cards.

**2.2 Per-subject packs.** New content lives in its own packs, e.g.
`content-packs/cbse-evs-1-5-en-v1/`, `content-packs/cbse-science-6-10-en-v1/`,
`content-packs/cbse-social-6-10-en-v1/`, `content-packs/cbse-computers-3-12-en-v1/`.
Each `pack.json` gets a `subject` and keeps `grades`, `world`, `language`.

**2.3 Subject-aware "strands" (chapters).** `strand` stays the grouping key but its allowed values
become per subject (Science: `life, matter, energy, earth-space, environment`; Social:
`history, geography, civics, economics`; Computers: `hardware, software, coding, internet-safety`).
The validator checks strand against the concept's subject.

**2.4 The lesson contract generalizes cleanly.** The existing contract already fits any subject —
`whatIsIt, whyNeeded, realLifeUses, vocabulary, story, teachingGallery, standardMethod → keyIdeas,
workedExamples → examples, commonMistakes, practice(easy/medium/challenge), masteryCheck,
teachBackPrompt, revisionCard`. Only two maths-isms are relaxed for non-math subjects:
- `story.extractedProblem/answerInStory` become **optional** (a science story doesn't "extract a sum").
- answer formats: keep `mcq` + `text`; `number/fraction` become optional (rare outside maths).

**2.5 New offline visual components** (the biggest real build — science/social are image/diagram-heavy):
- **ImageCard** — a captioned illustration (uses a bundled image or the existing AI "Picture-it" generator).
- **LabeledDiagram** — an image/SVG with labelled hotspots (parts of a plant, the water cycle, a computer).
- **Timeline** — dated events on a line (history).
- **MapView** — an outline map (India/world) with marked places (geography).
- **Flowchart** — ordered steps/process (science methods, algorithms, civics processes).
Each is registered exactly like the current visuals (VisualRenderer switch + validator list) — the
`FunctionPlot` I just added is the template for how to add one safely.

**2.6 UI: a Subject switcher.** WorldMap gains a top-level **Subject** selector
(Maths · Science · Social · Computers · GK), then the existing Class tabs, then chapters. Persist the
choice in `localStorage`. Everything else (mastery, hints, teach-back, spaced revision, themes,
voice) works unchanged across subjects.

---

## 3. How data is added (the authoring pipeline)

Identical model to maths, three ways:

1. **Hand-authored JSON** — drop `content-packs/<subject-pack>/concepts/<id>.json` following the
   (generalized) contract, run `node tools/validate-content.js …`, rebuild. Best for the gold-standard
   first slice of each subject.
2. **AI-generated + verified** — extend the app's existing **Create-a-Lesson** feature
   (`aiService.generateConcept`) to be subject-aware: subject-specific prompts, web/Wikipedia grounding,
   the generalized schema, and the same sanitise→validate→answer-verify gate. This is how the bulk of
   ~2,000 lessons get produced at scale, with a human/teacher review step before publish.
3. **Bulk import** — a small script to convert a chapter outline (CSV/markdown) into skeleton concept
   JSON for an author to fill, for teams producing content in volume.

All three feed the same validator and the same auto-merging loader. No new "data plumbing" is needed.

---

## 4. Scope reality (be honest)

CBSE non-language subjects PP1→12 is huge:
- **Primary (1–5):** EVS (Science + Social combined), Computers, GK.
- **Middle (6–8):** Science, Social Science (History, Geography, Civics, Economics), Computers/IT.
- **Secondary (9–10):** Science, Social Science, IT (402).
- **Senior secondary (11–12) streams:** Science (Physics, Chemistry, Biology, Computer Science/IP),
  Commerce (Accountancy, Business Studies, Economics), Humanities (History, Geography, Political
  Science, Sociology, Psychology, Economics).

At the app's current depth (146 concepts for maths alone), "all subjects, all classes" is a
**1,500–3,000+ concept program** — months of authoring even with AI assistance. The plan below is
therefore staged so value ships continuously, not in one impossible push.

---

## 5. Implementation plan (phased)

**Phase 0 — Generalize the engine (make it multi-subject).** ~1–2 focused sessions.
- Add `subject` to schema; migrate 146 math concepts to `subject: "maths"`.
- Thread `subject` through loader + concept cards + api types.
- Make the validator subject-aware (per-subject strands; relax maths-only required fields).
- Add the **Subject switcher** UI to WorldMap.
- Build the new visual components (ImageCard, LabeledDiagram, Timeline, MapView, Flowchart).

**Phase 1 — Prove it: EVS/Science PP1→Class 5 vertical slice.** ~30 concepts, full contract, hand-authored + verified. Confirms the whole pipeline end-to-end and ships visible value.

**Phase 2 — AI authoring pipeline for scale.** Extend Create-a-Lesson to be subject-aware and grounded; add a batch-generate + review workflow so the remaining subjects can be produced quickly with verification.

**Phase 3 — Roll out subject by subject / class by class** (each an incremental pack):
Science 6–10 · Social Science 6–10 · Computers/IT 3–12 · GK 1–8 · then senior-secondary streams
(Physics, Chemistry, Biology, CS; Accountancy, Business Studies, Economics; History, Geography,
Political Science, etc.).

**Phase 4 — Rebrand + distribute.** Rename to a subject-neutral identity (e.g. "FearlessLearn"),
regenerate the portable build/installer.

---

## 6. Recommendation

Start with **Phase 0 + Phase 1** — generalize the engine and ship one real subject slice (EVS PP1–5).
That turns the app into a true multi-subject platform and proves every part of the pipeline, after
which content scales through AI generation + review rather than pure hand-authoring. Trying to
hand-author all subjects/classes up front is not realistic; staging is how this actually gets built.
