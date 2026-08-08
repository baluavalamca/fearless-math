/**
 * Formula Book — every key formula in the app, in one browsable, searchable place.
 * Aggregated at runtime from each concept's `formulas` field (see concepts:listFormulas
 * in electron/main.js) rather than hand-duplicated, so it's always in sync with the
 * lesson content and grows automatically as new concepts add formulas. Follows the
 * Algorithms/Tips & Tricks screens' native pattern: category chips, search, and cards
 * grouped by topic — reusing the exact `.fm-formula-card` styling from LessonPlayer's
 * "Formulas to know" tab so a formula looks the same here as it does inside the lesson.
 */
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { api, FormulaGroup } from "../api";
import { MathTex } from "../components/Math";

/* ─────────────────────────── categorisation ─────────────────────────── */

type FormulaCatId =
  | "numbersense" | "algebra" | "sequences" | "geometry" | "trig"
  | "coordgeo" | "calculus" | "stats" | "practical" | "olympiad";

const FORMULA_CATS: { id: FormulaCatId; icon: string; label: string }[] = [
  { id: "numbersense", icon: "🔢", label: "Number Sense & Arithmetic" },
  { id: "algebra", icon: "🅰️", label: "Algebra" },
  { id: "sequences", icon: "🔁", label: "Sequences, Series & Counting" },
  { id: "geometry", icon: "📐", label: "Geometry & Mensuration" },
  { id: "trig", icon: "📏", label: "Trigonometry" },
  { id: "coordgeo", icon: "🧭", label: "Coordinate Geometry, Vectors & Matrices" },
  { id: "calculus", icon: "∫", label: "Calculus" },
  { id: "stats", icon: "📊", label: "Statistics & Probability" },
  { id: "practical", icon: "💰", label: "Practical & Aptitude Math" },
  { id: "olympiad", icon: "🏆", label: "Olympiad & Number Theory" },
];

/** Concept ids follow a stable naming scheme (prefix + keyword), so a formula's home
 * topic can be worked out from its concept id without hand-tagging every concept —
 * new concepts that add a `formulas` field are picked up automatically. */
function categorize(id: string): FormulaCatId {
  if (id.startsWith("oly-")) return "olympiad";
  if (id.startsWith("apt-")) return "practical";
  if (/speed-distance-time|advanced-finance/.test(id)) return "practical";
  if (/probability|statistic|cumulative-frequency|mean-deviation|pie-charts/.test(id)) return "stats";
  if (/trigonometric|trigonometry|trig-|sine-cosine-rule|bearings/.test(id)) return "trig";
  if (/coordinate-geometry|straight-lines|vector|matri|complex-number|roots-of-unity/.test(id)) return "coordgeo";
  if (/limits-derivatives|integrals/.test(id)) return "calculus";
  if (/permutations-combinations|binomial|arithmetic-progressions|sequences-series|special-series|generating-functions|recurrence-relations|combinatorial-identities|mathematical-induction/.test(id)) return "sequences";
  if (/expressions|polynomials|quadratics|functions-graphs|vieta/.test(id)) return "algebra";
  if (id.startsWith("geo-") || id.startsWith("meas-")) return "geometry";
  return "numbersense";
}

/** Grades are a pseudo-band, not always the literal school class (12 = Aptitude,
 * 13 = Reasoning) — mirrors WorldMap's STAGES labelling so this screen shows the
 * same friendly names a learner already recognises from Ganita Grove. */
const GRADE_LABEL: Record<number, string> = {
  0: "Foundation", 1: "Foundation", 2: "Foundation",
  3: "Class 3", 4: "Class 4", 5: "Class 5", 6: "Class 6", 7: "Class 7",
  8: "Class 8–9", 9: "Class 10", 10: "Class 11", 11: "Class 12",
  12: "Aptitude", 13: "Reasoning",
};
const gradeLabel = (g: number) => GRADE_LABEL[g] ?? `Grade ${g}`;

/* ─────────────────────────── card ─────────────────────────── */

