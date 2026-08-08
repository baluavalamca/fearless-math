/**
 * Tips & Tricks — mental-maths shortcuts (mostly Vedic-maths style), built from the
 * same verified reference used elsewhere in the app (docs/VEDIC-MATH-REFERENCE.md).
 * Follows the Algorithms screen's native, theme-aware pattern: search, category chips,
 * cards with rule + worked examples, plus a live "Try it yourself" calculator per trick
 * so a learner isn't limited to the printed examples.
 */
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { TRICKS, TRICK_CATS, TRICKS_HISTORY_NOTE, Trick, TrickCatId } from "../data/mathTricks";

/* ─────────────────────────── trick-specific calculators ─────────────────────────── */

type CalcResult = { steps: string[]; answer: number; checkOk: boolean };

function pad2(n: number): string {
  const s = Math.abs(n).toString();
  return s.length >= 2 ? s : "0" + s;
}

function computeTrick(id: string, x1: number, x2: number): CalcResult | string {
  switch (id) {
    case "square-ending-5": {
      const n = x1;
      if (!Number.isInteger(n) || n <= 0) return "Enter a positive whole number.";
      if (n % 10 !== 5) return "This trick only works for numbers ending in 5 — try 15, 45, 95…";
      const base = Math.floor(n / 10);
      const left = base * (base + 1);
      const answer = left * 100 + 25;
      return {
        answer,
        checkOk: answer === n * n,
        steps: [
          `Digits before the 5: ${base}`,
          `${base} × ${base + 1} = ${left}`,
          `Write 25 on the right → ${left}25`,
        ],
      };
    }
    case "square-near-100": {
      const n = x1;
      if (!Number.isInteger(n) || n < 60 || n > 140) return "Pick a number roughly between 80 and 120 (60–140 also works).";
      const d = n - 100;
      let left = n + d;
      let right = d * d;
      const steps = [`d = ${n} − 100 = ${d}`, `Left = ${n} + (${d}) = ${left}`, `Right = ${d}² = ${right}`];
      if (right >= 100) {
        const carry = Math.floor(right / 100);
        right = right % 100;
        left += carry;
        steps.push(`${d}² has 3+ digits, so carry ${carry} into the left part → ${left}`);
      }
      const answer = left * 100 + right;
      steps.push(`Join: ${left} and ${pad2(right)} → ${answer}`);
      return { answer, checkOk: answer === n * n, steps };
    }
    case "multiply-near-100": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b)) return "Enter two whole numbers.";
      const sameSide = (a < 100 && b < 100) || (a > 100 && b > 100);
      if (a === 100 || b === 100 || !sameSide || a < 70 || a > 130 || b < 70 || b > 130)
        return "Both numbers need to be on the same side of 100 (both below, or both above) — try 96 & 94, or 103 & 106.";
      const da = a - 100, db = b - 100;
      let left = a + db;
      let right = da * db;
      const steps = [`Distance from 100: ${a} → ${da}, ${b} → ${db}`, `Left = ${a} + (${db}) = ${left}`, `Right = ${da} × ${db} = ${right}`];
      if (right >= 100) {
        const carry = Math.floor(right / 100);
        right = right % 100;
        left += carry;
        steps.push(`That's 3+ digits, so carry ${carry} into the left part → ${left}`);
      } else if (right < 0) {
        return "Both distances need the same sign — pick two numbers on the same side of 100.";
      }
      const answer = left * 100 + right;
      steps.push(`Join: ${left} and ${pad2(right)} → ${answer}`);
      return { answer, checkOk: answer === a * b, steps };
    }
    case "crosswise-2x2": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 10 || a > 99 || b < 10 || b > 99)
        return "Enter two 2-digit numbers (10–99).";
      const a1 = Math.floor(a / 10), a0 = a % 10, b1 = Math.floor(b / 10), b0 = b % 10;
      let units = a0 * b0, carryU = Math.floor(units / 10); const u = units % 10;
      let middle = a1 * b0 + a0 * b1 + carryU; const carryM = Math.floor(middle / 10); const m = middle % 10;
      const left = a1 * b1 + carryM;
      const answer = left * 100 + m * 10 + u;
      return {
        answer,
        checkOk: answer === a * b,
        steps: [
          `Units: ${a0} × ${b0} = ${units}`,
          `Cross: ${a1}×${b0} + ${a0}×${b1} = ${a1 * b0} + ${a0 * b1} = ${a1 * b0 + a0 * b1}` + (carryU ? ` (plus carry ${carryU} from units → ${middle})` : ``),
          `Left: ${a1} × ${b1} = ${a1 * b1}` + (carryM ? ` (plus carry ${carryM} → ${left})` : ``),
          `Join, carrying each column: ${answer}`,
        ],
      };
    }
    case "times-11": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1 || n > 999999) return "Enter a positive whole number.";
      const answer = n * 11;
      const digits = n.toString().split("").map(Number);
      const pairs: string[] = [];
      for (let i = 0; i < digits.length - 1; i++) pairs.push(`${digits[i]}+${digits[i + 1]}=${digits[i] + digits[i + 1]}`);
      return {
        answer,
        checkOk: true,
        steps: [
          `Digits of ${n}: ${digits.join(" ")}`,
          digits.length === 1
            ? `Single digit — just ${digits[0]} . ${digits[0]} → ${answer}`
            : `Neighbour sums: ${pairs.join(", ")}`,
          `Outer digits stay, sums go between them, carrying left where a sum ≥ 10 → ${answer}`,
        ],
      };
    }
    case "times-9-99-999": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1) return "Enter a positive whole number.";
      const k = n.toString().length;
      const power = Math.pow(10, k);
      const left = n - 1;
      const right = power - n;
      const answer = left * power + right;
      const nines = "9".repeat(k);
      return {
        answer,
        checkOk: answer === n * (power - 1),
        steps: [
          `${n} has ${k} digit${k > 1 ? "s" : ""}, so multiply by ${nines} (${k} nine${k > 1 ? "s" : ""}).`,
          `Left = ${n} − 1 = ${left}`,
          `Right = ${power} − ${n} = ${right}`,
          `Join: ${left} and ${right.toString().padStart(k, "0")} → ${answer}`,
        ],
      };
    }
    case "same-first-sum-10": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 10 || a > 99 || b < 10 || b > 99)
        return "Enter two 2-digit numbers.";
      const ta = Math.floor(a / 10), tb = Math.floor(b / 10);
      const ua = a % 10, ub = b % 10;
      if (ta !== tb) return "Both numbers need the SAME tens digit — try 43 & 47.";
      if (ua + ub !== 10) return "The units digits need to add up to 10 — try 43 & 47 (3+7=10).";
      const left = ta * (ta + 1);
      const right = ua * ub;
      const answer = left * 100 + right;
      return {
        answer,
        checkOk: answer === a * b,
        steps: [
          `Same tens digit: ${ta}. Units ${ua} + ${ub} = 10 ✓`,
          `Left = ${ta} × ${ta + 1} = ${left}`,
          `Right = ${ua} × ${ub} = ${pad2(right)}`,
          `Join: ${left} and ${pad2(right)} → ${answer}`,
        ],
      };
    }
    case "divisibility-rules": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1) return "Enter a positive whole number.";
      const digits = n.toString().split("").map(Number);
      const digitSum = digits.reduce((a, b) => a + b, 0);
      const last1 = n % 10, last2 = n % 100, last3 = n % 1000;
      let altSum = 0;
      for (let i = digits.length - 1, sign = 1; i >= 0; i--, sign *= -1) altSum += sign * digits[i];
      const hits: string[] = [];
      if (last1 % 2 === 0) hits.push("2");
      if (digitSum % 3 === 0) hits.push("3");
      if (last2 % 4 === 0) hits.push("4");
      if (last1 === 0 || last1 === 5) hits.push("5");
      if (last1 % 2 === 0 && digitSum % 3 === 0) hits.push("6");
      if (last3 % 8 === 0) hits.push("8");
      if (digitSum % 9 === 0) hits.push("9");
      if (last1 === 0) hits.push("10");
      if (altSum % 11 === 0) hits.push("11");
      return {
        answer: n,
        checkOk: true,
        steps: [
          `Digit sum = ${digitSum}, last digit = ${last1}, last 2 = ${last2}, last 3 = ${last3}, alternating sum = ${altSum}`,
          hits.length ? `Divisible by: ${hits.join(", ")}` : "Not divisible by any of 2, 3, 4, 5, 6, 8, 9, 10, 11",
        ],
      };
    }
    case "quick-prime-check": {
      const n = x1;
      if (!Number.isInteger(n) || n < 2) return "Enter a whole number greater than 1.";
      const bound = Math.floor(Math.sqrt(n));
      const testPrimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31].filter((p) => p <= bound);
      let factor: number | null = null;
      for (const p of testPrimes) { if (n % p === 0) { factor = p; break; } }
      const isPrime = factor === null;
      return {
        answer: n,
        checkOk: true,
        steps: [
          `√${n} ≈ ${Math.sqrt(n).toFixed(2)}, so test primes up to ${bound}: ${testPrimes.join(", ") || "(none needed)"}`,
          isPrime ? `None divide evenly → ${n} is PRIME` : `${n} ÷ ${factor} = ${n / (factor as number)} → ${n} is COMPOSITE`,
        ],
      };
    }
    case "hcf-lcm-shortcut": {
      let a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) return "Enter two positive whole numbers.";
      const origA = a, origB = b;
      const steps: string[] = [];
      let p = Math.max(a, b), q = Math.min(a, b);
      while (q !== 0) {
        const r = p % q;
        steps.push(r === 0 ? `${p} = ${Math.floor(p / q)}×${q} + 0` : `${p} = ${Math.floor(p / q)}×${q} + ${r}`);
        p = q; q = r;
      }
      const hcf = p;
      const lcm = (origA * origB) / hcf;
      steps.push(`HCF = ${hcf}`, `LCM = (${origA} × ${origB}) ÷ ${hcf} = ${lcm}`);
      return { answer: lcm, checkOk: hcf * lcm === origA * origB, steps };
    }
    case "percent-of-number": {
      const n = x1, p = x2;
      if (!Number.isInteger(n) && !Number.isFinite(n)) return "Enter a number and a percentage.";
      const ten = n / 10;
      const answer = (n * p) / 100;
      return {
        answer,
        checkOk: true,
        steps: [
          `10% of ${n} = ${ten}`,
          `${p}% = ${(p / 10).toFixed(1)} × 10%`,
          `${p}% of ${n} = ${answer}`,
        ],
      };
    }
    case "percent-change-one-step": {
      const n = x1, p = x2;
      const multiplier = 1 + p / 100;
      const answer = n * multiplier;
      return {
        answer,
        checkOk: true,
        steps: [
          `Multiplier = 1 ${p >= 0 ? "+" : "−"} ${Math.abs(p)}/100 = ${multiplier}`,
          `${n} × ${multiplier} = ${answer}`,
          p >= 0 ? `That's a ${p}% increase.` : `That's a ${Math.abs(p)}% decrease.`,
        ],
      };
    }
    case "fraction-to-percent": {
      const num = x1, den = x2;
      if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) return "Enter a numerator and a non-zero denominator.";
      const answer = (num / den) * 100;
      return {
        answer,
        checkOk: true,
        steps: [
          `${num}/${den} = ${num} ÷ ${den} × 100`,
          `= ${answer.toFixed(2).replace(/\.00$/, "")}%`,
        ],
      };
    }
    case "difference-of-squares": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || (a + b) % 2 !== 0)
        return "The two numbers need to add to an even total so the midpoint is a whole number — try 48 & 52.";
      const mid = (a + b) / 2;
      const d = Math.abs(b - a) / 2;
      const answer = mid * mid - d * d;
      return {
        answer,
        checkOk: answer === a * b,
        steps: [
          `Midpoint = (${a} + ${b}) ÷ 2 = ${mid}`,
          `Distance = ${d}`,
          `${mid}² − ${d}² = ${mid * mid} − ${d * d} = ${answer}`,
        ],
      };
    }
    case "sqrt-estimate": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1) return "Enter a positive whole number.";
      const lo = Math.floor(Math.sqrt(n));
      const hi = lo + 1;
      const actual = Math.sqrt(n);
      const frac = (n - lo * lo) / (hi * hi - lo * lo);
      const estimate = lo + frac;
      return {
        answer: Math.round(actual * 100) / 100,
        checkOk: true,
        steps: [
          `${lo}² = ${lo * lo} and ${hi}² = ${hi * hi}, so ${lo}² < ${n} < ${hi}²`,
          `√${n} is between ${lo} and ${hi}`,
          `Linear estimate: ${lo} + ${frac.toFixed(2)} ≈ ${estimate.toFixed(2)} (actual ≈ ${actual.toFixed(2)})`,
        ],
      };
    }
    case "pythagorean-triples": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) return "Enter the two legs (positive whole numbers).";
      const c2 = a * a + b * b;
      const c = Math.round(Math.sqrt(c2));
      const isTriple = c * c === c2;
      return {
        answer: c,
        checkOk: isTriple,
        steps: [
          `${a}² + ${b}² = ${a * a} + ${b * b} = ${c2}`,
          isTriple ? `${c2} is a perfect square → √${c2} = ${c}` : `${c2} is NOT a perfect square — not a whole-number triple (hypotenuse ≈ ${Math.sqrt(c2).toFixed(2)})`,
        ],
      };
    }
    case "polygon-angle-sum": {
      const n = x1;
      if (!Number.isInteger(n) || n < 3) return "Enter a number of sides (3 or more).";
      const sum = (n - 2) * 180;
      const each = sum / n;
      return {
        answer: sum,
        checkOk: true,
        steps: [
          `Sum = (${n} − 2) × 180° = ${sum}°`,
          `If regular, each angle = ${sum}° ÷ ${n} = ${each.toFixed(1)}°`,
        ],
      };
    }
    case "rectangle-area-perimeter": {
      const l = x1, w = x2;
      if (!Number.isFinite(l) || !Number.isFinite(w) || l <= 0 || w <= 0) return "Enter a positive length and width.";
      const area = l * w;
      const perimeter = 2 * (l + w);
      return {
        answer: area,
        checkOk: true,
        steps: [
          `Area = ${l} × ${w} = ${area}`,
          `Perimeter = 2 × (${l} + ${w}) = ${perimeter}`,
        ],
      };
    }
    default:
      return "Unknown trick.";
  }
}

