/** Speaker button — click to hear the text, click again to stop. */
import { useEffect, useState } from "react";
import { isSpeechAvailable, speak, stopSpeaking, SpeakStyle } from "../speech";

export function SpeakButton({ text, label = "Read aloud", style = "concept" }: { text: string; label?: string; style?: SpeakStyle }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => { if (speaking) stopSpeaking(); }, [speaking]);

  if (!isSpeechAvailable()) return null;

  return (
    <button
      className={`fm-speak ${speaking ? "speaking" : ""}`}
      aria-label={speaking ? "Stop reading" : label}
      title={speaking ? "Stop" : label}
      onClick={() => {
        if (speaking) { stopSpeaking(); setSpeaking(false); }
        else { setSpeaking(true); speak(text, () => setSpeaking(false), { style }); }
      }}
    >
      {speaking ? "⏹" : "🔊"}
    </button>
  );
}
