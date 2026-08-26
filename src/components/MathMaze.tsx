/** Math maze — a short branching path. Solve the question at each fork and pick
 *  the branch that heads toward the goal; a wrong pick just shakes and reveals
 *  a hint (fear-free: unlimited retries, no lives lost). Bonus/practice extra,
 *  not wired into the SRS/mastery pipeline. */
import { useState } from "react";
import { Concept } from "../api";
import { cheer, bigCheer } from "../celebrate";

export type MazeSpec = NonNullable<NonNullable<Concept["activityBook"]>["maze"]>;

export function MathMaze({ spec }: { spec: MazeSpec }) {
  const [step, setStep] = useState(0);
  const [wrongBranch, setWrongBranch] = useState<number | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const done = step >= spec.forks.length;
  const fork = !done ? spec.forks[step] : null;

  function pick(branch: 0 | 1) {
    if (!fork) return;
    if (branch === fork.correctBranch) {
      const next = step + 1;
      setStep(next);
      setWrongBranch(null);
      setHintsShown(0);
      if (next >= spec.forks.length) bigCheer();
      else cheer();
    } else {
      setWrongBranch(branch);
      setHintsShown((h) => Math.min(h + 1, fork.q.hintLadder.length));
      setTimeout(() => setWrongBranch(null), 450);
    }
  }

  function reset() { setStep(0); setHintsShown(0); setWrongBranch(null); }

  return (
    <div className="fm-maze">
      <p className="fm-tab-intro">{spec.instructions}</p>
      <div className="fm-maze-trail">
        {spec.forks.map((_, i) => (
          <span key={i} className={`fm-maze-node ${i < step ? "done" : i === step ? "here" : ""}`}>{i < step ? "✓" : i + 1}</span>
        ))}
        <span className={`fm-maze-node fm-maze-goal ${done ? "done" : ""}`}>🏁</span>
      </div>

      {done ? (
        <div className="fm-maze-done">
          <p>🏆 You made it! {spec.goalLabel}</p>
          <button className="fm-secondary" onClick={reset}>↺ Run the maze again</button>
        </div>
      ) : fork ? (
        <div className="fm-maze-fork">
          <p className="fm-maze-q">{fork.q.q}</p>
          <div className="fm-maze-branches">
            <button
              className={`fm-maze-branch ${wrongBranch === 0 ? "wrong" : ""}`}
              onClick={() => pick(0)}
            >
              {fork.branches[0]}
            </button>
            <button
              className={`fm-maze-branch ${wrongBranch === 1 ? "wrong" : ""}`}
              onClick={() => pick(1)}
            >
              {fork.branches[1]}
            </button>
          </div>
          {hintsShown > 0 && (
            <p className="fm-maze-hint">💡 {fork.q.hintLadder[Math.min(hintsShown - 1, fork.q.hintLadder.length - 1)]}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
