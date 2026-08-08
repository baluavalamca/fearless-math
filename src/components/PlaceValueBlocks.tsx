/** Offline SVG place-value blocks — each block renders at a FIXED, always-legible
 *  size (it never auto-shrinks to squeeze into a card), and every block prints its
 *  own value so a child can literally read what each piece is worth. When a set has
 *  a lot of blocks (e.g. "999" = 9 hundreds + 9 tens + 9 ones) they wrap onto new
 *  lines instead of being crushed smaller — count no longer shrinks legibility.
 *  thousands = big labeled cube, hundreds = 10x10 flat (labeled "100"),
 *  tens = rod (labeled "10"), ones = unit cube (labeled "1"). */

export interface BlockSet {
  label?: string;
  thousands?: number;
  hundreds?: number;
  tens?: number;
  ones?: number;
}

type Kind = "th" | "h" | "t" | "o";

export function PlaceValueBlocks({ sets, caption }: { sets: BlockSet[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      {sets.map((s, i) => <Blocks key={i} set={s} />)}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

// Fixed pixel size per block kind — never scaled down, so blocks always stay readable.
// Tens is drawn as a HORIZONTAL rod (10 unit-cells laid side by side, like a real
// base-10 rod on a table) instead of a tall vertical bar — it reads left-to-right
// with the rest of the row, keeps the row shorter, and lets more tens fit per line.
const KIND_SIZE: Record<Kind, { w: number; h: number }> = {
  th: { w: 84, h: 84 },
  h: { w: 68, h: 68 },
  t: { w: 96, h: 28 },
  o: { w: 26, h: 26 },
};

function Blocks({ set }: { set: BlockSet }) {
  const th = set.thousands ?? 0, h = set.hundreds ?? 0, t = set.tens ?? 0, o = set.ones ?? 0;
  const total = th * 1000 + h * 100 + t * 10 + o;

  const items: { kind: Kind }[] = [
    ...Array.from({ length: th }, () => ({ kind: "th" as const })),
    ...Array.from({ length: h }, () => ({ kind: "h" as const })),
    ...Array.from({ length: t }, () => ({ kind: "t" as const })),
    ...Array.from({ length: o }, () => ({ kind: "o" as const })),
  ];

  return (
    <div className="fm-pvb-row">
      <div
        className="fm-pvb-blocks"
        role="img"
        aria-label={`${th ? th + " thousands, " : ""}${h} hundreds, ${t} tens, ${o} ones — the number ${total}`}
      >
        {items.map((it, i) => <Block key={i} kind={it.kind} />)}
      </div>
      <span className="fm-strip-label">{set.label ?? String(total)}</span>
    </div>
  );
}

function Block({ kind }: { kind: Kind }) {
  const { w, h } = KIND_SIZE[kind];
  const stroke = "#8d6e3f";
  return (
    <span className="fm-pvb-cell" style={{ width: w }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="fm-pvb-block" aria-hidden>
        {kind === "th" && (
          <>
            <rect x={2} y={2} width={w - 4} height={h - 4} rx={10} fill="#e8b04b" stroke={stroke} strokeWidth={3} />
            <text x={w / 2} y={h / 2 + 7} textAnchor="middle" fontSize={19} fontWeight={800} fill="#3d2f1e">1000</text>
          </>
        )}
        {kind === "h" && (
          <>
            <rect x={2} y={2} width={w - 4} height={h - 4} rx={8} fill="#ffcf87" stroke={stroke} strokeWidth={3} />
            {Array.from({ length: 9 }, (_, i) => (
              <line key={"v" + i} x1={2 + ((i + 1) * (w - 4)) / 10} y1={2} x2={2 + ((i + 1) * (w - 4)) / 10} y2={h - 2} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={"hh" + i} x1={2} y1={2 + ((i + 1) * (h - 4)) / 10} x2={w - 2} y2={2 + ((i + 1) * (h - 4)) / 10} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
            ))}
            <text x={w / 2} y={h / 2 + 6} textAnchor="middle" fontSize={16} fontWeight={800} fill="#5a3e12" stroke="#fff" strokeWidth={3} paintOrder="stroke">100</text>
          </>
        )}
        {kind === "t" && (
          <>
            <rect x={2} y={3} width={w - 4} height={h - 6} rx={6} fill="#ff9f43" stroke={stroke} strokeWidth={2.5} />
            {Array.from({ length: 9 }, (_, i) => (
              <line key={i} x1={2 + ((i + 1) * (w - 4)) / 10} y1={3} x2={2 + ((i + 1) * (w - 4)) / 10} y2={h - 3} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
            ))}
            <text x={w / 2} y={h / 2 + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#5a2e00" stroke="#fff" strokeWidth={3} paintOrder="stroke">10</text>
          </>
        )}
        {kind === "o" && (
          <>
            <rect x={2} y={2} width={w - 4} height={h - 4} rx={5} fill="#fdf3e3" stroke={stroke} strokeWidth={2.5} />
            <text x={w / 2} y={h / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#5a3e12">1</text>
          </>
        )}
      </svg>
    </span>
  );
}
