const { app, BrowserWindow, ipcMain, net, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { createStore } = require("./db");
const { loadPacks, conceptCard } = require("./contentLoader");
const logic = require("./logic");
const ai = require("./aiService");
const media = require("./mediaService");

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

function registerIpc() {
  function activeProfile() {
    const all = store.listProfiles();
    const id = store.getActiveProfileId();
    if (id == null) { if (all.length) { store.setActiveProfile(all[0].id); return all[0]; } return null; }
    return all.find((p) => p.id === id) || all[0] || null;
  }
  let profile = activeProfile();

  // Never leak the raw PIN to the renderer — expose only whether one is set.
  const pub = (p) => { if (!p) return p; const { pin, ...rest } = p; return { ...rest, hasPin: !!pin }; };

  ipcMain.handle("profile:get", () => pub(profile));
  ipcMain.handle("profiles:list", () => store.listProfiles().map(pub));
  ipcMain.handle("profiles:active", () => pub(profile) || null);
  ipcMain.handle("profiles:create", (_e, data) => { profile = store.createProfile(data); return pub(profile); });
  ipcMain.handle("profiles:setActive", (_e, id) => { store.setActiveProfile(id); profile = store.listProfiles().find((p) => p.id === id) || profile; return pub(profile); });
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
    const unlocked = new Set(logic.unlockedConcepts(all, mastered));
    const progress = new Map(store.getProgress(profile.id).map((p) => [p.concept_id, p]));
    return all.map((c) => ({
      ...conceptCard(c),
      status: progress.get(c.id)?.status
        || (unlocked.has(c.id) ? "available" : "locked"),
    }));
  });

  ipcMain.handle("concepts:get", (_e, conceptId) => {
    const c = content.concepts.get(conceptId);
    if (!c) throw new Error("Unknown concept: " + conceptId);
    return c;
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
    if (result.status === "mastered") {
      const masteredAt = new Date().toISOString();
      store.upsertProgress(profile.id, conceptId, {
        status: "mastered", mastery_score: result.score,
        teach_back_done: true, mastered_at: masteredAt,
        next_revision_at: logic.nextRevisionAt(c, masteredAt, 0),
      });
      store.awardBadge(profile.id, "explained-it");
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
