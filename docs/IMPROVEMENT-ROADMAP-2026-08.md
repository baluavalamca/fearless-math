# FearlessMath — Improvement & Feature Roadmap

_Compiled 2026-08-10 by reading the actual codebase (electron/, src/, content-packs/, docs/,
schema/, tests/) plus current (2026) research on AI tutoring apps and adaptive-learning
science. Every claim below is checked against the code or a cited source — nothing is guessed._

---

## 1. Where the app actually stands today

This is a mature, feature-rich product, not an early prototype. Worth saying plainly so the
recommendations below read as "what's next," not "what's missing":

- **226 concepts** across 6 content packs (204 Class 3–12 + 22 PP1–2, in en/hi/te), covering
  PP1 → Class 12 maths end-to-end, plus Aptitude (16), Reasoning (20), and Olympiad (20) bands.
- **Full JEE Main + JEE Advanced Maths syllabus** now covered chapter-for-chapter (verified this
  session).
- **Real AI tutoring already built**: a grounded Socratic coach (`buildCoachPrompt` — guides,
  never hands over the answer), an "Explain a different way" rephraser, an "Ask Robo" open
  Q&A chat, and an AI **Create-a-Lesson** authoring pipeline (topic → grounded generation →
  schema validation → answer-key self-verification) — this is the same "guide, don't solve"
  philosophy Khan Academy's Khanmigo uses, and it's provider-agnostic: OpenAI, Anthropic,
  Ollama, and LM Studio are all wired in, so a fully **offline/local LLM** is already an option
  (`electron/aiService.js` `providers()`), not something to add.
- **Multi-method teaching**: CPA-ordered lessons (Story → Picture → Meaning → Steps → Another
  Way → Examples), a method-switcher (mental math / abacus / Vedic / standard), Vedic-math
  techniques verified against a Python reference.
- **Real 3D** (Three.js — solids, vectors, cone-slices, a rotatable surface plotter), KaTeX
  typesetting, an offline TTS + Sarvam STT/TTS voice layer, an AI image ("Picture-it") layer.
- **Fear-free pedagogy enforced by tooling**: the content validator rejects any concept missing
  3-hint ladders, ≥3 real-life uses, worked-example-first ordering, and authored (not generic)
  mistake fixes — this is a genuine quality gate, not a style guideline.
- **Study toolkit**: Flashcards, Formula Book, Tips & Tricks, Mistake Clinic (per-mistake-tag
  review), spaced revision, badges/streak/XP, Textbook Mode, a Parent Dashboard with per-child
  progress and content enable/disable.
- **i18n infrastructure**: language-aware loader, per-language TTS, Hindi/Telugu font stacks.

So the honest framing is: **the pedagogy engine, the AI plumbing, and the maths content are
strong. The biggest gaps are in scale (subjects, languages), a few high-value AI features every
competitor now has, personalization depth, and go-to-market basics (mobile, distribution).**

---

## 2. AI-powered improvements (the part you asked about specifically)

### 2.1 Photo/camera homework solver — the single biggest gap
Every leading AI-math competitor (Photomath, and increasingly Khanmigo) is now built around
"point your camera at a problem, get it read and solved." FearlessMath has zero camera/OCR
input today — everything starts from picking a concept in Ganita Grove. This is worth doing
because it meets kids where their _actual_ homework lives (a textbook page or worksheet), not
just the app's own curriculum.
- Flow: camera/gallery → OCR (a vision-capable model call, since OpenAI/Anthropic/Ollama vision
  models are already reachable through the existing provider plumbing) → match to the nearest
  concept if one exists (so it still teaches with the Fear-Free lesson, not just an answer) →
  otherwise fall back to the existing Socratic **coach** prompt so it still guides rather than
  just solving.
- This slots into infrastructure you already have (`ai:coach`, `ai:explain`, image handling in
  `mediaService.js`) — it's a new entry point into existing logic, not a new subsystem.

### 2.2 Real adaptive spaced repetition (replace the fixed-day schedule)
Today `nextRevisionAt` (electron/logic.js) uses a **fixed** `reviewAfterDays` array authored per
concept (e.g. `[3, 7, 21]`) — every child gets the same schedule regardless of how well *they*
did. Modern spaced-repetition systems (SM-2, and the newer FSRS used by Anki since 2023) instead
build a **per-student forgetting-curve model** and adjust the next interval by how easy/hard that
review actually was. This isn't a marginal tweak — studies cited by current SRS research show
adaptive scheduling scoring **6–10% higher** on retention tests than fixed-interval schedules,
and 80–90% six-month retention vs 20–30% for cramming-style fixed review. Given the whole app is
built around mastery + revision, this is probably the single highest-leverage engine change you
could make.

