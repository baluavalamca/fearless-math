/** Dispatches a content-authored visual spec to the right offline component. */
import { Component, ReactNode, lazy, Suspense } from "react";
import { FractionStrip, StripSpec } from "./FractionStrip";
import { NumberLine, LineSpec } from "./NumberLine";
import { ArrayGrid, GridSpec } from "./ArrayGrid";
import { PlaceValueBlocks, BlockSet } from "./PlaceValueBlocks";
import { BarModel, BarSpec } from "./BarModel";
import { AreaModel, AreaSpec } from "./AreaModel";
import { GeometryCanvas, ShapeSpec } from "./GeometryCanvas";
import { ClockFace, ClockSpec } from "./ClockFace";
import { BarChart, CategorySpec } from "./BarChart";
import { PizzaSlices, PieSpec } from "./PizzaSlices";
import { Abacus, AbacusSpec } from "./Abacus";
import { ObjectRow, SeqSpec } from "./ObjectRow";
import { NumberTrack, TrackSpec } from "./NumberTrack";
import { FunctionPlot, PlotSpec } from "./FunctionPlot";
import type { SolidSpec } from "./Solid3D";
// Three.js 3D solids are code-split — only loaded when a 3D visual actually appears.
const Solid3D = lazy(() => import("./Solid3D").then((m) => ({ default: m.Solid3D })));
import type { VisualSpec } from "./visualTypes";

// Re-exported so existing importers (`import { VisualSpec } from "./VisualRenderer"`)
// keep working; the type itself now lives in the React-free visualTypes module.
export type { VisualSpec };

/** Safety net: a malformed spec (e.g. from an AI-generated lesson) must never
 *  crash a whole lesson — fall back to the caption text instead. */
class VisualBoundary extends Component<{ caption?: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return this.props.caption ? <p className="fm-callout">{this.props.caption}</p> : null;
    return this.props.children;
  }
}

export function VisualRenderer({ visual }: { visual: VisualSpec }) {
  return <VisualBoundary caption={visual.caption}><VisualSwitch visual={visual} /></VisualBoundary>;
}

function VisualSwitch({ visual }: { visual: VisualSpec }) {
  switch (visual.component) {
    case "NumberTrack":
      return <NumberTrack tracks={visual.props.tracks as TrackSpec[]} caption={visual.caption} />;
    case "ObjectRow":
      return <ObjectRow sequences={visual.props.sequences as SeqSpec[]} caption={visual.caption} />;
    case "Abacus":
      return <Abacus abaci={visual.props.abaci as AbacusSpec[]} caption={visual.caption} />;
    case "PizzaSlices":
      return (
        <PizzaSlices
          pies={visual.props.pies as PieSpec[]}
          interactive={visual.props.interaction === "tap-to-shade"}
          caption={visual.caption}
        />
      );
    case "FractionStrip":
      return (
        <FractionStrip
          strips={visual.props.strips as StripSpec[]}
          interactive={visual.props.interaction === "tap-to-shade"}
          caption={visual.caption}
        />
      );
    case "NumberLine":
      return <NumberLine lines={visual.props.lines as LineSpec[]} caption={visual.caption} />;
    case "ArrayGrid":
      return <ArrayGrid grids={visual.props.grids as GridSpec[]} caption={visual.caption} />;
    case "PlaceValueBlocks":
      return <PlaceValueBlocks sets={visual.props.sets as BlockSet[]} caption={visual.caption} />;
    case "BarModel":
      return <BarModel bars={visual.props.bars as BarSpec[]} caption={visual.caption} />;
    case "AreaModel":
      return <AreaModel models={visual.props.models as AreaSpec[]} caption={visual.caption} />;
    case "GeometryCanvas":
      return <GeometryCanvas shapes={visual.props.shapes as ShapeSpec[]} caption={visual.caption} />;
    case "ClockFace":
      return <ClockFace clocks={visual.props.clocks as ClockSpec[]} caption={visual.caption} />;
    case "BarChart":
      return (
        <BarChart
          categories={visual.props.categories as CategorySpec[]}
          unit={visual.props.unit as string | undefined}
          caption={visual.caption}
        />
      );
    case "FunctionPlot":
      return <FunctionPlot plots={visual.props.plots as PlotSpec[]} caption={visual.caption} />;
    case "Solid3D":
      return (
        <Suspense fallback={<p className="fm-callout">{visual.caption ?? "Loading 3D…"}</p>}>
          <Solid3D solids={visual.props.solids as SolidSpec[]} caption={visual.caption} />
        </Suspense>
      );
    default:
      // Unknown component: fail soft, never break a lesson
      return visual.caption ? <p className="fm-callout">{visual.caption}</p> : null;
  }
}
