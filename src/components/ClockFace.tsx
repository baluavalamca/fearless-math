/** Offline SVG analog clock — eighth visual component. */

export interface ClockSpec { hour: number; minute: number; label?: string }

export function ClockFace({ clocks, caption }: { clocks: ClockSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      <div className="fm-geo-row">
        {clocks.map((c, i) => <Clock key={i} spec={c} />)}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Clock({ spec }: { spec: ClockSpec }) {
  const cx = 80, cy = 80, r = 66;
  const minuteAngle = (spec.minute / 60) * 360 - 90;
  const hourAngle = (((spec.hour % 12) + spec.minute / 60) / 12) * 360 - 90;
  const hand = (angle: number, len: number) => ({
    x: cx + len * Math.cos((angle * Math.PI) / 180),
    y: cy + len * Math.sin((angle * Math.PI) / 180),
  });
  const mh = hand(minuteAngle, r - 16);
  const hh = hand(hourAngle, r - 32);

  return (
    <div className="fm-geo-item">
      <svg viewBox="0 0 160 160" width={170} role="img"
        aria-label={`Clock showing ${spec.hour} ${spec.minute === 0 ? "o'clock" : spec.minute + " minutes"}`}>
        <circle cx={cx} cy={cy} r={r} fill="#fffdf6" stroke="#8d6e3f" strokeWidth={4} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((i * 30 - 90) * Math.PI) / 180;
          const nx = cx + (r - 13) * Math.cos(a), ny = cy + (r - 13) * Math.sin(a) + 5;
          return (
            <text key={i} x={nx} y={ny} textAnchor="middle" fontSize={14} fontWeight={700} fill="#3d2f1e">
              {i === 0 ? 12 : i}
            </text>
          );
        })}
        <line x1={cx} y1={cy} x2={hh.x} y2={hh.y} stroke="#3d2f1e" strokeWidth={5} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={mh.x} y2={mh.y} stroke="#e8842a" strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill="#3d2f1e" />
      </svg>
      {spec.label && <div className="fm-strip-label">{spec.label}</div>}
    </div>
  );
}
