/**
 * Ask Robo — a kid-safe, free-form MATHS tutor chat.
 *
 * Design (Khanmigo-style, matched to this app's safety model):
 *  • Maths-only, grade-aware answers (the child's grade comes from the profile;
 *    their NAME and progress are never sent — only the question + grade).
 *  • Gentle refusal for anything that isn't school maths.
 *  • Step-by-step explanation + a tiny worked example + a "now you try" nudge.
 *  • Voice read-aloud, suggested starter questions, quick follow-ups.
 *  • Grounding: if the question matches one of the app's lessons, offer to open it.
 *  • Works on any configured provider, including fully-offline local (Ollama).
 *  • If the AI Tutor is off, a friendly note points to Parents' Corner.
 */
import { useEffect, useRef, useState } from "react";
import { AiStatus, ConceptCard, MediaStatus, Profile, aiUsable, api, sarvamUsable } from "../api";
import { autoSpeak, currentSpeechLang, speak, stopSpeaking } from "../speech";
import { RoboAvatar } from "../components/RoboAvatar";
import { matchLesson } from "../lessonMatch";
import { Recorder, micSupported, startRecording } from "../voice";

/** Voice mode is a per-device preference (like auto-read) -- remembered across sessions. */
const VOICE_MODE_KEY = "fm_askrobo_voice";

type Msg = {
  role: "user" | "bot";
  text: string;                // for user: the question; for bot: the answer
  example?: string;
  tryYourself?: string;
  onTopic?: boolean;
  lesson?: { id: string; name: string } | null;
  error?: boolean;
};

/** Grade-appropriate starter prompts so kids aren't staring at a blank box. */
function starters(grade: number): string[] {
  if (grade <= 2) return ["What is counting?", "What does 'add' mean?", "Which is bigger, 7 or 4?"];
  if (grade <= 5) return ["What is a fraction?", "How do I do long division?", "Why do we carry in addition?"];
  if (grade <= 8) return ["What is BODMAS?", "How do ratios work?", "What is a negative number?"];
  return ["What is the sine rule?", "Explain De Moivre's theorem", "What is a derivative, simply?"];
}

