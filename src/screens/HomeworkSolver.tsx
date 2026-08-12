/**
 * Homework Helper — photo/camera homework solver (OCR + solve/coach).
 *
 * A child (or parent) photographs a homework page — via a connected webcam or by
 * uploading a saved photo. A vision-capable AI model reads the printed problem(s)
 * and either:
 *  - COACHES: one gentle Socratic guiding question per problem, no answer revealed
 *    (matches this app's coaching philosophy everywhere else — Ask Robo, the
 *    lesson Coach, etc.), or
 *  - SOLVES: the full step-by-step worked solution + final answer, for checking work.
 *
 * Safety / privacy, same model as Ask Robo:
 *  - Only the photo + grade level are ever sent — never the child's name.
 *  - A non-maths photo is refused kindly, never described further.
 *  - Requires a VISION-capable model on the configured AI provider (GPT-4o, Gemini,
 *    Claude, etc.) — a text-only local model will simply fail to read the photo.
 *  - Photos are downscaled client-side before sending and never stored on disk.
 */
import { useEffect, useRef, useState } from "react";
import { AiStatus, ConceptCard, HomeworkProblem, Profile, aiUsable, api } from "../api";
import { autoSpeak, speak } from "../speech";
import { RoboAvatar } from "../components/RoboAvatar";
import { VisualRenderer } from "../components/VisualRenderer";
import { matchLesson } from "../lessonMatch";
import { buildHomeworkVisual, pickHomeworkTool } from "../homeworkAids";
import { openTool } from "../toolBus";

type Mode = "coach" | "solve";
type Stage = "capture" | "preview" | "results";

/** Downscale + re-encode any source image to a small JPEG data URL (keeps the
 *  upload fast/cheap regardless of camera/phone resolution). */
