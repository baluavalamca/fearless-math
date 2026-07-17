import { useEffect, useState, lazy, Suspense } from "react";
import { api, Concept, ConceptCard, Profile } from "./api";
import { WorldMap } from "./screens/WorldMap";
import { LessonPlayer } from "./screens/LessonPlayer";
import { MistakeClinic } from "./screens/MistakeClinic";
import { ParentDashboard } from "./screens/ParentDashboard";
import { Onboarding } from "./screens/Onboarding";
// Heavy calculator/tool popups are code-split into their own chunks so the main
// bundle stays small and loads fast on low-end devices.
const MathToolbox = lazy(() => import("./components/MathToolbox").then((m) => ({ default: m.MathToolbox })));
const AdvancedToolbox = lazy(() => import("./components/AdvancedToolbox").then((m) => ({ default: m.AdvancedToolbox })));
import { Doodles } from "./components/Doodles";
import { Emoji3D } from "./components/ObjectIcon";
import { isAutoRead, setAutoRead, stopSpeaking } from "./speech";

type Screen = "map" | "clinic" | "parent";
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
  const [autoRead, setAutoReadState] = useState(isAutoRead());
  const [theme, setTheme] = useState<ThemeId>(() => {
    const s = localStorage.getItem("fm_theme");
    return (THEMES.find((t) => t.id === s)?.id) ?? "light";
  });

  const [themeMenu, setThemeMenu] = useState(false);
  function toggleAutoRead() { const next = !autoRead; setAutoRead(next); setAutoReadState(next); }

  useEffect(() => { stopSpeaking(); }, [screen, open]);
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

  // Boot: is anyone logged in?
  useEffect(() => {
    api.activeProfile()
      .then((p) => { setProfile(p); setBooting(false); if (p) { setScreen(p.role === "student" ? "map" : "parent"); refresh(); } })
      .catch(() => setBooting(false));
  }, []);

  async function onReady(p: Profile) { setProfile(p); setScreen(p.role === "student" ? "map" : "parent"); setOpen(null); await refresh(); }
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

  if (booting) return <div className="fm-loading">Waking up Fraction Fox… 🦊</div>;
  if (!profile) return <Onboarding onReady={onReady} />;

  if (open) {
    return <>
      <Doodles />
      <LessonPlayer concept={open} onExit={() => { setOpen(null); refresh(); }} />
      <Suspense fallback={null}><MathToolbox /><AdvancedToolbox /></Suspense>
    </>;
  }

  return (
    <>
      <Doodles />
      <nav className="fm-nav" aria-label="Main navigation">
        <span className="fm-brand"><Emoji3D char="🦊" size={24} /> FearlessMath</span>
        <button className={screen === "map" ? "active" : ""} onClick={() => { setScreen("map"); refresh(); }}>🌳 Ganita Grove</button>
        <button className={screen === "clinic" ? "active" : ""} onClick={() => setScreen("clinic")}>🏥 Mistake Clinic</button>
        <button className={screen === "parent" ? "active" : ""} onClick={() => setScreen("parent")}>👨‍👩‍👧 Parents</button>
        <button className="fm-user-chip" onClick={switchUser} title="Switch user">🦊 {profile.name} ⇄</button>
        <button className={`fm-autoread ${autoRead ? "active" : ""}`} onClick={toggleAutoRead}
          title="When ON, the app reads every screen aloud automatically">
          {autoRead ? "🔊 Auto-read ON" : "🔇 Auto-read OFF"}
        </button>
        <div className="fm-theme-wrap">
          <button className="fm-theme-toggle" onClick={() => setThemeMenu((v) => !v)}
            aria-haspopup="true" aria-expanded={themeMenu} title="Choose a theme">
            {(THEMES.find((t) => t.id === theme) ?? THEMES[0]).icon}{" "}
            {(THEMES.find((t) => t.id === theme) ?? THEMES[0]).label} ▾
          </button>
          {themeMenu && (
            <>
              <div className="fm-theme-backdrop" onClick={() => setThemeMenu(false)} />
              <div className="fm-theme-menu" role="menu" aria-label="Choose a theme">
                {THEMES.map((t) => (
                  <button key={t.id} role="menuitemradio" aria-checked={theme === t.id}
                    className={"fm-theme-swatch" + (theme === t.id ? " on" : "")}
                    onClick={() => { setTheme(t.id); setThemeMenu(false); }}>
                    <span className="fm-theme-chip" style={{ background: t.sw }} aria-hidden />
                    <span className="fm-theme-name">{t.icon} {t.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>
      {screen === "map" && concepts && <WorldMap concepts={concepts} profile={profile} onOpen={openConcept} />}
      {screen === "map" && !concepts && <div className="fm-loading">Loading…</div>}
      {screen === "clinic" && <MistakeClinic />}
      {screen === "parent" && <ParentDashboard autoUnlock={profile.role !== "student"} />}
      <Suspense fallback={null}><MathToolbox /><AdvancedToolbox /></Suspense>
    </>
  );
}
