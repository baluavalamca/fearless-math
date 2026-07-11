/**
 * Parent Dashboard — PIN-gated. Mastery overview, accuracy, effort,
 * revision schedule, badges, and "how to help at home" tips.
 * Default PIN: 1234 (changeable below; stored locally on this computer).
 */
import { useEffect, useState, type ReactNode } from "react";
import { AiStatus, DashboardData, MediaStatus, MediaConfig, ProviderInfo, api } from "../api";
import { refreshVoiceStatus } from "../speech";
import { CreateLesson } from "./CreateLesson";

const FALLBACK_PROVIDERS: ProviderInfo[] = [
  { id: "anthropic", label: "Claude (Anthropic)", kind: "anthropic", defaultModel: "claude-haiku-4-5", models: ["claude-haiku-4-5", "claude-sonnet-5"] },
  { id: "openai", label: "OpenAI (GPT)", kind: "openai", defaultModel: "gpt-4o-mini", models: ["gpt-4o-mini", "gpt-4o"] },
];

const classLabel = (g: number) => (g <= 2 ? "🌱 Foundation (PP1–Class 2)" : `Class ${g}`);

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

/** iOS-style toggle switch built from a checkbox (reuses theme tokens). */
function Switch({ checked, defaultChecked, onChange }: {
  checked?: boolean; defaultChecked?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="fm-switch">
      <input type="checkbox" checked={checked} defaultChecked={defaultChecked}
        onChange={(e) => onChange(e.target.checked)} />
      <span className="fm-switch-track"><span className="fm-switch-thumb" /></span>
    </label>
  );
}

/** Titled glass section card with an icon chip. */
function Section({ icon, title, sub, children }: {
  icon: string; title: string; sub?: string; children: ReactNode;
}) {
  return (
    <section className="fm-pcard">
      <div className="fm-pcard-head">
        <span className="fm-pcard-ic">{icon}</span>
        <div><h2 className="fm-pcard-h">{title}</h2>{sub && <p className="fm-pcard-sub">{sub}</p>}</div>
      </div>
      {children}
    </section>
  );
}