function downscale(src: HTMLVideoElement | HTMLImageElement, maxW = 1280): string {
  const w = "videoWidth" in src ? src.videoWidth : src.naturalWidth;
  const h = "videoHeight" in src ? src.videoHeight : src.naturalHeight;
  const scale = Math.min(1, maxW / (w || maxW));
  const cw = Math.max(1, Math.round((w || maxW) * scale));
  const ch = Math.max(1, Math.round((h || maxW) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(src, 0, 0, cw, ch);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function dataUrlParts(dataUrl: string): { mime: string; base64: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  return m ? { mime: m[1], base64: m[2] } : { mime: "image/jpeg", base64: "" };
}

const REASON_MSG: Record<string, string> = {
  disabled: "The AI Tutor is switched off. A grown-up can turn it on in Parents' Corner → AI Tutor.",
  "local-unreachable": "Robo's offline model isn't running. Ask a grown-up to start Ollama / LM Studio, or switch to a cloud provider in Parents' Corner → AI Tutor.",
  "bad-key": "The AI provider rejected the key. A grown-up can re-check the API key in Parents' Corner → AI Tutor.",
  "image-too-large": "That photo is too large. Please try a smaller or less detailed photo.",
  "image-rejected": "The AI provider couldn't accept that photo. Try a clearer, closer photo of just the problem.",
  "no-image": "No photo was captured. Please try again.",
};
function friendlyError(reason?: string): string {
  if (reason && REASON_MSG[reason]) return REASON_MSG[reason];
  return "Robo couldn't read that photo clearly. Try a closer, well-lit photo showing just one or two problems, or check that your AI provider's model supports reading images (GPT-4o, Gemini, and Claude all do).";
}

export function HomeworkSolver({ profile, concepts, onOpenConcept }: {
  profile: Profile;
  concepts: ConceptCard[];
  /** Open a concept straight into its lesson (same function WorldMap/Ask Robo use). */
  onOpenConcept: (id: string) => void;
}) {
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [stage, setStage] = useState<Stage>("capture");
  const [mode, setMode] = useState<Mode>("coach");
  const [photo, setPhoto] = useState<string | null>(null); // downscaled data URL
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ isMathHomework: boolean; problems: HomeworkProblem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followup, setFollowup] = useState<Record<number, { open: boolean; q: string; a?: string; busy?: boolean }>>({});
  /** Which problem is showing right now — homework is solved one problem per
   *  page, with Prev/Next + jump-to-number navigation between them. */
  const [idx, setIdx] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { api.aiStatus().then(setAi).catch(() => setAi(null)); }, []);
  useEffect(() => () => stopCamera(), []); // stop the webcam if we ever unmount mid-capture

  const usable = aiUsable(ai);
  const camSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  async function startCamera() {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCamOn(true);
      // Wait a tick for the <video> element to mount, then attach the stream.
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = stream; });
    } catch {
      setCamError("Couldn't access a camera. You can upload a photo instead.");
    }
  }

  function capture() {
    if (!videoRef.current) return;
    const dataUrl = downscale(videoRef.current);
    stopCamera();
    setPhoto(dataUrl);
    setStage("preview");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setCamError("Please choose an image file."); return; }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => { setPhoto(downscale(img)); setStage("preview"); };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function retake() {
    setPhoto(null);
    setResult(null);
    setError(null);
    setFollowup({});
    setIdx(0);
    setStage("capture");
  }

  async function analyze() {
    if (!photo) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { mime, base64 } = dataUrlParts(photo);
      const r = await api.aiHomework({ imageBase64: base64, mime, mode });
      if (r.ok) {
        setResult({ isMathHomework: r.isMathHomework !== false, problems: r.problems || [] });
        setIdx(0);
        setStage("results");
        if (r.isMathHomework === false) {
          autoSpeak("That doesn't look like a maths homework page. Try a clearer photo of your maths problems.");
        }
      } else {
        setError(friendlyError(r.reason));
        setStage("results");
      }
    } catch {
      setError("Something went wrong reading that photo. Please try again.");
      setStage("results");
    } finally {
      setBusy(false);
    }
  }

  async function askFollowup(i: number, problem: string) {
    const state = followup[i];
    const q = (state?.q || "").trim();
    if (!q) return;
    setFollowup((prev) => ({ ...prev, [i]: { ...prev[i], open: true, busy: true } }));
    try {
      const r = await api.aiAsk({ question: `About this homework problem: "${problem}". ${q}` });
      const a = r.ok && r.answer ? r.answer : friendlyError(r.reason);
      setFollowup((prev) => ({ ...prev, [i]: { ...prev[i], busy: false, a } }));
      if (r.ok && r.answer) autoSpeak(r.answer);
    } catch {
      setFollowup((prev) => ({ ...prev, [i]: { ...prev[i], busy: false, a: "Something went wrong. Please try again." } }));
    }
  }

  return (
    <div className="fm-hw">
      <header className="fm-hw-head">
        <RoboAvatar size={52} />
        <div>
          <h1>Homework Helper</h1>
          <p className="fm-dash-sub">Photograph or upload a homework page — Robo reads it and helps you solve it.</p>
        </div>
      </header>

      {!usable && (
        <p className="fm-gate-msg">🔒 The AI Tutor is off (or needs setup). A grown-up can switch it on in <strong>Parents' Corner → AI Tutor</strong> — this feature also needs a vision-capable model (GPT-4o, Gemini, or Claude).</p>
      )}

      <div className="fm-hw-mode" role="radiogroup" aria-label="Help style">
        <button className={mode === "coach" ? "active" : ""} onClick={() => setMode("coach")} disabled={!usable}>
          🧭 Coach me <span>Hints only — I'll work it out</span>
        </button>
        <button className={mode === "solve" ? "active" : ""} onClick={() => setMode("solve")} disabled={!usable}>
          ✅ Show solution <span>Full steps + answer</span>
        </button>
      </div>

      {stage === "capture" && (
        <div className="fm-hw-capture">
          {camOn ? (
            <div className="fm-hw-camwrap">
              <video ref={videoRef} autoPlay playsInline muted className="fm-hw-video" />
              <div className="fm-hw-camactions">
                <button className="fm-primary" onClick={capture}>📸 Capture</button>
                <button className="fm-secondary" onClick={stopCamera}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="fm-hw-choices">
              <RoboAvatar size={72} className="big" />
              <p>Show Robo your homework — use the camera, or upload a photo.</p>
              {camError && <p className="fm-hw-camerr">{camError}</p>}
              <div className="fm-hw-buttons">
                <button className="fm-primary" disabled={!usable || !camSupported} onClick={startCamera}>📷 Use Camera</button>
                <button className="fm-secondary" disabled={!usable} onClick={() => fileRef.current?.click()}>🖼️ Upload a Photo</button>
              </div>
              {!camSupported && <p className="fm-hw-hint">No camera detected on this device — upload a photo instead.</p>}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            </div>
          )}
        </div>
      )}

      {stage === "preview" && photo && (
        <div className="fm-hw-preview">
          <img src={photo} alt="Captured homework" className="fm-hw-thumb" />
          <div className="fm-hw-buttons">
            <button className="fm-primary" disabled={busy || !usable} onClick={analyze}>
              {busy ? "Reading…" : mode === "coach" ? "🧭 Coach me on this" : "✅ Solve this"}
            </button>
            <button className="fm-secondary" disabled={busy} onClick={retake}>Retake</button>
          </div>
          {busy && (
            <div className="fm-ar-row bot">
              <RoboAvatar size={34} thinking />
              <div className="fm-ar-bubble bot"><span className="fm-ar-typing"><i /><i /><i /></span></div>
            </div>
          )}
        </div>
      )}

      {stage === "results" && (
        <div className="fm-hw-results">
          {error && <div className="fm-ar-bubble bot err">{error}</div>}

          {result && result.isMathHomework === false && (
            <div className="fm-ar-bubble bot err">That doesn't look like a maths homework page to Robo. Try a clearer photo showing just your maths problem(s).</div>
          )}

          {result && result.isMathHomework && result.problems.length > 0 && (() => {
            const problems = result.problems;
            const total = problems.length;
            const i = Math.min(idx, total - 1);
            const p = problems[i];
            const lesson = matchLesson(p.problem, concepts);
            const visual = buildHomeworkVisual(p.problem);
            const tool = pickHomeworkTool(p.problem);
            const isLast = i === total - 1;
            return (
              <div className="fm-hw-stage">
                {/* Sidebar: photo, jump-to-problem nav, and the concept/tool mapped to THIS problem's type */}
                <aside className="fm-hw-side">
                  {photo && <img src={photo} alt="Captured homework" className="fm-hw-thumb small" />}

                  {total > 1 && (
                    <nav className="fm-hw-jump" aria-label="Jump to problem">
                      {problems.map((_, j) => (
                        <button key={j} className={j === i ? "active" : ""} onClick={() => setIdx(j)} title={`Problem ${j + 1}`}>
                          {j + 1}
                        </button>
                      ))}
                    </nav>
                  )}

                  <div className="fm-hw-related">
                    <h2 className="fm-hw-relatedtitle">🧩 Related help for this problem</h2>
                    {lesson ? (
                      <button className="fm-hw-relatedcard concept" onClick={() => onOpenConcept(lesson.id)}>
                        <span className="fm-hw-relatedicon">📚</span>
                        <span className="fm-hw-relatedtext">
                          <strong>Learn this concept</strong>
                          <span className="fm-hw-relatedsub">{lesson.name} →</span>
                        </span>
                      </button>
                    ) : (
                      <p className="fm-hw-hint">Robo couldn't match a lesson to this one yet — ask below instead.</p>
                    )}
                    {tool && (
                      <button className="fm-hw-relatedcard tool" onClick={() => openTool(tool.id)}>
                        <span className="fm-hw-relatedicon">{tool.icon}</span>
                        <span className="fm-hw-relatedtext">
                          <strong>Practice with a tool</strong>
                          <span className="fm-hw-relatedsub">{tool.label} →</span>
                        </span>
                      </button>
                    )}
                  </div>

                  <button className="fm-secondary fm-hw-retakebtn" onClick={retake}>📷 Try another page</button>
                </aside>

                {/* Main: one problem, full width */}
                <div className="fm-hw-main">
                  <div className="fm-hw-card">
                    <div className="fm-hw-cardhead">
                      <span className="fm-ar-tag">Problem {i + 1}{total > 1 ? ` of ${total}` : ""}</span>
                      <button className="fm-hw-speak" title="Read aloud" onClick={() => speak([p.problem, p.answer, p.question, p.hint].filter(Boolean).join(". "))}>🔊</button>
                    </div>
                    <p className="fm-hw-problem">{p.problem}</p>

                    {visual && (
                      <div className="fm-hw-visual">
                        <VisualRenderer visual={visual} />
                      </div>
                    )}

                    {mode === "solve" && p.steps && (
                      <ol className="fm-hw-steps">
                        {p.steps.map((s, j) => <li key={j}>{s}</li>)}
                      </ol>
                    )}
                    {mode === "solve" && p.answer && (
                      <div className="fm-hw-answer"><span className="fm-ar-tag">Answer</span> {p.answer}</div>
                    )}

                    {mode === "coach" && p.question && (
                      <div className="fm-ar-try"><span className="fm-ar-tag">Think about this</span> {p.question}</div>
                    )}
                    {mode === "coach" && p.hint && (
                      <div className="fm-ar-example"><span className="fm-ar-tag">Hint</span> {p.hint}</div>
                    )}

                    <div className="fm-hw-follow">
                      {!followup[i]?.open ? (
                        <button className="fm-hw-followbtn" disabled={!usable} onClick={() => setFollowup((prev) => ({ ...prev, [i]: { open: true, q: "" } }))}>🤖 Ask Robo a follow-up</button>
                      ) : (
                        <form className="fm-ar-inputbar small" onSubmit={(e) => { e.preventDefault(); askFollowup(i, p.problem); }}>
                          <input className="fm-input" value={followup[i]?.q || ""} placeholder="Ask about this problem…"
                            onChange={(e) => setFollowup((prev) => ({ ...prev, [i]: { ...prev[i], q: e.target.value } }))} />
                          <button className="fm-primary" type="submit" disabled={followup[i]?.busy || !followup[i]?.q?.trim()}>Ask →</button>
                        </form>
                      )}
                      {followup[i]?.busy && <p className="fm-hw-hint">Robo is thinking…</p>}
                      {followup[i]?.a && <p className="fm-ar-answer">{followup[i].a}</p>}
                    </div>
                  </div>

                  {total > 1 && (
                    <div className="fm-hw-pagenav">
                      <button className="fm-secondary" disabled={i === 0} onClick={() => setIdx(i - 1)}>← Previous</button>
                      <span className="fm-hw-pageindicator">{isLast ? "🎉 " : ""}Problem {i + 1} of {total}</span>
                      <button className="fm-primary" disabled={isLast} onClick={() => setIdx(i + 1)}>Next →</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {result && result.isMathHomework && result.problems.length === 0 && (
            <div className="fm-hw-buttons">
              <button className="fm-secondary" onClick={retake}>📷 Try another page</button>
            </div>
          )}

          {(error || (result && result.isMathHomework === false)) && (
            <div className="fm-hw-buttons">
              <button className="fm-secondary" onClick={retake}>📷 Try another page</button>
            </div>
          )}
        </div>
      )}

      <p className="fm-ar-foot">Robo only reads the maths on the page, keeps it kind, and never sees your name — just the photo and your grade.</p>
    </div>
  );
}
