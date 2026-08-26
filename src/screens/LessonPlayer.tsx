/**
 * Lesson Player — teaches in CPA order, one idea at a time:
 * story → visual → meaning → method(s) → worked examples → practice → mastery.
 * The method switcher is the runtime face of the Methodology Engine.
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown } from "lucide-react";
import { AiStatus, Concept, VeoClip, VideoLocalFile, VideoYoutubeEntry, aiUsable, api } from "../api";
import { VisualRenderer, VisualSpec } from "../components/VisualRenderer";
import { SpeakButton } from "../components/SpeakButton";
import { GeneratedExample, generateExample, hasGenerator } from "../exampleFactory";
import { generatePractice, hasPracticeGen } from "../practiceFactory";
import { autoSpeak, stopSpeaking } from "../speech";
import { Character } from "../components/Characters";
import { ConceptImageModal } from "../components/ConceptImageModal";
import { Flashcards } from "../components/Flashcards";
import { ConceptInfographic } from "../components/ConceptInfographic";
import { YouTubePlayer, extractYoutubeId } from "../components/YouTubePlayer";
import { DotToDot } from "../components/DotToDot";
import { TraceIt } from "../components/TraceIt";
import { MathMaze } from "../components/MathMaze";
import { ColorByAnswer } from "../components/ColorByAnswer";
import { MatchUp } from "../components/MatchUp";
import { MathTex, TutorText } from "../components/Math";
import { StepCards } from "../components/ResponseWidgets";
import { buildHomeworkVisual } from "../homeworkAids";
import { TextbookMode } from "../components/TextbookMode";
import { DictLang } from "../data/mathDictionary";
import { LiveSimPanel } from "../components/LiveSim";
import { Practice } from "./Practice";

type Tab = "story" | "picture" | "gallery" | "live" | "meaning" | "steps" | "anotherWay" | "examples" | "flashcards" | "infographic" | "video" | "activity";

const STEP_NAME: Record<string, string> = { story: "Story", picture: "Picture", gallery: "See it", live: "Try it live", meaning: "Meaning", steps: "Steps", anotherWay: "Another way", examples: "Examples", flashcards: "Cards", infographic: "Recap", video: "Video", activity: "Activities" };
type ActivityGame = "dotToDot" | "traceIt" | "maze" | "colorByAnswer" | "matchUp";
const ACTIVITY_META: Record<ActivityGame, { icon: string; label: string }> = {
  dotToDot: { icon: "⚫", label: "Dot-to-dot" },
  traceIt: { icon: "✏️", label: "Trace it" },
  maze: { icon: "🧭", label: "Maze" },
  colorByAnswer: { icon: "🎨", label: "Color-by-answer" },
  matchUp: { icon: "🔗", label: "Match-up" },
};
type UIMethod = { kind: string; name: string; whenToUse: string; steps: string[]; example: string; visual?: unknown };
/** Gather every taught method into one ordered, labeled list — the Methodology Engine. */
function collectMethods(c: Concept): UIMethod[] {
  const out: UIMethod[] = [];
  if (c.abacusMethod) out.push({ kind: "🧮 Abacus", ...c.abacusMethod });
  if (c.mentalMathMethod) out.push({ kind: "🧠 Mental Math", ...c.mentalMathMethod });
  if (c.vedicMethod) out.push({ kind: "⚡ Vedic", ...c.vedicMethod });
  (c.alternateMethods ?? []).forEach((m) => out.push({ kind: "🔀 Another Way", ...m }));
  return out;
}

