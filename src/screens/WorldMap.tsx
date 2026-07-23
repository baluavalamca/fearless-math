/**
 * Home — Ganita Grove. Two levels:
 *   1. HOME  = greeting + continue + SEARCH + a grid of CLASS cards.
 *   2. CLASS = the chosen class's concepts, shown either as the guided PATH
 *              (the original roadmap — unlock rules unchanged) or as a MIND MAP
 *              (free choice: pick any concept to learn).
 * Search and the mind map let the learner jump to ANY concept; the Path view
 * keeps the prerequisite roadmap exactly as before. The lesson flow (onOpen ->
 * LessonPlayer) is untouched.
 */
import { useEffect, useMemo, useState } from "react";
import { ConceptCard, Profile } from "../api";
import { Emoji3D } from "../components/ObjectIcon";
import { GameHud } from "../components/GameHud";
import { MATH_FACTS, LangKey, factText } from "../data/mathFacts";

/** Deep-dive label per language for the 🔬 icon and the home teaser. */
const DEEP_LABEL: Record<LangKey, string> = { en: "Explore with Robo", hi: "रोबो के साथ खोजें", te: "రోబోతో అన్వేషించు" };
const FACT_TEASER: Record<LangKey, { did: string; more: string }> = {
  en: { did: "Did you know?", more: "More fun facts →" },
  hi: { did: "क्या तुम जानते हो?", more: "और मज़ेदार तथ्य →" },
  te: { did: "నీకు తెలుసా?", more: "మరిన్ని సరదా వాస్తవాలు →" },
};

// `name` = the real maths topic (shown as the primary label so it's clear, not generic).
// `world` = the playful theme name, kept as a small subtitle for kid-friendly flavour.
const STRAND_THEME: Record<string, { icon: string; name: string; world: string; cls: string }> = {
  numbers: { icon: "🌴", name: "Numbers & Algebra", world: "Number Jungle", cls: "region-numbers" },
  operations: { icon: "🚜", name: "Operations", world: "Operations Farm", cls: "region-operations" },
  fractions: { icon: "🍳", name: "Fractions & Decimals", world: "Fraction Kitchen", cls: "region-fractions" },
  geometry: { icon: "🏙️", name: "Geometry & Trigonometry", world: "Geometry City", cls: "region-geometry" },
  measurement: { icon: "🏝️", name: "Measurement", world: "Measurement Island", cls: "region-measurement" },
  data: { icon: "📰", name: "Data & Probability", world: "Data Newsroom", cls: "region-data" },
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
  { id: "aptitude", label: "Aptitude", sub: "Competitive exams", grades: [12], badge: "🎯" },
];
// Map a learner's class number to the matching stage tab.
const bandOf = (g: number) =>
  g <= 2 ? "foundation" :
  g <= 7 ? "class" + g :
  g <= 9 ? "class8" :
  g === 10 ? "class10" :
  g === 11 ? "class11" : "class12";
const ACTIVE = ["available", "learning", "practicing"];
const statusText = (s: string) =>
  s === "mastered" ? "Mastered ⭐" : s === "learning" ? "Learning" : s === "practicing" ? "Keep practicing" : s === "locked" ? "Locked" : "Ready";
const statusDot = (s: string) => (s === "mastered" ? "⭐" : s === "locked" ? "🔒" : ACTIVE.includes(s) ? "•" : "•");

/** Animate a number from 0 up to target (ease-out). Respects reduced-motion. */
function useCountUp(target: number, ms = 700) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(target); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

