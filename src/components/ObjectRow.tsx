/**
 * ObjectRow — a picture sequence of real objects (emoji), so questions about
 * "which is first?", "how many?", "more or fewer?" are SEEN, not read.
 * Supports position badges (1st, 2nd...), counting numbers, a highlighted item,
 * and a staggered pop-in animation.
 */
import { ObjectIcon } from "./ObjectIcon";

export interface SeqSpec {
  items: string[];        // emoji, e.g. ["🚗","🍉","🚚"]
  markIndex?: number;     // 0-based item to highlight
  showOrdinal?: boolean;  // show 1st, 2nd, 3rd under each
  showCount?: boolean;    // show 1, 2, 3 under each
  label?: string;
  sizes?: number[];      // per-item icon size (big/small comparison)
}

const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

export function ObjectRow({ sequences, caption }: { sequences: SeqSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      {sequences.map((s, si) => (
        <div className="fm-objrow" key={si}>
          {s.items.map((it, i) => (
            <div
              className={`fm-objtile ${s.markIndex === i ? "mark" : ""}`}
              key={i}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <ObjectIcon name={it} size={s.sizes?.[i] ?? 48} />
              {s.showOrdinal && <span className="fm-objbadge">{ORD[i] ?? i + 1 + "th"}</span>}
              {s.showCount && <span className="fm-objbadge">{i + 1}</span>}
            </div>
          ))}
          {s.label && <span className="fm-strip-label">{s.label}</span>}
        </div>
      ))}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
