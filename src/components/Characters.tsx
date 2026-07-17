/**
 * Original FearlessMath character cast — flat SVG, no external assets.
 * Movie-archetype-inspired but 100% original (no licensing risk).
 * Moods: happy | think | celebrate
 */

export type Mood = "happy" | "think" | "celebrate";

export function Character({
  name,
  mood = "happy",
  size = 64,
}: {
  name: string;
  mood?: Mood;
  size?: number;
}) {
  const n = name.toLowerCase();
  const Body = n.includes("fox") ? Fox
    : n.includes("monkey") || n.includes("multi") ? Monkey
    : n.includes("divya") || n.includes("divider") ? Divya
    : n.includes("count") || n.includes("captain") ? CaptainCount
    : n.includes("ant") && !n.includes("anthropic") ? Ant
    : n.includes("subbu") || n.includes("squirrel") ? Squirrel
    : Robo;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={name}
      className={`fm-char fm-char-${mood}`}>
      <Body mood={mood} />
      {mood === "celebrate" && <Confetti />}
    </svg>
  );
}

/* ---------- shared bits ---------- */

function Eyes({ mood, y = 36, dx = 9 }: { mood: Mood; y?: number; dx?: number }) {
  return mood === "think" ? (
    <>
      <circle cx={50 - dx} cy={y} r={2.6} fill="#2c2018" />
      <circle cx={50 + dx} cy={y} r={2.6} fill="#2c2018" />
      <path d={`M ${50 - dx - 5} ${y - 8} q 5 -4 10 -1`} stroke="#2c2018" strokeWidth={2} fill="none" />
    </>
  ) : (
    <>
      <circle cx={50 - dx} cy={y} r={3.2} fill="#2c2018" />
      <circle cx={50 + dx} cy={y} r={3.2} fill="#2c2018" />
      <circle cx={50 - dx + 1} cy={y - 1} r={1} fill="#fff" />
      <circle cx={50 + dx + 1} cy={y - 1} r={1} fill="#fff" />
    </>
  );
}

function Mouth({ mood, y = 47 }: { mood: Mood; y?: number }) {
  if (mood === "celebrate") return <ellipse cx={50} cy={y + 2} rx={6} ry={4.5} fill="#7c2d12" />;
  if (mood === "think") return <path d={`M 44 ${y + 2} h 12`} stroke="#7c2d12" strokeWidth={2.5} strokeLinecap="round" fill="none" />;
  return <path d={`M 43 ${y} q 7 7 14 0`} stroke="#7c2d12" strokeWidth={2.5} strokeLinecap="round" fill="none" />;
}

function Confetti() {
  const pts: [number, number, string][] = [
    [14, 16, "#ff9f43"], [86, 14, "#7d6bd1"], [10, 52, "#2e7d32"],
    [90, 48, "#e0525e"], [22, 6, "#4a7fd4"], [76, 4, "#e8b04b"],
  ];
  return (
    <>
      {pts.map(([x, y, c], i) => (
        <path key={i} d={`M ${x} ${y} l 2.2 4.6 5 .5 -3.7 3.4 1 4.9 -4.5 -2.5 -4.5 2.5 1 -4.9 -3.7 -3.4 5 -.5 z`} fill={c} transform={`scale(0.55) translate(${x * 0.8}, ${y * 0.8})`} />
      ))}
    </>
  );
}

/* ---------- the cast ---------- */

function Fox({ mood }: { mood: Mood }) {
  return (
    <>
      {/* tail */}
      <path d="M 76 78 q 20 -6 16 -26 q -2 12 -14 14 z" fill="#f28f3c" stroke="#b35f1b" strokeWidth={2} />
      <path d="M 88 58 q 3 6 -2 10 l -4 -6 z" fill="#fff4e6" />
      {/* body */}
      <ellipse cx={50} cy={74} rx={24} ry={18} fill="#f28f3c" stroke="#b35f1b" strokeWidth={2.5} />
      <ellipse cx={50} cy={79} rx={13} ry={10} fill="#fff4e6" />
      {/* ears */}
      <path d="M 30 26 L 36 8 L 46 22 Z" fill="#f28f3c" stroke="#b35f1b" strokeWidth={2.5} />
      <path d="M 70 26 L 64 8 L 54 22 Z" fill="#f28f3c" stroke="#b35f1b" strokeWidth={2.5} />
      <path d="M 34 22 L 37 13 L 42 20 Z" fill="#fff4e6" />
      <path d="M 66 22 L 63 13 L 58 20 Z" fill="#fff4e6" />
      {/* head */}
      <circle cx={50} cy={38} r={22} fill="#f28f3c" stroke="#b35f1b" strokeWidth={2.5} />
      <ellipse cx={50} cy={46} rx={12} ry={9} fill="#fff4e6" />
      <Eyes mood={mood} />
      <ellipse cx={50} cy={44} rx={3} ry={2.4} fill="#2c2018" />
      <Mouth mood={mood} y={49} />
    </>
  );
}

