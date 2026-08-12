const { app, BrowserWindow, ipcMain, net, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { createStore } = require("./db");
const { loadPacks, conceptCard } = require("./contentLoader");
const logic = require("./logic");
const ai = require("./aiService");
const media = require("./mediaService");
const mistakeFamilies = require("./mistakeFamilies");

// Some Windows GPU driver / virtual-display combinations leave the Chromium
// compositor unable to flush a frame to the actual window surface — the DOM
// renders correctly (verified via devtools) but the window paints solid white
// forever. Disabling GPU compositing trades a little rendering perf for a
// window that reliably paints on every machine. Must be called before
// app.whenReady()/app ready.
app.disableHardwareAcceleration();

let store, content, userConceptsDir;

/* User-authored concepts (from the "Create a Lesson" feature) live in a writable
 * dir and are merged into the in-memory concept map so they behave exactly like
 * authored concepts — full lesson, practice, mastery, revision, coach. */
function loadUserConcepts() {
  try {
    if (!userConceptsDir || !fs.existsSync(userConceptsDir)) return;
    for (const f of fs.readdirSync(userConceptsDir).filter((x) => x.endsWith(".json"))) {
      try {
        const c = JSON.parse(fs.readFileSync(path.join(userConceptsDir, f), "utf8"));
        if (c && c.id && !content.concepts.has(c.id)) content.concepts.set(c.id, c);
      } catch { /* skip a corrupt file */ }
    }
  } catch { /* ignore */ }
}
function persistUserConcept(c) {
  fs.mkdirSync(userConceptsDir, { recursive: true });
  fs.writeFileSync(path.join(userConceptsDir, c.id + ".json"), JSON.stringify(c, null, 2));
}
function removeUserConcept(id) { try { fs.unlinkSync(path.join(userConceptsDir, id + ".json")); } catch { /* ignore */ } }

function allQuestions(c) {
  return [
    ...c.practice.easy, ...c.practice.medium, ...c.practice.challenge,
    ...c.masteryCheck.questions,
  ];
}

/** Plain-language weekly summary — used whenever the AI tutor isn't configured/online,
 * so the Parent Dashboard trend always shows something honest, not a blank state. */
function localWeeklySummary({ attempts, correct, accuracyPct, activeDays, conceptsMasteredThisWeek }) {
  if (attempts === 0) {
    return "No practice logged this week. A short 10-minute session on a couple of days makes a real difference — no pressure, just little and often.";
  }
  const parts = [];
  parts.push(`${attempts} question${attempts === 1 ? "" : "s"} answered across ${activeDays} active day${activeDays === 1 ? "" : "s"} this week`
    + (accuracyPct !== null ? ` at ${accuracyPct}% accuracy.` : "."));
  if (conceptsMasteredThisWeek > 0) {
    parts.push(`${conceptsMasteredThisWeek} concept${conceptsMasteredThisWeek === 1 ? "" : "s"} mastered — nice steady progress.`);
  }
  if (accuracyPct !== null && accuracyPct < 60) {
    parts.push("Accuracy dipped a bit — a good sign to slow down together, not a reason to worry; hints are there to help.");
  } else if (activeDays <= 1) {
    parts.push("Just one active day — a couple of short sessions spread across the week tends to stick better than one long one.");
  } else {
    parts.push("Keep the rhythm going with a few short sessions next week.");
  }
  return parts.join(" ");
}

/** Plain-language mistake-pattern note — used whenever the AI tutor isn't
 * configured/online, so this section always shows something honest. */
function localPatternInsight(patterns) {
  if (!patterns.length) return null;
  const top = patterns[0];
  const names = top.concepts.map((c) => c.name).join(", ");
  return `The pattern showing up most is "${top.label}" — it's come up across ${top.concepts.length} different lessons (${names}). ${top.tip}`;
}

function registerIpc() {
  function activeProfile() {
    const all = store.listProfiles();
    const id = store.getActiveProfileId();
    if (id == null) { if (all.length) { store.setActiveProfile(all[0].id); return all[0]; } return null; }
    return all.find((p) => p.id === id) || all[0] || null;
  }
  let profile = activeProfile();

  // Global display language (EN default). Translated packs carry the same concept
  // ids, so we resolve a concept's text in the active language and fall back to
  // English per-concept when a translation isn't shipped yet.
  let activeLang = "en";
  const resolveConcept = (id) => {
    const m = content && content.conceptsByLang && content.conceptsByLang.get(activeLang);
    return (m && m.get(id)) || (content && content.concepts.get(id)) || null;
  };

  // Never leak the raw PIN to the renderer — expose only whether one is set.
  const pub = (p) => { if (!p) return p; const { pin, ...rest } = p; return { ...rest, hasPin: !!pin }; };

  // English is always available. Hindi/Telugu (or any other shipped non-English pack)
  // only count as "available" to a child once their parent has switched it on in the
  // Parent Dashboard — mirrors the per-child concept enable/disable pattern.
  const langAllowedForActiveProfile = (lang) => {
    if (lang === "en") return true;
    if (!profile) return false;
    return store.listEnabledLanguages(profile.id).includes(lang);
  };
  const availableLangsForActiveProfile = () => {
    const shipped = content && content.conceptsByLang ? [...content.conceptsByLang.keys()] : ["en"];
    return shipped.filter(langAllowedForActiveProfile);
  };

  ipcMain.handle("content:languages", () => availableLangsForActiveProfile());
  ipcMain.handle("content:setLanguage", (_e, lang) => {
    const has = content && content.conceptsByLang && content.conceptsByLang.has(lang);
    activeLang = (has && langAllowedForActiveProfile(lang)) ? lang : "en";
    return { lang: activeLang, available: availableLangsForActiveProfile() };
  });

  /** Parent turns Hindi/Telugu on or off for the currently active child. English can't
   * be disabled. If the child was actively using a language the parent just turned off,
   * we fall back to English immediately so the UI never shows an unavailable language. */
  ipcMain.handle("languages:listEnabled", () =>
    profile ? store.listEnabledLanguages(profile.id) : []);
  ipcMain.handle("languages:setEnabled", (_e, { lang, enabled }) => {
    if (!profile || lang === "en") return { ok: false };
    store.setLanguageEnabled(profile.id, lang, enabled);
    if (!enabled && activeLang === lang) activeLang = "en";
    return { ok: true, activeLang };
  });

  ipcMain.handle("profile:get", () => pub(profile));
  ipcMain.handle("profiles:list", () => store.listProfiles().map(pub));
  ipcMain.handle("profiles:active", () => pub(profile) || null);
  ipcMain.handle("profiles:create", (_e, data) => { profile = store.createProfile(data); return pub(profile); });
  ipcMain.handle("profiles:setActive", (_e, id) => { store.setActiveProfile(id); profile = store.listProfiles().find((p) => p.id === id) || profile; activeLang = "en"; return pub(profile); });
  ipcMain.handle("profiles:setPin", (_e, { id, pin }) => {
    const row = store.setPin(id, pin);
    if (profile && profile.id === id) profile = store.listProfiles().find((p) => p.id === id) || profile;
    return pub(row);
  });
  ipcMain.handle("profiles:verifyPin", (_e, { id, pin }) => store.verifyPin(id, pin));

  ipcMain.handle("concepts:list", () => {
    if (!profile) return [];
    const all = [...content.concepts.values()];
    const mastered = store.getProgress(profile.id)
      .filter((p) => p.status === "mastered").map((p) => p.concept_id);
    // Unlocking is computed against the FULL concept set (including anything a parent has
    // switched off) so a hidden concept never blocks its descendants from unlocking.
    const unlocked = new Set(logic.unlockedConcepts(all, mastered));
    const progress = new Map(store.getProgress(profile.id).map((p) => [p.concept_id, p]));
    const disabled = new Set(store.listDisabledConcepts(profile.id));
    return all
      .filter((c) => !disabled.has(c.id))
      .map((c) => ({
        // Card text (name/world/character) shows in the active language; the unlock
        // graph above is computed from the canonical English map (ids are shared).
        ...conceptCard(resolveConcept(c.id) || c),
        status: progress.get(c.id)?.status
          || (unlocked.has(c.id) ? "available" : "locked"),
      }));
  });

  /** Parent switches a concept on/off for the currently active child. Hidden concepts stay
   * hidden from Ganita Grove/search but keep any progress already recorded, so re-enabling
   * later picks up right where the child left off. */
  ipcMain.handle("concepts:setEnabled", (_e, { conceptId, enabled }) => {
    if (!profile) return { ok: false };
    store.setConceptDisabled(profile.id, conceptId, !enabled);
    return { ok: true };
  });

  ipcMain.handle("concepts:get", (_e, conceptId) => {
    const c = resolveConcept(conceptId);
    if (!c) throw new Error("Unknown concept: " + conceptId);
    return c;
  });

  /** Formula Book: aggregates every concept's `formulas` field into one flat list,
   * so the screen doesn't need to fetch 300+ concepts individually. Respects the
   * active display language (falls back to English per concept) and skips anything
   * a parent has disabled for the active child, same as concepts:list. */
  ipcMain.handle("concepts:listFormulas", () => {
    const all = [...content.concepts.values()];
    const disabled = profile ? new Set(store.listDisabledConcepts(profile.id)) : new Set();
    return all
      .filter((c) => !disabled.has(c.id))
      .map((c) => {
        const local = resolveConcept(c.id) || c;
        return {
          id: c.id,
          name: local.name || c.name,
          grade: c.grade,
          strand: c.strand,
          formulas: local.formulas || c.formulas || [],
        };
      })
      .filter((c) => c.formulas.length > 0)
      .sort((a, b) => (a.grade - b.grade) || a.name.localeCompare(b.name));
  });

  ipcMain.handle("lesson:started", (_e, conceptId) =>
    profile ? store.upsertProgress(profile.id, conceptId, { status: "learning" }) : null);

  ipcMain.handle("practice:submit", (_e, { conceptId, questionId, context, answer, hintsUsed, question }) => {
    if (!profile) return { correct: false, mistakeTag: null, mistake: null, hintLadder: [] };
    const c = content.concepts.get(conceptId);
    if (!c) throw new Error("Unknown concept");
    // Generated practice sends the question inline; authored questions are looked up by id.
    // Either way, logic.checkAnswer stays the single math-truth layer.
    const q = question || allQuestions(c).find((x) => x.id === questionId);
    if (!q) throw new Error("Unknown question");
    const verdict = logic.checkAnswer(q, answer);
    store.recordAttempt({
      profileId: profile.id, conceptId, questionId,
      context: context || "practice",
      correct: verdict.correct, hintsUsed, answerGiven: String(answer),
      mistakeTag: verdict.mistakeTag,
    });
    if (verdict.correct && (hintsUsed || 0) > 0) store.awardBadge(profile.id, "tried-again");
    if (verdict.correct && context === "clinic") store.awardBadge(profile.id, "fixed-my-mistake");
    // Friendly mistake info comes from authored content
    const mistake = verdict.mistakeTag
      ? c.commonMistakes.find((m) => m.mistakeTag === verdict.mistakeTag) || null
      : null;
    return { ...verdict, mistake, hintLadder: q.hintLadder };
  });

  ipcMain.handle("mastery:finish", (_e, { conceptId, teachBackDone }) => {
    if (!profile) return { status: "incomplete", score: null };
    const c = content.concepts.get(conceptId);
    const attempts = store.masteryAttempts(profile.id, conceptId);
    const result = logic.masteryResult(c, attempts, !!teachBackDone);
    const prior = store.getProgress(profile.id).find((p) => p.concept_id === conceptId) || null;
    const wasAlreadyMastered = prior?.status === "mastered";
    const now = new Date().toISOString();
    // Author-declared first check-in still matters; everything after it adapts per-student.
    const firstIntervalDays = c.revisionCard?.reviewAfterDays?.[0] || 3;
    const srsPrev = { easeFactor: prior?.srs_ease, intervalDays: prior?.srs_interval_days, repetitions: prior?.reviews_done };

    if (result.status === "mastered") {
      const quality = logic.masteryQuality({ score: result.score, teachBackDone: true });
      const srs = logic.sm2Update(srsPrev, quality, { fromISO: now, firstIntervalDays });
      store.upsertProgress(profile.id, conceptId, {
        status: "mastered", mastery_score: result.score,
        teach_back_done: true, mastered_at: wasAlreadyMastered ? prior.mastered_at : now,
        reviews_done: srs.repetitions, srs_ease: srs.easeFactor,
        srs_interval_days: srs.intervalDays, next_revision_at: srs.nextRevisionAt,
      });
      store.awardBadge(profile.id, wasAlreadyMastered ? "memory-booster" : "explained-it");
    } else if (wasAlreadyMastered) {
      // A revision check on an already-mastered concept came back below the bar — the
      // strongest "forgot it" signal SM-2 has. Tighten the schedule (SM-2 "lapse": reset
      // repetitions, review again tomorrow) but don't strip mastered status — that would
      // re-lock every concept downstream over one shaky revision, which isn't the point.
      const quality = logic.masteryQuality({ score: result.score, forgot: true });
      const srs = logic.sm2Update(srsPrev, quality, { fromISO: now, firstIntervalDays });
      store.upsertProgress(profile.id, conceptId, {
        mastery_score: result.score,
        reviews_done: srs.repetitions, srs_ease: srs.easeFactor,
        srs_interval_days: srs.intervalDays, next_revision_at: srs.nextRevisionAt,
      });
    } else {
      store.upsertProgress(profile.id, conceptId, {
        status: "practicing", mastery_score: result.score,
      });
    }
    return result;
  });

  ipcMain.handle("badges:list", () => (profile ? store.badges(profile.id) : []));

  /** Mistake Clinic: the child's own not-yet-fixed wrong answers as fix-it puzzles. */
  ipcMain.handle("clinic:list", () => {
    if (!profile) return [];
    return store.wrongQuestions(profile.id).flatMap((w) => {
      const c = content.concepts.get(w.conceptId);
      if (!c) return [];
      const q = allQuestions(c).find((x) => x.id === w.questionId);
      if (!q) return [];
      const mistake = w.lastMistakeTag
        ? c.commonMistakes.find((m) => m.mistakeTag === w.lastMistakeTag) || null
        : null;
      return [{ conceptId: c.id, conceptName: c.name, question: q, tries: w.tries, mistake }];
    });
  });

  /** Parent dashboard: mastery, accuracy, hints, revision dates, badges, home tips. */
  ipcMain.handle("dashboard:get", () => {
    if (!profile) return { profile: null, concepts: [], badges: [], tips: [] };
    const progress = new Map(store.getProgress(profile.id).map((p) => [p.concept_id, p]));
    const stats = new Map(store.stats(profile.id).map((s) => [s.conceptId, s]));
    const disabled = new Set(store.listDisabledConcepts(profile.id));
    const conceptsOut = [...content.concepts.values()].map((c) => {
      const p = progress.get(c.id);
      const s = stats.get(c.id);
      return {
        id: c.id, name: c.name, strand: c.strand, grade: c.grade,
        status: p?.status || "not-started",
        masteryScore: p?.mastery_score ?? null,
        attempts: s?.attempts || 0,
        correct: s?.correct || 0,
        hints: s?.hints || 0,
        nextRevisionAt: p?.next_revision_at || null,
        reviewStreak: p?.reviews_done || 0,
        masteredAt: p?.mastered_at || null,
        disabled: disabled.has(c.id),
      };
    });
    // Home tips for concepts the child is finding hard (accuracy < 70% with real attempts)
    const tips = conceptsOut
      .filter((c) => c.attempts >= 3 && c.correct / c.attempts < 0.7 && c.status !== "mastered")
      .map((c) => {
        const full = content.concepts.get(c.id);
        return {
          concept: c.name,
          homeTip: full.realLifeProject || null,
          fixes: full.commonMistakes.slice(0, 2).map((m) => m.fix),
        };
      });
    return { profile: { name: profile.name, grade: profile.grade }, concepts: conceptsOut, badges: store.badges(profile.id), tips };
  });

  /** Parent dashboard: 14-day activity + cumulative-mastery trend, plus a short weekly
   * narrative — AI-written (any configured provider, incl. local/offline) when available,
   * otherwise a plain-language fallback computed locally so this never shows a blank state. */
  ipcMain.handle("dashboard:trend", async () => {
    if (!profile) return { days: [], week: null, summary: null, summaryOk: false };
    const DAYS = 14;
    const since = new Date();
    since.setDate(since.getDate() - (DAYS - 1));
    since.setHours(0, 0, 0, 0);
    const sinceISO = since.toISOString();

    const activityByDay = new Map(store.dailyActivity(profile.id, sinceISO).map((r) => [r.day, r]));
    const masteryDates = store.masteryDates(profile.id);
    let masteredSoFar = masteryDates.filter((m) => new Date(m.masteredAt) < since).length;

    const days = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const row = activityByDay.get(key);
      const masteredToday = masteryDates.filter((m) => String(m.masteredAt).slice(0, 10) === key).length;
      masteredSoFar += masteredToday;
      days.push({ date: key, attempts: row?.attempts || 0, correct: row?.correct || 0, masteredCumulative: masteredSoFar });
    }

    const last7 = days.slice(-7);
    const weekAttempts = last7.reduce((s, d) => s + d.attempts, 0);
    const weekCorrect = last7.reduce((s, d) => s + d.correct, 0);
    const startOfWeekMastered = days[days.length - 8]?.masteredCumulative ?? days[0]?.masteredCumulative ?? masteredSoFar;
    const week = {
      attempts: weekAttempts,
      correct: weekCorrect,
      accuracyPct: weekAttempts ? Math.round((weekCorrect / weekAttempts) * 100) : null,
      activeDays: last7.filter((d) => d.attempts > 0).length,
      conceptsMasteredThisWeek: Math.max(0, masteredSoFar - startOfWeekMastered),
    };

    let summary = null, summaryOk = false;
    try {
      const r = await ai.weeklySummary(week);
      if (r.ok) { summary = r.summary; summaryOk = true; }
    } catch { /* fall through to the local summary below */ }
    if (!summaryOk) summary = localWeeklySummary(week);

    return { days, week, summary, summaryOk };
  });

  /** Parent dashboard: cross-concept mistake-pattern detection (#433). Groups the
   * child's still-unresolved wrong answers (store.wrongQuestions) into named skill-gap
   * families that span 2+ different lessons, then adds a short AI note (or an honest
   * local fallback) naming the biggest one. */
  ipcMain.handle("mistakes:patterns", async () => {
    if (!profile) return { patterns: [], insight: null, insightOk: false };
    const wrong = store.wrongQuestions(profile.id);
    const patterns = mistakeFamilies.detectPatterns(wrong, (id) => content.concepts.get(id)?.name || null);

    let insight = null, insightOk = false;
    if (patterns.length) {
      try {
        const r = await ai.mistakePatternInsight(patterns);
        if (r.ok) { insight = r.insight; insightOk = true; }
      } catch { /* fall through to the local note below */ }
      if (!insightOk) insight = localPatternInsight(patterns);
    }
    return { patterns, insight, insightOk };
  });

  /* ---------- AI tutor (online, optional, grounded — §2b) ---------- */

  ipcMain.handle("ai:status", () => {
    let online = true;
    try { online = net.isOnline(); } catch {}
    return { ...ai.getStatus(), online };
  });

  ipcMain.handle("ai:configure", (_e, cfg) => ai.configure(cfg));

  ipcMain.handle("ai:providers", () => ai.providers());

  // Ask Robo — free-form maths tutor. Only the question + grade are sent; never
  // the child's name or history-of-progress. Grade comes from the active profile.
  ipcMain.handle("ai:ask", (_e, { question, history }) => {
    const grade = profile ? profile.grade : 5;
    return ai.askTutor({ question, grade, history });
  });

  // Photo/camera homework solver — OCR + solve/coach on a photographed homework
  // page. Only the photo + grade go to the provider; never the child's name.
  ipcMain.handle("ai:homework", (_e, { imageBase64, mime, mode }) => {
    const grade = profile ? profile.grade : 5;
    return ai.solveHomework({ imageBase64, mime, grade, mode });
  });

  ipcMain.handle("ai:explain", async (_e, { conceptId, style }) => {
    const c = content.concepts.get(conceptId);
    if (!c) return { ok: false, reason: "unknown-concept" };
    return ai.explain(c, style);
  });

  ipcMain.handle("ai:coach", async (_e, { conceptId, questionId, answerGiven, question }) => {
    const c = content.concepts.get(conceptId);
    if (!c) return { ok: false, reason: "unknown-concept" };
    const q = question || allQuestions(c).find((x) => x.id === questionId);
    if (!q) return { ok: false, reason: "unknown-question" };
    const verdict = logic.checkAnswer(q, answerGiven);
    const mistake = verdict.mistakeTag
      ? c.commonMistakes.find((mm) => mm.mistakeTag === verdict.mistakeTag) || null
      : null;
    return ai.coach(c, q, String(answerGiven), mistake);
  });

  // Ask it a different way — same maths question, fresh wording, for a child who's stuck
  // on the PHRASING rather than the maths. The answer/numbers never change.
  ipcMain.handle("ai:rephrase", async (_e, { conceptId, questionId, question }) => {
    const c = content.concepts.get(conceptId);
    if (!c) return { ok: false, reason: "unknown-concept" };
    const q = question || allQuestions(c).find((x) => x.id === questionId);
    if (!q) return { ok: false, reason: "unknown-question" };
    return ai.rephraseQuestion(c, q);
  });

  ipcMain.handle("ai:whyWrong", async (_e, { conceptId, questionId, answerGiven }) => {
    const c = content.concepts.get(conceptId);
    if (!c) return { ok: false, reason: "unknown-concept" };
    const q = allQuestions(c).find((x) => x.id === questionId);
    if (!q) return { ok: false, reason: "unknown-question" };
    const verdict = logic.checkAnswer(q, answerGiven);
    const mistake = verdict.mistakeTag
      ? c.commonMistakes.find((m) => m.mistakeTag === verdict.mistakeTag) || null
      : null;
    return ai.whyWrong(c, q, String(answerGiven), mistake);
  });

  /* ---------- Media (illustrated posters + Sarvam voice, optional) ---------- */
  ipcMain.handle("media:status", () => {
    let online = true;
    try { online = net.isOnline(); } catch {}
    return { ...media.status(), online };
  });
  ipcMain.handle("media:configure", (_e, cfg) => media.configure(cfg));
  ipcMain.handle("image:cached", (_e, p) => media.getCachedImage(p));
  ipcMain.handle("image:generate", async (_e, p) => media.generateImage(p));
  ipcMain.handle("tts:sarvam", async (_e, p) => media.sarvamTTS(p));
  ipcMain.handle("media:clearCache", (_e, what) => media.clearCache(what));

  // ---- Extend the syllabus: create a concept from a topic (parent/teacher) ----
  ipcMain.handle("stt:sarvam", async (_e, p) => media.sarvamTranscribe(p));

  ipcMain.handle("concept:create", async (_e, { topic, grade, language, ground, verify }) => {
    if (!profile || profile.role === "student") return { ok: false, reason: "not-allowed" };
    const res = await ai.generateConcept({ topic, grade: Number.isInteger(grade) ? grade : profile.grade, language, ground: ground !== false, verify: verify !== false });
    if (!res.ok) return res;
    try {
      persistUserConcept(res.concept);
      content.concepts.set(res.concept.id, res.concept);
    } catch { return { ok: false, reason: "save-failed" }; }
    return { ok: true, card: conceptCard(res.concept), grounded: res.grounded || null, verifiedFixed: res.verifiedFixed || 0 };
  });

  ipcMain.handle("concept:listUser", () =>
    [...content.concepts.values()].filter((c) => c.source === "user").map((c) => ({ ...conceptCard(c), whatIsIt: c.whatIsIt })));

  ipcMain.handle("concept:delete", (_e, id) => {
    if (!profile || profile.role === "student") return { ok: false, reason: "not-allowed" };
    const c = content.concepts.get(id);
    if (!c || c.source !== "user") return { ok: false, reason: "not-user-concept" };
    content.concepts.delete(id);
    removeUserConcept(id);
    return { ok: true };
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1000, minHeight: 700,
    title: "FearlessMath",
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // --- Security hardening: this is a self-contained local app, so never let it
  // navigate away from its own page or spawn arbitrary windows. Any genuine
  // external link (e.g. from an AI explanation) opens in the OS browser instead. ---
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    const dev = process.env.ELECTRON_START_URL;
    const allowed = url.startsWith("file://") || (dev && url.startsWith(dev));
    if (!allowed) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {}); }
  });

  const devUrl = process.env.ELECTRON_START_URL;
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  if (process.platform === "win32") app.setAppUserModelId("com.fearlessmath.app");
  store = createStore(path.join(app.getPath("userData"), "data"));
  // Packaged: content packs ship next to the app (updatable independently).
  // Dev: they live in the repo root.
  const packsDir = app.isPackaged
    ? path.join(process.resourcesPath, "content-packs")
    : path.join(__dirname, "..", "content-packs");
  content = loadPacks(packsDir);
  userConceptsDir = path.join(app.getPath("userData"), "user-concepts");
  loadUserConcepts();
  ai.init(path.join(app.getPath("userData"), "ai"));
  media.init(path.join(app.getPath("userData"), "media"));
  registerIpc();
  createWindow();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
