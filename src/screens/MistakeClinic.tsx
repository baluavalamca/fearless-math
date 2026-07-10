/**
 * Mistake Clinic — the child's own wrong answers come back as friendly
 * "fix-it" puzzles. Fixing one earns the Fixed My Mistake badge.
 */
import { useEffect, useState } from "react";
import { ClinicItem, api } from "../api";
import { VisualRenderer, VisualSpec } from "../components/VisualRenderer";
import { SpeakButton } from "../components/SpeakButton";
import { Character } from "../components/Characters";

export function MistakeClinic() {
  const [items, setItems] = useState<ClinicItem[] | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  async function refresh() {
    setItems(await api.clinicList());
    setOpenIdx(null);
  }
  useEffect(() => { refresh(); }, []);

  if (!items) return <div className="fm-loading">Robo Reason is checking the clinic… 🤖</div>;

  if (!items.length) {
    return (
      <div className="fm-celebrate">
        <h1>🏥 Mistake Clinic</h1>
        <p>All clear — no mistakes waiting to be fixed! 🌟</p>
        <p className="fm-callout">Every mistake you fix makes your math stronger. Come back after more practice!</p>
      </div>
    );
  }

  return (
    <div className="fm-clinic">
      <div className="fm-clinic-hero">
        <Character name="Robo Reason" mood="happy" size={84} />
        <div>
          <h1>🏥 Mistake Clinic</h1>
          <p className="fm-sub">
            Robo Reason kept {items.length} puzzle{items.length > 1 ? "s" : ""} for you —
            questions that tricked you before. Fix them and earn badges!
          </p>
        </div>
      </div>
      {items.map((item, i) => (
        <ClinicCard
          key={item.conceptId + item.question.id}
          item={item}
          open={openIdx === i}
          onOpen={() => setOpenIdx(openIdx === i ? null : i)}
          onFixed={refresh}
        />
      ))}
    </div>
  );
}

function ClinicCard({
  item, open, onOpen, onFixed,
}: {
  item: ClinicItem; open: boolean; onOpen: () => void; onFixed: () => void;
}) {
  const q = item.question;
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"fixed" | "not-yet" | null>(null);
  const [fixShown, setFixShown] = useState(false);
  const qVisual = q.visual as VisualSpec | undefined;

  async function submit(given: string) {
    const v = await api.submitAnswer({
      conceptId: item.conceptId, questionId: q.id,
      context: "clinic", answer: given, hintsUsed: fixShown ? 1 : 0,
    });
    setResult(v.correct ? "fixed" : "not-yet");
  }

  return (
    <section className={`fm-clinic-card ${open ? "open" : ""}`}>
      <button className="fm-clinic-head" onClick={onOpen}>
        <span className="fm-clinic-title">🔧 {item.conceptName}</span>
        <span className="fm-clinic-tries">tried {item.tries}×</span>
      </button>

      {open && (
        <div className="fm-clinic-body">
          <h2 className="fm-question">
            {q.q} <SpeakButton text={q.q} label="Read the puzzle aloud" />
          </h2>
          {qVisual?.component && <VisualRenderer visual={qVisual} />}

          {item.mistake && (
            <div className="fm-callout">
              <button className="fm-secondary" onClick={() => setFixShown(!fixShown)}>
                🤖 {fixShown ? "Hide" : "Show"} Robo Reason's tip
              </button>
              {fixShown && <p><strong>Last time:</strong> {item.mistake.mistake}<br /><strong>The fix:</strong> {item.mistake.fix}</p>}
            </div>
          )}

          {result !== "fixed" && (
            q.type === "mcq" ? (
              <div className="fm-options">
                {q.options!.map((o) => (
                  <button key={o.label} className="fm-option" onClick={() => submit(o.label)}>{o.label}</button>
                ))}
              </div>
            ) : (
              <div className="fm-answer-row">
                <input
                  className="fm-input" value={answer}
                  placeholder={q.type === "fraction" ? "like 3/4" : "your answer"}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && answer && submit(answer)}
                />
                <button className="fm-primary" disabled={!answer} onClick={() => submit(answer)}>Fix it! 🔧</button>
              </div>
            )
          )}

          {result === "fixed" && (
            <div className="fm-feedback good">
              <p>🌟 FIXED! That mistake can't trick you any more.</p>
              <p className="fm-badge-note">🏅 Badge earned: Fixed My Mistake!</p>
              <button className="fm-primary" onClick={onFixed}>Next puzzle →</button>
            </div>
          )}
          {result === "not-yet" && (
            <div className="fm-feedback again">
              <p>Not yet — but you're closer! Read Robo's tip and try once more. 💪</p>
              <button className="fm-primary" onClick={() => { setResult(null); setFixShown(true); }}>Try again</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
