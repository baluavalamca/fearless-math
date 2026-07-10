/**
 * Create a Lesson — parent/teacher tool to EXTEND the syllabus.
 * Type or speak a maths topic; an AI authors a full concept that follows the
 * same methodology (story → visual → methods → worked examples → practice →
 * mastery → revision). Generated lessons appear in Ganita Grove like any other.
 * Guardrails: OpenAI + Structured Outputs, math-only, validated before saving.
 */
import { useEffect, useState } from "react";
import { api, AiStatus, MediaStatus, ConceptCard, aiUsable, sarvamUsable } from "../api";
import { startRecording, micSupported, Recorder } from "../voice";

const GRADES = [
  { v: 0, label: "PP1–Class 2 (Foundation)" },
  { v: 3, label: "Class 3" },
  { v: 4, label: "Class 4" },
  { v: 5, label: "Class 5" },
  { v: 6, label: "Class 6" },
  { v: 7, label: "Class 7" },
  { v: 8, label: "Class 8" },
];

const FAIL_MSG: Record<string, string> = {
  "not-math": "That doesn't look like a school-maths topic. Try a maths idea like “multiplying fractions” or “perimeter of rectangles”.",
  disabled: "Turn on the AI Tutor below and save an OpenAI key first.",
  "needs-openai": "Lesson creation needs the OpenAI provider. Set the AI Tutor provider to “OpenAI” below.",
  "empty-topic": "Type a topic first.",
  "bad-json": "The AI reply couldn't be read. Please try again.",
  "save-failed": "Couldn't save the lesson on this computer. Please try again.",
  "not-allowed": "Only a parent or teacher profile can create lessons.",
};

