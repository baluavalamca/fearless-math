/**
 * Trilingual Math Dictionary — a searchable glossary of core maths vocabulary with a
 * short definition in English, తెలుగు and हिंदी, and a per-language 🔊 pronounce button.
 * Each button speaks in its own language (speakInLang) regardless of the app's current
 * read-aloud language, so a learner can hear the Telugu and Hindi words spoken correctly.
 */
import { useEffect, useMemo, useState } from "react";
import {
  DICTIONARY, DICT_CATEGORIES, DICT_BCP, DICT_NATIVE, DictCat, DictLang, DictEntry, catLabel,
} from "../data/mathDictionary";
import { speakInLang, stopSpeaking, isSpeechAvailable } from "../speech";

const HEADING: Record<DictLang, { title: string; sub: string; all: string; search: string; none: string }> = {
  en: {
    title: "Trilingual Math Dictionary",
    sub: "Quick definitions and audio pronunciations in English, తెలుగు and हिंदी.",
    all: "All", search: "Search a term — 'fraction', 'angle', 'भिन्न', 'కోణం'…",
    none: "No terms match that. Try another word!",
  },
  hi: {
    title: "त्रिभाषी गणित शब्दकोश",
    sub: "अंग्रेज़ी, తెలుగు और हिंदी में त्वरित परिभाषाएँ और उच्चारण।",
    all: "सभी", search: "शब्द खोजें — 'भिन्न', 'कोण', 'fraction', 'కోణం'…",
    none: "उस शब्द से कुछ मेल नहीं खाता। दूसरा आज़माएँ!",
  },
  te: {
    title: "త్రిభాషా గణిత నిఘంటువు",
    sub: "ఇంగ్లీష్, తెలుగు మరియు हिंदीలో త్వరిత నిర్వచనాలు మరియు ఉచ్చారణలు.",
    all: "అన్నీ", search: "పదాన్ని వెతకండి — 'భిన్నం', 'కోణం', 'fraction'…",
    none: "ఆ పదానికి ఏదీ సరిపోలేదు. మరొకటి ప్రయత్నించండి!",
  },
};

// Show the three languages in the order the feature promises: English, Telugu, Hindi.
const LANG_ORDER: DictLang[] = ["en", "te", "hi"];

export function Dictionary({ lang = "en" }: { lang?: DictLang }) {
  const t = HEADING[lang] ?? HEADING.en;
  const [cat, setCat] = useState<DictCat | "all">("all");
  const [query, setQuery] = useState("");
  const [saying, setSaying] = useState<string | null>(null);   // "<id>:<lang>" currently speaking

  useEffect(() => () => stopSpeaking(), []);

  const q = query.trim().toLowerCase();
  const list = useMemo(() => {
    const filtered = DICTIONARY.filter((e) => {
      if (cat !== "all" && e.cat !== cat) return false;
      if (!q) return true;
      return (e.en.t + " " + e.en.d + " " + e.hi.t + " " + e.hi.d + " " + e.te.t + " " + e.te.d).toLowerCase().includes(q);
    });
    // Sort alphabetically by the active language's term for a stable, scannable order.
    return filtered.sort((a, b) => a[lang].t.localeCompare(b[lang].t, lang === "en" ? "en" : lang));
  }, [cat, q, lang]);

  function say(e: DictEntry, l: DictLang) {
    const key = e.id + ":" + l;
    if (saying === key) { stopSpeaking(); setSaying(null); return; }
    setSaying(key);
    speakInLang(`${e[l].t}. ${e[l].d}`, DICT_BCP[l], () => setSaying((cur) => (cur === key ? null : cur)));
  }

  return (
    <div className="fm-dict">
      <header className="fm-dict-header">
        <h1>📖 {t.title}</h1>
        <p className="fm-dash-sub">{t.sub}</p>
      </header>

      <div className="fm-dict-cats">
        <button className={"fm-fact-chip" + (cat === "all" ? " on" : "")} onClick={() => setCat("all")}>✨ {t.all}</button>
        {DICT_CATEGORIES.map((c) => (
          <button key={c.id} className={"fm-fact-chip" + (cat === c.id ? " on" : "")} onClick={() => setCat(c.id)}>
            {c.icon} {catLabel(c.id, lang)}
          </button>
        ))}
      </div>

      <div className="fm-search-wrap fm-dict-search">
        <span className="fm-search-ic">🔍</span>
        <input className="fm-search-input" value={query} placeholder={t.search} onChange={(e) => setQuery(e.target.value)} aria-label="Search dictionary" />
        {query && <button className="fm-search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>}
      </div>

      <div className="fm-dict-grid">
        {list.map((e) => (
          <article key={e.id} className={"fm-dict-card cat-" + e.cat}>
            <span className="fm-dict-cat">{DICT_CATEGORIES.find((c) => c.id === e.cat)?.icon} {catLabel(e.cat, lang)}</span>
            {LANG_ORDER.map((l) => (
              <div key={l} className={"fm-dict-row" + (l === lang ? " active" : "")}>
                <span className="fm-dict-lang">{DICT_NATIVE[l]}</span>
                <div className="fm-dict-body">
                  <b className="fm-dict-term">{e[l].t}</b>
                  <span className="fm-dict-def">{e[l].d}</span>
                </div>
                {isSpeechAvailable() && (
                  <button
                    className={"fm-dict-say" + (saying === e.id + ":" + l ? " on" : "")}
                    onClick={() => say(e, l)}
                    title={`Pronounce in ${DICT_NATIVE[l]}`}
                    aria-label={`Pronounce ${e[l].t} in ${DICT_NATIVE[l]}`}
                  >{saying === e.id + ":" + l ? "⏹" : "🔊"}</button>
                )}
              </div>
            ))}
          </article>
        ))}
      </div>

      {list.length === 0 && <p className="fm-search-count">{t.none}</p>}
    </div>
  );
}
