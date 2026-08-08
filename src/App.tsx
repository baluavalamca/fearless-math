import { useEffect, useState, lazy, Suspense } from "react";
import { api, Concept, ConceptCard, Profile } from "./api";
import { WorldMap } from "./screens/WorldMap";
import { LessonPlayer } from "./screens/LessonPlayer";
import { MistakeClinic } from "./screens/MistakeClinic";
import { AskRobo } from "./screens/AskRobo";
import { FunFacts } from "./screens/FunFacts";
import { Dictionary } from "./screens/Dictionary";
import { Algorithms } from "./screens/Algorithms";
import { ParentDashboard } from "./screens/ParentDashboard";
import { Onboarding } from "./screens/Onboarding";
// Heavy calculator/tool popups are code-split into their own chunks so the main
// bundle stays small and loads fast on low-end devices.
const MathToolbox = lazy(() => import("./components/MathToolbox").then((m) => ({ default: m.MathToolbox })));
const AdvancedToolbox = lazy(() => import("./components/AdvancedToolbox").then((m) => ({ default: m.AdvancedToolbox })));
import { Doodles } from "./components/Doodles";
import { Emoji3D } from "./components/ObjectIcon";
import { RoboAvatar } from "./components/RoboAvatar";
import { isAutoRead, setAutoRead, stopSpeaking, setSpeechLang } from "./speech";

type Screen = "map" | "clinic" | "ask" | "facts" | "algos" | "dict" | "parent";

/* Navigation is split in two:
 *  TOP  — the two everyday destinations a learner uses constantly.
 *  MENU — everything else, tucked into the bottom popup sheet.
 * Both are data-driven so labels and active states stay in sync. */
const TOP_NAV: { id: Screen; icon: string; label: string }[] = [
  { id: "map", icon: "🌳", label: "Ganita Grove" },
  { id: "clinic", icon: "🏥", label: "Mistake Clinic" },
];
const MENU_NAV: { id: Screen; icon: string; label: string; sub: string }[] = [
  { id: "ask", icon: "🤖", label: "Ask Robo", sub: "Your AI maths tutor" },
  { id: "facts", icon: "💡", label: "Fun Facts", sub: "200 maths wonders" },
  { id: "algos", icon: "🧠", label: "Algorithms", sub: "Must-know algorithms" },
  { id: "dict", icon: "📖", label: "Dictionary", sub: "EN · తెలుగు · हिंदी" },
  { id: "parent", icon: "👨‍👩‍👧", label: "Parents", sub: "Progress & settings" },
];
const ALL_NAV = [...TOP_NAV, ...MENU_NAV];

/* Global display language. Translated packs (hi/te) carry the same concept ids,
 * so progress is shared; untranslated lessons fall back to English automatically. */
type LangId = "en" | "hi" | "te";
const LANGS: { id: LangId; label: string; native: string; bcp: string }[] = [
  { id: "en", label: "EN", native: "English", bcp: "en-IN" },
  { id: "hi", label: "हिं", native: "हिंदी", bcp: "hi-IN" },
  { id: "te", label: "తె", native: "తెలుగు", bcp: "te-IN" },
];
type ThemeId = "rainbow" | "space" | "unicorn" | "ocean" | "dino" | "candy" | "fairy" | "jungle" | "racing"
  | "light" | "dark";

