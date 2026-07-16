/**
 * ConceptInfographic — a one-page visual summary ("poster") of a concept, auto-built
 * from the lesson's own data (no extra authoring). Dual-coding: the whole idea at a
 * glance — definition, key steps, one example, a trap to avoid, and the remember-line.
 */
import { Concept } from "../api";
import { VisualRenderer, VisualSpec } from "./VisualRenderer";

export function ConceptInfographic({ concept }: { concept: Concept }) {
  const ex = (concept.workedExamples ?? [])[0];
  const mistake = (concept.commonMistakes ?? [])[0];
  const steps = concept.standardMethod?.steps ?? [];
  const uses = (concept.realLifeUses ?? []).slice(0, 3);

  return (
    <div className="fm-infographic">
      <header className="fm-ig-head">
        <h3>{concept.name}</h3>
        <span className="fm-ig-sub">Class {concept.grade} · one-page summary</span>
      </header>

      <section className="fm-ig-def">
        <span className="fm-ig-label">💡 What it is</span>
        <p>{concept.whatIsIt}</p>
      </section>

      {concept.visual?.component && (
        <section className="fm-ig-visual">
          <VisualRenderer visual={concept.visual as VisualSpec} />
        </section>
      )}

      <div className="fm-ig-grid">
        {steps.length > 0 && (
          <section className="fm-ig-card">
            <span className="fm-ig-label">🪜 How to do it</span>
            <ol>{steps.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}</ol>
          </section>
        )}
        {ex && (
          <section className="fm-ig-card">
            <span className="fm-ig-label">✅ Example</span>
            <p className="fm-ig-ex-q">{ex.problem}</p>
            <p className="fm-ig-ex-a"><strong>→ {ex.answer}</strong></p>
          </section>
        )}
        {mistake && (
          <section className="fm-ig-card fm-ig-warn">
            <span className="fm-ig-label">⚠️ Avoid this</span>
            <p>{mistake.fix}</p>
          </section>
        )}
        {uses.length > 0 && (
          <section className="fm-ig-card">
            <span className="fm-ig-label">🌍 Where it's used</span>
            <ul>{uses.map((u, i) => <li key={i}>{u}</li>)}</ul>
          </section>
        )}
      </div>

      {(concept.vocabulary ?? []).length > 0 && (
        <section className="fm-ig-terms">
          <span className="fm-ig-label">🔑 Key words</span>
          <div className="fm-ig-chips">
            {concept.vocabulary.map((v) => <span key={v.term} className="fm-ig-chip" title={v.meaning}>{v.term}</span>)}
          </div>
        </section>
      )}

      <footer className="fm-ig-remember">
        📝 Remember: {concept.revisionCard?.summary}
      </footer>

      <button className="fm-secondary fm-ig-print" onClick={() => window.print()}>🖨️ Print / Save</button>
    </div>
  );
}
