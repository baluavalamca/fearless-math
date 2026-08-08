/**
 * Tiny, safe arithmetic expression evaluator for `liveSim` formulas
 * (e.g. "l*w*h", "2*(l*w+w*h+h*l)", "PI*r^2", "sqrt(a^2+b^2)",
 * "adj*tan(angle)", "abs(x-mean)", "max(a,b)").
 *
 * Deliberately NOT eval()/new Function() — a hand-rolled recursive-descent
 * parser over a whitelisted grammar (numbers, + - * / ^ ( ), named
 * variables, PI, and a small whitelisted function set, comma-separated
 * multi-arg calls) so authored content can never execute arbitrary code.
 *
 * Trig functions take degrees (this is a kids' app — no radians in sight).
 */
const toRad = (deg: number) => (deg * Math.PI) / 180;

const LIVE_EXPR_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: (x) => Math.sqrt(x),
  abs: (x) => Math.abs(x),
  sin: (deg) => Math.sin(toRad(deg)),
  cos: (deg) => Math.cos(toRad(deg)),
  tan: (deg) => Math.tan(toRad(deg)),
  min: (...xs) => Math.min(...xs),
  max: (...xs) => Math.max(...xs),
};

// Arity check — catches authoring mistakes early (e.g. sqrt(a,b) or min(a)).
const LIVE_EXPR_ARITY: Record<string, { min: number; max: number }> = {
  sqrt: { min: 1, max: 1 },
  abs: { min: 1, max: 1 },
  sin: { min: 1, max: 1 },
  cos: { min: 1, max: 1 },
  tan: { min: 1, max: 1 },
  min: { min: 2, max: Infinity },
  max: { min: 2, max: Infinity },
};

export function evalExpr(expr: string, scope: Record<string, number>): number {
  const s = expr.replace(/\s+/g, "");
  let i = 0;

  const peek = () => s[i];
  const eat = (ch?: string) => {
    if (ch && s[i] !== ch) throw new Error(`liveExpr: expected "${ch}" at ${i} in "${expr}"`);
    i++;
  };

  function parseNumber(): number {
    const start = i;
    while (i < s.length && /[0-9.]/.test(s[i])) i++;
    if (i === start) throw new Error(`liveExpr: expected number at ${i} in "${expr}"`);
    return parseFloat(s.slice(start, i));
  }

  function parseIdent(): string {
    const start = i;
    while (i < s.length && /[A-Za-z_]/.test(s[i])) i++;
    return s.slice(start, i);
  }

  function parseAtom(): number {
    const ch = peek();
    if (ch === "(") {
      eat("(");
      const v = parseExpr();
      eat(")");
      return v;
    }
    if (ch === "-") { eat("-"); return -parseAtom(); }
    if (ch === "+") { eat("+"); return parseAtom(); }
    if (ch && /[A-Za-z_]/.test(ch)) {
      const name = parseIdent();
      if (peek() === "(") {
        eat("(");
        const args: number[] = [parseExpr()];
        while (peek() === ",") { eat(","); args.push(parseExpr()); }
        eat(")");
        if (!Object.prototype.hasOwnProperty.call(LIVE_EXPR_FUNCTIONS, name))
          throw new Error(`liveExpr: unknown function "${name}" in "${expr}"`);
        const arity = LIVE_EXPR_ARITY[name];
        if (args.length < arity.min || args.length > arity.max)
          throw new Error(`liveExpr: "${name}" takes ${arity.min}${arity.max === arity.min ? "" : "+"} argument(s), got ${args.length} in "${expr}"`);
        return LIVE_EXPR_FUNCTIONS[name](...args);
      }
      if (name === "PI") return Math.PI;
      if (Object.prototype.hasOwnProperty.call(scope, name)) return scope[name];
      throw new Error(`liveExpr: unknown variable "${name}" in "${expr}"`);
    }
    return parseNumber();
  }

  function parsePow(): number {
    const base = parseAtom();
    if (peek() === "^") { eat("^"); return Math.pow(base, parsePow()); }
    return base;
  }

  function parseTerm(): number {
    let v = parsePow();
    while (peek() === "*" || peek() === "/") {
      const op = peek(); eat(op);
      const rhs = parsePow();
      v = op === "*" ? v * rhs : v / rhs;
    }
    return v;
  }

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = peek(); eat(op);
      const rhs = parseTerm();
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  }

  if (!s) throw new Error("liveExpr: empty expression");
  const result = parseExpr();
  if (i !== s.length) throw new Error(`liveExpr: unexpected character at ${i} in "${expr}"`);
  if (!Number.isFinite(result)) throw new Error(`liveExpr: non-finite result for "${expr}"`);
  return result;
}

/** Validate an expression at content-authoring/validation time (no scope needed —
 *  just checks it PARSES against a dummy scope built from the given variable names). */
export function validateExpr(expr: string, varNames: string[]): string | null {
  const scope: Record<string, number> = {};
  varNames.forEach((v) => (scope[v] = 1));
  try {
    evalExpr(expr, scope);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
