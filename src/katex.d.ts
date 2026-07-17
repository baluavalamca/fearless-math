declare module "katex" {
  interface KatexOptions {
    throwOnError?: boolean;
    displayMode?: boolean;
    output?: "html" | "mathml" | "htmlAndMathml";
    strict?: boolean | string;
    trust?: boolean;
  }
  const katex: { renderToString(tex: string, options?: KatexOptions): string };
  export default katex;
}
declare module "katex/dist/katex.min.css";