export function CreateLesson() {
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState(5);
  const [language, setLanguage] = useState("en-IN");
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [media, setMedia] = useState<MediaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [mine, setMine] = useState<(ConceptCard & { whatIsIt?: string })[]>([]);
  const [rec, setRec] = useState<Recorder | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [ground, setGround] = useState(true);
  const [verify, setVerify] = useState(true);

  const canCreate = typeof api.createConcept === "function";

  async function refreshMine() {
    if (typeof api.listUserConcepts === "function") {
      try { setMine(await api.listUserConcepts()); } catch { /* ignore */ }
    }
  }
  useEffect(() => {
    api.aiStatus().then(setAi).catch(() => setAi(null));
    api.mediaStatus().then(setMedia).catch(() => setMedia(null));
    refreshMine();
  }, []);

  const openaiReady = aiUsable(ai) && ai?.provider === "openai";
  const micReady = canCreate && micSupported() && sarvamUsable(media);

  async function generate() {
    if (!topic.trim() || busy) return;
    setBusy(true);
    setMsg({ kind: "info", text: ground ? "Reading a reference, then writing & checking the lesson… this can take a minute." : "Creating & checking a full lesson… this can take a minute." });
    try {
      const res = await api.createConcept({ topic: topic.trim(), grade, language: language.slice(0, 2), ground, verify });
      if (res.ok && res.card) {
        const bits = [`“${res.card.name}” is ready! Open Ganita Grove to teach it.`];
        if (res.grounded) bits.push(`Grounded with: ${res.grounded}.`);
        if (verify) bits.push(res.verifiedFixed ? `Answer check fixed ${res.verifiedFixed} key(s).` : "Answers double-checked.");
        setMsg({ kind: "ok", text: bits.join(" ") });
        setTopic("");
        refreshMine();
      } else {
        setMsg({ kind: "err", text: FAIL_MSG[res.reason || ""] || (res.reason?.startsWith("validation") ? "Couldn't build a clean lesson — try rewording the topic a little." : `Couldn't create the lesson (${res.reason || "error"}).`) });
      }
    } catch {
      setMsg({ kind: "err", text: "Something went wrong. Please try again." });
    } finally { setBusy(false); }
  }

  async function toggleMic() {
    if (rec) {
      // stop + transcribe
      setTranscribing(true);
      try {
        const { base64, mime } = await rec.stop();
        setRec(null);
        const r = await api.sarvamTranscribe({ audioBase64: base64, mime, language });
        if (r.ok && r.transcript) setTopic((t) => (t ? t + " " : "") + r.transcript);
        else setMsg({ kind: "err", text: "Couldn't hear that clearly — please try again or type the topic." });
      } catch {
        setRec(null);
        setMsg({ kind: "err", text: "Microphone couldn't be used. Please type the topic instead." });
      } finally { setTranscribing(false); }
    } else {
      try { setRec(await startRecording()); setMsg(null); }
      catch { setMsg({ kind: "err", text: "Microphone permission was blocked. Please type the topic instead." }); }
    }
  }

  async function remove(id: string) {
    if (typeof api.deleteConcept !== "function") return;
    const r = await api.deleteConcept(id);
    if (r.ok) refreshMine();
  }

  if (!canCreate) {
    return (
      <div className="fm-ai-settings">
        <p className="fm-gate-msg" style={{ maxWidth: 640 }}>
          ⚠️ Creating lessons is part of a recent update. Please <strong>fully close and reopen
          FearlessMath</strong> (not just reload) to use it.
        </p>
      </div>
    );
  }

  return (
    <div className="fm-ai-settings fm-create-lesson">
      <p className="fm-dash-note">
        Extend the syllabus: type or speak any <strong>school-maths</strong> topic and FearlessMath
        will author a full lesson — story, pictures, methods, worked examples, practice, mastery
        check and revision — in the same fear-free style. It’s saved on this computer and appears in
        Ganita Grove for your child. With “Ground with web reference” on, it first looks the topic up
        (Wikipedia) so facts are accurate; then a second pass double-checks every answer. Uses your
        OpenAI key; only the topic is sent.
      </p>

      {!openaiReady && (
        <p className="fm-gate-msg" style={{ maxWidth: 640 }}>
          To create lessons, enable the <strong>AI Tutor</strong> below, set its provider to
          <strong> OpenAI</strong>, and save your OpenAI key.
        </p>
      )}

      <div className="fm-answer-row" style={{ maxWidth: 720, flexWrap: "wrap" }}>
        <input
          className="fm-input" style={{ flex: "1 1 260px" }}
          placeholder="e.g. Multiplying two fractions"
          value={topic} onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && openaiReady && generate()}
          disabled={busy}
        />
        {micReady && (
          <button className={"fm-secondary" + (rec ? " fm-mic-on" : "")} onClick={toggleMic} disabled={busy || transcribing}
            title="Speak the topic">
            {transcribing ? "…" : rec ? "⏹ Stop" : "🎤 Speak"}
          </button>
        )}
        <select className="fm-input" style={{ maxWidth: 210 }} value={grade} onChange={(e) => setGrade(+e.target.value)} disabled={busy}>
          {GRADES.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
        </select>
        <select className="fm-input" style={{ maxWidth: 150 }} value={language} onChange={(e) => setLanguage(e.target.value)} disabled={busy}>
          <option value="en-IN">English</option>
          <option value="hi-IN">Hindi</option>
          <option value="te-IN">Telugu</option>
          <option value="ta-IN">Tamil</option>
          <option value="kn-IN">Kannada</option>
        </select>
        <button className="fm-primary" onClick={generate} disabled={busy || !openaiReady || !topic.trim()}>
          {busy ? "Creating…" : "✨ Create lesson"}
        </button>
      </div>

      <div className="fm-answer-row" style={{ maxWidth: 720, gap: 18, flexWrap: "wrap" }}>
        <label className="fm-ai-toggle" style={{ margin: 0 }} title="Fetch a factual reference from the web before writing, so the lesson is accurate — not just from memory.">
          <input type="checkbox" checked={ground} onChange={(e) => setGround(e.target.checked)} disabled={busy} /> Ground with web reference
        </label>
        <label className="fm-ai-toggle" style={{ margin: 0 }} title="A second AI pass solves every question and fixes any wrong answer keys before saving.">
          <input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} disabled={busy} /> Double-check answers
        </label>
      </div>

      {rec && <p className="fm-dash-note">🎙️ Listening… tap “Stop” when you’ve said the topic.</p>}
      {msg && <p className={msg.kind === "err" ? "fm-pin-error" : "fm-dash-note"} style={{ maxWidth: 720 }}>{msg.text}</p>}

      {mine.length > 0 && (
        <div className="fm-my-lessons">
          <h3 style={{ margin: "10px 0 6px" }}>My lessons ({mine.length})</h3>
          {mine.map((c) => (
            <div key={c.id} className="fm-answer-row" style={{ maxWidth: 720, alignItems: "center" }}>
              <span style={{ flex: 1 }}><strong>{c.name}</strong> <span className="fm-dash-strand">{c.strand} · Class {c.grade}</span></span>
              <button className="fm-secondary" onClick={() => remove(c.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