export function ParentDashboard({ autoUnlock = false }: { autoUnlock?: boolean }) {
  const [unlocked, setUnlocked] = useState(autoUnlock);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [newPin, setNewPin] = useState("");
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [aiKey, setAiKey] = useState("");
  const [aiSaved, setAiSaved] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [customModel, setCustomModel] = useState(false);
  const [modelInput, setModelInput] = useState("");
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
      if (typeof api.aiProviders === "function") {
        api.aiProviders().then(setProviders).catch(() => setProviders(FALLBACK_PROVIDERS));
      } else {
        setProviders(FALLBACK_PROVIDERS);
      }
    }
  }, [unlocked]);

  async function saveAi(patch: { enabled?: boolean; provider?: string; apiKey?: string; model?: string }) {
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
        <div className="fm-pin-card">
          <div className="fm-pin-ic">🔐</div>
          <h1>Parents' Corner</h1>
          <p className="fm-dash-sub">Enter the parent PIN to view progress and settings (default is 1234).</p>
          <div className="fm-key-row" style={{ maxWidth: 320, margin: "10px auto 0" }}>
            <input
              className="fm-input" type="password" value={pinInput} maxLength={6}
              placeholder="PIN" autoFocus style={{ textAlign: "center", letterSpacing: "0.3em" }}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={(e) => e.key === "Enter" && (pinInput === getPin() ? setUnlocked(true) : setPinError(true))}
            />
            <button className="fm-primary" onClick={() => (pinInput === getPin() ? setUnlocked(true) : setPinError(true))}>
              Open
            </button>
          </div>
          {pinError && <p className="fm-pin-error">That's not it — try again.</p>}
        </div>
      </div>
    );
  }

  if (!data) return <div className="fm-loading">Preparing the report…</div>;

  const started = data.concepts.filter((c) => c.attempts > 0 || c.status === "mastered");
  const mastered = data.concepts.filter((c) => c.status === "mastered").length;
  const dueRevisions = data.concepts.filter(
    (c) => c.nextRevisionAt && new Date(c.nextRevisionAt) <= new Date()
  );

  // Group the concept map by class for collapsible panels.
  const classGroups = (() => {
    const m = new Map<string, { label: string; order: number; items: typeof data.concepts }>();
    for (const c of data.concepts) {
      const key = c.grade <= 2 ? "foundation" : "c" + c.grade;
      if (!m.has(key)) m.set(key, { label: classLabel(c.grade), order: c.grade <= 2 ? 0 : c.grade, items: [] });
      m.get(key)!.items.push(c);
    }
    return [...m.values()].sort((a, b) => a.order - b.order);
  })();

  const provList = providers.length ? providers : FALLBACK_PROVIDERS;
  const curProv = provList.find((p) => p.id === (ai?.provider ?? "anthropic")) ?? provList[0];
  const curModel = ai?.model ?? "";
  const aiOn = !!ai?.enabled, aiKeyed = !!ai?.hasKey, aiOnline = ai?.online !== false;

  return (
    <div className="fm-dashboard">
      <header className="fm-dash-header">
        <div className="fm-pcard-ic fm-dash-avatar">👨‍👩‍👧</div>
        <div>
          <h1>{data.profile.name}'s Progress</h1>
          <p className="fm-dash-sub">A calm, honest snapshot of how learning is going — plus the controls to tailor it.</p>
        </div>
      </header>

      <div className="fm-kpi-grid">
        <div className="fm-kpi"><span className="fm-kpi-ic">⭐</span><div><b>{mastered}</b><span>concepts mastered</span></div></div>
        <div className="fm-kpi"><span className="fm-kpi-ic">📚</span><div><b>{started.length}</b><span>concepts started</span></div></div>
        <div className="fm-kpi"><span className="fm-kpi-ic">🏅</span><div><b>{data.badges.length}</b><span>badges earned</span></div></div>
        <div className="fm-kpi"><span className="fm-kpi-ic">🔔</span><div><b>{dueRevisions.length}</b><span>revisions due</span></div></div>
      </div>

      {dueRevisions.length > 0 && (
        <p className="fm-callout">
          🔔 Memory boosters due: {dueRevisions.map((c) => c.name).join(", ")}. A 5-minute revisit keeps mastery strong!
        </p>
      )}

      <Section icon="✏️" title="Create a lesson" sub="Extend the syllabus with a new AI-authored, verified lesson.">
        <CreateLesson />
      </Section>

      <Section icon="🗺️" title="Concept map" sub="Progress by class — tap a class to expand its lessons.">
        {classGroups.map((grp, gi) => {
          const gMastered = grp.items.filter((c) => c.status === "mastered").length;
          const gAtt = grp.items.reduce((s, c) => s + c.attempts, 0);
          const gCor = grp.items.reduce((s, c) => s + c.correct, 0);
          const gAcc = gAtt ? Math.round((gCor / gAtt) * 100) : null;
          const pct = Math.round((gMastered / grp.items.length) * 100);
          return (
            <details className="fm-class-panel" key={grp.label} open={gi === 0}>
              <summary>
                <span className="fm-class-title">{grp.label}</span>
                <span className="fm-class-meta">
                  ⭐ {gMastered}/{grp.items.length} mastered{gAcc !== null ? ` · ${gAcc}% accuracy` : ""}
                </span>
                <span className="fm-class-bar"><i style={{ width: `${pct}%` }} /></span>
              </summary>
              <table className="fm-dash-table">
                <thead>
                  <tr><th>Concept</th><th>Status</th><th>Accuracy</th><th>Tries</th><th>Hints</th></tr>
                </thead>
                <tbody>
                  {grp.items.map((c) => {
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
            </details>
          );
        })}
        <p className="fm-dash-note">
          Hints are GOOD — they mean your child asked for help instead of giving up. Never scold hint usage.
        </p>
      </Section>

      {data.tips.length > 0 && (
        <Section icon="🏠" title="How to help at home" sub="Gentle, specific things to try together.">
          {data.tips.map((t) => (
            <div key={t.concept} className="fm-callout">
              <strong>{t.concept}</strong>
              {t.homeTip && <p>🏠 Try together: {t.homeTip}</p>}
              {t.fixes.map((f, i) => <p key={i}>💡 {f}</p>)}
            </div>
          ))}
        </Section>
      )}

      <Section icon="🏅" title="Badges" sub="Milestones your child has earned.">
        <div className="fm-badge-row">
          {data.badges.length
            ? data.badges.map((b) => <span key={b.badge_id} className="fm-badge">🏅 {b.badge_id.replace(/-/g, " ")}</span>)
            : <span className="fm-dash-note">No badges yet — they'll come!</span>}
        </div>
      </Section>

      <Section icon="🤖" title="AI Tutor" sub="Online, optional. Grounded in verified lessons; math answers come only from built-in keys.">
        <div className="fm-setting">
          <div className="fm-setting-txt">
            <b>Enable AI Tutor</b>
            <span>Robo Reason can rephrase lessons and explain mistakes. Only lesson content and the current question are ever sent — never your child's name or history. Keys are stored encrypted on this computer.</span>
          </div>
          <Switch checked={aiOn} onChange={(v) => saveAi({ enabled: v })} />
        </div>

        <div className="fm-field">
          <label>Provider &amp; API key</label>
          <div className="fm-key-row">
            <select className="fm-input fm-w-provider"
              value={ai?.provider ?? "anthropic"}
              onChange={(e) => { saveAi({ provider: e.target.value, model: "" }); setCustomModel(false); }}>
              {provList.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <input className="fm-input" type="password"
              placeholder={aiKeyed ? "API key saved ✓ (paste to replace)" : "Paste your API key"}
              value={aiKey} onChange={(e) => setAiKey(e.target.value)} />
            <button className="fm-secondary" disabled={!aiKey} onClick={() => { saveAi({ apiKey: aiKey }); setAiKey(""); }}>Save</button>
          </div>
          {curProv?.keyHint && <p className="fm-dash-note" style={{ margin: 0 }}>Get a {curProv.label} key at {curProv.keyHint}.</p>}
        </div>

        <div className="fm-field">
          <label>Model</label>
          <div className="fm-key-row">
            <select className="fm-input fm-w-model"
              value={customModel ? "__custom" : curModel}
              onChange={(e) => {
                if (e.target.value === "__custom") { setCustomModel(true); setModelInput(curModel || (curProv?.defaultModel ?? "")); }
                else { setCustomModel(false); saveAi({ model: e.target.value }); }
              }}>
              <option value="">Provider default{curProv ? ` (${curProv.defaultModel})` : ""}</option>
              {curProv?.models.map((m) => <option key={m} value={m}>{m}</option>)}
              <option value="__custom">Custom model…</option>
            </select>
            {customModel && (
              <>
                <input className="fm-input" placeholder="exact model id, e.g. gpt-5.6"
                  value={modelInput} onChange={(e) => setModelInput(e.target.value)} />
                <button className="fm-secondary" disabled={!modelInput.trim()} onClick={() => saveAi({ model: modelInput.trim() })}>Set</button>
              </>
            )}
          </div>
        </div>

        <div className="fm-pill-row">
          <span className={`fm-pill ${aiOn ? "on" : "off"}`}>{aiOn ? "● Enabled" : "○ Disabled"}</span>
          <span className={`fm-pill ${aiKeyed ? "on" : "off"}`}>{aiKeyed ? "Key saved" : "No key"}</span>
          <span className={`fm-pill ${aiOnline ? "on" : "warn"}`}>{aiOnline ? "Online" : "Offline"}</span>
          <span className="fm-pill">Model: {ai?.effectiveModel ?? curProv?.defaultModel}{ai?.model ? "" : " (default)"}</span>
          {aiSaved && <span className="fm-pill on">Saved ✓</span>}
        </div>
      </Section>

      {!bridgeReady && (
        <p className="fm-gate-msg" style={{ maxWidth: 640 }}>
          ⚠️ Picture posters and Sarvam voice need a full restart. Please <strong>fully close and reopen FearlessMath</strong> (not just reload) so these settings can be saved.
        </p>
      )}
      {mediaMsg && <p className="fm-gate-msg" style={{ maxWidth: 640 }}>{mediaMsg}</p>}

      <Section icon="✨" title="Picture posters" sub="Online, optional. Illustrated posters saved on this computer and reused instantly.">
        <div className="fm-setting">
          <div className="fm-setting-txt">
            <b>Enable picture posters</b>
            <span>A “✨ Picture it” button appears on stories and concepts. Images are cached locally and never re-generated unless you ask.</span>
          </div>
          <Switch checked={!!media?.image.enabled} onChange={(v) => saveMedia({ image: { enabled: v } })} />
        </div>
        <div className="fm-field">
          <label>OpenAI API key</label>
          <div className="fm-key-row">
            <input className="fm-input" type="password"
              placeholder={media?.image.hasKey ? "OpenAI key saved ✓ (paste to replace)" : "Paste your OpenAI API key"}
              value={imgKey} onChange={(e) => setImgKey(e.target.value)} />
            <button className="fm-secondary" disabled={!imgKey} onClick={() => { saveMedia({ image: { apiKey: imgKey } }); setImgKey(""); }}>Save</button>
          </div>
        </div>
        <div className="fm-field">
          <label>Model &amp; quality</label>
          <div className="fm-key-row">
            <select className="fm-input fm-w-model" value={media?.image.model ?? "gpt-image-2"}
              onChange={(e) => saveMedia({ image: { model: e.target.value } })}>
              <option value="gpt-image-2">gpt-image-2 (newest)</option>
              <option value="gpt-image-1.5">gpt-image-1.5</option>
              <option value="gpt-image-1">gpt-image-1</option>
            </select>
            <select className="fm-input fm-w-qual" value={media?.image.quality ?? "high"}
              onChange={(e) => saveMedia({ image: { quality: e.target.value } })}>
              <option value="high">High quality</option>
              <option value="medium">Medium</option>
              <option value="low">Low (cheapest)</option>
            </select>
          </div>
        </div>
        <div className="fm-pill-row">
          <span className={`fm-pill ${media?.image.enabled ? "on" : "off"}`}>{media?.image.enabled ? "● Enabled" : "○ Disabled"}</span>
          <span className={`fm-pill ${media?.image.hasKey ? "on" : "off"}`}>{media?.image.hasKey ? "Key saved" : "No key"}</span>
          <span className={`fm-pill ${media?.online ? "on" : "warn"}`}>{media?.online ? "Online" : "Offline"}</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="fm-secondary" disabled={!bridgeReady} onClick={clearMediaCache}>Clear saved pictures &amp; voice</button>
        </div>
      </Section>

      <Section icon="🔊" title="Voice readout" sub="Built-in works offline; Sarvam AI gives a warm Indian voice (falls back automatically).">
        <div className="fm-field">
          <label>Voice provider &amp; key</label>
          <div className="fm-key-row">
            <select className="fm-input fm-w-provider" value={media?.voice.provider ?? "browser"}
              onChange={(e) => saveMedia({ voice: { provider: e.target.value } })}>
              <option value="browser">Built-in (offline)</option>
              <option value="sarvam">Sarvam AI (Indian voice)</option>
            </select>
            <input className="fm-input" type="password"
              placeholder={media?.voice.hasKey ? "Sarvam key saved ✓ (paste to replace)" : "Paste your Sarvam API key"}
              value={voiceKey} onChange={(e) => setVoiceKey(e.target.value)} />
            <button className="fm-secondary" disabled={!voiceKey} onClick={() => { saveMedia({ voice: { apiKey: voiceKey } }); setVoiceKey(""); }}>Save</button>
          </div>
        </div>
        {media?.voice.provider === "sarvam" && (
          <div className="fm-field">
            <label>Voice (bulbul:v3)</label>
            <select className="fm-input fm-w-model" value={media?.voice.speaker ?? "priya"}
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
        <div className="fm-pill-row">
          <span className="fm-pill on">{media?.voice.provider === "sarvam" ? `Sarvam (${media?.voice.speaker})` : "Built-in"}</span>
          <span className={`fm-pill ${media?.voice.hasKey ? "on" : "off"}`}>{media?.voice.hasKey ? "Key saved" : "No key"}</span>
        </div>
      </Section>

      <Section icon="⚙️" title="App settings" sub="Guardrails and the parent PIN.">
        <div className="fm-setting">
          <div className="fm-setting-txt">
            <b>Explorer mode</b>
            <span>Locked concepts become previewable (🔍) so you can review all content. Turn OFF before handing the app to your child, so the learning path stays guided.</span>
          </div>
          <Switch defaultChecked={localStorage.getItem("fm_explore") === "1"}
            onChange={(v) => localStorage.setItem("fm_explore", v ? "1" : "0")} />
        </div>
        <div className="fm-setting">
          <div className="fm-setting-txt">
            <b>Playful skin (PP1–Class 2)</b>
            <span>Bigger buttons and text, and voice read-aloud turns ON so the youngest learners can play by listening. Best paired with the Little Sprouts stops.</span>
          </div>
          <Switch defaultChecked={localStorage.getItem("fm_skin") === "playful"}
            onChange={(v) => {
              localStorage.setItem("fm_skin", v ? "playful" : "classic");
              document.body.classList.toggle("skin-playful", v);
              if (v) localStorage.setItem("fm_autoread", "1"); // audio-first for little ones
            }} />
        </div>
        <div className="fm-field">
          <label>Change parent PIN</label>
          <div className="fm-key-row">
            <input className="fm-input fm-w-pin" type="password" maxLength={6} placeholder="New PIN"
              value={newPin} onChange={(e) => setNewPin(e.target.value)} />
            <button className="fm-secondary" disabled={newPin.length < 4}
              onClick={() => { localStorage.setItem(PIN_KEY, newPin); setNewPin(""); }}>Change PIN</button>
          </div>
        </div>
      </Section>
    </div>
  );
}
