import { useEffect, useState } from "react";
import { api, Concept, ConceptCard, Profile } from "./api";
import { WorldMap } from "./screens/WorldMap";
import { LessonPlayer } from "./screens/LessonPlayer";
import { MistakeClinic } from "./screens/MistakeClinic";
import { ParentDashboard } from "./screens/ParentDashboard";
import { Onboarding } from "./screens/Onboarding";
import { MathToolbox } from "./components/MathToolbox";
import { AdvancedToolbox } from "./components/AdvancedToolbox";
import { Doodles } from "./components/Doodles";
import { Emoji3D } from "./components/ObjectIcon";
import { isAutoRead, setAutoRead, stopSpeaking } from "./speech";

type Screen = "map" | "clinic" | "parent";
type ThemeId = "light" | "dark" | "claude" | "nvidia" | "nike" | "taupe" | "matrix" | "sunflower" | "grape"
  | "pastel" | "sage" | "rosewood" | "sapphire";

const THEMES: { id: ThemeId; label: string; icon: string; mode: "light" | "dark" }[] = [
  { id: "light", label: "Light", icon: "☀️", mode: "light" },
  { id: "dark", label: "Dark", icon: "🌙", mode: "dark" },
  { id: "claude", label: "Claude", icon: "🟠", mode: "light" },
  { id: "nvidia", label: "NVIDIA", icon: "🟢", mode: "dark" },
  { id: "nike", label: "Nike", icon: "✔️", mode: "dark" },
  { id: "taupe", label: "Taupe", icon: "🤎", mode: "light" },
  { id: "matrix", label: "Matrix", icon: "🟩", mode: "dark" },
  { id: "sunflower", label: "Sunflower", icon: "🌻", mode: "dark" },
  { id: "grape", label: "Grape", icon: "🍇", mode: "light" },
  { id: "pastel", label: "Pastel", icon: "🪻", mode: "light" },
  { id: "sage", label: "Sage", icon: "🌿", mode: "light" },
  { id: "rosewood", label: "Rosewood", icon: "🌹", mode: "light" },
  { id: "sapphire", label: "Sapphire", icon: "🔷", mode: "dark" },
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

  function toggleAutoRead() { const next = !autoRead; setAutoRead(next); setAutoReadState(next); }
  function cycleTheme() {
    setTheme((prev) => { const i = THEMES.findIndex((t) => t.id === prev); return THEMES[(i + 1) % THEMES.length].id; });
  }

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
    const c = await api.getConcept(id);
    await api.lessonStarted(id);
    localStorage.setItem("fm_last_" + (profile?.id ?? 0), id);
    setOpen(c);
  }

  if (booting) return <div className="fm-loading">Waking up Fraction Fox… 🦊</div>;
  if (!profile) return <Onboarding onReady={onReady} />;

  if (open) {
    return <>
      <Doodles />
      <LessonPlayer concept={open} onExit={() => { setOpen(null); refresh(); }} />
      <MathToolbox />
      <AdvancedToolbox />
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
        <button className="fm-theme-toggle" onClick={cycleTheme}
          title="Switch theme: Light → Dark → Claude → NVIDIA → Nike">
          {(THEMES.find((t) => t.id === theme) ?? THEMES[0]).icon}{" "}
          {(THEMES.find((t) => t.id === theme) ?? THEMES[0]).label}
        </button>
      </nav>
      {screen === "map" && concepts && <WorldMap concepts={concepts} profile={profile} onOpen={openConcept} />}
      {screen === "map" && !concepts && <div className="fm-loading">Loading…</div>}
      {screen === "clinic" && <MistakeClinic />}
      {screen === "parent" && <ParentDashboard autoUnlock={profile.role !== "student"} />}
      <MathToolbox />
      <AdvancedToolbox />
    </>
  );
}