export function AskRobo({ profile, concepts, onOpen, seed, onSeedConsumed }: {
  profile: Profile;
  concepts: ConceptCard[];
  onOpen: (id: string) => void;
  /** When a learner taps a concept's deep-dive icon, we open straight into an "explore this" chat. */
  seed?: { id: string; name: string } | null;
  onSeedConsumed?: () => void;
}) {
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [media, setMedia] = useState<MediaStatus | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastQ, setLastQ] = useState("");
  // Voice mode: tap-to-talk instead of typing, and Robo always reads its answers
  // aloud (regardless of the app's global auto-read setting) -- a hands-free
  // back-and-forth, like talking with a real tutor.
  const [voiceMode, setVoiceMode] = useState(() => typeof localStorage !== "undefined" && localStorage.getItem(VOICE_MODE_KEY) === "1");
  const [rec, setRec] = useState<Recorder | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const seededRef = useRef<string | null>(null);

  useEffect(() => {
    api.aiStatus().then(setAi).catch(() => setAi(null));
    api.mediaStatus().then(setMedia).catch(() => setMedia(null));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => () => stopSpeaking(), []);

  const usable = aiUsable(ai);
  const micReady = micSupported() && sarvamUsable(media);

  function toggleVoiceMode() {
    setVoiceMode((v) => {
      const next = !v;
      try { localStorage.setItem(VOICE_MODE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      if (!next) stopSpeaking();
      return next;
    });
  }

  /** Tap to start recording; tap again to stop, transcribe, and auto-ask --
   *  no separate "send" step, so it feels like talking rather than typing. */
  async function toggleMic() {
    if (rec) {
      setTranscribing(true);
      try {
        const { base64, mime } = await rec.stop();
        setRec(null);
        const r = await api.sarvamTranscribe({ audioBase64: base64, mime, language: currentSpeechLang() });
        if (r.ok && r.transcript?.trim()) {
          void ask(r.transcript);
        } else {
          setMsgs((prev) => [...prev, { role: "bot", text: "I couldn't hear that clearly — please try again or type your question.", error: true }]);
        }
      } catch {
        setRec(null);
        setMsgs((prev) => [...prev, { role: "bot", text: "The microphone couldn't be used. Please type your question instead.", error: true }]);
      } finally { setTranscribing(false); }
    } else {
      try { setRec(await startRecording()); }
      catch { setMsgs((prev) => [...prev, { role: "bot", text: "Microphone permission was blocked. Please type your question instead.", error: true }]); }
    }
  }

  // Deep-dive: a concept was handed in — auto-ask Robo to explore it (once AI status is known).
  // If the tutor is off, prefill the box so the question is ready when a grown-up enables it.
  useEffect(() => {
    if (!seed) { seededRef.current = null; return; }
    if (seededRef.current === seed.id || ai === null) return;
    seededRef.current = seed.id;
    const question = `Tell me more about "${seed.name}". Explain it simply for my level, give a real-life example, and one surprising fact.`;
    if (usable) void ask(question); else setInput(question);
    onSeedConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, ai, usable]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setLastQ(q);
    const history = msgs.slice(-4).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((prev) => [...prev, { role: "user", text: q }]);
    setBusy(true);
    stopSpeaking();
    try {
      const r = await api.aiAsk({ question: q, history });
      if (r.ok && r.answer) {
        const lesson = r.onTopic === false ? null : matchLesson(q, concepts);
        setMsgs((prev) => [...prev, {
          role: "bot", text: r.answer!, example: r.example, tryYourself: r.tryYourself,
          onTopic: r.onTopic !== false, lesson,
        }]);
        const spoken = r.answer + (r.tryYourself ? " Now you try: " + r.tryYourself : "");
        if (voiceMode) speak(spoken); else autoSpeak(spoken);
      } else {
        const why =
          r.reason === "disabled" ? "The AI Tutor is switched off. A grown-up can turn it on in Parents' Corner → AI Tutor." :
          r.reason === "local-unreachable" ? "Robo's offline model isn't running. Ask a grown-up to start Ollama / LM Studio, or switch to a cloud provider (like OpenAI or Claude) in Parents' Corner → AI Tutor." :
          r.reason === "bad-key" ? "The AI provider rejected the key. A grown-up can re-check the API key in Parents' Corner → AI Tutor." :
          "Robo couldn't answer that just now. Please try again, or ask in a different way.";
        setMsgs((prev) => [...prev, { role: "bot", text: why, error: true }]);
      }
    } catch {
      setMsgs((prev) => [...prev, { role: "bot", text: "Something went wrong reaching Robo. Please try again.", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fm-askrobo">
      <header className="fm-ar-head">
        <RoboAvatar size={52} />
        <div>
          <h1>Ask Robo</h1>
          <p className="fm-dash-sub">Your maths helper. Ask any maths question — Robo explains it kindly, step by step.</p>
        </div>
        {micReady && (
          <button
            type="button"
            className={"fm-ar-voice-toggle" + (voiceMode ? " on" : "")}
            onClick={toggleVoiceMode}
            title={voiceMode ? "Voice mode is on — tap the mic below to talk, Robo will answer out loud" : "Turn on voice mode to talk with Robo instead of typing"}
          >
            🎙️ {voiceMode ? "Voice mode on" : "Voice mode"}
          </button>
        )}
      </header>

      {!usable && (
        <p className="fm-gate-msg">🔒 The AI Tutor is off (or needs setup). A grown-up can switch it on in <strong>Parents' Corner → AI Tutor</strong> — cloud providers need an API key, or pick a free offline model (Ollama / LM Studio).</p>
      )}

      <div className="fm-ar-thread">
        {msgs.length === 0 && (
          <div className="fm-ar-welcome">
            <RoboAvatar size={72} className="big" />
            <p><strong>Hi {profile.name}! I'm Robo.</strong> Ask me anything about maths and I'll explain it simply. Try one of these:</p>
            <div className="fm-ar-starters">
              {starters(profile.grade).map((s) => (
                <button key={s} className="fm-ar-chip" disabled={!usable} onClick={() => ask(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          m.role === "user" ? (
            <div key={i} className="fm-ar-row user"><div className="fm-ar-bubble user">{m.text}</div></div>
          ) : (
            <div key={i} className="fm-ar-row bot">
              <RoboAvatar size={34} />
              <div className={`fm-ar-bubble bot ${m.error ? "err" : ""}`}>
                <p className="fm-ar-answer">{m.text}</p>
                {m.example && <div className="fm-ar-example"><span className="fm-ar-tag">Example</span> {m.example}</div>}
                {m.tryYourself && <div className="fm-ar-try"><span className="fm-ar-tag">Now you try</span> {m.tryYourself}</div>}
                {m.lesson && (
                  <button className="fm-ar-lesson" onClick={() => onOpen(m.lesson!.id)}>📚 Open the lesson: {m.lesson.name} →</button>
                )}
                {!m.error && (
                  <div className="fm-ar-actions">
                    <button onClick={() => speak(m.text + (m.tryYourself ? ". Now you try: " + m.tryYourself : ""))} title="Read aloud">🔊 Read</button>
                    <button disabled={!usable || busy} onClick={() => ask(lastQ + " — explain even more simply")}>🧸 Simpler</button>
                    <button disabled={!usable || busy} onClick={() => ask(lastQ + " — give me another example")}>➕ Another example</button>
                  </div>
                )}
              </div>
            </div>
          )
        ))}

        {busy && (
          <div className="fm-ar-row bot">
            <RoboAvatar size={34} thinking />
            <div className="fm-ar-bubble bot"><span className="fm-ar-typing"><i /><i /><i /></span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="fm-ar-inputbar" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <input className="fm-input" value={input} disabled={!usable || busy || !!rec || transcribing}
          placeholder={
            !usable ? "Turn on the AI Tutor to chat" :
            rec ? "Listening… tap the mic to stop and send" :
            transcribing ? "Robo's working out what you said…" :
            voiceMode ? "Tap the mic and ask out loud, or type here…" : "Ask a maths question…"
          }
          onChange={(e) => setInput(e.target.value)} aria-label="Ask a maths question" />
        {micReady && (
          <button type="button" className={"fm-secondary" + (rec ? " fm-mic-on" : "")}
            disabled={!usable || busy || transcribing} onClick={toggleMic}
            title={rec ? "Stop and send" : "Speak your question"}>
            {transcribing ? "…" : rec ? "⏹" : "🎤"}
          </button>
        )}
        <button className="fm-primary" type="submit" disabled={!usable || busy || !input.trim() || !!rec || transcribing}>Ask →</button>
      </form>
      <p className="fm-ar-foot">Robo only answers maths, keeps it kind, and never sees your name — just your question.</p>
    </div>
  );
}
