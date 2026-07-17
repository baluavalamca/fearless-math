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
