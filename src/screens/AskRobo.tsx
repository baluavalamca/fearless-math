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
import { AiStatus, ConceptCard, Profile, aiUsable, api } from "../api";
import { autoSpeak, speak, stopSpeaking } from "../speech";
import { RoboAvatar } from "../components/RoboAvatar";

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

/** Tiny local matcher: find a lesson whose name shares meaningful words with the question. */
const STOP = new Set(["what","is","a","an","the","how","do","i","we","of","to","in","and","for","why","does","it","my","me","can","you","explain","tell","about","with","are","this","that","which","bigger","smaller","mean","means"]);
function matchLesson(q: string, concepts: ConceptCard[]): { id: string; name: string } | null {
  const words = q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return null;
  let best: { id: string; name: string } | null = null;
  let bestScore = 0;
  for (const c of concepts) {
    const name = c.name.toLowerCase();
    let s = 0;
    for (const w of words) if (name.includes(w)) s += 1;
    if (s > bestScore) { bestScore = s; best = { id: c.id, name: c.name }; }
  }
  return bestScore >= 1 ? best : null;
}

export function AskRobo({ profile, concepts, onOpen }: {
  profile: Profile;
  concepts: ConceptCard[];
  onOpen: (id: string) => void;
}) {
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastQ, setLastQ] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { api.aiStatus().then(setAi).catch(() => setAi(null)); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => () => stopSpeaking(), []);

  const usable = aiUsable(ai);

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
        autoSpeak(r.answer + (r.tryYourself ? " Now you try: " + r.tryYourself : ""));
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
        <input className="fm-input" value={input} disabled={!usable || busy}
          placeholder={usable ? "Ask a maths question…" : "Turn on the AI Tutor to chat"}
          onChange={(e) => setInput(e.target.value)} aria-label="Ask a maths question" />
        <button className="fm-primary" type="submit" disabled={!usable || busy || !input.trim()}>Ask →</button>
      </form>
      <p className="fm-ar-foot">Robo only answers maths, keeps it kind, and never sees your name — just your question.</p>
    </div>
  );
}