function Monkey({ mood }: { mood: Mood }) {
  return (
    <>
      {/* big side ears */}
      <circle cx={24} cy={36} r={9} fill="#a9743f" stroke="#6f4a24" strokeWidth={2.5} />
      <circle cx={76} cy={36} r={9} fill="#a9743f" stroke="#6f4a24" strokeWidth={2.5} />
      <circle cx={24} cy={36} r={4.5} fill="#e8c39a" />
      <circle cx={76} cy={36} r={4.5} fill="#e8c39a" />
      {/* body + curly tail */}
      <path d="M 74 80 q 16 2 14 -12 q -1 8 -10 7" fill="none" stroke="#6f4a24" strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={50} cy={75} rx={23} ry={17} fill="#a9743f" stroke="#6f4a24" strokeWidth={2.5} />
      <ellipse cx={50} cy={79} rx={12} ry={9} fill="#e8c39a" />
      {/* head */}
      <circle cx={50} cy={38} r={22} fill="#a9743f" stroke="#6f4a24" strokeWidth={2.5} />
      <path d="M 32 42 a 18 16 0 0 1 36 0 a 18 20 0 0 1 -36 0" fill="#e8c39a" />
      {/* mango in hand */}
      <ellipse cx={22} cy={70} rx={7} ry={9} fill="#ffb43a" stroke="#b35f1b" strokeWidth={2} transform="rotate(-15 22 70)" />
      <path d="M 24 61 q 4 -4 7 -2" stroke="#2e7d32" strokeWidth={2.5} fill="none" />
      <Eyes mood={mood} y={38} />
      <Mouth mood={mood} y={50} />
    </>
  );
}

function Divya({ mood }: { mood: Mood }) {
  return (
    <>
      {/* body */}
      <ellipse cx={50} cy={75} rx={23} ry={17} fill="#7d6bd1" stroke="#4c3e96" strokeWidth={2.5} />
      <ellipse cx={50} cy={79} rx={12} ry={9} fill="#efeaff" />
      {/* dealing cards fan */}
      <g stroke="#4c3e96" strokeWidth={1.8} fill="#fffdf6">
        <rect x={12} y={62} width={12} height={16} rx={2} transform="rotate(-18 18 70)" />
        <rect x={17} y={60} width={12} height={16} rx={2} transform="rotate(-4 23 68)" />
        <rect x={22} y={60} width={12} height={16} rx={2} transform="rotate(10 28 68)" />
      </g>
      <text x={23} y={72} fontSize={8} fill="#7d6bd1" fontWeight={700}>÷</text>
      {/* head + bow */}
      <circle cx={50} cy={38} r={22} fill="#7d6bd1" stroke="#4c3e96" strokeWidth={2.5} />
      <ellipse cx={50} cy={44} rx={12} ry={9} fill="#efeaff" />
      <path d="M 58 14 l 10 -6 -2 10 10 -2 -6 9 q -6 -6 -12 -11 z" fill="#e0525e" stroke="#a02c37" strokeWidth={2} />
      <Eyes mood={mood} />
      <Mouth mood={mood} y={48} />
    </>
  );
}

function CaptainCount({ mood }: { mood: Mood }) {
  return (
    <>
      {/* body with belt */}
      <ellipse cx={50} cy={75} rx={23} ry={17} fill="#4a7fd4" stroke="#2b549c" strokeWidth={2.5} />
      <rect x={34} y={72} width={32} height={6} rx={3} fill="#e8b04b" stroke="#b3841b" strokeWidth={1.5} />
      {/* head */}
      <circle cx={50} cy={40} r={21} fill="#ffd9a8" stroke="#c99b62" strokeWidth={2.5} />
      {/* captain hat */}
      <path d="M 27 26 q 23 -16 46 0 l -3 8 q -20 -10 -40 0 z" fill="#2b549c" stroke="#1d3a6e" strokeWidth={2} />
      <rect x={27} y={30} width={46} height={6} rx={3} fill="#1d3a6e" />
      <circle cx={50} cy={24} r={6} fill="#e8b04b" stroke="#b3841b" strokeWidth={1.5} />
      <text x={50} y={27.5} fontSize={9} textAnchor="middle" fontWeight={700} fill="#1d3a6e">1</text>
      <Eyes mood={mood} y={42} />
      <Mouth mood={mood} y={52} />
    </>
  );
}

