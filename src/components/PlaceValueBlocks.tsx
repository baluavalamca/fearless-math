/** Offline SVG place-value blocks — fourth visual component.
 *  thousands = big labeled cube, hundreds = 10x10 flat, tens = rod, ones = unit. */

export interface BlockSet {
  label?: string;
  thousands?: number;
  hundreds?: number;
  tens?: number;
  ones?: number;
}

export function PlaceValueBlocks({ sets, caption }: { sets: BlockSet[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      {sets.map((s, i) => <Blocks key={i} set={s} />)}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Blocks({ set }: { set: BlockSet }) {
  const th = set.thousands ?? 0, h = set.hundreds ?? 0, t = set.tens ?? 0, o = set.ones ?? 0;
  const total = th * 1000 + h * 100 + t * 10 + o;

  const items: { w: number; kind: "th" | "h" | "t" | "o" }[] = [
    ...Array.from({ length: th }, () => ({ w: 64, kind: "th" as const })),
    ...Array.from({ length: h }, () => ({ w: 52, kind: "h" as const })),
    ...Array.from({ length: t }, () => ({ w: 14, kind: "t" as const })),
    ...Array.from({ length: o }, () => ({ w: 14, kind: "o" as const })),
  ];
  const gap = 6;
  const W = Math.max(120, items.reduce((x, it) => x + it.w + gap, 8));
  const H = 78;

  let x = 4;
  return (
    <div className="fm-strip-row">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: Math.min(W, 520) }}
        role="img"
        aria-label={`${th ? th + " thousands, " : ""}${h} hundreds, ${t} tens, ${o} ones — the number ${total}`}
      >
        {items.map((it, i) => {
          const el = block(it.kind, x);
          x += it.w + gap;
          return <g key={i}>{el}</g>;
        })}
      </svg>
      <span className="fm-strip-label">{set.label ?? String(total)}</span>
    </div>
  );
}

function block(kind: "th" | "h" | "t" | "o", x: number) {
  const stroke = "#8d6e3f";
  switch (kind) {
    case "th":
      return (
        <>
          <rect x={x} y={6} width={64} height={64} rx={8} fill="#e8b04b" stroke={stroke} strokeWidth={2.5} />
          <text x={x + 32} y={44} textAnchor="middle" fontSize={16} fontWeight={700} fill="#3d2f1e">1000</text>
        </>
      );
    case "h":
      return (
        <>
          <rect x={x} y={12} width={52} height={52} rx={6} fill="#ffcf87" stroke={stroke} strokeWidth={2.5} />
          {Array.from({ length: 4 }, (_, i) => (
            <line key={"v" + i} x1={x + (i + 1) * 10.4} y1={12} x2={x + (i + 1) * 10.4} y2={64} stroke={stroke} strokeWidth={0.7} />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <line key={"h" + i} x1={x} y1={12 + (i + 1) * 10.4} x2={x + 52} y2={12 + (i + 1) * 10.4} stroke={stroke} strokeWidth={0.7} />
          ))}
        </>
      );
    case "t":
      return (
        <>
          <rect x={x} y={14} width={14} height={50} rx={4} fill="#ff9f43" stroke={stroke} strokeWidth={2} />
          {Array.from({ length: 4 }, (_, i) => (
            <line key={i} x1={x} y1={14 + (i + 1) * 10} x2={x + 14} y2={14 + (i + 1) * 10} stroke={stroke} strokeWidth={0.7} />
          ))}
        </>
      );
    case "o":
      return <rect x={x} y={50} width={14} height={14} rx={3} fill="#fdf3e3" stroke={stroke} strokeWidth={2} />;
  }
}