export function WorldMap({
  concepts,
  profile,
  onOpen,
  onDeepDive,
  onFacts,
  lang = "en",
}: {
  concepts: ConceptCard[];
  profile: Profile;
  onOpen: (id: string) => void;
  /** Deep-dive: hand this concept to Ask Robo to explore it further. */
  onDeepDive?: (id: string, name: string) => void;
  /** Open the Fun Facts screen (from the home teaser). */
  onFacts?: () => void;
  lang?: LangKey;
}) {
  const explore = localStorage.getItem("fm_explore") === "1";
  const [view, setView] = useState<"home" | "class">("home");
  const [mode, setMode] = useState<"path" | "mind">("path");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>(() => localStorage.getItem("fm_stage") || bandOf(profile.grade));
  const [strand, setStrand] = useState<string>("all");
  const [streak, setStreak] = useState(1);

  useEffect(() => { localStorage.setItem("fm_stage", stage); }, [stage]);

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

  // One random fun fact for the home teaser (fresh each time the home mounts).
  const teaser = useMemo(() => MATH_FACTS[Math.floor(Math.random() * MATH_FACTS.length)], []);

  const mastered = concepts.filter((c) => c.status === "mastered").length;
  const mCount = useCountUp(mastered);
  const sCount = useCountUp(streak);
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const ordered = [...concepts].sort((a, b) => a.grade - b.grade || a.id.localeCompare(b.id));
  const lastId = localStorage.getItem("fm_last_" + profile.id) || "";
  let cont = byId.get(lastId);
  if (!cont || cont.status === "locked") cont = ordered.find((c) => ACTIVE.includes(c.status));

  const stageStats = (grades: number[]) => {
    const cs = concepts.filter((c) => grades.includes(c.grade));
    return { m: cs.filter((c) => c.status === "mastered").length, t: cs.length };
  };
  const stageLabelOf = (g: number) => STAGES.find((s) => s.grades.includes(g))?.label ?? "";

  function openClass(id: string) { setStage(id); setStrand("all"); setMode("path"); setView("class"); }

  // ---- SEARCH (global, across every class) ----
  const q = query.trim().toLowerCase();
  const results = q
    ? ordered.filter((c) => c.name.toLowerCase().includes(q) || (STRAND_THEME[c.strand]?.name.toLowerCase().includes(q))).slice(0, 40)
    : [];

  const stageDef = STAGES.find((s) => s.id === stage) ?? STAGES[0];
  const inStage = ordered.filter((c) => stageDef.grades.includes(c.grade));
  const worldsHere = STRAND_ORDER.filter((s) => inStage.some((c) => c.strand === s));
  const currentId = inStage.find((c) => ACTIVE.includes(c.status))?.id;
  const shownWorlds = strand === "all" ? worldsHere : [strand];

  // Small 🔬 deep-dive icon — sibling button (never nested) that sends the concept to Ask Robo.
  const deepBtn = (c: ConceptCard) =>
    onDeepDive ? (
      <button
        className="fm-deepdive"
        onClick={(e) => { e.stopPropagation(); onDeepDive(c.id, c.name); }}
        title={DEEP_LABEL[lang]}
        aria-label={`${DEEP_LABEL[lang]}: ${c.name}`}
      >🔬</button>
    ) : null;

  // Guided PATH node (keeps unlock rules — locked stays disabled).
  function pathNode(c: ConceptCard) {
    const locked = c.status === "locked" && !explore;
    const isCur = c.id === currentId;
    const dot = c.status === "mastered" ? "⭐" : locked ? "🔒" : isCur ? "▶" : "•";
    return (
      <div key={c.id} className="fm-node-wrap">
        <button className={`fm-node ${c.status} ${isCur ? "current" : ""}`} disabled={locked} onClick={() => onOpen(c.id)}>
          <span className="fm-node-dot">{dot}</span>
          <span className="fm-node-body">
            <span className="fm-node-name">{c.name}</span>
            <span className="fm-node-status">{isCur ? "You're here — let's go!" : statusText(c.status)}</span>
          </span>
          {isCur && <span className="fm-node-start">Start</span>}
        </button>
        {deepBtn(c)}
      </div>
    );
  }

  // Free-choice leaf (mind map + search) — any concept can be opened.
  function leaf(c: ConceptCard) {
    return (
      <div key={c.id} className="fm-mm-leaf-wrap">
        <button className={`fm-mm-leaf ${c.status}`} onClick={() => onOpen(c.id)} title={c.name}>
          <span className="fm-mm-leaf-dot">{statusDot(c.status)}</span>
          <span className="fm-mm-leaf-name">{c.name}</span>
        </button>
        {deepBtn(c)}
      </div>
    );
  }

  return (
    <div className="fm-worldmap">
      <div className="fm-hero">
        <span className="fm-hero-fox"><Emoji3D char="🦊" size={38} /></span>
        <div className="fm-hero-text">
          <div className="fm-hero-hi">Hi {profile.name}! Ready for some maths?</div>
          <div className="fm-hero-sub">Mistakes are welcome here — let's keep going.</div>
        </div>
        <div className="fm-hero-stats">
          <div className="fm-stat"><b>⭐ {mCount}</b><span>mastered</span></div>
          <div className="fm-stat"><b>🔥 {sCount}</b><span>day streak</span></div>
        </div>
      </div>

      {cont && view === "home" && !q && (
        <button className="fm-continue" onClick={() => onOpen(cont!.id)}>
          <span className="fm-continue-ic">▶</span>
          <span className="fm-continue-body">
            <span className="fm-continue-lbl">{byId.get(lastId) && lastId === cont.id ? "Continue where you left off" : "Up next"}</span>
            <span className="fm-continue-name">{cont.name} · {STRAND_THEME[cont.strand]?.name ?? cont.strand}</span>
          </span>
          <span className="fm-continue-go">Go</span>
        </button>
      )}

      {view === "home" && !q && <GameHud concepts={concepts} streak={streak} />}

      {view === "home" && !q && onFacts && (
        <button className="fm-fact-teaser" onClick={onFacts} title={FACT_TEASER[lang].more}>
          <span className="fm-fact-teaser-ic">💡</span>
          <span className="fm-fact-teaser-body">
            <span className="fm-fact-teaser-lbl">{FACT_TEASER[lang].did}</span>
            <span className="fm-fact-teaser-text">{factText(teaser, lang)}</span>
          </span>
          <span className="fm-fact-teaser-go">{FACT_TEASER[lang].more}</span>
        </button>
      )}

      {/* -------- SEARCH (always available, above the classes) -------- */}
      <div className="fm-search-wrap">
        <span className="fm-search-ic">🔍</span>
        <input
          className="fm-search-input"
          value={query}
          placeholder="Search any concept — e.g. Pythagoras, fractions, percentages…"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search concepts"
        />
        {query && <button className="fm-search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>}
      </div>

      {q ? (
        <div className="fm-search-results">
          <p className="fm-search-count">{results.length ? `${results.length} concept${results.length > 1 ? "s" : ""} found — tap one to learn it` : "No concepts match that. Try another word."}</p>
          {results.map((c) => (
            <div key={c.id} className="fm-search-item-wrap">
              <button className={`fm-search-item ${c.status}`} onClick={() => onOpen(c.id)}>
                <span className="fm-search-item-dot">{statusDot(c.status)}</span>
                <span className="fm-search-item-body">
                  <span className="fm-search-item-name">{c.name}</span>
                  <span className="fm-search-item-meta">{stageLabelOf(c.grade)} · {STRAND_THEME[c.strand]?.name ?? c.strand}</span>
                </span>
                <span className="fm-search-item-go">{statusText(c.status)}</span>
              </button>
              {deepBtn(c)}
            </div>
          ))}
        </div>
      ) : view === "home" ? (
        /* -------- HOME: grid of class cards -------- */
        <>
          <h2 className="fm-section-title">Pick a class</h2>
          <div className="fm-class-grid">
            {STAGES.map((s) => {
              const p = stageStats(s.grades);
              const mine = bandOf(profile.grade) === s.id;
              return (
                <button key={s.id} className={`fm-class-card ${mine ? "mine" : ""}`} onClick={() => openClass(s.id)}>
                  <span className={`fm-class-badge${/^\d+$/.test(s.badge) ? "" : " emoji"}`}>{s.badge}</span>
                  <span className="fm-class-info">
                    <span className="fm-class-label">{s.label}{mine && <span className="fm-class-mine">You</span>}</span>
                    <span className="fm-class-sub">{s.sub}</span>
                    <span className="fm-class-prog">
                      <span className="fm-class-bar"><span style={{ width: `${p.t ? (p.m / p.t) * 100 : 0}%` }} /></span>
                      ⭐ {p.m}/{p.t}
                    </span>
                  </span>
                  <span className="fm-class-arrow">→</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* -------- CLASS: concepts of the chosen class -------- */
        <>
          <div className="fm-class-head">
            <button className="fm-back-btn" onClick={() => setView("home")}>← All classes</button>
            <div className="fm-class-head-title">
              <span className={`fm-class-badge${/^\d+$/.test(stageDef.badge) ? "" : " emoji"}`}>{stageDef.badge}</span>
              <span><b>{stageDef.label}</b> · {stageDef.sub}</span>
            </div>
            <div className="fm-view-toggle" role="tablist" aria-label="View">
              <button className={mode === "path" ? "on" : ""} onClick={() => setMode("path")}>🗺️ Path</button>
              <button className={mode === "mind" ? "on" : ""} onClick={() => setMode("mind")}>🧠 Mind map</button>
            </div>
          </div>

          <p className="fm-world-menu-label">Jump to a topic in {stageDef.label}:</p>
          <nav className="fm-world-menu" aria-label="Filter by topic">
            <button className={strand === "all" ? "active" : ""} onClick={() => setStrand("all")}>
              <Emoji3D char="🗺️" size={20} /> All topics
            </button>
            {worldsHere.map((s) => (
              <button key={s} className={strand === s ? "active" : ""} onClick={() => setStrand(s)}
                title={STRAND_THEME[s] ? `${STRAND_THEME[s].name} · ${STRAND_THEME[s].world}` : s}>
                {STRAND_THEME[s] ? <><Emoji3D char={STRAND_THEME[s].icon} size={20} /> {STRAND_THEME[s].name}</> : s}
              </button>
            ))}
          </nav>

          {inStage.length === 0 && <p className="fm-empty">No stops in this class yet.</p>}

          {mode === "path" ? (
            /* Guided roadmap — UNCHANGED behaviour */
            shownWorlds.map((s) => {
              const items = inStage.filter((c) => c.strand === s);
              if (!items.length) return null;
              const theme = STRAND_THEME[s] ?? { icon: "", name: s, world: "", cls: "" };
              return (
                <section key={s} className={`fm-region ${theme.cls}`}>
                  <h2 className="fm-region-title">
                    <Emoji3D char={theme.icon} size={30} /> {theme.name}
                    {theme.world && <span className="fm-region-world">{theme.world}</span>}
                  </h2>
                  <div className="fm-path-trail">{items.map(pathNode)}</div>
                </section>
              );
            })
          ) : (
            /* Mind map — free choice, pick any concept */
            <div className="fm-mindmap">
              <p className="fm-mm-hint">🧠 Your choice — tap any concept to jump straight in.</p>
              <div className="fm-mm-canvas">
                <div className="fm-mm-root"><Emoji3D char="🦊" size={22} /> {stageDef.label}</div>
                <div className="fm-mm-branches">
                  {shownWorlds.map((s) => {
                    const items = inStage.filter((c) => c.strand === s);
                    if (!items.length) return null;
                    const theme = STRAND_THEME[s] ?? { icon: "", name: s, world: "", cls: "" };
                    return (
                      <div key={s} className={`fm-mm-branch ${theme.cls}`}>
                        <div className="fm-mm-strand"><Emoji3D char={theme.icon} size={18} /> {theme.name} <span className="fm-mm-count">{items.length}</span></div>
                        <div className="fm-mm-leaves">{items.map(leaf)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
