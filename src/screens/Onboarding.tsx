/**
 * Login / onboarding: pick an existing user, or create one with role,
 * name, class and age. Data is saved locally (per profile) so multiple
 * children/teachers/parents can each keep their own progress.
 */
import { useEffect, useState } from "react";
import { Profile, api } from "../api";

const ROLES = [
  { id: "student", label: "🧒 Student", sub: "I want to learn" },
  { id: "parent", label: "👪 Parent", sub: "For my child" },
  { id: "teacher", label: "🍎 Teacher", sub: "For my class" },
];
const CLASSES = [
  { label: "PP1", grade: 0 }, { label: "Class 1", grade: 1 }, { label: "Class 2", grade: 2 },
  { label: "Class 3", grade: 3 }, { label: "Class 4", grade: 4 }, { label: "Class 5", grade: 5 },
];

const roleLabel = (r: string) => (r === "parent" ? "Parent" : r === "teacher" ? "Teacher" : "Student");
const classLabel = (g: number) => (g <= 2 ? ["PP1", "Class 1", "Class 2"][g] : "Class " + g);

export function Onboarding({ onReady }: { onReady: (p: Profile) => void }) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [mode, setMode] = useState<"pick" | "new">("new");
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [age, setAge] = useState("");

  useEffect(() => {
    api.listProfiles().then((ps) => { setProfiles(ps); setMode(ps.length ? "pick" : "new"); });
  }, []);

  async function pick(id: number) { onReady(await api.setActiveProfile(id)); }
  async function create() {
    if (!name.trim() || grade == null) return;
    onReady(await api.createProfile({ name: name.trim(), role, grade, age: age ? Number(age) : null }));
  }

  if (profiles === null) return <div className="fm-loading">Loading…</div>;

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
                <button key={p.id} className="fm-profile-pick" onClick={() => pick(p.id)}>
                  <span className="fm-profile-av">🦊</span>
                  <span className="fm-profile-nm">{p.name}</span>
                  <span className="fm-profile-meta">{roleLabel(p.role)} · {classLabel(p.grade)}</span>
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
            <div className="fm-choice-row wrap">
              {CLASSES.map((c) => (
                <button key={c.grade} className={`fm-chip-choice ${grade === c.grade ? "active" : ""}`} onClick={() => setGrade(c.grade)}>
                  {c.label}
                </button>
              ))}
            </div>

            <label className="fm-field-label">Age (optional)</label>
            <input className="fm-input" type="number" min={3} max={18} value={age} placeholder="Age"
              onChange={(e) => setAge(e.target.value)} style={{ maxWidth: 120 }} />

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