/* Kid-first theme set. `sw` is the swatch gradient shown in the picker. */
const THEMES: { id: ThemeId; label: string; icon: string; mode: "light" | "dark"; sw: string }[] = [
  { id: "rainbow", label: "Rainbow", icon: "🌈", mode: "light", sw: "linear-gradient(120deg,#ff5d5d,#ffb84d,#ffe14d,#4dd07a,#4db8ff,#a15dff)" },
  { id: "space", label: "Space", icon: "🚀", mode: "dark", sw: "linear-gradient(135deg,#7c5cff,#3b82f6,#22d3ee)" },
  { id: "unicorn", label: "Unicorn", icon: "🦄", mode: "light", sw: "linear-gradient(135deg,#ff5db1,#c084fc,#7dd3fc)" },
  { id: "ocean", label: "Ocean", icon: "🐠", mode: "light", sw: "linear-gradient(135deg,#22d3ee,#0ea5e9,#14b8a6)" },
  { id: "dino", label: "Dino", icon: "🦕", mode: "light", sw: "linear-gradient(135deg,#4caf50,#a3e635,#f59e0b)" },
  { id: "candy", label: "Candy", icon: "🍭", mode: "light", sw: "linear-gradient(135deg,#ff4d8d,#ff9ec4,#34d399)" },
  { id: "fairy", label: "Fairy", icon: "🧚", mode: "light", sw: "linear-gradient(135deg,#14b8a6,#8b5cf6,#f9a8d4)" },
  { id: "jungle", label: "Jungle", icon: "🌴", mode: "light", sw: "linear-gradient(135deg,#16a34a,#22c55e,#a3e635)" },
  { id: "racing", label: "Racing", icon: "🏎️", mode: "dark", sw: "linear-gradient(135deg,#ff3b3b,#ff7a18,#111827)" },
  { id: "light", label: "Light", icon: "☀️", mode: "light", sw: "linear-gradient(135deg,#ff9f43,#ff5db1,#8b5cf6)" },
  { id: "dark", label: "Dark", icon: "🌙", mode: "dark", sw: "linear-gradient(135deg,#2b2440,#8b5cf6)" },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("map");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);
  const [concepts, setConcepts] = useState<ConceptCard[] | null>(null);
  const [open, setOpen] = useState<Concept | null>(null);
  // When a learner taps the deep-dive icon, we hand Robo a seed so it opens straight
  // into an "explore this concept" chat. Cleared once Ask Robo has consumed it.
  const [askSeed, setAskSeed] = useState<{ id: string; name: string } | null>(null);
  const [autoRead, setAutoReadState] = useState(isAutoRead());
  const [theme, setTheme] = useState<ThemeId>(() => {
    const s = localStorage.getItem("fm_theme");
    return (THEMES.find((t) => t.id === s)?.id) ?? "light";
  });

  const [lang, setLang] = useState<LangId>(() => {
    const s = localStorage.getItem("fm_lang");
    return (LANGS.find((l) => l.id === s)?.id) ?? "en";
  });
  // Hindi/Telugu only show up in the switcher once a parent turns them on for the
  // active child (English is always available and is the default). Undefined until
  // the first fetch resolves, so WorldMap shows English-only rather than flashing
  // languages that turn out to be disabled.
  const [enabledLangs, setEnabledLangs] = useState<string[] | undefined>(undefined);
  async function refreshEnabledLanguages() {
    try { setEnabledLangs(await api.listEnabledLanguages()); } catch { setEnabledLangs([]); }
  }
  // The single bottom menu sheet replaces the old top navigation bar.
  const [menu, setMenu] = useState(false);
  function toggleAutoRead() { const next = !autoRead; setAutoRead(next); setAutoReadState(next); }

  // Apply the display language: set <html lang> (drives the Indic font via CSS),
  // point read-aloud at the right voice, and tell the main process which pack to serve.
  // The main process is the source of truth for whether `next` is actually allowed
  // (English is always allowed; Hindi/Telugu only if the parent enabled them for this
  // child) — we sync local state to whatever it reports back rather than assuming success.
  async function applyLanguage(next: LangId, reloadOpen: boolean) {
    const requested = LANGS.find((l) => l.id === next) ?? LANGS[0];
    let resolved = requested;
    try {
      const r = await api.setLanguage(requested.id);
      if (r?.lang && r.lang !== requested.id) resolved = LANGS.find((l) => l.id === r.lang) ?? LANGS[0];
    } catch { resolved = LANGS[0]; /* falls back to en in main */ }
    document.documentElement.setAttribute("lang", resolved.id);
    localStorage.setItem("fm_lang", resolved.id);
    setSpeechLang(resolved.bcp);
    stopSpeaking();
    setLang(resolved.id);
    if (profile) await refresh();
    if (reloadOpen && open) { try { setOpen(await api.getConcept(open.id)); } catch { /* keep current */ } }
  }
  function changeLanguage(next: LangId) {
    setLang(next);
    void applyLanguage(next, true);
  }

  /** Jump to a screen from the bottom menu and close the sheet behind you. */
  function go(next: Screen) {
    stopSpeaking();
    setMenu(false);
    setScreen(next);
    if (next === "map") { void refresh(); void refreshEnabledLanguages(); }
  }

  useEffect(() => { stopSpeaking(); }, [screen, open]);
  // Escape closes the bottom menu, like any other dialog in the app.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);
  useEffect(() => {
    const t = THEMES.find((x) => x.id === theme) ?? THEMES[0];
    document.documentElement.setAttribute("data-theme", t.id);
    document.documentElement.setAttribute("data-mode", t.mode);
    localStorage.setItem("fm_theme", t.id);
  }, [theme]);
  useEffect(() => {
    document.body.classList.toggle("skin-playful", localStorage.getItem("fm_skin") === "playful");
  }, []);

  async function refresh() { setConcepts(await api.listConcepts()); }

  // Boot: apply the saved language first (so cards/lessons load translated), then
  // check whether anyone is logged in.
  useEffect(() => {
    const meta = LANGS.find((l) => l.id === lang) ?? LANGS[0];
    document.documentElement.setAttribute("lang", meta.id);
    setSpeechLang(meta.bcp);
    (async () => {
      try {
        const r = await api.setLanguage(meta.id);
        if (r?.lang && r.lang !== meta.id) {
          const resolved = LANGS.find((l) => l.id === r.lang) ?? LANGS[0];
          document.documentElement.setAttribute("lang", resolved.id);
          setSpeechLang(resolved.bcp);
          setLang(resolved.id);
        }
      } catch { /* main defaults to en */ }
      void refreshEnabledLanguages();
      try {
        const p = await api.activeProfile();
        setProfile(p); setBooting(false);
        if (p) { setScreen(p.role === "student" ? "map" : "parent"); await refresh(); }
      } catch { setBooting(false); }
    })();
  }, []);

  async function onReady(p: Profile) {
    setProfile(p); setScreen(p.role === "student" ? "map" : "parent"); setOpen(null);
    // Each child has their own enabled-language set, and the main process resets to
    // English on every profile switch (see profiles:setActive) — mirror that here so
    // the switcher never shows a stale non-English selection from the previous child.
    setEnabledLangs(undefined);
    document.documentElement.setAttribute("lang", "en");
    setSpeechLang("en-IN");
    setLang("en");
    void refreshEnabledLanguages();
    await refresh();
  }
  function switchUser() { stopSpeaking(); setProfile(null); setConcepts(null); setOpen(null); }

  async function openConcept(id: string) {
    try {
      const c = await api.getConcept(id);
      await api.lessonStarted(id);
      localStorage.setItem("fm_last_" + (profile?.id ?? 0), id);
      setOpen(c);
    } catch (e) {
      // A failed lesson load shouldn't dead-end the child on a frozen tile.
      console.error("Could not open lesson:", id, e);
    }
  }

  /** Deep dive: send this concept to Ask Robo to explore it further. */
  function deepDive(id: string, name?: string) {
    const label = name ?? open?.name ?? concepts?.find((c) => c.id === id)?.name ?? id;
    stopSpeaking();
    setAskSeed({ id, name: label });
    setOpen(null);
    setScreen("ask");
  }

  if (booting) return <div className="fm-loading">Waking up Fraction Fox… 🦊</div>;
  if (!profile) return <Onboarding onReady={onReady} />;

  if (open) {
    return <>
      <Doodles />
      <LessonPlayer concept={open} lang={lang} onExit={() => { setOpen(null); refresh(); }} onDeepDive={() => deepDive(open!.id, open!.name)} />
      <Suspense fallback={null}><MathToolbox /><AdvancedToolbox /></Suspense>
    </>;
  }

  const here = ALL_NAV.find((n) => n.id === screen) ?? ALL_NAV[0];

  return (
    <>
      <Doodles />
      {/* Slim top bar: clickable logo (goes home) + the two everyday destinations. */}
      <nav className="fm-nav" aria-label="Main navigation">
        <button className="fm-brand-btn" onClick={() => go("map")} title="Go to the home screen" aria-label="FearlessMath — go home">
          <Emoji3D char="🦊" size={24} />
          <span className="fm-brand">FearlessMath</span>
        </button>
        {TOP_NAV.map((n) => (
          <button key={n.id} className={screen === n.id ? "active" : ""} onClick={() => go(n.id)}
            aria-current={screen === n.id ? "page" : undefined}>
            {n.icon} {n.label}
          </button>
        ))}
      </nav>
      <main className="fm-main">
      {screen === "map" && concepts && <WorldMap concepts={concepts} profile={profile} onOpen={openConcept} onDeepDive={deepDive} onFacts={() => setScreen("facts")} lang={lang} onChangeLanguage={changeLanguage} enabledLangs={enabledLangs} />}
      {screen === "map" && !concepts && <div className="fm-loading">Loading…</div>}
      {screen === "clinic" && <MistakeClinic />}
      {screen === "ask" && <AskRobo profile={profile} concepts={concepts ?? []} onOpen={openConcept} seed={askSeed} onSeedConsumed={() => setAskSeed(null)} />}
      {screen === "facts" && <FunFacts lang={lang} />}
      {screen === "algos" && <Algorithms />}
      {screen === "dict" && <Dictionary lang={lang} />}
      {screen === "parent" && <ParentDashboard autoUnlock={profile.role !== "student"} />}
      </main>

      {/* Bottom launcher — the only always-on chrome. Tapping it opens the menu sheet. */}
      <button className={"fm-dock" + (menu ? " open" : "")} onClick={() => setMenu((v) => !v)}
        aria-haspopup="dialog" aria-expanded={menu} title="Open the menu">
        <Emoji3D char="🦊" size={22} />
        <span className="fm-dock-cur">{here.icon} {here.label}</span>
        <span className="fm-dock-caret" aria-hidden>▴</span>
      </button>

      {menu && (
        <>
          <div className="fm-menu-backdrop" onClick={() => setMenu(false)} />
          <div className="fm-menu" role="dialog" aria-modal="true" aria-label="Main menu">
            <div className="fm-menu-grip" aria-hidden />
            <div className="fm-menu-head">
              <span className="fm-brand"><Emoji3D char="🦊" size={22} /> FearlessMath</span>
              <button className="fm-menu-x" onClick={() => setMenu(false)} aria-label="Close menu">✕</button>
            </div>

            <p className="fm-menu-sec">Explore</p>
            <div className="fm-menu-grid">
              {MENU_NAV.map((n) => (
                <button key={n.id} className={"fm-menu-tile" + (screen === n.id ? " on" : "")}
                  onClick={() => go(n.id)} aria-current={screen === n.id ? "page" : undefined}>
                  <span className="fm-menu-ico">
                    {n.id === "ask" ? <RoboAvatar size={24} /> : <Emoji3D char={n.icon} size={24} />}
                  </span>
                  <span className="fm-menu-txt">
                    <b>{n.label}</b>
                    <small>{n.sub}</small>
                  </span>
                </button>
              ))}
            </div>

            <p className="fm-menu-sec">Settings</p>
            <div className="fm-menu-row">
              <button className="fm-menu-chip" onClick={() => { setMenu(false); switchUser(); }} title="Switch user">
                🦊 {profile.name} ⇄
              </button>
              <button className={"fm-menu-chip" + (autoRead ? " on" : "")} onClick={toggleAutoRead}
                title="When ON, the app reads every screen aloud automatically">
                {autoRead ? "🔊 Auto-read ON" : "🔇 Auto-read OFF"}
              </button>
            </div>

            <p className="fm-menu-sub">🎨 Theme</p>
            <div className="fm-menu-row" role="radiogroup" aria-label="Choose a theme">
              {THEMES.map((t) => (
                <button key={t.id} role="radio" aria-checked={theme === t.id}
                  className={"fm-menu-chip" + (theme === t.id ? " on" : "")}
                  onClick={() => setTheme(t.id)}>
                  <span className="fm-theme-chip" style={{ background: t.sw }} aria-hidden />
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <Suspense fallback={null}><MathToolbox /><AdvancedToolbox /></Suspense>
    </>
  );
}