### 2.3 Adaptive difficulty inside Practice
`practiceFactory` and `Practice.tsx` currently run every student through the same fixed
easy → medium → challenge ladder. A light per-session adaptive rule (e.g. two fast-correct
answers bumps to the next tier early; two wrong answers with hints used drops back down) would
make practice feel personalized without needing a new AI call — pure logic, consistent with the
"math truth layer" philosophy already in `logic.js`.

### 2.4 Turn dashboard numbers into an AI-written narrative
`dashboard:get` already computes rich per-concept stats (attempts, correct, hints, mastery,
struggling-concept tips) — but the Parent Dashboard renders them as raw numbers with no charts
and no narrative. Given `askTutor`/`explain` already call an LLM, a natural extension is a
**weekly AI-written parent summary** ("Aarav is flying through fractions but keeps mixing up
the two triangle similarity mistakes — here's what to try this week") generated from that same
stats payload. Zero new data plumbing needed, just a new prompt template + a summary tab.

### 2.5 Voice-first tutor mode
STT (Sarvam transcribe) and TTS already exist and are wired into lesson readout — but "Ask Robo"
is still a typed chat. Letting a child **speak** their question and hear Robo's Socratic
follow-up spoken back closes the loop and matters a lot for younger (PP1–Class 3) or
lower-literacy users, who are a real part of this app's target band.

### 2.6 Cross-concept mistake-pattern detection
`Mistake Clinic` already surfaces per-question mistake tags. The next step is aggregating tags
**across concepts** to catch systemic issues an AI can name explicitly — e.g. a student who
mixes up "increasing/decreasing" in both `num-54-application-derivatives` and a trig concept has
a signed-number intuition gap, not two unrelated mistakes. This is a genuinely differentiating
feature (most apps report per-question, not per-pattern).

---

## 3. Content & curriculum

- **Multilingual depth is shallow relative to English.** Hindi and Telugu packs currently cover
  only **43 of 226 concepts (~19%)**. For an app whose stated mission is Indian-context,
  multi-language learning, this is the largest content gap, bigger than any missing topic in the
  English pack. Prioritizing translation coverage (even just PP1–Class 5, the age band least
  likely to be comfortable in English) would matter more than most new English content.
- **Class 6–9 core strands are thinner than Class 10–12.** Concept counts by grade: Class 6 (11),
  7 (17), 8 (17), 9 (17) vs Class 10 (27), 11 (20), 12 (19). Middle school is the band most likely
  to determine whether a struggling student catches up or falls further behind — worth a
  depth pass, not just more senior-secondary content.
- **Board/JEE practice density**: your own `docs/PRODUCTION-READINESS.md` already flags this —
  "Senior (Class 9–12) lessons are introductions, not exam-depth." The JEE-gap work done this
  session closed *coverage* gaps; *depth* (more worked examples and harder challenge-tier
  questions per concept) is the next layer.
- **`reviewStatus` is still `draft` on effectively everything.** There's no teacher/subject-expert
  review workflow yet — worth building even a lightweight one (a reviewer checklist + a status
  bump) before treating content as classroom-ready.
- **Multi-subject expansion** is already scoped in `docs/MULTI-SUBJECT-PLAN.md` (Science, Social
  Science, Computers, GK) — that plan is sound; it's a matter of sequencing it in, not redesigning
  it.

---

## 4. Engagement, gamification & parent tools

- **Gamification is currently thin**: a day-streak counter, XP number, and a single badge shown
  in the home screenshot from this session. No weekly challenges, no milestone celebrations
  beyond the existing confetti-on-mastery, no visible badge *catalog* to chase. Kids' apps that
  retain well (Duolingo-style) lean much harder into visible collectible goals.
- **Parent Dashboard has no visualizations** — `ParentDashboard.tsx` renders stats as numbers/
  cards, no trend chart despite having the time-series data (attempts, mastery dates) to draw one.
  A simple "mastery over the last 4 weeks" line and a "time on task" figure would go a long way
  for parent trust and engagement.
- **No opt-in multiplayer/social loop** — even something fully local and privacy-safe (two
  sibling profiles racing the same practice set on one device, or a weekly family leaderboard)
  adds a reason to come back that pure solo mastery doesn't.
- **No notification/reminder channel** — being a desktop app with no OS-level reminder, there's
  nothing that brings a child back if they stop opening it. Worth at least a "streak about to
  break" system notification.

---

## 5. Accessibility & input

- **Accessibility is an explicit, still-open gap** per `docs/PRODUCTION-READINESS.md`: no
  keyboard-navigation/focus-state audit, no WCAG AA contrast check, no screen-reader labels, no
  "reduce motion" honouring for the 3D/auto-rotate views. This matters for compliance and for
  genuinely reaching kids with different needs.
- **All practice input is typed or multiple-choice.** There's no handwriting/stylus input, which
  matters a lot for maths specifically (writing out a long division or an equation is often
  easier and more natural than typing it) — especially relevant if this ever targets tablets.
- **No dyslexia-friendly font or larger-text mode** beyond the existing theme system.

---

## 6. Platform & distribution

- **Windows-only Electron desktop.** Most Indian families are mobile-first; a phone/tablet
  companion (even a lighter React Native or PWA build reusing the same content-pack JSON and
  logic.js) would multiply reach far more than any single new feature. This is the single biggest
  strategic decision on this list.
- **No cloud sync.** Progress lives in a local SQLite/JSON file per machine — fine for
  privacy-first offline-by-default, but it means a child can't pick up on a second device, and a
  factory reset loses everything. An optional, explicitly-opt-in encrypted backup/sync would
  close this without breaking the offline-first promise.
- **Installer/distribution items already flagged and partly resolved this session** (NSIS
  short-path fix landed — task #196), but code signing, auto-update (electron-updater), and a
  clean second-machine install test are still open per `PRODUCTION-READINESS.md`.

---

## 7. Engineering hygiene

- **Main renderer bundle is ~1.25 MB** (confirmed in this session's build output — up from the
  745 KB noted in `PRODUCTION-READINESS.md` a few weeks ago, as features have accumulated).
  3D and toolboxes are already code-split; the KaTeX/Three.js/i18n-font payload is the next thing
  worth trimming (lazy-load fonts per active language, defer KaTeX until first equation render).
- **No end-to-end/UI test coverage** — `npm test` covers pure logic + content validation well, but
  there's no Playwright-style flow test (e.g. "onboard → pick concept → answer → mastery →
  badge"), so UI regressions (like the mascot-sizing and 3D-canvas bugs fixed earlier this
  session) are only caught by manual screenshotting.
- **No crash reporting / opt-in telemetry** — you're flying blind on real-world failures once this
  leaves your machine.
- **No CI** — validate-content, tsc, and tests all run manually each session; wiring them into a
  GitHub Actions workflow on every push would catch regressions before they're noticed by hand.

---

## 8. Suggested priority (Now / Next / Later)

**Now — highest leverage, most in reach:**
1. Adaptive spaced repetition (SM-2/FSRS-style) replacing the fixed `reviewAfterDays` schedule.
2. Close the Hindi/Telugu translation gap for at least PP1–Class 5 (19% → meaningfully higher).
3. Parent-dashboard trend chart + AI-written weekly summary (reuses existing data + AI plumbing).

**Next — high value, more build effort:**
4. Photo/camera homework solver (OCR → match-to-concept or Socratic coach fallback).
5. Adaptive difficulty inside Practice sessions.
6. Accessibility pass (keyboard nav, contrast, reduce-motion, screen-reader labels).
7. Deepen gamification (badge catalog, weekly challenges, streak-save notification).

**Later — strategic, bigger bets:**
8. Mobile/tablet companion app (biggest reach multiplier).
9. Multi-subject rollout per the existing `MULTI-SUBJECT-PLAN.md`.
10. Optional cloud sync/backup.
11. CI + E2E tests + crash reporting + code signing/auto-update (distribution/ops maturity).

---

## Sources consulted for the AI/adaptive-learning claims
- [11 Best AI Math Tutoring Tools 2026](https://www.taskade.com/blog/ai-math-tutoring)
- [The Best AI For Math: Teacher Rated And Compared For Schools](https://thirdspacelearning.com/us/blog/best-ai-for-math/)
- [AI Math Tutors for Kids: Top 5 Compared (2026)](https://www.kidsaitools.com/en/articles/ai-math-tutors-for-kids)
- [7 Best Spaced Repetition Apps in 2026: We Tested Them All](https://laxuai.com/blog/best-spaced-repetition-apps-2026)
- [Spaced Repetition Guide: Learn Faster (2026)](https://trycramd.com/blog/spaced-repetition-guide-2026)
- [Best Spaced Repetition Apps 2026: Anki, Chunks, Duolingo & More](https://chunks.app/blog/best-spaced-repetition-apps-2026)
