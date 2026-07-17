/**
 * Storage layer. Prefers better-sqlite3; falls back to a JSON file store
 * with the same API so the app runs even before native modules compile.
 */
const path = require("path");
const fs = require("fs");

function createStore(userDataDir) {
  fs.mkdirSync(userDataDir, { recursive: true });
  try {
    const Database = require("better-sqlite3");
    return sqliteStore(new Database(path.join(userDataDir, "fearlessmath.db")));
  } catch {
    console.warn("[db] better-sqlite3 unavailable — using JSON fallback store");
    return jsonStore(path.join(userDataDir, "fearlessmath.json"));
  }
}

/* ---------------- SQLite ---------------- */
function sqliteStore(db) {
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles(
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      role TEXT DEFAULT 'student', grade INTEGER NOT NULL, age INTEGER,
      avatar TEXT DEFAULT 'fox', created_at TEXT);
    CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS concept_progress(
      profile_id INTEGER, concept_id TEXT, status TEXT DEFAULT 'available',
      mastery_score REAL, teach_back_done INTEGER DEFAULT 0,
      reviews_done INTEGER DEFAULT 0, mastered_at TEXT,
      last_activity TEXT, next_revision_at TEXT,
      PRIMARY KEY(profile_id, concept_id));
    CREATE TABLE IF NOT EXISTS attempts(
      id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER,
      concept_id TEXT, question_id TEXT, context TEXT,
      correct INTEGER, hints_used INTEGER, answer_given TEXT,
      mistake_tag TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS badges(
      profile_id INTEGER, badge_id TEXT, earned_at TEXT,
      PRIMARY KEY(profile_id, badge_id));
  `);
  for (const col of ["role TEXT DEFAULT 'student'", "age INTEGER", "pin TEXT"]) {
    try { db.exec(`ALTER TABLE profiles ADD COLUMN ${col}`); } catch {}
  }
  return {
    kind: "sqlite",
    setPin(id, pin) { db.prepare("UPDATE profiles SET pin=? WHERE id=?").run(pin || null, id); return db.prepare("SELECT * FROM profiles WHERE id=?").get(id); },
    verifyPin(id, pin) { const r = db.prepare("SELECT pin FROM profiles WHERE id=?").get(id); return !r || !r.pin ? true : String(r.pin) === String(pin); },
    getOrCreateDefaultProfile() {
      let p = db.prepare("SELECT * FROM profiles ORDER BY id LIMIT 1").get();
      if (!p) {
        const info = db.prepare("INSERT INTO profiles(name, grade, created_at) VALUES(?,?,?)")
          .run("Learner", 3, new Date().toISOString());
        p = db.prepare("SELECT * FROM profiles WHERE id=?").get(info.lastInsertRowid);
      }
      return p;
    },
    listProfiles() { return db.prepare("SELECT * FROM profiles ORDER BY id").all(); },
    createProfile(p) {
      const info = db.prepare("INSERT INTO profiles(name, role, grade, age, avatar, pin, created_at) VALUES(?,?,?,?,?,?,?)")
        .run(p.name, p.role || "student", p.grade, p.age ?? null, p.avatar || "fox", p.pin || null, new Date().toISOString());
      db.prepare("INSERT INTO meta(key,value) VALUES('active_profile',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(info.lastInsertRowid));
      return db.prepare("SELECT * FROM profiles WHERE id=?").get(info.lastInsertRowid);
    },
    getActiveProfileId() {
      const r = db.prepare("SELECT value FROM meta WHERE key='active_profile'").get();
      return r ? Number(r.value) : null;
    },
    setActiveProfile(id) {
      db.prepare("INSERT INTO meta(key,value) VALUES('active_profile',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(id));
    },
    getProgress(profileId) {
      return db.prepare("SELECT * FROM concept_progress WHERE profile_id=?").all(profileId);
    },
    upsertProgress(profileId, conceptId, patch) {
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO concept_progress(profile_id, concept_id, last_activity) VALUES(?,?,?)
        ON CONFLICT(profile_id, concept_id) DO NOTHING`).run(profileId, conceptId, now);
      const cur = db.prepare("SELECT * FROM concept_progress WHERE profile_id=? AND concept_id=?").get(profileId, conceptId);
      const next = { ...cur, ...patch, last_activity: now };
      db.prepare(`UPDATE concept_progress SET status=?, mastery_score=?, teach_back_done=?,
        reviews_done=?, mastered_at=?, last_activity=?, next_revision_at=?
        WHERE profile_id=? AND concept_id=?`)
        .run(next.status, next.mastery_score, next.teach_back_done ? 1 : 0,
          next.reviews_done || 0, next.mastered_at, next.last_activity,
          next.next_revision_at, profileId, conceptId);
      return next;
    },
    recordAttempt(a) {
      db.prepare(`INSERT INTO attempts(profile_id, concept_id, question_id, context, correct,
        hints_used, answer_given, mistake_tag, created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
        .run(a.profileId, a.conceptId, a.questionId, a.context, a.correct ? 1 : 0,
          a.hintsUsed || 0, a.answerGiven, a.mistakeTag, new Date().toISOString());
    },
    masteryAttempts(profileId, conceptId) {
      return db.prepare(`SELECT question_id AS questionId, MAX(correct) AS correct FROM attempts
        WHERE profile_id=? AND concept_id=? AND context='mastery' GROUP BY question_id`)
        .all(profileId, conceptId).map((r) => ({ ...r, correct: !!r.correct }));
    },
    awardBadge(profileId, badgeId) {
      db.prepare("INSERT OR IGNORE INTO badges(profile_id, badge_id, earned_at) VALUES(?,?,?)")
        .run(profileId, badgeId, new Date().toISOString());
    },
    badges(profileId) {
      return db.prepare("SELECT * FROM badges WHERE profile_id=?").all(profileId);
    },
    /** Questions the child has attempted but never yet answered correctly. */
    wrongQuestions(profileId) {
      return db.prepare(`
        SELECT concept_id AS conceptId, question_id AS questionId,
               COUNT(*) AS tries, MAX(correct) AS everCorrect,
               (SELECT mistake_tag FROM attempts a2
                 WHERE a2.profile_id = a.profile_id AND a2.concept_id = a.concept_id
                   AND a2.question_id = a.question_id AND a2.correct = 0
                 ORDER BY a2.id DESC LIMIT 1) AS lastMistakeTag
        FROM attempts a WHERE profile_id = ?
        GROUP BY concept_id, question_id HAVING everCorrect = 0
      `).all(profileId).map((r) => ({ ...r, everCorrect: undefined }));
    },
    /** Per-concept attempt aggregates for the parent dashboard. */
    stats(profileId) {
      return db.prepare(`
        SELECT concept_id AS conceptId, COUNT(*) AS attempts,
               SUM(correct) AS correct, SUM(hints_used) AS hints
        FROM attempts WHERE profile_id = ? GROUP BY concept_id
      `).all(profileId);
    },
  };
}

/* ---------------- JSON fallback (same API) ---------------- */
function jsonStore(file) {
  const load = () => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8"))
    : { profiles: [], progress: [], attempts: [], badges: [] });
  const save = (d) => fs.writeFileSync(file, JSON.stringify(d, null, 2));
  return {
    kind: "json",
    getOrCreateDefaultProfile() {
      const d = load();
      if (!d.profiles.length) {
        d.profiles.push({ id: 1, name: "Learner", grade: 3, avatar: "fox", created_at: new Date().toISOString() });
        save(d);
      }
      return d.profiles[0];
    },
    listProfiles() { return load().profiles; },
    createProfile(p) {
      const d = load();
      const id = (d.profiles.reduce((m, x) => Math.max(m, x.id), 0) || 0) + 1;
      const row = { id, name: p.name, role: p.role || "student", grade: p.grade, age: p.age ?? null, avatar: p.avatar || "fox", pin: p.pin || null, created_at: new Date().toISOString() };
      d.profiles.push(row); d.meta = d.meta || {}; d.meta.active_profile = id; save(d);
      return row;
    },
    setPin(id, pin) { const d = load(); const r = d.profiles.find((x) => x.id === id); if (r) { r.pin = pin || null; save(d); } return r; },
    verifyPin(id, pin) { const r = load().profiles.find((x) => x.id === id); return !r || !r.pin ? true : String(r.pin) === String(pin); },
    getActiveProfileId() { const d = load(); return d.meta && d.meta.active_profile != null ? d.meta.active_profile : null; },
    setActiveProfile(id) { const d = load(); d.meta = d.meta || {}; d.meta.active_profile = id; save(d); },
    getProgress(pid) { return load().progress.filter((p) => p.profile_id === pid); },
    upsertProgress(pid, cid, patch) {
      const d = load();
      let row = d.progress.find((p) => p.profile_id === pid && p.concept_id === cid);
      if (!row) { row = { profile_id: pid, concept_id: cid, status: "available", reviews_done: 0 }; d.progress.push(row); }
      Object.assign(row, patch, { last_activity: new Date().toISOString() });
      save(d); return row;
    },
    recordAttempt(a) {
      const d = load();
      d.attempts.push({ ...a, created_at: new Date().toISOString() });
      save(d);
    },
    masteryAttempts(pid, cid) {
      const best = new Map();
      for (const a of load().attempts)
        if (a.profileId === pid && a.conceptId === cid && a.context === "mastery")
          best.set(a.questionId, best.get(a.questionId) || a.correct);
      return [...best].map(([questionId, correct]) => ({ questionId, correct }));
    },
    awardBadge(pid, bid) {
      const d = load();
      if (!d.badges.find((b) => b.profile_id === pid && b.badge_id === bid)) {
        d.badges.push({ profile_id: pid, badge_id: bid, earned_at: new Date().toISOString() });
        save(d);
      }
    },
    badges(pid) { return load().badges.filter((b) => b.profile_id === pid); },
    wrongQuestions(pid) {
      const groups = new Map(); // key -> {conceptId, questionId, tries, everCorrect, lastMistakeTag}
      for (const a of load().attempts) {
        if (a.profileId !== pid) continue;
        const key = a.conceptId + "|" + a.questionId;
        const g = groups.get(key) || { conceptId: a.conceptId, questionId: a.questionId, tries: 0, everCorrect: false, lastMistakeTag: null };
        g.tries++;
        if (a.correct) g.everCorrect = true;
        else g.lastMistakeTag = a.mistakeTag || g.lastMistakeTag;
        groups.set(key, g);
      }
      return [...groups.values()].filter((g) => !g.everCorrect)
        .map(({ everCorrect, ...rest }) => rest);
    },
    stats(pid) {
      const byConcept = new Map();
      for (const a of load().attempts) {
        if (a.profileId !== pid) continue;
        const s = byConcept.get(a.conceptId) || { conceptId: a.conceptId, attempts: 0, correct: 0, hints: 0 };
        s.attempts++;
        s.correct += a.correct ? 1 : 0;
        s.hints += a.hintsUsed || 0;
        byConcept.set(a.conceptId, s);
      }
      return [...byConcept.values()];
    },
  };
}

module.exports = { createStore };
