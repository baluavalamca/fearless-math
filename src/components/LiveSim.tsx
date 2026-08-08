/**
 * LiveSim — the "Try it live" panel: drag a slider, watch the shape/graph AND
 * its formula update in real time (GeoGebra/Desmos/PhET-style interaction).
 * Dispatches to the right visual (LiveSolid3D / LiveGraph2D / LiveShape2D)
 * based on `spec.kind`, and renders the shared slider + live-formula controls.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Concept } from "../api";
import { evalExpr } from "../liveExpr";
import { LiveGraph2D } from "./LiveGraph2D";
import { LiveShape2D } from "./LiveShape2D";
// Three.js is code-split — only loaded when a solid3d liveSim actually appears.
const LiveSolid3D = lazy(() => import("./LiveSolid3D").then((m) => ({ default: m.LiveSolid3D })));

export type LiveSimSpec = NonNullable<Concept["liveSim"]>;

const dispVal = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

function defaultsOf(spec: LiveSimSpec): Record<string, number> {
  const v: Record<string, number> = {};
  spec.sliders.forEach((s) => { v[s.key] = s.default; });
  return v;
}

export function LiveSimPanel({ spec }: { spec: LiveSimSpec }) {
  const [values, setValues] = useState<Record<string, number>>(() => defaultsOf(spec));
  const maxExtent = useMemo(() => Math.max(...spec.sliders.map((s) => s.max), 1), [spec.sliders]);

  const results = useMemo(
    () =>
      spec.formulas.map((f) => {
        try {
          return { ...f, value: evalExpr(f.expr, values) as number | null, error: null as string | null };
        } catch (e) {
          return { ...f, value: null as number | null, error: e instanceof Error ? e.message : String(e) };
        }
      }),
    [spec.formulas, values]
  );

  return (
    <div className="fm-livesim">
      {spec.hook && <p className="fm-livesim-hook">🎛️ {spec.hook}</p>}
      <div className="fm-livesim-body">
        <div className="fm-livesim-stage">
          {spec.kind === "solid3d" && (
            <Suspense fallback={<p className="fm-callout">Loading 3D…</p>}>
              <LiveSolid3D shape={spec.shape} params={values} maxExtent={maxExtent} color={spec.color} />
            </Suspense>
          )}
          {spec.kind === "graph2d" && <LiveGraph2D shape={spec.shape} params={values} color={spec.color} />}
          {spec.kind === "shape2d" && <LiveShape2D shape={spec.shape} params={values} maxExtent={maxExtent} color={spec.color} />}
        </div>

        <div className="fm-livesim-controls">
          {spec.sliders.map((s) => (
            <label key={s.key} className="fm-livesim-slider">
              <span className="fm-livesim-slider-top">
                <span className="fm-livesim-slider-label">{s.label}</span>
                <span className="fm-livesim-slider-value">{dispVal(values[s.key])}{s.unit ? ` ${s.unit}` : ""}</span>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step ?? Math.max((s.max - s.min) / 100, 0.01)}
                value={values[s.key]}
                onChange={(e) => setValues((v) => ({ ...v, [s.key]: Number(e.target.value) }))}
                aria-label={s.label}
              />
            </label>
          ))}

          <button type="button" className="fm-livesim-reset" onClick={() => setValues(defaultsOf(spec))}>
            <RotateCcw size={14} /> Reset
          </button>

          <div className="fm-livesim-formulas">
            {results.map((r, i) => (
              <div key={i} className="fm-livesim-formula">
                <span className="fm-livesim-formula-name">{r.name}</span>
                <span className="fm-livesim-formula-value">
                  {r.error || r.value === null
                    ? "—"
                    : (r.decimals !== undefined ? r.value.toFixed(r.decimals) : dispVal(r.value))}
                  {r.unit ? ` ${r.unit}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
