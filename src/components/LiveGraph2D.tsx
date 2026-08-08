/**
 * LiveGraph2D — Desmos-style "drag a slider, the curve redraws instantly".
 * Thin wrapper around the existing (already-pure/stateless) FunctionPlot: we
 * just recompute the PlotSpec from the current slider values on every render.
 *
 * Also plots a handful of concrete (x, y) dots on the curve and shows them as
 * a live "table of values" underneath — seeing the actual numbers that build
 * the line (not just an abstract slope) is what makes it click for kids.
 */
import { FunctionPlot, Marker, PlotSpec } from "./FunctionPlot";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

function labelFor(shape: string, p: Record<string, number>): string {
  if (shape === "quadratic") {
    const a = p.a ?? 1, b = p.b ?? 0, c = p.c ?? 0;
    return `y = ${fmt(a)}x² ${b >= 0 ? "+" : "−"} ${fmt(Math.abs(b))}x ${c >= 0 ? "+" : "−"} ${fmt(Math.abs(c))}`;
  }
  const m = p.m ?? 1, c = p.c ?? 0;
  return `y = ${fmt(m)}x ${c >= 0 ? "+" : "−"} ${fmt(Math.abs(c))}`;
}

function yAt(shape: string, p: Record<string, number>, x: number): number {
  if (shape === "quadratic") {
    const a = p.a ?? 1, b = p.b ?? 0, c = p.c ?? 0;
    return a * x * x + b * x + c;
  }
  const m = p.m ?? 1, c = p.c ?? 0;
  return m * x + c;
}

// A small, legible spread of x-values to plot as dots and list in the value table.
const SAMPLE_XS = [-3, -2, -1, 0, 1, 2, 3];

export function LiveGraph2D({
  shape,
  params,
  color = "accent",
  caption,
}: {
  shape: string;
  params: Record<string, number>;
  color?: "accent" | "good" | "cool";
  caption?: string;
}) {
  const plot: PlotSpec =
    shape === "quadratic"
      ? { poly: [params.c ?? 0, params.b ?? 0, params.a ?? 1], domain: [-8, 8], color, label: labelFor(shape, params) }
      : { poly: [params.c ?? 0, params.m ?? 1], domain: [-8, 8], color, label: labelFor(shape, params) };

  const rows = SAMPLE_XS.map((x) => ({ x, y: yAt(shape, params, x) }));
  const markers: Marker[] = rows.map((r) => ({ x: r.x, y: r.y, color }));

  return (
    <div className="fm-livegraph2d">
      <FunctionPlot plots={[plot]} caption={caption} markers={markers} />
      <div className="fm-livesim-valuetable-wrap">
        <p className="fm-livesim-valuetable-title">Table of values — plug each x in and see y!</p>
        <table className="fm-livesim-valuetable">
          <tbody>
            <tr>
              <th scope="row">x</th>
              {rows.map((r, i) => <td key={"x" + i}>{fmt(r.x)}</td>)}
            </tr>
            <tr>
              <th scope="row">y</th>
              {rows.map((r, i) => <td key={"y" + i}>{fmt(r.y)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
