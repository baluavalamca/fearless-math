/**
 * Home — Ganita Grove. Greeting + continue card + class tabs + world menu,
 * with concepts shown as a learning PATH (mastered / current / locked).
 * Content is filtered by the chosen class; the child's own class is default.
 */
import { useEffect, useState } from "react";
import { ConceptCard, Profile } from "../api";
import { Emoji3D } from "../components/ObjectIcon";

const STRAND_THEME: Record<string, { icon: string; name: string; cls: string }> = {
  numbers: { icon: "🌴", name: "Number Jungle", cls: "region-numbers" },
  operations: { icon: "🚜", name: "Operations Farm", cls: "region-operations" },
  fractions: { icon: "🍳", name: "Fraction Kitchen", cls: "region-fractions" },
  geometry: { icon: "🏙️", name: "Geometry City", cls: "region-geometry" },
  measurement: { icon: "🏝️", name: "Measurement Island", cls: "region-measurement" },
  data: { icon: "📰", name: "Data Newsroom", cls: "region-data" },
};
const STRAND_ORDER = ["numbers", "operations", "fractions", "geometry", "measurement", "data"];

const STAGES: { id: string; label: string; sub: string; grades: number[]; badge: string }[] = [
  { id: "foundation", label: "Foundation", sub: "PP1 – Class 2", grades: [0, 1, 2], badge: "🌱" },
  { id: "class3", label: "Class 3", sub: "Getting strong", grades: [3], badge: "3" },
  { id: "class4", label: "Class 4", sub: "Levelling up", grades: [4], badge: "4" },
  { id: "class5", label: "Class 5", sub: "Big ideas", grades: [5], badge: "5" },
  { id: "class6", label: "Class 6", sub: "Middle school", grades: [6], badge: "6" },
  { id: "class7", label: "Class 7", sub: "Middle school", grades: [7], badge: "7" },
  { id: "class8", label: "Class 8 – 9", sub: "Pre-board", grades: [8], badge: "8" },
  { id: "class10", label: "Class 10", sub: "Board year", grades: [9], badge: "10" },
  { id: "class11", label: "Class 11", sub: "Senior secondary", grades: [10], badge: "11" },
  { id: "class12", label: "Class 12", sub: "IIT-JEE foundation", grades: [11], badge: "12" },
];
// Map a learner's class number to the matching stage tab.
const bandOf = (g: number) =>
  g <= 2 ? "foundation" :
  g <= 7 ? "class" + g :          // Classes 3,4,5,6,7 have their own tabs
  g <= 9 ? "class8" :             // Classes 8 & 9 share the Class 8–9 tab
  g === 10 ? "class10" :
  g === 11 ? "class11" : "class12";
const ACTIVE = ["available", "learning", "practicing"];
const statusText = (s: string) =>
  s === "mastered" ? "Mastered ⭐" : s === "learning" ? "Learning" : s === "practicing" ? "Keep practicing" : s === "locked" ? "Locked" : "Ready";