function Ant({ mood }: { mood: Mood }) {
  return (
    <>
      {/* legs */}
      <g stroke="#7a2e12" strokeWidth={2.5} strokeLinecap="round">
        <line x1={40} y1={78} x2={30} y2={92} /><line x1={50} y1={80} x2={50} y2={94} /><line x1={60} y1={78} x2={70} y2={92} />
      </g>
      {/* abdomen + thorax */}
      <ellipse cx={62} cy={72} rx={16} ry={13} fill="#c0492b" stroke="#7a2e12" strokeWidth={2.5} />
      <ellipse cx={44} cy={68} rx={11} ry={10} fill="#c0492b" stroke="#7a2e12" strokeWidth={2.5} />
      {/* sugar cube held up */}
      <rect x={14} y={52} width={14} height={14} rx={2} fill="#fffdf6" stroke="#b9a67e" strokeWidth={2} />
      <line x1={28} y1={62} x2={36} y2={66} stroke="#7a2e12" strokeWidth={2.5} strokeLinecap="round" />
      {/* head + antennae */}
      <circle cx={44} cy={40} r={17} fill="#e0603c" stroke="#7a2e12" strokeWidth={2.5} />
      <path d="M 36 26 q -6 -10 -14 -8" fill="none" stroke="#7a2e12" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M 52 26 q 6 -10 14 -8" fill="none" stroke="#7a2e12" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={22} cy={17} r={3} fill="#7a2e12" /><circle cx={66} cy={17} r={3} fill="#7a2e12" />
      <Eyes mood={mood} y={38} dx={7} />
      <Mouth mood={mood} y={47} />
    </>
  );
}

function Squirrel({ mood }: { mood: Mood }) {
  return (
    <>
      {/* big curled tail */}
      <path d="M 72 82 q 26 -4 24 -30 q -2 -20 -20 -22 q 12 6 12 22 q 0 18 -18 22 z"
        fill="#9c6b46" stroke="#5f3c22" strokeWidth={2.5} />
      {/* body */}
      <ellipse cx={48} cy={74} rx={21} ry={17} fill="#b98354" stroke="#5f3c22" strokeWidth={2.5} />
      <ellipse cx={48} cy={78} rx={11} ry={9} fill="#f3e2cd" />
      {/* acorn */}
      <ellipse cx={22} cy={72} rx={6} ry={8} fill="#a97a3f" stroke="#5f3c22" strokeWidth={2} />
      <path d="M 15 68 q 7 -5 14 0 l -1 3 q -6 -3 -12 0 z" fill="#5f3c22" />
      {/* ears */}
      <path d="M 34 24 q -2 -12 8 -14 q 2 8 -1 13 z" fill="#b98354" stroke="#5f3c22" strokeWidth={2.5} />
      <path d="M 62 24 q 2 -12 -8 -14 q -2 8 1 13 z" fill="#b98354" stroke="#5f3c22" strokeWidth={2.5} />
      {/* head */}
      <circle cx={48} cy={38} r={20} fill="#b98354" stroke="#5f3c22" strokeWidth={2.5} />
      <ellipse cx={48} cy={45} rx={11} ry={8} fill="#f3e2cd" />
      {/* buck teeth */}
      <rect x={44} y={50} width={4} height={6} rx={1} fill="#fff" stroke="#5f3c22" strokeWidth={1} />
      <rect x={49} y={50} width={4} height={6} rx={1} fill="#fff" stroke="#5f3c22" strokeWidth={1} />
      <Eyes mood={mood} y={36} dx={8} />
      <ellipse cx={48} cy={43} rx={2.6} ry={2} fill="#2c2018" />
    </>
  );
}

function Robo({ mood }: { mood: Mood }) {
  return (
    <>
      {/* antenna */}
      <line x1={50} y1={12} x2={50} y2={22} stroke="#5d6b78" strokeWidth={3} />
      <circle cx={50} cy={10} r={4} fill="#e0525e" />
      {/* head */}
      <rect x={28} y={22} width={44} height={34} rx={9} fill="#aeb9c4" stroke="#5d6b78" strokeWidth={2.5} />
      {/* digital eyes */}
      {mood === "think" ? (
        <>
          <rect x={37} y={34} width={10} height={4} rx={2} fill="#1c2733" />
          <rect x={53} y={32} width={10} height={7} rx={2} fill="#1c2733" />
        </>
      ) : (
        <>
          <rect x={37} y={32} width={10} height={8} rx={2} fill="#1c2733" />
          <rect x={53} y={32} width={10} height={8} rx={2} fill="#1c2733" />
          <rect x={39} y={34} width={3} height={3} fill="#7ef0c0" />
          <rect x={55} y={34} width={3} height={3} fill="#7ef0c0" />
        </>
      )}
      {/* mouth grill */}
      {mood === "celebrate"
        ? <rect x={41} y={46} width={18} height={6} rx={3} fill="#1c2733" />
        : <path d="M 42 49 h 16" stroke="#1c2733" strokeWidth={3} strokeLinecap="round" />}
      {/* body with heart-bolt */}
      <rect x={33} y={58} width={34} height={30} rx={8} fill="#aeb9c4" stroke="#5d6b78" strokeWidth={2.5} />
      <path d="M 52 64 l -6 10 h 5 l -3 9 8 -12 h -5 z" fill="#e8b04b" stroke="#b3841b" strokeWidth={1.5} />
    </>
  );
}