function FormulaConceptCard({ g, onOpen }: { g: FormulaGroup; onOpen: (id: string) => void }) {
  return (
    <article className="fm-algo-card">
      <h3 className="fm-algo-name">
        {g.name} <span className="fm-algo-badge">{gradeLabel(g.grade)}</span>
      </h3>
      <div className="fm-formulas">
        {g.formulas.map((f, i) => (
          <div key={i} className="fm-formula-card">
            <div className="fm-formula-top">
              <span className="fm-formula-name">{f.name}</span>
              <span className="fm-formula-eq"><MathTex>{f.formula}</MathTex></span>
            </div>
            {f.remember && <p className="fm-formula-remember">🧠 {f.remember}</p>}
            {f.whenToUse && <p className="fm-formula-when">👉 {f.whenToUse}</p>}
          </div>
        ))}
      </div>
      <button className="fm-algo-btn primary" onClick={() => onOpen(g.id)}>Open the lesson →</button>
    </article>
  );
}

/* ─────────────────────────── main screen ─────────────────────────── */

export function FormulaBook({ onOpen }: { onOpen: (id: string) => void }) {
  const [groups, setGroups] = useState<FormulaGroup[] | null>(null);
  const [cat, setCat] = useState<FormulaCatId | "all">("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  useEffect(() => { api.listFormulas().then(setGroups).catch(() => setGroups([])); }, []);

  const tagged = useMemo(
    () => (groups ?? []).map((g) => ({ ...g, cat: categorize(g.id) })),
    [groups]
  );

  const filtered = useMemo(() => tagged.filter((g) => {
    if (cat !== "all" && g.cat !== cat) return false;
    if (!q) return true;
    const hay = (g.name + " " + g.formulas.map(
      (f) => f.name + " " + f.formula + " " + (f.remember ?? "") + " " + (f.whenToUse ?? "")
    ).join(" ")).toLowerCase();
    return hay.includes(q);
  }), [tagged, cat, q]);

  const totalFormulas = useMemo(() => tagged.reduce((n, g) => n + g.formulas.length, 0), [tagged]);
  const groupsIn = (id: FormulaCatId) => filtered.filter((g) => g.cat === id);

  if (groups === null) {
    return <div className="fm-algo"><p className="fm-loading">Loading the Formula Book…</p></div>;
  }

  return (
    <div className="fm-algo">
      <header className="fm-algo-head">
        <h1>📐 Formula Book</h1>
        <p className="fm-dash-sub">
          Every key formula in FearlessMath — {totalFormulas} formulas across {tagged.length} lessons —
          with a memory hook, when to use it, and a one-tap link back to the lesson it came from.
        </p>
      </header>

      <div className="fm-algo-cats">
        <button className={"fm-fact-chip" + (cat === "all" ? " on" : "")} onClick={() => setCat("all")}>✨ All</button>
        {FORMULA_CATS.map((c) => (
          <button key={c.id} className={"fm-fact-chip" + (cat === c.id ? " on" : "")} onClick={() => setCat(c.id)}>{c.icon} {c.label}</button>
        ))}
      </div>

      <div className="fm-search-wrap fm-algo-search">
        <span className="fm-search-ic"><Search size={16} /></span>
        <input className="fm-search-input" value={query} placeholder="Search formulas — try 'area', 'quadratic', 'Pythagoras'…" onChange={(e) => setQuery(e.target.value)} aria-label="Search formulas" />
        {query && <button className="fm-search-clear" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
      </div>

      {filtered.length === 0 && <p className="fm-search-count">No formulas match "{query}". Try another word.</p>}

      {FORMULA_CATS.map((c) => {
        if (cat !== "all" && cat !== c.id) return null;
        const inCat = groupsIn(c.id);
        if (inCat.length === 0) return null;
        return (
          <section key={c.id} className="fm-algo-sec">
            <h2 className="fm-algo-cat-title">{c.icon} {c.label} <span className="fm-algo-badge">{inCat.reduce((n, g) => n + g.formulas.length, 0)} formulas</span></h2>
            {inCat.map((g) => <FormulaConceptCard key={g.id} g={g} onOpen={onOpen} />)}
          </section>
        );
      })}
    </div>
  );
}
