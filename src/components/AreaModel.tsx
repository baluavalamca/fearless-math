/** Offline SVG area model — sixth visual component.
 *  Splits a multiplication into place-value rectangles: 24×5 = (20+4)×5. */

export interface AreaSpec {
  rowParts: number[]; // e.g. [5]        (one row band)
  colParts: number[]; // e.g. [20, 4]    (split of the other factor)
  label?: string;
}

export function AreaModel({ models, caption }: { models: AreaSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      {models.map((m, i) => <Model key={i} spec={m} />)}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

const FILLS = ["#ffd18f", "#fdc4a2", "#ffe3b3", "#fbd2c0"];

function Model({ spec }: { spec: AreaSpec }) {
  const W = 460, H = 200, padL = 54, padT = 34;
  const totalCols = spec.colParts.reduce((a, b) => a + b, 0);
  const totalRows = spec.rowParts.reduce((a, b) => a + b, 0);
  // widths proportional with a floor so small parts stay readable
  const wOf = (v: number) => Math.max((v / totalCols) * (W - padL - 10), 56);
  const hOf = (v: number) => Math.max((v / totalRows) * (H - padT - 10), 56);
  const widths = spec.colParts.map(wOf);
  const heights = spec.rowParts.map(hOf);
  const sumW = widths.reduce((a, b) => a + b, 0);
  const sumH = heights.reduce((a, b) => a + b, 0);
  const grand = totalRows * totalCols;

  let cellIdx = 0;
  const cells: JSX.Element[] = [];
  let y = padT;
  for (let r = 0; r < spec.rowParts.length; r++) {
    let x = padL;
    for (let c = 0; c < spec.colParts.length; c++) {
      const product = spec.rowParts[r] * spec.colParts[c];
      cells.push(
        <g key={`${r}-${c}`}>
          <rect x={x} y={y} width={widths[c]} height={heights[r]} rx={6}
            fill={FILLS[cellIdx % FILLS.length]} stroke="#8d6e3f" strokeWidth={2} />
          <text x={x + widths[c] / 2} y={y + heights[r] / 2 + 6}
            textAnchor="middle" fontSize={18} fontWeight={700} fill="#3d2f1e">
            {product}
          </text>
        </g>
      );
      x += widths[c];
      cellIdx++;
    }
    y += heights[r];
  }

  let cx = padL;
  let cy = padT;
  return (
    <div className="fm-strip-row">
      <svg viewBox={`0 0 ${W} ${padT + sumH + 14}`} width="100%" style={{ maxWidth: W }}
        role="img"
        aria-label={`Area model: ${totalRows} times ${totalCols} split into parts, total ${grand}`}>
        {/* column headers */}
        {spec.colParts.map((v, i) => {
          const t = (
            <text key={"c" + i} x={cx + widths[i] / 2} y={padT - 10}
              textAnchor="middle" fontSize={16} fontWeight={700} fill="#b35f1b">{v}</text>
          );
          cx += widths[i];
          return t;
        })}
        {/* row headers */}
        {spec.rowParts.map((v, i) => {
          const t = (
            <text key={"r" + i} x={padL - 12} y={cy + heights[i] / 2 + 6}
              textAnchor="end" fontSize={16} fontWeight={700} fill="#b35f1b">{v}</text>
          );
          cy += heights[i];
          return t;
        })}
        {cells}
      </svg>
      <span className="fm-strip-label">{spec.label ?? `${totalRows} × ${totalCols} = ${grand}`}</span>
    </div>
  );
}