function computeListTrick(id: string, nums: number[]): CalcResult | string {
  switch (id) {
    case "assumed-mean-average": {
      if (nums.length < 2) return "Enter at least 2 numbers, separated by commas or spaces.";
      const n = nums.length;
      const rawAvg = nums.reduce((a, b) => a + b, 0) / n;
      const assumed = Math.round(rawAvg / 5) * 5 || Math.round(rawAvg);
      const devs = nums.map((x) => x - assumed);
      const avgDev = devs.reduce((a, b) => a + b, 0) / n;
      const answer = assumed + avgDev;
      return {
        answer,
        checkOk: Math.abs(answer - rawAvg) < 1e-9,
        steps: [
          `Numbers: ${nums.join(", ")} (${n} values)`,
          `Assumed mean = ${assumed}`,
          `Deviations: ${devs.map((d) => (d >= 0 ? "+" + d : d)).join(", ")}`,
          `Average deviation = ${devs.reduce((a, b) => a + b, 0)} ÷ ${n} = ${avgDev.toFixed(2)}`,
          `Average = ${assumed} + ${avgDev.toFixed(2)} = ${answer.toFixed(2)}`,
        ],
      };
    }
    default:
      return "Unknown trick.";
  }
}

function TrickCalc({ t }: { t: Trick }) {
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [vList, setVList] = useState("");
  const [out, setOut] = useState<CalcResult | string | null>(null);

  function run() {
    if (t.calcInputs === "list") {
      const nums = vList.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean).map(Number);
      if (nums.length === 0 || nums.some((n) => Number.isNaN(n))) {
        setOut("Type a list of numbers, separated by commas or spaces.");
        return;
      }
      setOut(computeListTrick(t.id, nums));
      return;
    }
    const n1 = parseFloat(v1);
    const n2 = t.calcInputs === "two" ? parseFloat(v2) : 0;
    if (Number.isNaN(n1) || (t.calcInputs === "two" && Number.isNaN(n2))) {
      setOut("Type a number first.");
      return;
    }
    setOut(computeTrick(t.id, n1, n2));
  }

  return (
    <div className="fm-algo-lab">
      <h4>🧮 Try it yourself</h4>
      <p className="fm-algo-hint">{t.calcLabel} — {t.calcHint}</p>
      <div className="fm-algo-controls">
        {t.calcInputs === "list" ? (
          <input className="fm-algo-select" style={{ width: 260 }} placeholder="e.g. 82, 79, 85, 91, 78" value={vList}
            onChange={(e) => setVList(e.target.value.replace(/[^\d,\s.-]/g, ""))} />
        ) : (
          <>
            <input className="fm-algo-select" style={{ width: 110 }} inputMode="decimal" placeholder="e.g. 85" value={v1}
              onChange={(e) => setV1(e.target.value.replace(/[^\d.-]/g, ""))} />
            {t.calcInputs === "two" && (
              <>
                <span className="fm-algo-stat">×</span>
                <input className="fm-algo-select" style={{ width: 110 }} inputMode="decimal" placeholder="e.g. 96" value={v2}
                  onChange={(e) => setV2(e.target.value.replace(/[^\d.-]/g, ""))} />
              </>
            )}
          </>
        )}
        <button className="fm-algo-btn primary" onClick={run}>Show me</button>
      </div>
      {out && typeof out === "string" && <p className="fm-algo-note">⚠️ {out}</p>}
      {out && typeof out !== "string" && (
        <div className="fm-algo-note">
          {out.steps.map((s, i) => <div key={i}>{s}</div>)}
          <div style={{ marginTop: 6, fontWeight: 700 }}>
            Answer: {out.answer} {out.checkOk ? "✓ checks out" : "— double-check the inputs"}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── card ─────────────────────────── */

function TrickCard({ t }: { t: Trick }) {
  return (
    <article className="fm-algo-card">
      <h3 className="fm-algo-name">{t.name} <span className="fm-algo-badge">{t.sutra}</span></h3>
      <p className="fm-algo-idea"><b>Rule:</b> {t.rule}</p>
      <div className="fm-algo-when">
        <div className="good"><b>Use when</b> {t.whenToUse}</div>
      </div>
      <ol className="fm-algo-idea" style={{ paddingLeft: 20, margin: "10px 0" }}>
        {t.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
      </ol>
      <div className="fm-algo-tablewrap">
        <table className="fm-algo-table">
          <thead><tr><th>Problem</th><th>Working</th><th>Answer</th></tr></thead>
          <tbody>
            {t.examples.map((ex, i) => (
              <tr key={i}><td className="mono">{ex.problem}</td><td>{ex.working}</td><td className="mono ok">{ex.answer}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <TrickCalc t={t} />
    </article>
  );
}

/* ─────────────────────────── main screen ─────────────────────────── */

export function TipsAndTricks() {
  const [cat, setCat] = useState<TrickCatId | "all">("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const list = useMemo(() => TRICKS.filter((t) => {
    if (cat !== "all" && t.cat !== cat) return false;
    if (!q) return true;
    return (t.name + " " + t.rule + " " + t.whenToUse + " " + t.sutra).toLowerCase().includes(q);
  }), [cat, q]);

  return (
    <div className="fm-algo">
      <header className="fm-algo-head">
        <h1>🪄 Math Tips &amp; Tricks</h1>
        <p className="fm-dash-sub">Mental-maths shortcuts across squaring, multiplying, number sense, factors, percentages, algebra, estimation and geometry — each with the rule explained step by step, worked examples, and a live calculator so you can try your own numbers.</p>
      </header>

      <div className="fm-algo-cats">
        <button className={"fm-fact-chip" + (cat === "all" ? " on" : "")} onClick={() => setCat("all")}>✨ All</button>
        {TRICK_CATS.map((c) => (
          <button key={c.id} className={"fm-fact-chip" + (cat === c.id ? " on" : "")} onClick={() => setCat(c.id)}>{c.icon} {c.label}</button>
        ))}
      </div>

      <div className="fm-search-wrap fm-algo-search">
        <span className="fm-search-ic"><Search size={16} /></span>
        <input className="fm-search-input" value={query} placeholder="Search tricks — try 'square', 'percent', 'divisibility'…" onChange={(e) => setQuery(e.target.value)} aria-label="Search tricks" />
        {query && <button className="fm-search-clear" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
      </div>

      <section className="fm-algo-sec">
        {list.map((t) => <TrickCard key={t.id} t={t} />)}
        {list.length === 0 && <p className="fm-search-count">No tricks match "{query}". Try another word.</p>}
      </section>

      {!q && (
        <section className="fm-algo-sec">
          <div className="fm-algo-card">
            <h3 className="fm-algo-name">📜 Honest context — read before teaching</h3>
            <p className="fm-algo-idea">{TRICKS_HISTORY_NOTE}</p>
          </div>
        </section>
      )}
    </div>
  );
}
