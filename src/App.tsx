import { useEffect, useState } from "react";
import { api, Concept, ConceptCard, Profile } from "./api";
import { WorldMap } from "./screens/WorldMap";
import { LessonPlayer } from "./screens/LessonPlayer";
import { MistakeClinic } from "./screens/MistakeClinic";
import { ParentDashboard } from "./screens/ParentDashboard";
import { Onboarding } from "./screens/Onboarding";
import { MathToolbox } from "./components/MathToolbox";
import { AdvancedToolbox } from "./components/AdvancedToolbox";
import { isAutoRead, setAutoRead, stopSpeaking } from "./speech";

type Screen = "map" | "clinic" | "parent";

export default function App() {
  const [screen, setScreen] = useState<Screen>("map");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);
  const [concepts, setConcepts] = useState<ConceptCard[] | null>(null);
  const [open, setOpen] = useState<Concept | null>(null);
  const [autoRead, setAutoReadState] = useState(isAutoRead());

  function toggleAutoRead() { const next = !autoRead; setAutoRead(next); setAutoReadState(next); }

  useEffect(() => { stopSpeaking(); }, [screen, open]);
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
      <LessonPlayer concept={open} onExit={() => { setOpen(null); refresh(); }} />
      <MathToolbox />
      <AdvancedToolbox />
    </>;
  }

  return (
    <>
      <nav className="fm-nav" aria-label="Main navigation">
        <span className="fm-brand" aria-hidden>🦊 FearlessMath</span>
        <button className={screen === "map" ? "active" : ""} onClick={() => { setScreen("map"); refresh(); }}>🌳 Ganita Grove</button>
        <button className={screen === "clinic" ? "active" : ""} onClick={() => setScreen("clinic")}>🏥 Mistake Clinic</button>
        <button className={screen === "parent" ? "active" : ""} onClick={() => setScreen("parent")}>👨‍👩‍👧 Parents</button>
        <button className="fm-user-chip" onClick={switchUser} title="Switch user">🦊 {profile.name} ⇄</button>
        <button className={`fm-autoread ${autoRead ? "active" : ""}`} onClick={toggleAutoRead}
          title="When ON, the app reads every screen aloud automatically">
          {autoRead ? "🔊 Auto-read ON" : "🔇 Auto-read OFF"}
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
