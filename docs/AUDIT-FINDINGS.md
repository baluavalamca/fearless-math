# FearlessMath — Code / Design / Architecture Audit

_2026-07-16. A read-through of the real source (Electron main, preload, renderer core, logic).
Overall the codebase is in good shape — clean IPC boundary, sound Electron security defaults,
a well-isolated "math truth" layer. Findings below; the safe ones are already fixed._

> Note: fixes marked **✅ fixed** are applied to source but **not yet `tsc`/build-verified**
> (the build sandbox was frozen read-only this session). Run `npm run build` to confirm, then commit.

---

## ✅ Fixed this pass (low-risk, correct-by-inspection)

| # | Area | File | Change |
|---|------|------|--------|
| 1 | Design | `src/styles.css` | Onboarding/profile-picker had **zero CSS** — added full stylesheet (brand card, avatar profile grid, role/class selectors, form, responsive, light+dark). |
| 2 | Coding/feature | `src/components/Surface3D.tsx` (new) + `AdvancedToolbox.tsx` | "3D Surface" tool was fake flat-canvas wireframe → real Three.js mesh (drag/zoom, height colour-map), code-split. |
| 3 | Architecture/security | `electron/main.js` | Added `setWindowOpenHandler` + `will-navigate` guard: app can't be navigated away or spawn windows; real external links open in OS browser. |
| 4 | Correctness | `electron/logic.js` | Number-answer check used exact float equality → added tiny relative epsilon so computed/decimal answers aren't wrongly marked wrong (never accepts a near-miss). |
| 5 | Robustness | `src/components/ErrorBoundary.tsx` (new) + `main.tsx` + `styles.css` | No app-level error boundary → a render crash white-screened the whole app. Now shows a friendly "Try again" recovery screen. |

---

## 🔧 Remaining findings — do in the verified pass (edit → tsc → build)

### Architecture / robustness
- ✅ **Null-profile guards (medium)** — FIXED. `electron/main.js` handlers `lesson:started`, `practice:submit`,
  `mastery:finish`, `badges:list`, `dashboard:get`, `clinic:list` now return safe defaults if no active profile.
- ✅ **Async error handling (low)** — FIXED. `App.openConcept` wrapped in `try/catch` so a failed lesson load
  can't produce an unhandled rejection / frozen tile.
- ⏸ **Content-Security-Policy (low) — DEFERRED (verify-risk).** A CSP mistake white-screens only at runtime,
  and dev (HMR) vs prod need different policies. Do via `session.onHeadersReceived` gated on `app.isPackaged`,
  tested live — not blind. `connect-src` can stay tight since AI/media fetches run in the main process.
- **`logic.test.js` hardcoded concept count** must be bumped whenever concepts are added (consider deriving it).

### Design / UX
- **Full design-QA sweep (medium).** The onboarding bug proves spot-checks miss unstyled elements.
  Do a deliberate screen × theme pass (Home/WorldMap, LessonPlayer, ParentDashboard, MistakeClinic,
  both toolboxes, all popups) in light + dark + each of the 13 themes, at min and max window size.
  _Needs the running app — do it right after the build is green._
- ✅ **Stale tooltip (trivial)** — FIXED. Theme-toggle `title` is now generic (`Switch theme (N available)`).
- **Accessibility (medium).** Keyboard focus states, WCAG-AA contrast per theme, and honour
  `prefers-reduced-motion` for the 3D auto-rotate (Solid3D/Scene3D/Surface3D `controls.autoRotate`).

### Code quality
- ⏸ **Duplicated visual-component list — DEFERRED (verify-risk).** Lives in 3 places (`validate-content.js` ×2,
  `aiService.js`). Extracting a shared module means a cross-dir `require`; a wrong path fails only at app runtime
  (vite doesn't bundle main-process files), so do it with a live run, not a blind edit.
- **`AdvancedToolbox.tsx` is very large** (~1300 lines, many tools in one file). Consider splitting per-tool
  for maintainability (non-urgent; it's already lazy-loaded).

### Verified-build checklist (run after edits)
```
npx tsc --noEmit           # types
node tools/validate-content.js content-packs/*/concepts   # content
npm test                    # logic + coverage (update concept-count assertion if needed)
npm run build               # vite + electron bundle
```

---

## Not problems (audited, healthy)
- `preload.js` — textbook secure `contextBridge`, invoke-only, no Node in renderer.
- `main.js` webPreferences — `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`.
- `logic.js` mastery / unlocking / spaced-revision — correct.
- Code-splitting (toolboxes + all 3D) — main bundle stays ~745 KB.
- AI boundary — only lesson + current question sent to providers; answers judged locally, never by AI.
