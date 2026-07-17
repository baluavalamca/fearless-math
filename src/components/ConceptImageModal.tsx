/**
 * "✨ Picture it" popup — shows a colourful AI-illustrated poster for a concept
 * or its story. Images are generated once via the main process (OpenAI) and
 * CACHED on disk per concept+style, so re-opening reuses the same picture
 * instantly instead of regenerating. Degrades gracefully with no API key.
 */
import { useEffect, useState } from "react";
import { Concept, MediaStatus, api } from "../api";
import { speak, stopSpeaking, isSpeechAvailable } from "../speech";

type StyleKey = "story" | "poster" | "board";
const STYLES: { key: StyleKey; label: string }[] = [
  { key: "story", label: "📖 Story scene" },
  { key: "poster", label: "🌈 Concept art" },
  { key: "board", label: "🧑‍🏫 Blackboard" },
];

/** Build a rich, kid-friendly image prompt from the verified concept content.
 *  The EXACT concept text is embedded so the poster shows the same content the
 *  child is learning; gpt-image-2 renders the wording accurately. */
export function buildImagePrompt(concept: Concept, style: StyleKey): string {
  const clip = (s: string, n: number) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const style_ =
    "Style: bright, friendly children's educational illustration for Indian primary school — flat " +
    "vector cartoon, thick rounded outlines, cheerful colours, warm cream background, cute happy " +
    "Indian kids. Render ALL text large, tidy and spelled EXACTLY as given (British/Indian English), " +
    "no gibberish letters, no watermark. Wide 16:9 landscape composition, neatly organised, nothing cropped.";

  if (style === "story") {
    return (
      `A warm illustrated STORY-SCENE picture for Indian children that shows this exact story so a ` +
      `child can follow it by looking. Title at top: "${concept.story.title}".\n` +
      `STORY (depict this scene faithfully): ${clip(concept.story.text, 1200)}\n` +
      `Characters: ${(concept.story.characters || []).join(", ")}. Setting: an Indian ` +
      `home / market / village that fits the story.\n` +
      `Add a small caption box at the bottom with this exact text — Question: ` +
      `"${clip(concept.story.extractedProblem, 200)}"  Answer: "${clip(concept.story.answerInStory, 160)}".\n` +
      style_
    );
  }
  if (style === "board") {
    return (
      `A friendly Indian teacher standing at a green CHALKBOARD teaching "${concept.name}" to happy ` +
      `children sitting in a bright classroom.\n` +
      `On the board, hand-write this method neatly in chalk (use this exact wording): ` +
      `"${clip(concept.standardMethod.summary, 300)}"  Steps: ${(concept.standardMethod.steps || []).slice(0, 4).map((s, i) => `${i + 1}) ${clip(s, 90)}`).join("  ")}.\n` +
      `Big chalk title on the board: "${concept.name}".\n` +
      style_
    );
  }
  // poster — mirror the on-screen concept card: What / Why / Where / Words
  return (
    `A colourful educational INFOGRAPHIC POSTER titled "${concept.name}" for Indian primary-school ` +
    `children, with four clearly separated, numbered, titled panels. Use this EXACT text:\n` +
    `Panel 1 "What is it?": ${clip(concept.whatIsIt, 300)}\n` +
    `Panel 2 "Why do we need it?": ${clip(concept.whyNeeded, 260)}\n` +
    `Panel 3 "Where do we see it?": ${(concept.realLifeUses || []).slice(0, 4).map((u) => clip(u, 60)).join("; ")}\n` +
    `Panel 4 "Words to know": ${(concept.vocabulary || []).slice(0, 4).map((v) => `${v.term} = ${clip(v.meaning, 50)}`).join("; ")}\n` +
    `Two happy Indian kids (a boy and a girl) at the top with small speech bubbles. ` +
    `A cheerful reminder ribbon at the bottom.\n` +
    style_
  );
}

