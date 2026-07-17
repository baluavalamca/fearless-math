/**
 * Login / onboarding: pick an existing user (with an optional 6-digit PIN a
 * parent set), or create one with role, name, class (grouped PP1 → Class 12),
 * age, and — for kids — an optional login PIN. Data is saved locally per profile.
 */
import { useEffect, useState } from "react";
import { Profile, api } from "../api";

const ROLES = [
  { id: "student", label: "🧒 Student", sub: "I want to learn" },
  { id: "parent", label: "👪 Parent", sub: "For my child" },
  { id: "teacher", label: "🍎 Teacher", sub: "For my class" },
];

/** Classes grouped by band so the whole PP1 → Class 12 ladder is selectable. */
const CLASS_GROUPS: { band: string; sub: string; items: { label: string; grade: number }[] }[] = [
  { band: "🌱 Foundation", sub: "Ages 3–7", items: [{ label: "PP1", grade: 0 }, { label: "Class 1", grade: 1 }, { label: "Class 2", grade: 2 }] },
  { band: "🚀 Primary", sub: "Ages 8–10", items: [{ label: "Class 3", grade: 3 }, { label: "Class 4", grade: 4 }, { label: "Class 5", grade: 5 }] },
  { band: "🏙️ Middle", sub: "Ages 11–13", items: [{ label: "Class 6", grade: 6 }, { label: "Class 7", grade: 7 }, { label: "Class 8", grade: 8 }] },
  { band: "🎯 Secondary", sub: "Ages 14–15", items: [{ label: "Class 9", grade: 8 }, { label: "Class 10", grade: 9 }] },
  { band: "🎓 Senior", sub: "Ages 16–17", items: [{ label: "Class 11", grade: 10 }, { label: "Class 12", grade: 11 }] },
];
const gradeLabel = (g: number) => {
  for (const grp of CLASS_GROUPS) { const it = grp.items.find((i) => i.grade === g); if (it) return it.label; }
  return "Class " + g;
};
const roleLabel = (r: string) => (r === "parent" ? "Parent" : r === "teacher" ? "Teacher" : "Student");

export function Onboarding({ onReady }: { onReady: (p: Profile) => void }) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [mode, setMode] = useState<"pick" | "new">("new");
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [clsLabel, setClsLabel] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [pin, setPin] = useState("");

  // PIN login gate for kid profiles
  const [pinFor, setPinFor] = useState<Profile | null>(null);
  const [pinTry, setPinTry] = useState("");
  const [pinErr, setPinErr] = useState(false);

  useEffect(() => {
    api.listProfiles().then((ps) => { setProfiles(ps); setMode(ps.length ? "pick" : "new"); });
  }, []);

  async function enter(id: number) { onReady(await api.setActiveProfile(id)); }
  function pick(p: Profile) {
    if (p.hasPin) { setPinFor(p); setPinTry(""); setPinErr(false); }
    else enter(p.id);
  }
  async function submitPin() {
    if (!pinFor) return;
    const ok = await api.verifyPin(pinFor.id, pinTry);
    if (ok) enter(pinFor.id);
    else { setPinErr(true); setPinTry(""); }
  }
  async function create() {
    if (!name.trim() || grade == null) return;
    onReady(await api.createProfile({
      name: name.trim(), role, grade, age: age ? Number(age) : null,
      pin: role === "student" && pin.length >= 4 ? pin : undefined,
    }));
  }

  if (profiles === null) return <div className="fm-loading">Loading…</div>;

  // ---- PIN entry for a locked kid profile ----
  if (pinFor) {
    return (
      <div className="fm-onboard">
        <div className="fm-onboard-card">
          <div className="fm-onboard-logo">🔒</div>
          <h1>Hi {pinFor.name}!</h1>
          <p className="fm-sub">Type your 6-digit PIN to start learning.</p>
          <input className="fm-input" type="password" inputMode="numeric" maxLength={6} autoFocus
            value={pinTry} placeholder="• • • • • •"
            style={{ textAlign: "center", letterSpacing: ".4em", fontSize: 22 }}
            onChange={(e) => { setPinTry(e.target.value.replace(/\D/g, "")); setPinErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && pinTry.length >= 4 && submitPin()} />
          {pinErr && <p className="fm-pin-error">That's not the right PIN — try again.</p>}
          <div className="fm-onboard-actions">
            <button className="fm-secondary" onClick={() => setPinFor(null)}>← Back</button>
            <button className="fm-primary" disabled={pinTry.length < 4} onClick={submitPin}>Let's go →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fm-onboard">
      <div className="fm-onboard-card">
        <div className="fm-onboard-logo">🦊</div>
        <h1>FearlessMath</h1>

        {mode === "pick" ? (
          <>
            <p className="fm-sub">Who's learning today?</p>
            <div className="fm-profile-grid">
              {profiles.map((p) => (
                <button key={p.id} className="fm-profile-pick" onClick={() => pick(p)}>
                  <span className="fm-profile-av">{p.hasPin ? "🔒" : "🦊"}</span>
                  <span className="fm-profile-nm">{p.name}</span>
                  <span className="fm-profile-meta">{roleLabel(p.role)} · {gradeLabel(p.grade)}</span>
                </button>
              ))}
              <button className="fm-profile-pick add" onClick={() => setMode("new")}>
                <span className="fm-profile-av">＋</span>
                <span className="fm-profile-nm">Add user</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="fm-sub">Let's set up your profile.</p>

            <label className="fm-field-label">I am a…</label>
            <div className="fm-choice-row">
              {ROLES.map((r) => (
                <button key={r.id} className={`fm-choice ${role === r.id ? "active" : ""}`} onClick={() => setRole(r.id)}>
                  <b>{r.label}</b><span>{r.sub}</span>
                </button>
              ))}
            </div>

            <label className="fm-field-label">Name</label>
            <input className="fm-input" value={name} placeholder="Your name" onChange={(e) => setName(e.target.value)} />

            <label className="fm-field-label">Class</label>
            <div className="fm-class-groups">
              {CLASS_GROUPS.map((grp) => (
                <div className="fm-class-group" key={grp.band}>
                  <div className="fm-class-group-head">{grp.band} <span>{grp.sub}</span></div>
                  <div className="fm-choice-row wrap">
                    {grp.items.map((c) => (
                      <button key={c.label}
                        className={`fm-chip-choice ${clsLabel === c.label ? "active" : ""}`}
                        onClick={() => { setClsLabel(c.label); setGrade(c.grade); }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <label className="fm-field-label">Age (optional)</label>
            <input className="fm-input" type="number" min={3} max={18} value={age} placeholder="Age"
              onChange={(e) => setAge(e.target.value)} style={{ maxWidth: 120 }} />

            {role === "student" && (
              <>
                <label className="fm-field-label">Login PIN (optional)</label>
                <input className="fm-input" type="password" inputMode="numeric" maxLength={6}
                  value={pin} placeholder="4–6 digit PIN for this child"
                  style={{ maxWidth: 240, letterSpacing: ".2em" }}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
                <p className="fm-sub" style={{ fontSize: 12.5, marginTop: 4 }}>
                  If set, this child types this PIN to log in. Parents can change it later in Parents' Corner.
                </p>
              </>
            )}

            <div className="fm-onboard-actions">
              {profiles.length > 0 && <button className="fm-secondary" onClick={() => setMode("pick")}>← Back</button>}
              <button className="fm-primary" disabled={!name.trim() || grade == null} onClick={create}>Start learning →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
