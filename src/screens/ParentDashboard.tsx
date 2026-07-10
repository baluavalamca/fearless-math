/**
 * Parent Dashboard — PIN-gated. Mastery overview, accuracy, effort,
 * revision schedule, badges, and "how to help at home" tips.
 * Default PIN: 1234 (changeable below; stored locally on this computer).
 */
import { useEffect, useState } from "react";
import { AiStatus, DashboardData, MediaStatus, MediaConfig, api } from "../api";
import { refreshVoiceStatus } from "../speech";
import { CreateLesson } from "./CreateLesson";

const PIN_KEY = "fm_parent_pin";
const getPin = () => localStorage.getItem(PIN_KEY) || "1234";

const STATUS_LABEL: Record<string, string> = {
  "not-started": "⬜ Not started",
  locked: "🔒 Locked",
  available: "🌱 Ready",
  learning: "📖 Learning",
  practicing: "✏️ Practicing",
  mastered: "⭐ Mastered",
};

export function ParentDashboard({ autoUnlock = false }: { autoUnlock?: boolean }) {
  const [unlocked, setUnlocked] = useState(autoUnlock);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [newPin, setNewPin] = useState("");
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [aiKey, setAiKey] = useState("");
  const [aiSaved, setAiSaved] = useState(false);
  const [media, setMedia] = useState<MediaStatus | null>(null);
  const [imgKey, setImgKey] = useState("");
  const [voiceKey, setVoiceKey] = useState("");
  const [mediaMsg, setMediaMsg] = useState<string | null>(null);
  const bridgeReady = typeof api.mediaConfigure === "function";

  useEffect(() => {
    if (unlocked) {
      api.getDashboard().then(setData);
      api.aiStatus().then(setAi).catch(() => setAi(null));
      api.mediaStatus().then(setMedia).catch(() => setMedia(null));
    }
  }, [unlocked]);

  async function saveAi(patch: { enabled?: boolean; provider?: string; apiKey?: string }) {
    const s = await api.aiConfigure(patch);
    setAi({ ...s, online: ai?.online ?? true });
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  }

  async function saveMedia(patch: MediaConfig) {
    if (!bridgeReady) {
      setMediaMsg("These new settings need a full app restart. Please close FearlessMath completely and open it again (a page reload isn’t enough).");
      return;
    }
    try {
      const s = await api.mediaConfigure(patch);
      setMedia(s);
      setMediaMsg(null);
      refreshVoiceStatus(); // let the speak() layer pick up the new voice choice
    } catch {
      setMediaMsg("Couldn’t save — please fully close and reopen the app, then try again.");
    }
  }

  async function clearMediaCache() {
    if (!bridgeReady) { setMediaMsg("Please fully restart the app first."); return; }
    const r = await api.mediaClearCache("all");
    setMediaMsg(r.ok ? `Cleared ${r.removed} saved file(s).` : "Nothing to clear.");
  }

  if (!unlocked) {
    return (
      <div className="fm-pin-gate">
        <h1>👨‍👩‍👧 Parents' Corner</h1>
        <p>Enter the parent PIN (default is 1234):</p>
        <div className="fm-answer-row" style={{ maxWidth: 340, margin: "0 auto" }}>
          <input
            className="fm-input" type="password" value={pinInput} maxLength={6}
            placeholder="PIN" autoFocus
            onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
            onKeyDown={(e) => e.key === "Enter" && (pinInput === getPin() ? setUnlocked(true) : setPinError(true))}
          />
          <button className="fm-primary" onClick={() => (pinInput === getPin() ? setUnlocked(true) : setPinError(true))}>
            Open
          </button>
        </div>
        {pinError && <p className="fm-pin-error">That's not it — try again.</p>}
      </div>
    );
  }

  if (!data) return <div className="fm-loading">Preparing the report…</div>;

  const started = data.concepts.filter((c) => c.attempts > 0 || c.status === "mastered");
  const mastered = data.concepts.filter((c) => c.status === "mastered").length;
  const dueRevisions = data.concepts.filter(
    (c) => c.nextRevisionAt && new Date(c.nextRevisionAt) <= new Date()
  );

  return (
    <div className="fm-dashboard">
      <h1>👨‍👩‍👧 {data.profile.name}'s Progress</h1>
      <div className="fm-dash-summary">
        <div className="fm-dash-stat"><strong>{mastered}</strong><span>concepts mastered</span></div>
        <div className="fm-dash-stat"><strong>{started.length}</strong><span>concepts started</span></div>
        <div className="fm-dash-stat"><strong>{data.badges.length}</strong><span>badges earned</span></div>
        <div className="fm-dash-stat"><strong>{dueRevisions.length}</strong><span>revisions due</span></div>
      </div>

      {dueRevisions.length > 0 && (
        <p className="fm-callout">
          🔔 Memory boosters due: {dueRevisions.map((c) => c.name).join(", ")}. A 5-minute revisit keeps mastery strong!
        </p>
      )}

      <h2>✏️ Create a lesson (extend the syllabus)</h2>
      <CreateLesson />

      <h2>Concept map</h2>
      <table className="fm-dash-table">
        <thead>
          <tr><th>Concept</th><th>Status</th><th>Accuracy</th><th>Tries</th><th>Hints</th></tr>
        </thead>
        <tbody>
          {data.concepts.map((c) => {
            const acc = c.attempts ? Math.round((c.correct / c.attempts) * 100) : null;
            return (
              <tr key={c.id}>
                <td>{c.name}<div className="fm-dash-strand">{c.strand} · Class {c.grade}</div></td>
                <td>{STATUS_LABEL[c.status] ?? c.status}</td>
                <td>
                  {acc === null ? "—" : (
                    <div className="fm-acc">
                      <div className="fm-acc-bar"><div style={{ width: `${acc}%` }} className={acc >= 70 ? "hi" : "lo"} /></div>
                      <span>{acc}%</span>
                    </div>
                  )}
                </td>
                <td>{c.attempts || "—"}</td>
                <td>{c.hints || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="fm-dash-note">
        Hints are GOOD — they mean your child asked for help instead of giving up. Never scold hint usage.
      </p>

      {data.tips.length > 0 && (
        <>
          <h2>How to help at home</h2>
          {data.tips.map((t) => (
            <div key={t.concept} className="fm-callout">
              <strong>{t.concept}</strong>
              {t.homeTip && <p>🏠 Try together: {t.homeTip}</p>}
              {t.fixes.map((f, i) => <p key={i}>💡 {f}</p>)}
            </div>
          ))}
        </>
      )}

      <h2>Badges</h2>
      <div className="fm-badge-row">
        {data.badges.length
          ? data.badges.map((b) => <span key={b.badge_id} className="fm-badge">🏅 {b.badge_id.replace(/-/g, " ")}</span>)
          : <span>No badges yet — they'll come!</span>}
      </div>

      <h2>AI Tutor (online, optional)</h2>
      <div className="fm-ai-settings">
        <p className="fm-dash-note">
          When enabled, Robo Reason can rephrase lessons and explain mistakes using an online AI —
          always grounded in the verified lesson content, with math answers coming only from the
          built-in answer keys. Only lesson content and the current question are ever sent — never
          your child's name or history. Your API key is stored encrypted on this computer.
        </p>
        <label className="fm-ai-toggle">
          <input
            type="checkbox"
            checked={!!ai?.enabled}
            onChange={(e) => saveAi({ enabled: e.target.checked })}
          />{" "}
          Enable AI Tutor
        </label>
        <div className="fm-answer-row" style={{ maxWidth: 560 }}>
          <select
            className="fm-input" style={{ maxWidth: 160 }}
            value={ai?.provider ?? "anthropic"}
            onChange={(e) => saveAi({ provider: e.target.value })}
          >
            <option value="anthropic">Claude (Anthropic)</option>
            <option value="openai">OpenAI</option>
          </select>
          <input
            className="fm-input" type="password"
            placeholder={ai?.hasKey ? "API key saved ✓ (paste to replace)" : "Paste your API key"}
            value={aiKey} onChange={(e) => setAiKey(e.target.value)}
          />
          <button className="fm-secondary" disabled={!aiKey} onClick={() => { saveAi({ apiKey: aiKey }); setAiKey(""); }}>
            Save key
          </button>
        </div>
        <p className="fm-dash-note">
          Status: {ai?.enabled ? "enabled" : "disabled"} · key {ai?.hasKey ? "saved" : "not set"} ·
          {ai?.online ? " online" : " offline (AI buttons hide automatically)"}
          {aiSaved && " · saved ✓"}
        </p>
      </div>

      {!bridgeReady && (
        <p className="fm-gate-msg" style={{ maxWidth: 640 }}>
          ⚠️ A recent update added Picture posters and Sarvam voice. Please <strong>fully close and
          reopen FearlessMath</strong> (not just reload) so these settings can be saved.
        </p>
      )}
      {mediaMsg && <p className="fm-gate-msg" style={{ maxWidth: 640 }}>{mediaMsg}</p>}

      <h2>✨ Picture posters (online, optional)</h2>
      <div className="fm-ai-settings">
        <p className="fm-dash-note">
          When enabled, a “✨ Picture it” button appears on stories and concepts. It creates a
          colourful illustrated poster with OpenAI’s image model and <strong>saves it on this
          computer</strong>, so the same concept shows the same picture instantly next time — it is
          never re-generated unless you ask. Your API key is stored encrypted here.
        </p>
        <label className="fm-ai-toggle">
          <input type="checkbox" checked={!!media?.image.enabled}
            onChange={(e) => saveMedia({ image: { enabled: e.target.checked } })} /> Enable picture posters
        </label>
        <div className="fm-answer-row" style={{ maxWidth: 560 }}>
          <input className="fm-input" type="password"
            placeholder={media?.image.hasKey ? "OpenAI key saved ✓ (paste to replace)" : "Paste your OpenAI API key"}
            value={imgKey} onChange={(e) => setImgKey(e.target.value)} />
          <button className="fm-secondary" disabled={!imgKey} onClick={() => { saveMedia({ image: { apiKey: imgKey } }); setImgKey(""); }}>
            Save key
          </button>
        </div>
        <div className="fm-answer-row" style={{ maxWidth: 560 }}>
          <label style={{ alignSelf: "center", color: "#6a5636" }}>Model &amp; quality:</label>
          <select className="fm-input" style={{ maxWidth: 180 }}
            value={media?.image.model ?? "gpt-image-2"}
            onChange={(e) => saveMedia({ image: { model: e.target.value } })}>
            <option value="gpt-image-2">gpt-image-2 (newest)</option>
            <option value="gpt-image-1.5">gpt-image-1.5</option>
            <option value="gpt-image-1">gpt-image-1</option>
          </select>
          <select className="fm-input" style={{ maxWidth: 140 }}
            value={media?.image.quality ?? "high"}
            onChange={(e) => saveMedia({ image: { quality: e.target.value } })}>
            <option value="high">High quality</option>
            <option value="medium">Medium</option>
            <option value="low">Low (cheapest)</option>
          </select>
        </div>
        <p className="fm-dash-note">
          Status: {media?.image.enabled ? "enabled" : "disabled"} · key {media?.image.hasKey ? "saved" : "not set"} ·
          {media?.online ? " online" : " offline (Picture-it hides automatically)"}
        </p>
        <button className="fm-secondary" disabled={!bridgeReady} onClick={clearMediaCache}>
          Clear saved pictures &amp; voice
        </button>
      </div>

      <h2>🔊 Voice readout</h2>
      <div className="fm-ai-settings">
        <p className="fm-dash-note">
          Choose the reading voice. <strong>Built-in</strong> works offline using your computer’s
          voice. <strong>Sarvam AI</strong> gives a warmer, natural Indian voice (needs a Sarvam key
          and internet); it automatically falls back to the built-in voice if offline.
        </p>
        <div className="fm-answer-row" style={{ maxWidth: 560 }}>
          <select className="fm-input" style={{ maxWidth: 200 }}
            value={media?.voice.provider ?? "browser"}
            onChange={(e) => saveMedia({ voice: { provider: e.target.value } })}>
            <option value="browser">Built-in (offline)</option>
            <option value="sarvam">Sarvam AI (Indian voice)</option>
          </select>
          <input className="fm-input" type="password"
            placeholder={media?.voice.hasKey ? "Sarvam key saved ✓ (paste to replace)" : "Paste your Sarvam API key"}
            value={voiceKey} onChange={(e) => setVoiceKey(e.target.value)} />
          <button className="fm-secondary" disabled={!voiceKey} onClick={() => { saveMedia({ voice: { apiKey: voiceKey } }); setVoiceKey(""); }}>
            Save key
          </button>
        </div>
        {media?.voice.provider === "sarvam" && (
          <div className="fm-answer-row" style={{ maxWidth: 560 }}>
            <label style={{ alignSelf: "center", color: "#6a5636" }}>Voice (bulbul:v3):</label>
            <select className="fm-input" style={{ maxWidth: 220 }}
              value={media?.voice.speaker ?? "priya"}
              onChange={(e) => saveMedia({ voice: { speaker: e.target.value } })}>
              <option value="priya">Priya — warm girl (teacher)</option>
              <option value="kavya">Kavya — bright girl</option>
              <option value="shreya">Shreya — gentle girl</option>
              <option value="pooja">Pooja — cheerful girl</option>
              <option value="ritu">Ritu — calm girl</option>
              <option value="shubh">Shubh — friendly boy</option>
            </select>
          </div>
        )}
        <p className="fm-dash-note">
          Voice: {media?.voice.provider === "sarvam" ? `Sarvam AI (${media?.voice.speaker})` : "Built-in"} · key {media?.voice.hasKey ? "saved" : "not set"} ·
          Stories are read slowly and expressively; concepts clearly — like a teacher.
        </p>
      </div>

      <h2>Settings</h2>
      <label className="fm-ai-toggle">
        <input
          type="checkbox"
          defaultChecked={localStorage.getItem("fm_explore") === "1"}
          onChange={(e) => localStorage.setItem("fm_explore", e.target.checked ? "1" : "0")}
        />{" "}
        Explorer mode — locked concepts become previewable (🔍) so parents/teachers can review
        all content. Turn OFF before handing the app to your child, so the learning path stays guided.
      </label>
      <label className="fm-ai-toggle">
        <input
          type="checkbox"
          defaultChecked={localStorage.getItem("fm_skin") === "playful"}
          onChange={(e) => {
            const on = e.target.checked;
            localStorage.setItem("fm_skin", on ? "playful" : "classic");
            document.body.classList.toggle("skin-playful", on);
            if (on) localStorage.setItem("fm_autoread", "1"); // audio-first for little ones
          }}
        />{" "}
        Playful skin (PP1–Class 2) — bigger buttons and text, and voice read-aloud turns ON so the
        youngest learners can play by listening. Best paired with the Little Sprouts stops.
      </label>
      <div className="fm-answer-row" style={{ maxWidth: 380 }}>
        <input
          className="fm-input" type="password" maxLength={6} placeholder="New PIN"
          value={newPin} onChange={(e) => setNewPin(e.target.value)}
        />
        <button
          className="fm-secondary" disabled={newPin.length < 4}
          onClick={() => { localStorage.setItem(PIN_KEY, newPin); setNewPin(""); }}
        >
          Change PIN
        </button>
      </div>
    </div>
  );
}