/** The exact words to READ ALOUD for each style — the same content shown. */
export function readoutText(concept: Concept, style: StyleKey): string {
  if (style === "story") {
    return `${concept.story.title}. ${concept.story.text} The question is: ${concept.story.extractedProblem} And the answer is: ${concept.story.answerInStory}`;
  }
  if (style === "board") {
    return `${concept.standardMethod.summary} Here are the steps. ${(concept.standardMethod.steps || []).join(". ")}`;
  }
  return (
    `What is it? ${concept.whatIsIt} ` +
    `Why do we need it? ${concept.whyNeeded} ` +
    `Where do we see it in life? ${(concept.realLifeUses || []).join(". ")} ` +
    `Words to know: ${(concept.vocabulary || []).map((v) => `${v.term} means ${v.meaning}`).join(". ")}`
  );
}

export function ConceptImageModal({
  concept,
  initialStyle = "story",
  onClose,
}: {
  concept: Concept;
  initialStyle?: StyleKey;
  onClose: () => void;
}) {
  const [style, setStyle] = useState<StyleKey>(initialStyle);
  const [media, setMedia] = useState<MediaStatus | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => { api.mediaStatus().then(setMedia).catch(() => setMedia(null)); }, []);
  // Stop any readout when the popup closes.
  useEffect(() => () => stopSpeaking(), []);

  function toggleRead() {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    setSpeaking(true);
    const voiceStyle = style === "story" ? "story" : style === "board" ? "board" : "concept";
    speak(readoutText(concept, style), () => setSpeaking(false), { style: voiceStyle });
  }

  // On open + whenever the style changes, show the cached picture if we have one.
  useEffect(() => {
    let alive = true;
    setImg(null); setCached(false); setError(null);
    stopSpeaking(); setSpeaking(false); // switching style stops the old readout
    api.getCachedImage({ conceptId: concept.id, style }).then((r) => {
      if (alive && r.ok && r.dataUrl) { setImg(r.dataUrl); setCached(true); }
    });
    return () => { alive = false; };
  }, [concept.id, style]);

  async function generate(force: boolean) {
    setBusy(true); setError(null);
    const prompt = buildImagePrompt(concept, style);
    const r = await api.generateImage({ conceptId: concept.id, style, prompt, force });
    setBusy(false);
    if (r.ok && r.dataUrl) { setImg(r.dataUrl); setCached(!!r.cached); }
    else setError(r.error === "no-image-key" ? "no-key" : (r.error || "failed"));
  }

  const keyReady = !!media && media.image.enabled && media.image.hasKey && media.online;

  return (
    <div className="fm-modal-backdrop" onClick={onClose}>
      <div className="fm-modal fm-img-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fm-modal-head">
          <h2>✨ Picture it — {concept.name}</h2>
          <button className="fm-modal-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <div className="fm-img-styles">
          {STYLES.map((s) => (
            <button key={s.key} className={style === s.key ? "active" : ""} onClick={() => setStyle(s.key)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="fm-img-stage">
          {img && <img src={img} alt={`${concept.name} ${style}`} className="fm-img-poster" />}
          {!img && !busy && (
            <div className="fm-img-empty">
              {keyReady
                ? <p>Tap <strong>Generate picture</strong> to draw this {style === "story" ? "story" : "concept"}. It’s saved after, so next time it opens instantly.</p>
                : <p>🔒 Picture posters are off. A grown-up can switch them on in <strong>Parents’ Corner → Picture posters</strong> and add an image API key.</p>}
            </div>
          )}
          {busy && <div className="fm-img-empty"><p>🎨 Drawing your picture… this takes a few seconds.</p></div>}
          {error === "no-key" && <p className="fm-img-error">Needs an image API key — set it in Parents’ Corner.</p>}
          {error && error !== "no-key" && <p className="fm-img-error">Couldn’t draw it ({error}). Please try again.</p>}
        </div>

        <div className="fm-img-actions">
          {isSpeechAvailable() && (
            <button className={`fm-read-btn ${speaking ? "on" : ""}`} onClick={toggleRead}>
              {speaking ? "⏹ Stop" : `🔊 Read this ${style === "story" ? "story" : style === "board" ? "method" : "to me"}`}
            </button>
          )}
          {cached && img && <span className="fm-img-note">💾 Saved — reused instantly</span>}
          {keyReady && !img && <button className="fm-primary" disabled={busy} onClick={() => generate(false)}>Generate picture 🎨</button>}
          {keyReady && img && <button className="fm-secondary" disabled={busy} onClick={() => generate(true)}>Draw a new one 🔁</button>}
          <button className="fm-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