export function LessonPlayer({
  concept,
  lang = "en",
  onExit,
  onDeepDive,
}: {
  concept: Concept;
  lang?: DictLang;
  onExit: () => void;
  /** Send this concept to Ask Robo to explore it further. */
  onDeepDive?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("story");
  const [mode, setMode] = useState<"learn" | "trick" | "practice" | "mastery" | "done" | "textbook">("learn");
  const [masteryMsg, setMasteryMsg] = useState<string | null>(null);
  const [gen, setGen] = useState<GeneratedExample | null>(null);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [aiText, setAiText] = useState<{ steps: string[]; example: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [maxStep, setMaxStep] = useState(0);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [imgStyle, setImgStyle] = useState<"story" | "poster" | "board" | null>(null);
  // Each concept can have an authored (content-pack) video PLUS any number of
  // parent-added YouTube links and local MP4/audio files. Authored entries are
  // always first in the list and can't be removed; override entries can.
  const [youtubeList, setYoutubeList] = useState<VideoYoutubeEntry[]>(() => {
    const authoredId = concept.video?.youtubeUrl ? extractYoutubeId(concept.video.youtubeUrl) : null;
    return authoredId ? [{ id: authoredId, url: concept.video!.youtubeUrl! }] : [];
  });
  const [activeYoutubeIdx, setActiveYoutubeIdx] = useState(0);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeBusy, setYoutubeBusy] = useState(false);
  const [youtubeMsg, setYoutubeMsg] = useState<string | null>(null);

  const [mp4List, setMp4List] = useState<(VideoLocalFile & { url: string | null })[]>([]);
  const [activeMp4Idx, setActiveMp4Idx] = useState(0);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoMsg, setVideoMsg] = useState<string | null>(null);

  const [veoPrompt, setVeoPrompt] = useState<string | null>(concept.video?.veoPrompt ?? null);
  const [veoHeader, setVeoHeader] = useState<string | null>(null);
  const [veoFooter, setVeoFooter] = useState<string | null>(null);
  const [veoClips, setVeoClips] = useState<VeoClip[] | null>(null);
  const [openClips, setOpenClips] = useState<Set<number>>(new Set([0]));
  const [copiedClip, setCopiedClip] = useState<number | "all" | null>(null);
  const [veoBusy, setVeoBusy] = useState(false);
  const [videoSubTab, setVideoSubTab] = useState<"youtube" | "mp4" | "prompt">("youtube");
  const [activeGame, setActiveGame] = useState<ActivityGame | null>(null);
  const methods = collectMethods(concept);
  const authoredLocalFile = concept.video?.localFile ?? null;

  useEffect(() => { api.aiStatus().then(setAi).catch(() => setAi(null)); }, []);

  // Resolve every video/file that applies to this concept (authored content-pack
  // entry, if any, plus any parent-added overrides) once the Video tab opens.
  useEffect(() => {
    if (tab !== "video") return;
    let cancelled = false;
    (async () => {
      const ov = await api.getVideoOverride(concept.id).catch(() => null);
      if (cancelled) return;

      const authoredId = concept.video?.youtubeUrl ? extractYoutubeId(concept.video.youtubeUrl) : null;
      const ytEntries: VideoYoutubeEntry[] = authoredId
        ? [{ id: authoredId, url: concept.video!.youtubeUrl! }, ...(ov?.youtubeVideos ?? [])]
        : (ov?.youtubeVideos ?? []);
      setYoutubeList(ytEntries);
      setActiveYoutubeIdx(0);

      const localEntries: VideoLocalFile[] = [
        ...(authoredLocalFile ? [{ file: authoredLocalFile, name: authoredLocalFile.split(/[\\/]/).pop() || "Video" }] : []),
        ...(ov?.localFiles ?? []),
      ];
      const resolved = await Promise.all(
        localEntries.map(async (lf) => ({ ...lf, url: await api.getVideoFileUrl(lf.file).catch(() => null) }))
      );
      if (!cancelled) {
        setMp4List(resolved);
        setActiveMp4Idx(0);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, concept.id, authoredLocalFile]);

  async function handlePickVideo() {
    setVideoBusy(true);
    setVideoMsg(null);
    const r = await api.pickVideoFile(concept.id);
    setVideoBusy(false);
    if (r.ok && r.localFiles) {
      const resolved = await Promise.all(
        r.localFiles.map(async (lf) => ({ ...lf, url: await api.getVideoFileUrl(lf.file).catch(() => null) }))
      );
      const withAuthored = authoredLocalFile
        ? [{ file: authoredLocalFile, name: authoredLocalFile.split(/[\\/]/).pop() || "Video", url: await api.getVideoFileUrl(authoredLocalFile).catch(() => null) }, ...resolved]
        : resolved;
      setMp4List(withAuthored);
      setActiveMp4Idx(withAuthored.length - 1);
      setVideoMsg("Added! 🎉");
    } else if (r.reason !== "canceled") {
      setVideoMsg("Couldn't add that file — try an MP3 or MP4.");
    }
  }

  async function handleRemoveMp4(file: string) {
    setVideoBusy(true);
    const r = await api.removeVideoLocalFile(concept.id, file);
    setVideoBusy(false);
    if (r.ok && r.localFiles) {
      const resolved = await Promise.all(
        r.localFiles.map(async (lf) => ({ ...lf, url: await api.getVideoFileUrl(lf.file).catch(() => null) }))
      );
      const withAuthored = authoredLocalFile
        ? [{ file: authoredLocalFile, name: authoredLocalFile.split(/[\\/]/).pop() || "Video", url: await api.getVideoFileUrl(authoredLocalFile).catch(() => null) }, ...resolved]
        : resolved;
      setMp4List(withAuthored);
      setActiveMp4Idx(0);
    }
  }

  async function handleAttachYoutube() {
    if (!youtubeInput.trim()) return;
    setYoutubeBusy(true);
    setYoutubeMsg(null);
    const r = await api.addVideoYoutubeUrl(concept.id, youtubeInput.trim());
    setYoutubeBusy(false);
    if (r.ok && r.youtubeVideos) {
      const authoredId = concept.video?.youtubeUrl ? extractYoutubeId(concept.video.youtubeUrl) : null;
      const withAuthored = authoredId
        ? [{ id: authoredId, url: concept.video!.youtubeUrl! }, ...r.youtubeVideos]
        : r.youtubeVideos;
      setYoutubeList(withAuthored);
      setActiveYoutubeIdx(r.duplicate ? withAuthored.findIndex((y) => y.id === r.youtubeId) : withAuthored.length - 1);
      setYoutubeInput("");
      setYoutubeMsg(r.duplicate ? "That one's already added." : "Added! 🎉");
    } else {
      setYoutubeMsg("That doesn't look like a YouTube link — try pasting the full video URL.");
    }
  }

  async function handleRemoveYoutube(id: string) {
    setYoutubeBusy(true);
    const r = await api.removeVideoYoutubeUrl(concept.id, id);
    setYoutubeBusy(false);
    if (r.ok && r.youtubeVideos) {
      const authoredId = concept.video?.youtubeUrl ? extractYoutubeId(concept.video.youtubeUrl) : null;
      const withAuthored = authoredId
        ? [{ id: authoredId, url: concept.video!.youtubeUrl! }, ...r.youtubeVideos]
        : r.youtubeVideos;
      setYoutubeList(withAuthored);
      setActiveYoutubeIdx(0);
    }
    setYoutubeMsg(null);
  }

  async function handleGenerateVeo() {
    setVeoBusy(true);
    const r = await api.generateVeoPrompt(concept.id);
    setVeoBusy(false);
    if (r.ok) {
      if (r.prompt) setVeoPrompt(r.prompt);
      setVeoHeader(r.header ?? null);
      setVeoFooter(r.footer ?? null);
      setVeoClips(r.clips ?? null);
      setOpenClips(new Set([0]));
    }
  }

  // The static concept.video.veoPrompt (if authored) is a flat string —
  // fetch the structured {header, clips, footer} shape once so the Prompt
  // sub-tab can show one collapsible panel per scene instead of one giant
  // block of text. buildVeoPrompt is a pure function of the concept's own
  // data, so this live call always matches what's stored.
  useEffect(() => {
    if (videoSubTab === "prompt" && !veoClips && !veoBusy && veoPrompt) {
      handleGenerateVeo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSubTab]);

  function toggleClip(idx: number) {
    setOpenClips((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function flashCopied(id: number | "all") {
    setCopiedClip(id);
    setTimeout(() => setCopiedClip((cur) => (cur === id ? null : cur)), 1500);
  }

  function copyClip(idx: number, clip: VeoClip) {
    const text = `${clip.label}\nPrompt: ${clip.prompt}\nVoice-over: ${clip.voiceOver}`;
    navigator.clipboard?.writeText(text).then(() => flashCopied(idx)).catch(() => {});
  }

  function copyVeoPrompt() {
    if (veoPrompt) navigator.clipboard?.writeText(veoPrompt).then(() => flashCopied("all")).catch(() => {});
  }

  async function askAi(style: "simpler" | "story" | "real-life" | "more-examples" | "fun-fact") {
    setAiBusy(true);
    setAiText(null);
    const r = await api.aiExplain({ conceptId: concept.id, style });
    setAiBusy(false);
    if (r.ok && r.steps && r.steps.length > 0) {
      setAiText({ steps: r.steps, example: r.example ?? "" });
      autoSpeak(r.steps.join(". ") + (r.example ? " For example: " + r.example : ""));
    } else {
      // Silent fallback to authored content — never an error for the child
      setAiText({ steps: [concept.whatIsIt, concept.whyNeeded].filter(Boolean), example: "" });
    }
  }

  /** Text of the current tab, for the voice readout. */
  function tabText(): string {
    switch (tab) {
      case "story":
        return `${concept.story.title}. ${concept.story.text} The math inside the story: ${concept.story.extractedProblem} Answer: ${concept.story.answerInStory}`;
      case "picture":
        return concept.visual.caption;
      case "gallery": {
        const galleryText = (concept.teachingGallery ?? [])
          .map((g) => `${g.title}. ${g.note ?? ""} ${g.examples.map((e) => e.caption).join(". ")}`)
          .join(" Next: ");
        return `${concept.visual.caption}${galleryText ? " Next: " + galleryText : ""}`;
      }
      case "live": {
        const ls = concept.liveSim;
        if (!ls) return "";
        const formulaNames = ls.formulas.map((f) => f.name).join(", ");
        return `${ls.title}. ${ls.hook ?? ""} Drag the sliders and watch ${formulaNames || "the shape"} change live!`;
      }
      case "meaning": {
        const remember = concept.rememberIt ? ` Remember it: ${concept.rememberIt.hook}. ${concept.rememberIt.unpack ?? ""}` : "";
        const faq = (concept.studentQuestions ?? []).map((qa) => `${qa.q} ${qa.a}`).join(" ");
        return `What is it? ${concept.whatIsIt} Why do we need it? ${concept.whyNeeded} Where do we see it in life? ${concept.realLifeUses.join(". ")}${remember}${faq ? " Curious? " + faq : ""}`;
      }
      case "steps": {
        const f = (concept.formulas ?? []).map((x) => `${x.name}: ${x.formula}. ${x.remember ?? ""}`).join(" ");
        return `${concept.standardMethod.summary} ${concept.standardMethod.steps.join(" ")}${f ? " Formulas to know: " + f : ""}`;
      }
      case "anotherWay":
        return methods
          .map((m) => `${m.kind}. ${m.name}. Best when: ${m.whenToUse}. ${m.steps.join(" ")} Example: ${m.example}`)
          .join(" Next method: ");
      case "examples": {
        const authored = concept.workedExamples
          .map((ex, i) => `Example ${i + 1}: ${ex.problem} ${ex.steps.join(" ")} Answer: ${ex.answer}.`)
          .join(" ");
        const extra = gen ? ` Fresh example: ${gen.problem} ${gen.steps.join(" ")} Answer: ${gen.answer}.` : "";
        return authored + extra;
      }
      case "flashcards":
        return "Flashcards. Flip each card, then rate yourself: got it, or review.";
      case "infographic":
        return `${concept.name} — one-page summary. ${concept.revisionCard.summary}`;
      case "video": {
        const v = concept.video;
        const bits = [
          v?.time != null ? `About ${Math.round(v.time)} seconds long.` : "",
          youtubeList.length ? "There's a YouTube video for this you can watch right here." : "",
          mp4List.length ? "There's a video or audio file you can play here." : "",
        ].filter(Boolean);
        return bits.join(" ") || "Add a video or audio file, or paste a YouTube link.";
      }
      case "activity": {
        const ab = concept.activityBook;
        if (!ab) return "";
        const names = (Object.keys(ab) as ActivityGame[]).filter((k) => ab[k]).map((k) => ACTIVITY_META[k].label);
        return `Activities. ${names.join(", ")}. Pick one to play!`;
      }
    }
  }

  const tabs = useMemo(() => {
    const t: { id: Tab; label: string }[] = [
      { id: "story", label: "📖 Story" },
      // "See it" now hosts the main picture first, then any gallery examples —
      // one visual tab instead of a separate "Picture" + "See it".
      { id: "gallery", label: "👀 See it" },
    ];
    if (concept.liveSim) t.push({ id: "live", label: "🎛️ Try it live" });
    t.push({ id: "meaning", label: "💡 Meaning" });
    t.push({ id: "steps", label: "🪜 Steps" });
    if (methods.length) t.push({ id: "anotherWay", label: "🔀 Another Way" });
    t.push({ id: "examples", label: "✅ Examples" });
    // Optional review tabs (do not gate practice) — study cards + a one-page recap.
    t.push({ id: "flashcards", label: "🃏 Cards" });
    t.push({ id: "infographic", label: "📊 Recap" });
    // Always offered — a parent can attach a YouTube link (or local file) to
    // ANY concept at runtime, not just the ones the content pack pre-authored.
    t.push({ id: "video", label: "🎬 Video" });
    if (concept.activityBook) t.push({ id: "activity", label: "🧩 Activities" });
    return t;
  }, [concept]);

  // Practice questions: when a generator exists, Practice.tsx runs in adaptive
  // mode -- it grows its own queue live, picking easy/medium/challenge from the
  // learner's streak, so we only need to seed a small warm-up batch here (fast
  // first render). Concepts with only authored questions get the old fixed set.
  const PRACTICE_SEED = 3; // warm-up questions before Practice starts adapting
  const practiceIsAdaptive = hasPracticeGen(concept.id);
  const practiceQuestions = useMemo(() => {
    if (practiceIsAdaptive) {
      return generatePractice(concept.id, "easy", PRACTICE_SEED);
    }
    return [...concept.practice.easy, ...concept.practice.medium, ...concept.practice.challenge];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept.id]);

  // Auto-read: speak the current learn tab when it changes; stop on unmount
  useEffect(() => {
    if (mode === "learn") autoSpeak(tabText());
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mode]);

  // Auto-read the celebration + revision card
  useEffect(() => {
    if (mode === "done" && masteryMsg) {
      autoSpeak(`${masteryMsg} Remember: ${concept.revisionCard.summary}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function finishMastery(teachBackDone: boolean) {
    const r = await api.finishMastery({ conceptId: concept.id, teachBackDone });
    if (r.status === "mastered") {
      setMasteryMsg(`⭐ Mastered! Score ${(r.score! * 100).toFixed(0)}%. ${concept.gameMission?.character ?? "Your guide"} is proud of you!`);
      setMode("done");
    } else if (r.teachBackPending) {
      setMasteryMsg("Almost there — now explain it in your own words!");
    } else {
      setMasteryMsg("Good try! Let's practice a little more — every mistake teaches us something.");
      setMode("practice");
    }
  }

  const stepIdx = tabs.findIndex((t) => t.id === tab);
  // Practice unlocks once the learner has reached "Examples" (the end of the core
  // teaching flow). The Cards + Poster tabs after it are OPTIONAL review, so they
  // never block practice.
  const coreLast = useMemo(() => { const i = tabs.findIndex((t) => t.id === "examples"); return i >= 0 ? i : tabs.length - 1; }, [tabs]);
  useEffect(() => { setMaxStep((m) => Math.max(m, stepIdx)); }, [stepIdx]);
  const canPractice = maxStep >= coreLast;
  const startPractice = () => {
    if (canPractice) { setGateMsg(null); setMode("practice"); }
    else {
      setGateMsg("Let's learn it first! 🦊 Read through to Examples, then Practice opens.");
      setTab(tabs[Math.min(maxStep + 1, coreLast)].id);
    }
  };

  return (
    <div className="fm-lesson">
      <header className="fm-lesson-head">
        <button className="fm-back" onClick={onExit}><ArrowLeft size={16} /> Grove</button>
        {concept.gameMission?.character && (
          <Character
            name={concept.gameMission.character}
            mood={mode === "done" ? "celebrate" : "happy"}
            size={56}
          />
        )}
        <h1>{concept.name}</h1>
        {concept.gameMission && <span className="fm-mission">Mission: {concept.gameMission.title}</span>}
        {mode !== "textbook" && (
          <button className="fm-textbook-btn" onClick={() => setMode("textbook")} title="Read this concept as a textbook chapter, with formulas, MCQs, fill-in-the-blanks and a glossary">
            📘 Textbook view
          </button>
        )}
        {onDeepDive && (
          <button className="fm-deepdive-btn" onClick={onDeepDive} title="Explore this concept deeper with Robo">
            🔬 Explore deeper with Robo
          </button>
        )}
      </header>

      {mode === "textbook" && (
        <TextbookMode concept={concept} lang={lang} onExit={() => setMode("learn")} />
      )}

      {mode === "learn" && (
        <>
          <nav className="fm-stepper" aria-label="Lesson steps">
            {tabs.map((t, i) => (
              <Fragment key={t.id}>
                {i > 0 && <span className={`fm-step-line ${i <= stepIdx ? "filled" : ""}`} />}
                <button
                  className={`fm-step ${i < stepIdx ? "done" : i === stepIdx ? "current" : "todo"}`}
                  onClick={() => setTab(t.id)}
                >
                  <span className="fm-step-dot">{i < stepIdx ? <Check size={14} /> : i + 1}</span>
                  <span className="fm-step-label">{STEP_NAME[t.id] ?? t.label}</span>
                </button>
              </Fragment>
            ))}
            <span className="fm-step-line" />
            <button
              className={`fm-step ${canPractice ? "current" : "locked"}`}
              onClick={startPractice}
              title={canPractice ? "Start practice" : "Finish the lesson to unlock practice"}
              aria-disabled={!canPractice}
            >
              <span className="fm-step-dot">{canPractice ? "★" : "🔒"}</span>
              <span className="fm-step-label">Practice</span>
            </button>
          </nav>
          {gateMsg && <p className="fm-gate-msg">{gateMsg}</p>}

          <main className="fm-canvas">
            <div className="fm-canvas-tools">
              <SpeakButton text={tabText()} label="Read this page aloud" style={tab === "story" ? "story" : (tab === "steps" || tab === "anotherWay") ? "board" : "concept"} />
            </div>
            {tab === "story" && (
              <article>
                <h2>{concept.story.title}</h2>
                <div className="fm-guide">
                  {concept.gameMission?.character && (
                    <Character name={concept.gameMission.character} mood="happy" size={56} />
                  )}
                  <p className="fm-bubble fm-story">{concept.story.text}</p>
                </div>
                {/* A small, deterministic picture of THIS concept's own visual — not a
                    freeform AI illustration — so what's shown always matches the lesson. */}
                {concept.visual && (
                  <div className="fm-story-visual">
                    <VisualRenderer visual={concept.visual} compact />
                  </div>
                )}
                <div className="fm-callout">
                  <strong>The math inside the story:</strong> {concept.story.extractedProblem}
                  <br /><strong>Answer:</strong> {concept.story.answerInStory}
                </div>
                <button className="fm-picture-btn" onClick={() => setImgStyle("story")}>✨ Draw an AI picture of this story (optional)</button>
              </article>
            )}
            {tab === "gallery" && (
              <article className="fm-gallery">
                <p className="fm-gallery-lead">👀 <strong>See it first.</strong> Look at each picture — the word will make sense when you can SEE it.</p>
                <section className="fm-gallery-group">
                  <div className="fm-gallery-grid"><VisualRenderer visual={concept.visual} /></div>
                </section>
                {(concept.teachingGallery ?? []).map((g, gi) => (
                  <section className="fm-gallery-group" key={gi}>
                    <h2>{g.title}</h2>
                    {g.note && <p className="fm-gallery-note">{g.note}</p>}
                    <div className="fm-gallery-grid">
                      {g.examples.map((ex, ei) => (
                        <VisualRenderer key={ei} visual={ex as VisualSpec} />
                      ))}
                    </div>
                  </section>
                ))}
              </article>
            )}
            {tab === "live" && concept.liveSim && (
              <article className="fm-live-article">
                <h2>{concept.liveSim.title}</h2>
                <p className="fm-live-lead">🎛️ <strong>Change the numbers, see the math change.</strong> Drag a slider — no waiting, no reload, just watch it happen.</p>
                <LiveSimPanel spec={concept.liveSim} />
              </article>
            )}
            {tab === "meaning" && (
              <article>
                <h2>What is it?</h2><p>{concept.whatIsIt}</p>
                <h2>Why do we need it?</h2><p>{concept.whyNeeded}</p>
                <h2>Where do we see it in life?</h2>
                <ul>{concept.realLifeUses.map((u, i) => <li key={i}>{u}</li>)}</ul>
                <h2>Words to know</h2>
                <div className="fm-vocab-chips">
                  {concept.vocabulary.map((v) => (
                    <span key={v.term} className="fm-vocab-chip"><strong>{v.term}</strong> — {v.meaning}</span>
                  ))}
                </div>
                {(concept.funFacts ?? []).map((f, i) => (
                  <p key={i} className="fm-funfact">💡 <strong>Did you know?</strong> {f}</p>
                ))}
                {concept.rememberIt && (
                  <div className="fm-remember">
                    <span className="fm-remember-badge">🧠 Remember it</span>
                    <p className="fm-remember-hook">{concept.rememberIt.hook}</p>
                    {concept.rememberIt.unpack && <p className="fm-remember-unpack">{concept.rememberIt.unpack}</p>}
                  </div>
                )}
                {(concept.studentQuestions?.length ?? 0) > 0 && (
                  <div className="fm-faq">
                    <h2>❓ Curious? Questions kids ask</h2>
                    {concept.studentQuestions!.map((qa, i) => (
                      <details key={i} className="fm-faq-item">
                        <summary>{qa.q}</summary>
                        <p>{qa.a}</p>
                      </details>
                    ))}
                  </div>
                )}
                <button className="fm-picture-btn" onClick={() => setImgStyle("poster")}>✨ Picture this concept</button>
              </article>
            )}
            {tab === "steps" && (
              <article>
                <h2>{concept.standardMethod.summary}</h2>
                <StepReveal steps={concept.standardMethod.steps} />
                {(concept.formulas?.length ?? 0) > 0 && (
                  <div className="fm-formulas">
                    <h2>📐 Formulas to know</h2>
                    {concept.formulas!.map((f, i) => (
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
                )}
              </article>
            )}
            {tab === "anotherWay" && methods.length > 0 && (
              <article className="fm-ways">
                <p className="fm-ways-intro">🧭 One problem — <strong>many ways to solve it</strong>. Tap a card to open it and try the way that clicks for you!</p>

                {concept.trickPractice && (
                  <div className="fm-way-card star">
                    <div className="fm-way-top">
                      <span className="fm-way-badge">⭐ Easiest way</span>
                      <span className="fm-way-title">{concept.trickPractice.trick}</span>
                    </div>
                    <p className="fm-way-when">{concept.trickPractice.intro}</p>
                    <button className="fm-primary" onClick={() => setMode("trick")}>Practice this trick ⚡</button>
                  </div>
                )}

                {methods.map((m, i) => (
                  <details className="fm-way-card" key={i} open={i === 0}>
                    <summary className="fm-way-summary">
                      <span className="fm-way-title">{m.kind} · {m.name}</span>
                      <span className="fm-way-chev"><ChevronDown size={16} /></span>
                    </summary>
                    <div className="fm-way-body">
                      <p className="fm-way-when">👉 <strong>Use this when:</strong> {m.whenToUse}</p>
                      {m.visual ? <VisualRenderer visual={m.visual as VisualSpec} /> : null}
                      <ol className="fm-way-steps">
                        {m.steps.map((s, si) => <li key={si}>{s}</li>)}
                      </ol>
                      <p className="fm-callout">✏️ See it work: {m.example}</p>
                      <SpeakButton label="Hear this way" style="board" text={`${m.name}. Use this when ${m.whenToUse}. ${m.steps.join(" ")} Example: ${m.example}`} />
                    </div>
                  </details>
                ))}
              </article>
            )}
            {tab === "examples" && (
              <article>
                {concept.workedExamples.map((ex, i) => (
                  <section key={i} className="fm-worked">
                    <h2>Example {i + 1}</h2>
                    <p><strong>{ex.problem}</strong></p>
                    {ex.visual ? <VisualRenderer visual={ex.visual as VisualSpec} /> : null}
                    <StepReveal steps={ex.steps} />
                    <p className="fm-answer">Answer: {ex.answer}</p>
                  </section>
                ))}
                {gen && (
                  <section className="fm-worked fm-generated">
                    <h2>🎲 Fresh Example</h2>
                    <p><strong>{gen.problem}</strong></p>
                    {gen.visual && <VisualRenderer visual={gen.visual} />}
                    <StepReveal key={gen.problem} steps={gen.steps} />
                    <p className="fm-answer">Answer: {gen.answer}</p>
                  </section>
                )}
                {hasGenerator(concept.id) && (
                  <div className="fm-gen-row">
                    <button className="fm-primary" onClick={() => setGen(generateExample(concept.id))}>
                      🎲 {gen ? "Another one, please!" : "Show me a new example!"}
                    </button>
                    <span className="fm-gen-note">Endless practice examples — a new one every click.</span>
                  </div>
                )}
              </article>
            )}
            {tab === "flashcards" && (
              <article>
                <p className="fm-tab-intro">🃏 Flip each card, then rate yourself — the best way to make it stick.</p>
                <Flashcards concept={concept} />
              </article>
            )}
            {tab === "infographic" && (
              <article>
                <ConceptInfographic concept={concept} />
              </article>
            )}
            {tab === "video" && (
              <article>
                <p className="fm-tab-intro">🎬 Watch or listen to this idea explained.</p>
                {concept.video?.time != null && (
                  <p className="fm-video-time">⏱️ About {Math.round(concept.video.time)}s</p>
                )}
                <div className="fm-video-subtabs" role="tablist" aria-label="Video source">
                  <button
                    role="tab"
                    aria-selected={videoSubTab === "youtube"}
                    className={`fm-video-subtab ${videoSubTab === "youtube" ? "active" : ""}`}
                    onClick={() => setVideoSubTab("youtube")}
                  >
                    ▶️ YouTube
                  </button>
                  <button
                    role="tab"
                    aria-selected={videoSubTab === "mp4"}
                    className={`fm-video-subtab ${videoSubTab === "mp4" ? "active" : ""}`}
                    onClick={() => setVideoSubTab("mp4")}
                  >
                    📁 MP4 / Audio
                  </button>
                  <button
                    role="tab"
                    aria-selected={videoSubTab === "prompt"}
                    className={`fm-video-subtab ${videoSubTab === "prompt" ? "active" : ""}`}
                    onClick={() => setVideoSubTab("prompt")}
                  >
                    🪄 Prompt
                  </button>
                </div>

                <div className="fm-video-panel">
                  {videoSubTab === "youtube" && (
                    <>
                      {youtubeList.length > 0 && (
                        <>
                          {youtubeList.length > 1 && (
                            <div className="fm-video-chip-row">
                              {youtubeList.map((y, i) => (
                                <span key={y.id} className={`fm-video-chip ${i === activeYoutubeIdx ? "active" : ""}`}>
                                  <button onClick={() => setActiveYoutubeIdx(i)}>
                                    {i === 0 && concept.video?.youtubeUrl && extractYoutubeId(concept.video.youtubeUrl) === y.id ? "📺 Video 1" : `📺 Video ${i + 1}`}
                                  </button>
                                  {!(i === 0 && concept.video?.youtubeUrl && extractYoutubeId(concept.video.youtubeUrl) === y.id) && (
                                    <button
                                      className="fm-video-chip-remove"
                                      disabled={youtubeBusy}
                                      aria-label="Remove this YouTube video"
                                      onClick={() => handleRemoveYoutube(y.id)}
                                    >
                                      ✖️
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                          <YouTubePlayer videoId={youtubeList[activeYoutubeIdx].id} title={concept.name} />
                          <div className="fm-video-actions">
                            <button
                              className="fm-secondary"
                              onClick={() => api.openExternalLink(`https://www.youtube.com/watch?v=${youtubeList[activeYoutubeIdx].id}`)}
                            >
                              ↗️ Open on YouTube
                            </button>
                            {!(activeYoutubeIdx === 0 && concept.video?.youtubeUrl && extractYoutubeId(concept.video.youtubeUrl) === youtubeList[0].id) && (
                              <button className="fm-secondary" disabled={youtubeBusy} onClick={() => handleRemoveYoutube(youtubeList[activeYoutubeIdx].id)}>
                                ✖️ Remove this video
                              </button>
                            )}
                          </div>
                        </>
                      )}
                      <div className="fm-yt-attach">
                        <p className="fm-veo-label">▶️ {youtubeList.length ? "Paste another YouTube link to add it here:" : "Paste a YouTube link to play it here for this lesson:"}</p>
                        <div className="fm-yt-attach-row">
                          <input
                            type="text"
                            className="fm-yt-input"
                            placeholder="https://www.youtube.com/watch?v=…"
                            value={youtubeInput}
                            onChange={(e) => setYoutubeInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAttachYoutube(); }}
                          />
                          <button className="fm-secondary" disabled={youtubeBusy || !youtubeInput.trim()} onClick={handleAttachYoutube}>
                            {youtubeBusy ? "Adding…" : "➕ Add"}
                          </button>
                        </div>
                      </div>
                      {youtubeMsg && <p className="fm-video-msg">{youtubeMsg}</p>}
                    </>
                  )}

                  {videoSubTab === "mp4" && (
                    <>
                      {mp4List.length > 0 && (
                        <>
                          {mp4List.length > 1 && (
                            <div className="fm-video-chip-row">
                              {mp4List.map((f, i) => (
                                <span key={f.file} className={`fm-video-chip ${i === activeMp4Idx ? "active" : ""}`}>
                                  <button onClick={() => setActiveMp4Idx(i)}>📁 {f.name}</button>
                                  {f.file !== authoredLocalFile && (
                                    <button
                                      className="fm-video-chip-remove"
                                      disabled={videoBusy}
                                      aria-label="Remove this file"
                                      onClick={() => handleRemoveMp4(f.file)}
                                    >
                                      ✖️
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                          {mp4List[activeMp4Idx].url && (
                            /\.(mp3|wav|m4a)$/i.test(mp4List[activeMp4Idx].file)
                              ? <audio controls src={mp4List[activeMp4Idx].url!} className="fm-video-player" />
                              : <video controls src={mp4List[activeMp4Idx].url!} className="fm-video-player" />
                          )}
                          {mp4List[activeMp4Idx].file !== authoredLocalFile && (
                            <div className="fm-video-actions">
                              <button className="fm-secondary" disabled={videoBusy} onClick={() => handleRemoveMp4(mp4List[activeMp4Idx].file)}>
                                ✖️ Remove this file
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      <div className="fm-video-actions">
                        <button className="fm-secondary" disabled={videoBusy} onClick={handlePickVideo}>
                          📁 {mp4List.length ? "Add another video/audio file" : "Add a video/audio file"}
                        </button>
                      </div>
                      {videoMsg && <p className="fm-video-msg">{videoMsg}</p>}
                    </>
                  )}

                  {videoSubTab === "prompt" && (
                    <div className="fm-veo-box">
                      <p className="fm-veo-label">🪄 Google Veo prompt — 6 scenes x 5s with voice-over, paste into veo.google or the Gemini app to create a short explainer video:</p>
                      {veoClips ? (
                        <>
                          {veoHeader && <p className="fm-veo-header">{veoHeader}</p>}
                          <div className="fm-veo-clip-list">
                            {veoClips.map((clip, idx) => {
                              const isOpen = openClips.has(idx);
                              return (
                                <div key={idx} className={`fm-veo-clip ${isOpen ? "open" : ""}`}>
                                  <button
                                    type="button"
                                    className="fm-veo-clip-head"
                                    aria-expanded={isOpen}
                                    onClick={() => toggleClip(idx)}
                                  >
                                    <span className="fm-veo-clip-chevron">
                                      <ChevronDown size={16} />
                                    </span>
                                    <span className="fm-veo-clip-title">{clip.label}</span>
                                    <span
                                      className="fm-veo-clip-copy"
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => { e.stopPropagation(); copyClip(idx, clip); }}
                                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); copyClip(idx, clip); } }}
                                    >
                                      {copiedClip === idx ? "✓ Copied" : "📋 Copy"}
                                    </span>
                                  </button>
                                  {isOpen && (
                                    <div className="fm-veo-clip-body">
                                      <p><strong>Prompt:</strong> {clip.prompt}</p>
                                      <p><strong>Voice-over:</strong> {clip.voiceOver}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {veoFooter && <p className="fm-veo-footer">{veoFooter}</p>}
                          <div className="fm-video-actions">
                            <button className="fm-secondary" onClick={copyVeoPrompt}>
                              {copiedClip === "all" ? "✓ Copied all" : "📋 Copy all scenes"}
                            </button>
                            <button className="fm-secondary" disabled={veoBusy} onClick={handleGenerateVeo}>
                              {veoBusy ? "Thinking…" : "🔄 Regenerate prompt"}
                            </button>
                          </div>
                        </>
                      ) : veoPrompt ? (
                        <p className="fm-veo-prompt">{veoBusy ? "Loading scenes…" : veoPrompt}</p>
                      ) : (
                        <button className="fm-secondary" disabled={veoBusy} onClick={handleGenerateVeo}>
                          {veoBusy ? "Thinking…" : "✨ Generate a Veo prompt"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            )}
            {tab === "activity" && concept.activityBook && (
              <article>
                <p className="fm-tab-intro">🧩 Playful practice, activity-book style. Pick one to try!</p>
                {activeGame ? (
                  <div className="fm-activity-active">
                    <button className="fm-secondary fm-activity-back" onClick={() => setActiveGame(null)}>← All activities</button>
                    {activeGame === "dotToDot" && concept.activityBook.dotToDot && <DotToDot spec={concept.activityBook.dotToDot} />}
                    {activeGame === "traceIt" && concept.activityBook.traceIt && <TraceIt spec={concept.activityBook.traceIt} />}
                    {activeGame === "maze" && concept.activityBook.maze && <MathMaze spec={concept.activityBook.maze} />}
                    {activeGame === "colorByAnswer" && concept.activityBook.colorByAnswer && <ColorByAnswer spec={concept.activityBook.colorByAnswer} />}
                    {activeGame === "matchUp" && concept.activityBook.matchUp && <MatchUp spec={concept.activityBook.matchUp} />}
                  </div>
                ) : (
                  <div className="fm-activity-menu">
                    {(Object.keys(ACTIVITY_META) as ActivityGame[])
                      .filter((k) => concept.activityBook?.[k])
                      .map((k) => (
                        <button key={k} className="fm-activity-card" onClick={() => setActiveGame(k)}>
                          <span className="fm-activity-icon">{ACTIVITY_META[k].icon}</span>
                          <span className="fm-activity-label">{concept.activityBook![k]!.title}</span>
                        </button>
                      ))}
                  </div>
                )}
              </article>
            )}
          </main>

          {/* Robo's help belongs on the explanation tab — these buttons re-word,
              re-explain or add examples for the CONCEPT, so they'd be noise on
              Picture / Steps / Examples / Cards. Show only on Meaning. */}
          {tab === "meaning" && aiUsable(ai) && (
            <div className="fm-ai-row">
              <span className="fm-ai-label">🤖 Robo can help more:</span>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("simpler")}>Simpler words</button>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("more-examples")}>➕ More examples</button>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("story")}>As a story</button>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("real-life")}>Real-life example</button>
              <button className="fm-secondary" disabled={aiBusy} onClick={() => askAi("fun-fact")}>✨ Fun fact</button>
            </div>
          )}
          {tab === "meaning" && aiBusy && <p className="fm-ai-busy">🤖 Robo Reason is thinking…</p>}
          {tab === "meaning" && aiText && (() => {
            // Best-effort, zero-extra-cost visual: the same offline heuristic Homework
            // Helper uses, run against Robo's own tiny example (or the concept's
            // story problem as a fallback). Fails soft to null when nothing matches.
            const visual = buildHomeworkVisual(aiText.example || concept.story?.extractedProblem || "");
            return (
              <div className="fm-ai-panel">
                <StepCards steps={aiText.steps} />
                {visual && (
                  <div className="fm-ar-visual">
                    <VisualRenderer visual={visual} compact />
                  </div>
                )}
                {aiText.example && <p className="fm-callout"><TutorText>{aiText.example}</TutorText></p>}
              </div>
            );
          })()}

          <footer className="fm-lesson-foot">
            {(() => {
              const ci = tabs.findIndex((t) => t.id === tab);
              return (
                <>
                  <button className="fm-secondary" disabled={ci <= 0}
                    onClick={() => { if (ci > 0) setTab(tabs[ci - 1].id); }}><ArrowLeft size={16} /> Back</button>
                  <span className="fm-foot-spacer" />
                  {ci < tabs.length - 1
                    ? <button className="fm-primary" onClick={() => setTab(tabs[ci + 1].id)}>Next <ArrowRight size={16} /></button>
                    : <button className="fm-primary" onClick={startPractice}>I'm ready to try! ✏️</button>}
                </>
              );
            })()}
          </footer>
        </>
      )}

      {mode === "trick" && concept.trickPractice && (
        <div className="fm-trick-drill">
          <div className="fm-trick-banner">⚡ Trick drill: <strong>{concept.trickPractice.trick}</strong> — {concept.trickPractice.intro}</div>
          <Practice
            concept={concept}
            context="practice"
            questions={concept.trickPractice.questions}
            onDone={() => setMode("learn")}
            doneLabel="Back to the lesson ←"
          />
        </div>
      )}

      {mode === "practice" && (
        <Practice
          concept={concept}
          context="practice"
          questions={practiceQuestions}
          adaptive={practiceIsAdaptive}
          onDone={() => setMode("mastery")}
          doneLabel="Take the Mastery Mission 🏆"
        />
      )}

      {mode === "mastery" && (
        <>
          <Practice
            concept={concept}
            context="mastery"
            questions={concept.masteryCheck.questions}
            onDone={() => finishMastery(false)}
            doneLabel="Finish Mission"
          />
          {masteryMsg && (
            <div className="fm-teachback">
              <p>{masteryMsg}</p>
              <p className="fm-callout">{concept.teachBackPrompt}</p>
              <button className="fm-primary" onClick={() => finishMastery(true)}>
                I explained it! ✅
              </button>
            </div>
          )}
        </>
      )}

      {mode === "done" && (
        <div className="fm-celebrate">
          {concept.gameMission?.character && (
            <Character name={concept.gameMission.character} mood="celebrate" size={120} />
          )}
          <p>{masteryMsg}</p>
          <p className="fm-callout">📝 Remember card: {concept.revisionCard.summary}</p>
          {concept.realLifeProject && (
            <p className="fm-callout">🏠 Try at home: {concept.realLifeProject}</p>
          )}
          <button className="fm-primary" onClick={onExit}>Back to Ganita Grove 🌳</button>
        </div>
      )}

      {imgStyle && (
        <ConceptImageModal concept={concept} initialStyle={imgStyle} onClose={() => setImgStyle(null)} />
      )}
    </div>
  );
}

/** Progressive disclosure: one step at a time — never a wall of math. */
function StepReveal({ steps }: { steps: string[] }) {
  const [shown, setShown] = useState(1);
  return (
    <div>
      <ol>{steps.slice(0, shown).map((s, i) => <li key={i}>{s}</li>)}</ol>
      {shown < steps.length && (
        <button className="fm-secondary" onClick={() => setShown(shown + 1)}>Next step <ArrowRight size={16} /></button>
      )}
    </div>
  );
}
