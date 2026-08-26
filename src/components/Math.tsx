/**
 * Math — render authored ASCII math (a^2 + b^2 = c^2, sqrt(x), pi r^2, +/-)
 * as real typeset math with KaTeX. Offline (fonts bundled). Fails soft to the
 * raw text so a lesson never shows a broken box.
 */
import katex from "katex";
import "katex/dist/katex.min.css";

/** Best-effort converter from the app's plain-text math to LaTeX. */
function toLatex(src: string): string {
  let s = " " + src + " ";
  s = s
    .replace(/%/g, "\\%")                  // % is a LaTeX comment char — escape it or
                                            // everything after it silently vanishes
    .replace(/\+\/-/g, " \\pm ")           // +/-  -> ±
    .replace(/<=/g, " \\le ")
    .replace(/>=/g, " \\ge ")
    .replace(/!=/g, " \\ne ")
    .replace(/\bsqrt\s*\(([^()]*)\)/g, "\\sqrt{$1}")
    .replace(/\^\(([^()]*)\)/g, "^{$1}")   // ^(n+1) -> ^{n+1}
    .replace(/_\(([^()]*)\)/g, "_{$1}")    // _(i)   -> _{i}
    .replace(/\bpi\b/g, "\\pi ")
    .replace(/\btheta\b/g, "\\theta ")
    .replace(/\balpha\b/g, "\\alpha ")
    .replace(/\bbeta\b/g, "\\beta ")
    .replace(/\bxbar\b/g, "\\bar{x}")
    .replace(/\bdegrees?\b/g, "^{\\circ}")
    .replace(/ x /g, " \\times ")          // standalone x -> times
    .replace(/\*/g, " \\cdot ")
    .replace(/\bintegral\b/g, "\\int ")
    .replace(/->/g, " \\rightarrow ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

export function MathTex({ children, block = false }: { children: string; block?: boolean }) {
  const raw = String(children ?? "");
  try {
    const html = katex.renderToString(toLatex(raw), { throwOnError: false, displayMode: block, output: "html" });
    return <span className={block ? "fm-math fm-math-block" : "fm-math"} dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span className="fm-math-fallback">{raw}</span>;
  }
}

const PUNCT_LEAD = /^["'(]+/;
const PUNCT_TRAIL = /["').,;:!?]+$/;

/** Loose heuristic for "this whitespace-delimited token is actual math
 *  notation" vs. an ordinary English word. Deliberately conservative --
 *  false negatives just mean a token stays plain text (harmless); false
 *  positives are rare because it requires a digit next to an operator, or
 *  one of a small set of unambiguous math markers. */
function looksMathy(core: string): boolean {
  if (!core) return false;
  if (/\^\(|\^[\d(a-zA-Z]/.test(core)) return true;      // exponent: x^2, ^(n+1)
  if (/sqrt\(/.test(core)) return true;                    // sqrt(x)
  if (/\+\/-/.test(core)) return true;                     // +/-
  if (/<=|>=|!=|->/.test(core)) return true;                // comparisons / arrow
  if (/\b(pi|theta|alpha|beta|xbar)\b/.test(core)) return true;
  if (/\d/.test(core) && /[+\-*/=]/.test(core)) return true; // e.g. 12+7=19, 1/2, 3*4
  return false;
}

/** Render text that mixes ordinary English prose with occasional inline
 *  math tokens -- e.g. AI tutor answers like "First, add the ones: 2+7=9."
 *  Unlike MathTex (which treats its whole input as one math expression, so
 *  plain sentences lose their spacing in KaTeX's math mode), this splits on
 *  whitespace and only sends tokens that look like real math through KaTeX;
 *  everything else -- words, punctuation, and all spacing -- stays literal
 *  text. Safe to use on any AI-generated string, math-heavy or not. */
export function TutorText({ children }: { children: string }) {
  const raw = String(children ?? "");
  const parts = raw.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "") return null;
        if (/^\s+$/.test(part)) return part;
        const lead = part.match(PUNCT_LEAD)?.[0] ?? "";
        const rest = part.slice(lead.length);
        const trail = rest.match(PUNCT_TRAIL)?.[0] ?? "";
        const core = trail ? rest.slice(0, rest.length - trail.length) : rest;
        if (core && looksMathy(core)) {
          try {
            const html = katex.renderToString(toLatex(core), { throwOnError: false, displayMode: false, output: "html" });
            return (
              <span key={i}>
                {lead}
                <span className="fm-math" dangerouslySetInnerHTML={{ __html: html }} />
                {trail}
              </span>
            );
          } catch { /* fall through to plain text below */ }
        }
        return part;
      })}
    </>
  );
}
