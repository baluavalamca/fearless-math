/**
 * Algorithms — an in-app CS study resource ("Algorithms Every Student Must Know").
 *
 * The guide is a rich, self-contained interactive page (live sorting visualizer,
 * binary-search stepper, Big-O growth chart, complexity tables, Python snippets and
 * interview Q&A). Rather than re-implement all of that in React, we embed the bundled
 * static page (public/algorithms.html → copied to the app root at build time) in a
 * sandboxed iframe. This keeps its own dark "tech" styling isolated from the app theme
 * and works fully offline in the packaged Electron build.
 */
import { useState } from "react";

export function Algorithms() {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="fm-algos">
      <header className="fm-algos-head">
        <div>
          <h1>🧠 Algorithms Every Student Must Know</h1>
          <p className="fm-dash-sub">A CS &amp; interview study guide — searching, sorting, graphs, dynamic programming and more, with live visualizers and code.</p>
        </div>
      </header>
      <div className="fm-algos-frame">
        {!loaded && <div className="fm-algos-loading">Loading the algorithms lab… 🧮</div>}
        <iframe
          title="Algorithms Every Student Must Know"
          src="./algorithms.html"
          onLoad={() => setLoaded(true)}
          className="fm-algos-iframe"
          // Allow the page's own scripts (visualizers) but keep it isolated from the app.
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}
