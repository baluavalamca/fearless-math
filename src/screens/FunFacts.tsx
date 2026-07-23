/**
 * Fun Facts & Math Innovations — a browsable, trilingual gallery of 200 kid-friendly
 * facts across eight categories. Features: category chips, live search, a "Surprise me"
 * shuffle that spotlights one big fact, and read-aloud on every card (reusing SpeakButton,
 * which respects the active speech language). All strings come from the shared data file
 * and are shown in the app's active display language with an English fallback.
 */
import { useMemo, useState } from "react";
import {
  FACT_CATEGORIES,
  FactCategory,
  LangKey,
  MATH_FACTS,
  MathFact,
  categoryLabel,
  factText,
} from "../data/mathFacts";
import { SpeakButton } from "../components/SpeakButton";

const HEADING: Record<LangKey, { title: string; sub: string; all: string; search: string; surprise: string; none: string; count: (n: number) => string }> = {
  en: {
    title: "Fun Facts & Math Innovations",
    sub: "200 amazing truths about numbers, shapes, great minds and the maths all around us.",
    all: "All",
    search: "Search fun facts — try 'zero', 'pi', 'India', 'infinity'…",
    surprise: "🎲 Surprise me",
    none: "No facts match that word. Try another!",
    count: (n) => `${n} fact${n === 1 ? "" : "s"}`,
  },
  hi: {
    title: "मज़ेदार तथ्य और गणित नवाचार",
    sub: "संख्याओं, आकृतियों, महान गणितज्ञों और हमारे चारों ओर के गणित के बारे में 200 अद्भुत सच्चाइयाँ।",
    all: "सभी",
    search: "मज़ेदार तथ्य खोजें — 'शून्य', 'पाई', 'भारत', 'अनंत' आज़माएँ…",
    surprise: "🎲 कोई एक दिखाओ",
    none: "उस शब्द से कोई तथ्य मेल नहीं खाता। दूसरा आज़माएँ!",
    count: (n) => `${n} तथ्य`,
  },
  te: {
    title: "సరదా వాస్తవాలు & గణిత ఆవిష్కరణలు",
    sub: "సంఖ్యలు, ఆకారాలు, గొప్ప మేధావులు మరియు మన చుట్టూ ఉన్న గణితం గురించి 200 అద్భుత నిజాలు.",
    all: "అన్నీ",
    search: "సరదా వాస్తవాలను వెతకండి — 'సున్నా', 'పై', 'భారత', 'అనంతం' ప్రయత్నించండి…",
    surprise: "🎲 ఏదైనా ఒకటి చూపించు",
    none: "ఆ పదానికి సరిపోయే వాస్తవం లేదు. మరొకటి ప్రయత్నించండి!",
    count: (n) => `${n} వాస్తవాలు`,
  },
};

function pickRandom(list: MathFact[], notId?: number): MathFact {
  if (list.length === 0) return MATH_FACTS[0];
  if (list.length === 1) return list[0];
  let f = list[Math.floor(Math.random() * list.length)];
  let guard = 0;
  while (notId !== undefined && f.id === notId && guard++ < 8) f = list[Math.floor(Math.random() * list.length)];
  return f;
}

export function FunFacts({ lang = "en" }: { lang?: LangKey }) {
  const t = HEADING[lang] ?? HEADING.en;
  const [cat, setCat] = useState<FactCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [spotlight, setSpotlight] = useState<MathFact>(() => pickRandom(MATH_FACTS));

  const q = query.trim().toLowerCase();
  const list = useMemo(() => {
    return MATH_FACTS.filter((f) => {
      if (cat !== "all" && f.cat !== cat) return false;
      if (!q) return true;
      // Search across all three languages so a Hindi/Telugu learner can still find English keywords.
      return (f.en + " " + f.hi + " " + f.te).toLowerCase().includes(q);
    });
  }, [cat, q]);

  function surprise() {
    setSpotlight(pickRandom(list.length ? list : MATH_FACTS, spotlight.id));
  }

  return (
    <div className="fm-facts">
      <header className="fm-facts-head">
        <div>
          <h1>💡 {t.title}</h1>
          <p className="fm-dash-sub">{t.sub}</p>
        </div>
      </header>

      {/* Spotlight — one big fact + Surprise me shuffle */}
      <div className="fm-fact-spotlight">
        <span className="fm-fact-spot-badge">{FACT_CATEGORIES.find((c) => c.id === spotlight.cat)?.icon} {categoryLabel(spotlight.cat, lang)}</span>
        <p className="fm-fact-spot-text">{factText(spotlight, lang)}</p>
        <div className="fm-fact-spot-actions">
          <button className="fm-primary fm-fact-surprise" onClick={surprise}>{t.surprise}</button>
          <SpeakButton text={factText(spotlight, lang)} label="Read this fact aloud" style="story" />
        </div>
      </div>

      {/* Category chips */}
      <div className="fm-fact-cats" role="tablist" aria-label="Fact categories">
        <button className={`fm-fact-chip ${cat === "all" ? "on" : ""}`} onClick={() => setCat("all")}>✨ {t.all}</button>
        {FACT_CATEGORIES.map((c) => (
          <button key={c.id} className={`fm-fact-chip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>
            {c.icon} {categoryLabel(c.id, lang)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="fm-search-wrap fm-fact-search">
        <span className="fm-search-ic">🔍</span>
        <input
          className="fm-search-input"
          value={query}
          placeholder={t.search}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search fun facts"
        />
        {query && <button className="fm-search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>}
      </div>

      <p className="fm-search-count">{list.length ? t.count(list.length) : t.none}</p>

      {/* Grid of fact cards */}
      <div className="fm-fact-grid">
        {list.map((f) => (
          <div key={f.id} className={`fm-fact-card cat-${f.cat}`}>
            <span className="fm-fact-card-cat">{FACT_CATEGORIES.find((c) => c.id === f.cat)?.icon} {categoryLabel(f.cat, lang)}</span>
            <p className="fm-fact-card-text">{factText(f, lang)}</p>
            <div className="fm-fact-card-foot">
              <span className="fm-fact-card-num">#{f.id}</span>
              <SpeakButton text={factText(f, lang)} label="Read this fact aloud" style="concept" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
