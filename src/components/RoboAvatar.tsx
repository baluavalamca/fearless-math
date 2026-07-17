/**
 * RoboAvatar — the custom "Robo Reason" mascot logo (inline SVG).
 *
 * Replaces the plain 🤖 emoji so the tutor has a real, consistent identity:
 * a friendly robot on a violet→cyan tile, with a little "π" maths chip.
 * Self-contained (fixed brand colours) so it looks identical on any surface,
 * crisp at every size, and needs no image files. `thinking` gives a gentle
 * blink while a reply is loading (disabled under prefers-reduced-motion).
 */
export function RoboAvatar({ size = 48, thinking = false, className = "" }: {
  size?: number;
  thinking?: boolean;
  className?: string;
}) {
  const gid = "robo-bg";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"
      className={`fm-robo ${thinking ? "thinking" : ""} ${className}`} role="img" aria-label="Robo, your maths helper">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="0.55" stopColor="#4f7bff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${gid})`} />
      {/* antenna */}
      <line x1="32" y1="13" x2="32" y2="7" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="6" r="2.6" fill="#ffd24d" />
      {/* side ears */}
      <rect x="10" y="26" width="5" height="11" rx="2.5" fill="#ffd24d" />
      <rect x="49" y="26" width="5" height="11" rx="2.5" fill="#ffd24d" />
      {/* head */}
      <rect x="14" y="15" width="36" height="30" rx="11" fill="#ffffff" />
      {/* screen face */}
      <rect x="19" y="20" width="26" height="17" rx="7" fill="#14213a" />
      {/* eyes */}
      <g className="fm-robo-eyes">
        <circle cx="26" cy="28" r="3.2" fill="#34e1ff" />
        <circle cx="38" cy="28" r="3.2" fill="#34e1ff" />
        <circle cx="27" cy="26.8" r="1" fill="#ffffff" />
        <circle cx="39" cy="26.8" r="1" fill="#ffffff" />
      </g>
      {/* smile */}
      <path d="M26 33 Q32 37 38 33" stroke="#34e1ff" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* maths chip */}
      <rect x="24" y="47" width="16" height="9" rx="4" fill="#ffffff" />
      <text x="32" y="53.6" textAnchor="middle" fontSize="7" fontWeight="800" fill="#4f7bff" fontFamily="system-ui, sans-serif">π</text>
    </svg>
  );
}
