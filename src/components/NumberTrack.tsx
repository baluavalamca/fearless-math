/**
 * NumberTrack — shows a number SEQUENCE as tiles with the blank the child must
 * find (e.g., 2 4 6 8 ?), plus small "+d" jump badges between tiles. The
 * relevant, question-specific visual for patterns, skip-counting and tables.
 */
export interface TrackSpec { terms: (number | string)[]; jump?: number; label?: string }

export function NumberTrack({ tracks, caption }: { tracks: TrackSpec[]; caption?: string }) {
  return (
    <figure className="fm-visual">
      {tracks.map((t, ti) => (
        <div className="fm-ntrack" key={ti}>
          {t.terms.map((term, i) => (
            <span className="fm-ntrack-cell" key={i}>
              <span
                className={`fm-ntile ${term === "?" ? "blank" : ""}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {term}
              </span>
              {i < t.terms.length - 1 && t.jump != null && (
                <span className="fm-njump">{t.jump >= 0 ? `+${t.jump}` : `−${Math.abs(t.jump)}`}</span>
              )}
            </span>
          ))}
          {t.label && <span className="fm-strip-label">{t.label}</span>}
        </div>
      ))}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