export function WorldMap({
  concepts,
  profile,
  onOpen,
}: {
  concepts: ConceptCard[];
  profile: Profile;
  onOpen: (id: string) => void;
}) {
  const explore = localStorage.getItem("fm_explore") === "1";
  const [stage, setStage] = useState<string>(() => localStorage.getItem("fm_stage") || bandOf(profile.grade));
  const [strand, setStrand] = useState<string>("all");
  const [streak, setStreak] = useState(1);

  useEffect(() => { localStorage.setItem("fm_stage", stage); }, [stage]);
  useEffect(() => { setStrand("all"); }, [stage]);

  useEffect(() => {
    const key = "fm_streak_" + profile.id;
    const today = new Date().toISOString().slice(0, 10);
    let rec: { last: string; count: number } | null = null;
    try { rec = JSON.parse(localStorage.getItem(key) || "null"); } catch { rec = null; }
    let count = 1;
    if (rec) {
      if (rec.last === today) count = rec.count;
      else { const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); count = rec.last === y ? rec.count + 1 : 1; }
    }
    localStorage.setItem(key, JSON.stringify({ last: today, count }));
    setStreak(count);
  }, [profile.id]);

  const mastered = concepts.filter((c) => c.status === "mastered").length;
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const ordered = [...concepts].sort((a, b) => a.grade - b.grade || a.id.localeCompare(b.id));
  const lastId = localStorage.getItem("fm_last_" + profile.id) || "";
  let cont = byId.get(lastId);
  if (!cont || cont.status === "locked") cont = ordered.find((c) => ACTIVE.includes(c.status));

  const stageDef = STAGES.find((s) => s.id === stage) ?? STAGES[0];
  const inStage = ordered.filter((c) => stageDef.grades.includes(c.grade));
  const worldsHere = STRAND_ORDER.filter((s) => inStage.some((c) => c.strand === s));
  const currentId = inStage.find((c) => ACTIVE.includes(c.status))?.id;

  const stageStats = (grades: number[]) => {
    const cs = concepts.filter((c) => grades.includes(c.grade));
    return { m: cs.filter((c) => c.status === "mastered").length, t: cs.length };
  };

  function node(c: ConceptCard) {
    const locked = c.status === "locked" && !explore;
    const isCur = c.id === currentId;
    const dot = c.status === "mastered" ? "⭐" : locked ? "🔒" : isCur ? "▶" : "•";
    return (
      <button key={c.id} className={`fm-node ${c.status} ${isCur ? "current" : ""}`} disabled={locked} onClick={() => onOpen(c.id)}>
        <span className="fm-node-dot">{dot}</span>
        <span className="fm-node-body">
          <span className="fm-node-name">{c.name}</span>
          <span className="fm-node-status">{isCur ? "You're here — let's go!" : statusText(c.status)}</span>
        </span>
        {isCur && <span className="fm-node-start">Start</span>}
      </button>
    );
  }

  const shownWorlds = strand === "all" ? worldsHere : [strand];

  return (
    <div className="fm-worldmap">
      <div className="fm-hero">
        <span className="fm-hero-fox"><Emoji3D char="🦊" size={38} /></span>
        <div className="fm-hero-text">
          <div className="fm-hero-hi">Hi {profile.name}! Ready for some maths?</div>
          <div className="fm-hero-sub">Mistakes are welcome here — let's keep going.</div>
        </div>
        <div className="fm-hero-stats">
          <div className="fm-stat"><b>⭐ {mastered}</b><span>mastered</span></div>
          <div className="fm-stat"><b>🔥 {streak}</b><span>day streak</span></div>
        </div>
      </div>

      {cont && (
        <button className="fm-continue" onClick={() => onOpen(cont!.id)}>
          <span className="fm-continue-ic">▶</span>
          <span className="fm-continue-body">
            <span className="fm-continue-lbl">{byId.get(lastId) && lastId === cont.id ? "Continue where you left off" : "Up next"}</span>
            <span className="fm-continue-name">{cont.name} · {STRAND_THEME[cont.strand]?.name ?? cont.strand}</span>
          </span>
          <span className="fm-continue-go">Go</span>
        </button>
      )}

      <div className="fm-stage-tabs" role="tablist" aria-label="Choose class">
        {STAGES.map((s) => {
          const p = stageStats(s.grades);
          return (
            <button key={s.id} role="tab" aria-selected={stage === s.id}
              className={`fm-stage-tab ${stage === s.id ? "active" : ""}`} onClick={() => setStage(s.id)}>
              <span className="fm-stage-label">
                <span className={`fm-numbadge${/^\d+$/.test(s.badge) ? "" : " emoji"}`}>{s.badge}</span>
                {s.label}
              </span>
              <span className="fm-stage-sub">{s.sub}</span>
              <span className="fm-stage-prog">⭐ {p.m}/{p.t}</span>
            </button>
          );
        })}
      </div>

      <nav className="fm-world-menu" aria-label="Choose world">
        <button className={strand === "all" ? "active" : ""} onClick={() => setStrand("all")}>
          <Emoji3D char="🗺️" size={20} /> All worlds
        </button>
        {worldsHere.map((s) => (
          <button key={s} className={strand === s ? "active" : ""} onClick={() => setStrand(s)}>
            {STRAND_THEME[s]
              ? <><Emoji3D char={STRAND_THEME[s].icon} size={20} /> {STRAND_THEME[s].name}</>
              : s}
          </button>
        ))}
      </nav>

      {shownWorlds.map((s) => {
        const items = inStage.filter((c) => c.strand === s);
        if (!items.length) return null;
        const theme = STRAND_THEME[s] ?? { icon: "", name: s, cls: "" };
        return (
          <section key={s} className={`fm-region ${theme.cls}`}>
            <h2 className="fm-region-title"><Emoji3D char={theme.icon} size={30} /> {theme.name}</h2>
            <div className="fm-path-trail">{items.map(node)}</div>
          </section>
        );
      })}
      {inStage.length === 0 && <p className="fm-empty">No stops in this class yet.</p>}
    </div>
  );
}
