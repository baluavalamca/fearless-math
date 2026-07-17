/**
 * GameHud — a home-screen gamification band: Level + XP, streak flame,
 * a class-mastery activity ring, and a badge shelf. Built entirely from data
 * the app already has (mastered count, streak, badges) — no new tracking.
 */
import { useEffect, useState } from "react";
import { ConceptCard, api } from "../api";

const XP_PER_CONCEPT = 100;
const XP_PER_LEVEL = 300; // 3 mastered concepts per level

const BADGE_EMOJI: Record<string, string> = {
  "explained-it": "🎓",
  "tried-again": "💪",
  "fixed-my-mistake": "🔧",
};
const BADGE_NAME: Record<string, string> = {
  "explained-it": "Explained it!",
  "tried-again": "Tried again",
  "fixed-my-mistake": "Fixed my mistake",
};

export function GameHud({ concepts, streak }: { concepts: ConceptCard[]; streak: number }) {
  const [badges, setBadges] = useState<{ badge_id: string }[]>([]);
  useEffect(() => { api.listBadges().then((b) => setBadges(b || [])).catch(() => setBadges([])); }, []);

  const mastered = concepts.filter((c) => c.status === "mastered").length;
  const total = concepts.length || 1;
  const xp = mastered * XP_PER_CONCEPT;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  const lvlPct = Math.round((intoLevel / XP_PER_LEVEL) * 100);
  const toNext = XP_PER_LEVEL - intoLevel;
  const journeyPct = mastered / total;

  const R = 26, CIRC = 2 * Math.PI * R;

  return (
    <div className="fm-hud" aria-label="Your progress">
      <div className="fm-hud-card fm-hud-level">
        <div className="fm-hud-lvl-badge">Lv {level}</div>
        <div className="fm-hud-lvl-body">
          <span className="fm-hud-lvl-xp">{xp.toLocaleString()} XP</span>
          <span className="fm-hud-bar"><span style={{ width: `${lvlPct}%` }} /></span>
          <span className="fm-hud-lvl-next">{toNext} XP to Level {level + 1}</span>
        </div>
      </div>

      <div className="fm-hud-card fm-hud-streak">
        <span className="fm-hud-flame" aria-hidden>🔥</span>
        <div className="fm-hud-streak-body"><b>{streak}</b><span>day streak</span></div>
      </div>

      <div className="fm-hud-card fm-hud-ring">
        <svg viewBox="0 0 64 64" width={58} height={58} role="img" aria-label={`${Math.round(journeyPct * 100)} percent of this class mastered`}>
          <circle cx="32" cy="32" r={R} className="fm-ring-track" />
          <circle cx="32" cy="32" r={R} className="fm-ring-fill"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - journeyPct)} transform="rotate(-90 32 32)" />
          <text x="32" y="37" textAnchor="middle" className="fm-ring-label">{Math.round(journeyPct * 100)}%</text>
        </svg>
        <span className="fm-hud-ring-label">class mastered</span>
      </div>

      <div className="fm-hud-card fm-hud-badges">
        <span className="fm-hud-badges-title">🏅 Badges</span>
        <div className="fm-hud-badge-shelf">
          {badges.length
            ? badges.slice(0, 8).map((b, i) => (
                <span key={i} className="fm-hud-badge" title={BADGE_NAME[b.badge_id] ?? b.badge_id}>
                  {BADGE_EMOJI[b.badge_id] ?? "🏅"}
                </span>
              ))
            : <span className="fm-hud-badge-empty">Earn your first badge!</span>}
        </div>
      </div>
    </div>
  );
}
