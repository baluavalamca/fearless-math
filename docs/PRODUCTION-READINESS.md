# FearlessMath — Production Readiness Checklist

_Status as of 2026-07-16. Honest assessment: **feature-complete private beta, not yet production/public-ready.**_
_Legend: ✅ done · 🟡 partial · ❌ not started · 🚧 blocker for public launch_

The app is genuinely strong on **content and features** (146 concepts PP1→Class 12,
real Three.js 3D, AI coach, study toolkit, themes). "Production-ready" is gated by the
items below — mostly **distribution, real-user validation, and QA**, not features.

---

## 0. Fixed in this pass
- ✅ Onboarding / "Who's learning today?" screen had **zero CSS** — every class was unstyled.
  Full stylesheet added (brand card, avatar profile grid, role/class selectors, form, responsive, light+dark).
- ✅ Advanced Tools "3D Surface" was **fake 3D** (flat-canvas wireframe). Replaced with a real
  Three.js `Surface3D` mesh (drag-to-orbit, zoom, height colour-map), code-split like the lesson 3D.

## 1. 🚧 Distribution / install (biggest launch blocker)
- ❌ **Working installer.** NSIS `Setup.exe` fails on this machine (include path > Windows ~260-char MAX_PATH).
  Currently shipped by manual file-copy / portable build → **not distributable to non-technical parents.**
  - Options: (a) build from a short path e.g. `C:\fmbuild`; (b) switch target to Squirrel/`msi`; (c) portable `.zip` as the official artifact with a one-click launcher.
- ❌ **Code signing** (Windows SmartScreen will warn on an unsigned installer).
- ❌ **Auto-update** channel (electron-updater) — none.
- ❌ **Second-machine test** — everything so far is one dev environment. Test a clean Windows PC with no Node.

## 2. 🚧 Real-user validation (the true unknown)
- ❌ **Play-test with 3–5 real children** across the age band (PP1, Class 3, Class 8, Class 11).
  Measure: can they navigate unaided? Is the difficulty curve right? Do they understand after the lesson?
- ❌ **Parent/teacher walkthrough** — is setup + progress view obvious to a non-technical adult?
- ❌ Instrument a lightweight, **local-only** funnel (lesson start → mastery) to see where kids drop off. No data leaves the device.

## 3. 🟡 Design / UX QA (the onboarding bug shows this is needed)
- 🟡 **Full-screen audit of every screen** in light + dark + all themes, at small and large windows.
  Onboarding proves spot-checks miss things — do a deliberate class-by-class "is every element styled?" pass on Home, WorldMap, LessonPlayer, Parent dashboard, both toolboxes, and all popups.
- ❌ **Accessibility**: keyboard navigation, focus states, colour-contrast (WCAG AA), screen-reader labels, "reduce motion" honouring for the 3D/auto-rotate.
- ❌ Empty/error/loading states reviewed (e.g. no profiles, AI key missing, WebGL unavailable → already soft-fails to caption ✅).

## 4. 🟡 Content quality
- 🟡 **`reviewStatus` is still `draft`** on senior concepts — none teacher-reviewed. Move key ones to `in_review`/`approved`.
- 🟡 **Senior (Class 9–12) lessons are introductions, not exam-depth.** Add board/JEE-level practice density where it matters.
- ✅ Answer keys are code-verified by the content validator (0 warnings at last run).

## 5. 🟡 Engineering hygiene
- 🟡 **Automated tests** exist for logic + content validation, but **no end-to-end/UI tests** (Playwright/Spectron) and no CI.
- ❌ **Crash reporting** (e.g. Sentry, opt-in) — none.
- 🟡 Main renderer bundle is ~745 KB; 3D + toolboxes are code-split ✅. Consider trimming further before launch.
- ⚠️ **Filesystem note (this session):** the build sandbox went read-only/stale mid-session, so the two fixes above
  are applied to source but **not yet tsc/build/reinstall-verified**. Re-run `npm run dev` (or a clean build) to confirm, then screenshot.

## 6. ❌ Legal / privacy (mandatory before public release to kids)
- ❌ **Privacy policy** + data-handling doc. App is offline-first ✅, but the AI features send lesson text to third-party providers.
- ❌ **COPPA / India DPDP Act** review — it targets children; children's-data rules apply even if data is minimal.
- ❌ Confirm **no child PII is ever sent to AI** (design says only lesson + current question — verify in code and document it).
- ❌ Third-party **licence/attribution** file (Three.js, fonts, any assets).

## 7. ❌ Ops / support
- ❌ Versioned **release notes / changelog** for users.
- ❌ A simple **feedback path** (in-app "report a problem").
- ❌ Support/FAQ doc for parents.

---

## Suggested launch sequence
1. **Fix the installer** (short-path build or switch target) + code-sign → get a real one-click install.
2. **Design-QA pass** on every screen/theme (catch the rest of the onboarding-class of bugs).
3. **Play-test with real kids** and a couple of parents; fix what that surfaces.
4. **Privacy policy + COPPA/DPDP review** and verify no-PII-to-AI.
5. **Second-machine clean install test** → then a small **private pilot** (a few families).
6. Iterate from pilot feedback before any public/store release.

**Bottom line:** ~1–2 focused iterations on _distribution + QA + real-user testing_ away from a
credible private pilot; a bit more (privacy/legal, polish, support) before a public launch.
