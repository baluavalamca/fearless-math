/**
 * Tips & Tricks — mental-maths shortcuts (mostly Vedic-maths style), built from the
 * same verified reference used elsewhere in the app (docs/VEDIC-MATH-REFERENCE.md).
 * Follows the Algorithms screen's native, theme-aware pattern: search, category chips,
 * cards with rule + worked examples, plus a live "Try it yourself" calculator per trick
 * so a learner isn't limited to the printed examples.
 *
 * Trilingual (en/hi/te): both the printed trick content (mathTricks.ts, per-entry
 * {en,hi,te}) and this screen's own chrome + the live calculator's step narration are
 * localised, following the same `lang` prop pattern as FunFacts/TextbookMode/Dictionary.
 * The maths logic in computeTrick/computeListTrick is written once; only the phrasing
 * (the M[lang] table below) is duplicated three ways, so the numbers can never drift
 * between languages.
 */
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { TRICKS, TRICK_CATS, TRICKS_HISTORY_NOTE, Trick, TrickCatId, DictLang, trick, trickCatLabel } from "../data/mathTricks";

/* ─────────────────────────── screen chrome i18n ─────────────────────────── */

const CHROME: Record<DictLang, {
  title: string; subtitle: string; allChip: string; searchPlaceholder: string; searchAria: string;
  noMatch: (q: string) => string; historyHeading: string; tryIt: string; showMe: string;
  answer: string; checksOut: string; doubleCheck: string; listPlaceholder: string; typeNumber: string;
}> = {
  en: {
    title: "🪄 Math Tips & Tricks",
    subtitle: "Mental-maths shortcuts across squaring, multiplying, number sense, factors, percentages, algebra, estimation and geometry — each with the rule explained step by step, worked examples, and a live calculator so you can try your own numbers.",
    allChip: "✨ All",
    searchPlaceholder: "Search tricks — try 'square', 'percent', 'divisibility'…",
    searchAria: "Search tricks",
    noMatch: (q) => `No tricks match "${q}". Try another word.`,
    historyHeading: "📜 Honest context — read before teaching",
    tryIt: "🧮 Try it yourself",
    showMe: "Show me",
    answer: "Answer",
    checksOut: "✓ checks out",
    doubleCheck: "— double-check the inputs",
    listPlaceholder: "e.g. 82, 79, 85, 91, 78",
    typeNumber: "Type a number first.",
  },
  hi: {
    title: "🪄 गणित टिप्स और तरकीबें",
    subtitle: "वर्ग, गुणा, संख्या बोध, गुणनखंड, प्रतिशत, बीजगणित, अनुमान और ज्यामिति में दिमाग़ी-गणित शॉर्टकट — हर एक में नियम चरण-दर-चरण समझाया गया, हल किए उदाहरण, और अपनी संख्याएँ आज़माने के लिए एक लाइव कैलकुलेटर।",
    allChip: "✨ सभी",
    searchPlaceholder: "तरकीबें खोजो — जैसे 'वर्ग', 'प्रतिशत', 'विभाज्यता'…",
    searchAria: "तरकीबें खोजो",
    noMatch: (q) => `"${q}" से कोई तरकीब नहीं मिली। कोई और शब्द आज़माओ।`,
    historyHeading: "📜 ईमानदार संदर्भ — पढ़ाने से पहले पढ़ें",
    tryIt: "🧮 ख़ुद आज़माओ",
    showMe: "दिखाओ",
    answer: "उत्तर",
    checksOut: "✓ सही मिलता है",
    doubleCheck: "— इनपुट दोबारा जाँचो",
    listPlaceholder: "जैसे 82, 79, 85, 91, 78",
    typeNumber: "पहले एक संख्या लिखो।",
  },
  te: {
    title: "🪄 గణిత చిట్కాలు & ఉపాయాలు",
    subtitle: "వర్గం, గుణకారం, సంఖ్యా జ్ఞానం, కారణాంకాలు, శాతాలు, బీజగణితం, అంచనా, జ్యామితిలో మానసిక-గణిత సత్వరమార్గాలు — ప్రతి దానికి నియమం దశలవారీగా వివరించి, పరిష్కరించిన ఉదాహరణలు, మీ సొంత సంఖ్యలు ప్రయత్నించడానికి లైవ్ కాలిక్యులేటర్.",
    allChip: "✨ అన్నీ",
    searchPlaceholder: "ఉపాయాలు వెతకండి — 'వర్గం', 'శాతం', 'భాజ్యత' ప్రయత్నించండి…",
    searchAria: "ఉపాయాలు వెతకండి",
    noMatch: (q) => `"${q}"కి సరిపోలే ఉపాయాలు లేవు. మరో పదం ప్రయత్నించండి.`,
    historyHeading: "📜 నిజాయితీ నేపథ్యం — నేర్పించే ముందు చదవండి",
    tryIt: "🧮 మీరే ప్రయత్నించండి",
    showMe: "చూపించు",
    answer: "సమాధానం",
    checksOut: "✓ సరిపోతుంది",
    doubleCheck: "— ఇన్‌పుట్‌లను మళ్ళీ తనిఖీ చేయండి",
    listPlaceholder: "ఉదా. 82, 79, 85, 91, 78",
    typeNumber: "ముందుగా ఒక సంఖ్య రాయండి.",
  },
};

/* ─────────────────────────── calculator narration i18n ─────────────────────────── */

type M = {
  errWhole: string; errTwoWhole: string; errWholeGt1: string; errPositiveTwo: string;
  errNumEndsIn5: string; errNumNear100: string; errBothSide100: string; errBothSameSign: string;
  errTwoDigit: string; errSameTensSum10a: string; errSameTensSum10b: string; errNumeratorDen: string;
  errEvenSum: string; errSidesGE3: string; errPosLengthWidth: string;
  join: (l: string | number, r: string, ans: number) => string;
  digitsBefore5: (base: number) => string;
  mulNext: (base: number, next: number, left: number) => string;
  write25: (left: number) => string;
  dEquals: (n: number, d: number) => string;
  leftEqNPlusD: (n: number, d: number, left: number) => string;
  rightEqDSq: (d: number, right: number) => string;
  carryLeft: (carry: number, left: number) => string;
  distFrom100: (a: number, da: number, b: number, db: number) => string;
  leftEqAPlusDb: (a: number, db: number, left: number) => string;
  rightEqDaDb: (da: number, db: number, right: number) => string;
  unitsEq: (a0: number, b0: number, units: number) => string;
  crossEq: (a1: number, b0: number, a0: number, b1: number, cross: number, carryU: number, mid: number) => string;
  leftTensEq: (a1: number, b1: number, left: number, carryM: number) => string;
  joinCarryEach: (answer: number) => string;
  digitsOf: (n: number, digits: string) => string;
  singleDigit: (d: number, answer: number) => string;
  neighbourSums: (pairs: string) => string;
  outerStayCarry: (answer: number) => string;
  hasKDigits: (n: number, k: number, nines: string) => string;
  leftMinus1: (n: number, left: number) => string;
  rightPowerMinusN: (power: number, n: number, right: number) => string;
  sameTens: (ta: number, ua: number, ub: number) => string;
  leftTensTimes: (ta: number, left: number) => string;
  rightUnitsTimes: (ua: number, ub: number, right: string) => string;
  digitSumInfo: (digitSum: number, last1: number, last2: number, last3: number, altSum: number) => string;
  divisibleBy: (hits: string) => string;
  notDivisible: string;
  sqrtTest: (n: number, sqrt: string, bound: number, primes: string) => string;
  isPrime: (n: number) => string;
  isComposite: (n: number, factor: number, quotient: number) => string;
  euclidStep: (p: number, q: number, quot: number, r: number) => string;
  hcfResult: (hcf: number) => string;
  lcmResult: (a: number, b: number, hcf: number, lcm: number) => string;
  tenPercentOf: (n: number, ten: number) => string;
  percentMultiplier: (p: number, factor: string) => string;
  percentOfResult: (p: number, n: number, answer: number) => string;
  multiplierEq: (p: number, mult: number) => string;
  timesMultiplier: (n: number, mult: number, answer: number) => string;
  increaseNote: (p: number) => string;
  decreaseNote: (p: number) => string;
  fracTimes100: (num: number, den: number) => string;
  percentResult: (pct: string) => string;
  midpointEq: (a: number, b: number, mid: number) => string;
  distanceEq: (d: number) => string;
  midSqMinusDSq: (mid: number, d: number, answer: number) => string;
  squaresBetween: (lo: number, loSq: number, hi: number, hiSq: number, n: number) => string;
  sqrtBetween: (n: number, lo: number, hi: number) => string;
  linearEstimate: (lo: number, frac: string, estimate: string, actual: string) => string;
  numbersCount: (nums: string, n: number) => string;
  assumedMean: (assumed: number) => string;
  deviations: (devs: string) => string;
  avgDeviation: (sumDev: number, n: number, avgDev: string) => string;
  averageResult: (assumed: number, avgDev: string, answer: string) => string;
  legsSquareSum: (a: number, b: number, a2: number, b2: number, c2: number) => string;
  perfectSquareHyp: (c2: number, c: number) => string;
  notPerfectSquare: (c2: number, approx: string) => string;
  sumInteriorAngles: (n: number, sum: number) => string;
  eachAngleIfRegular: (sum: number, n: number, each: string) => string;
  areaEq: (l: number, w: number, area: number) => string;
  perimeterEq: (l: number, w: number, perimeter: number) => string;
  mulByEq: (n: number, factor: number, product: number) => string;
  divByEq: (value: number, div: number, answer: number) => string;
  sumTwoParts: (p1: number, p2: number, sum: number) => string;
  errNeedEven: string;
  halveDoubleStep: (a: number, newA: number, b: number, newB: number) => string;
  finalMultiply: (a: number, b: number, answer: number) => string;
  factorSplit: (divisor: number, a: number, b: number) => string;
  errNoFactorPair: string;
  errCubeRange: string;
  cubesBetween: (lo: number, loCube: number, hi: number, hiCube: number, n: number) => string;
  cbrtBetween: (n: number, lo: number, hi: number) => string;
  errBaseExp: string;
  errRatePercent: string;
  doublingTime: (years: number) => string;
  errNeedThree: string;
  digitalRootOf: (n: number, dr: number) => string;
  rootProductCheck: (drA: number, drB: number, drProduct: number) => string;
};

const M_EN: M = {
  errWhole: "Enter a positive whole number.",
  errTwoWhole: "Enter two whole numbers.",
  errWholeGt1: "Enter a whole number greater than 1.",
  errPositiveTwo: "Enter two positive whole numbers.",
  errNumEndsIn5: "This trick only works for numbers ending in 5 — try 15, 45, 95…",
  errNumNear100: "Pick a number roughly between 80 and 120 (60–140 also works).",
  errBothSide100: "Both numbers need to be on the same side of 100 (both below, or both above) — try 96 & 94, or 103 & 106.",
  errBothSameSign: "Both distances need the same sign — pick two numbers on the same side of 100.",
  errTwoDigit: "Enter two 2-digit numbers (10–99).",
  errSameTensSum10a: "Both numbers need the SAME tens digit — try 43 & 47.",
  errSameTensSum10b: "The units digits need to add up to 10 — try 43 & 47 (3+7=10).",
  errNumeratorDen: "Enter a numerator and a non-zero denominator.",
  errEvenSum: "The two numbers need to add to an even total so the midpoint is a whole number — try 48 & 52.",
  errSidesGE3: "Enter a number of sides (3 or more).",
  errPosLengthWidth: "Enter a positive length and width.",
  join: (l, r, ans) => `Join: ${l} and ${r} → ${ans}`,
  digitsBefore5: (base) => `Digits before the 5: ${base}`,
  mulNext: (base, next, left) => `${base} × ${next} = ${left}`,
  write25: (left) => `Write 25 on the right → ${left}25`,
  dEquals: (n, d) => `d = ${n} − 100 = ${d}`,
  leftEqNPlusD: (n, d, left) => `Left = ${n} + (${d}) = ${left}`,
  rightEqDSq: (d, right) => `Right = ${d}² = ${right}`,
  carryLeft: (carry, left) => `That's 3+ digits, so carry ${carry} into the left part → ${left}`,
  distFrom100: (a, da, b, db) => `Distance from 100: ${a} → ${da}, ${b} → ${db}`,
  leftEqAPlusDb: (a, db, left) => `Left = ${a} + (${db}) = ${left}`,
  rightEqDaDb: (da, db, right) => `Right = ${da} × ${db} = ${right}`,
  unitsEq: (a0, b0, units) => `Units: ${a0} × ${b0} = ${units}`,
  crossEq: (a1, b0, a0, b1, cross, carryU, mid) => `Cross: ${a1}×${b0} + ${a0}×${b1} = ${a1 * b0} + ${a0 * b1} = ${cross}` + (carryU ? ` (plus carry ${carryU} from units → ${mid})` : ``),
  leftTensEq: (a1, b1, left, carryM) => `Left: ${a1} × ${b1} = ${a1 * b1}` + (carryM ? ` (plus carry ${carryM} → ${left})` : ``),
  joinCarryEach: (answer) => `Join, carrying each column: ${answer}`,
  digitsOf: (n, digits) => `Digits of ${n}: ${digits}`,
  singleDigit: (d, answer) => `Single digit — just ${d} . ${d} → ${answer}`,
  neighbourSums: (pairs) => `Neighbour sums: ${pairs}`,
  outerStayCarry: (answer) => `Outer digits stay, sums go between them, carrying left where a sum ≥ 10 → ${answer}`,
  hasKDigits: (n, k, nines) => `${n} has ${k} digit${k > 1 ? "s" : ""}, so multiply by ${nines} (${k} nine${k > 1 ? "s" : ""}).`,
  leftMinus1: (n, left) => `Left = ${n} − 1 = ${left}`,
  rightPowerMinusN: (power, n, right) => `Right = ${power} − ${n} = ${right}`,
  sameTens: (ta, ua, ub) => `Same tens digit: ${ta}. Units ${ua} + ${ub} = 10 ✓`,
  leftTensTimes: (ta, left) => `Left = ${ta} × ${ta + 1} = ${left}`,
  rightUnitsTimes: (ua, ub, right) => `Right = ${ua} × ${ub} = ${right}`,
  digitSumInfo: (digitSum, last1, last2, last3, altSum) => `Digit sum = ${digitSum}, last digit = ${last1}, last 2 = ${last2}, last 3 = ${last3}, alternating sum = ${altSum}`,
  divisibleBy: (hits) => `Divisible by: ${hits}`,
  notDivisible: "Not divisible by any of 2, 3, 4, 5, 6, 8, 9, 10, 11",
  sqrtTest: (n, sqrt, bound, primes) => `√${n} ≈ ${sqrt}, so test primes up to ${bound}: ${primes}`,
  isPrime: (n) => `None divide evenly → ${n} is PRIME`,
  isComposite: (n, factor, quotient) => `${n} ÷ ${factor} = ${quotient} → ${n} is COMPOSITE`,
  euclidStep: (p, q, quot, r) => (r === 0 ? `${p} = ${quot}×${q} + 0` : `${p} = ${quot}×${q} + ${r}`),
  hcfResult: (hcf) => `HCF = ${hcf}`,
  lcmResult: (a, b, hcf, lcm) => `LCM = (${a} × ${b}) ÷ ${hcf} = ${lcm}`,
  tenPercentOf: (n, ten) => `10% of ${n} = ${ten}`,
  percentMultiplier: (p, factor) => `${p}% = ${factor} × 10%`,
  percentOfResult: (p, n, answer) => `${p}% of ${n} = ${answer}`,
  multiplierEq: (p, mult) => `Multiplier = 1 ${p >= 0 ? "+" : "−"} ${Math.abs(p)}/100 = ${mult}`,
  timesMultiplier: (n, mult, answer) => `${n} × ${mult} = ${answer}`,
  increaseNote: (p) => `That's a ${p}% increase.`,
  decreaseNote: (p) => `That's a ${Math.abs(p)}% decrease.`,
  fracTimes100: (num, den) => `${num}/${den} = ${num} ÷ ${den} × 100`,
  percentResult: (pct) => `= ${pct}%`,
  midpointEq: (a, b, mid) => `Midpoint = (${a} + ${b}) ÷ 2 = ${mid}`,
  distanceEq: (d) => `Distance = ${d}`,
  midSqMinusDSq: (mid, d, answer) => `${mid}² − ${d}² = ${mid * mid} − ${d * d} = ${answer}`,
  squaresBetween: (lo, loSq, hi, hiSq, n) => `${lo}² = ${loSq} and ${hi}² = ${hiSq}, so ${lo}² < ${n} < ${hi}²`,
  sqrtBetween: (n, lo, hi) => `√${n} is between ${lo} and ${hi}`,
  linearEstimate: (lo, frac, estimate, actual) => `Linear estimate: ${lo} + ${frac} ≈ ${estimate} (actual ≈ ${actual})`,
  numbersCount: (nums, n) => `Numbers: ${nums} (${n} values)`,
  assumedMean: (assumed) => `Assumed mean = ${assumed}`,
  deviations: (devs) => `Deviations: ${devs}`,
  avgDeviation: (sumDev, n, avgDev) => `Average deviation = ${sumDev} ÷ ${n} = ${avgDev}`,
  averageResult: (assumed, avgDev, answer) => `Average = ${assumed} + ${avgDev} = ${answer}`,
  legsSquareSum: (a, b, a2, b2, c2) => `${a}² + ${b}² = ${a2} + ${b2} = ${c2}`,
  perfectSquareHyp: (c2, c) => `${c2} is a perfect square → √${c2} = ${c}`,
  notPerfectSquare: (c2, approx) => `${c2} is NOT a perfect square — not a whole-number triple (hypotenuse ≈ ${approx})`,
  sumInteriorAngles: (n, sum) => `Sum = (${n} − 2) × 180° = ${sum}°`,
  eachAngleIfRegular: (sum, n, each) => `If regular, each angle = ${sum}° ÷ ${n} = ${each}°`,
  areaEq: (l, w, area) => `Area = ${l} × ${w} = ${area}`,
  perimeterEq: (l, w, perimeter) => `Perimeter = 2 × (${l} + ${w}) = ${perimeter}`,
  mulByEq: (n, factor, product) => `${n} × ${factor} = ${product}`,
  divByEq: (value, div, answer) => `${value} ÷ ${div} = ${answer}`,
  sumTwoParts: (p1, p2, sum) => `${p1} + ${p2} = ${sum}`,
  errNeedEven: "At least one of the two numbers needs to be even — try 16 & 25, or 14 & 15.",
  halveDoubleStep: (a, newA, b, newB) => `Halve ${a} → ${newA}, double ${b} → ${newB}`,
  finalMultiply: (a, b, answer) => `${a} × ${b} = ${answer}`,
  factorSplit: (divisor, a, b) => `${divisor} = ${a} × ${b}`,
  errNoFactorPair: "That number doesn't split into two easy factors — try 12, 15, 16, 18, 20, or 24.",
  errCubeRange: "Enter a whole number from 1 to 20.",
  cubesBetween: (lo, loCube, hi, hiCube, n) => `${lo}³ = ${loCube} and ${hi}³ = ${hiCube}, so ${lo}³ < ${n} < ${hi}³`,
  cbrtBetween: (n, lo, hi) => `∛${n} is between ${lo} and ${hi}`,
  errBaseExp: "Base must be 2, 3, 5, or 10, and the exponent a whole number from 1 to 8.",
  errRatePercent: "Enter an annual interest or growth rate as a percent (e.g. 8).",
  doublingTime: (years) => `So the amount roughly doubles in ~${years} years.`,
  errNeedThree: "Enter exactly three numbers: the two numbers you multiplied, then the answer you got (e.g. 47, 63, 2961).",
  digitalRootOf: (n, dr) => `Digital root of ${n} = ${dr}`,
  rootProductCheck: (drA, drB, drProduct) => `${drA} × ${drB} = ${drA * drB} → digital root = ${drProduct}`,
};

const M_HI: M = {
  errWhole: "एक धनात्मक पूर्ण संख्या लिखो।",
  errTwoWhole: "दो पूर्ण संख्याएँ लिखो।",
  errWholeGt1: "1 से बड़ी पूर्ण संख्या लिखो।",
  errPositiveTwo: "दो धनात्मक पूर्ण संख्याएँ लिखो।",
  errNumEndsIn5: "यह तरकीब सिर्फ़ 5 पर ख़त्म होने वाली संख्याओं के लिए काम करती है — जैसे 15, 45, 95…",
  errNumNear100: "80 और 120 के बीच की कोई संख्या चुनो (60–140 भी चलेगा)।",
  errBothSide100: "दोनों संख्याएँ 100 की एक ही तरफ़ होनी चाहिए (दोनों कम, या दोनों ज़्यादा) — जैसे 96 और 94, या 103 और 106।",
  errBothSameSign: "दोनों दूरियों का चिह्न एक जैसा होना चाहिए — 100 की एक ही तरफ़ की दो संख्याएँ चुनो।",
  errTwoDigit: "दो 2-अंकीय संख्याएँ लिखो (10–99)।",
  errSameTensSum10a: "दोनों संख्याओं का दहाई अंक समान होना चाहिए — जैसे 43 और 47।",
  errSameTensSum10b: "इकाई अंकों का योग 10 होना चाहिए — जैसे 43 और 47 (3+7=10)।",
  errNumeratorDen: "एक अंश और शून्य न होने वाला हर लिखो।",
  errEvenSum: "दोनों संख्याओं का योग सम होना चाहिए ताकि मध्यबिंदु पूर्ण संख्या बने — जैसे 48 और 52।",
  errSidesGE3: "भुजाओं की संख्या लिखो (3 या ज़्यादा)।",
  errPosLengthWidth: "धनात्मक लंबाई और चौड़ाई लिखो।",
  join: (l, r, ans) => `जोड़ो: ${l} और ${r} → ${ans}`,
  digitsBefore5: (base) => `5 से पहले के अंक: ${base}`,
  mulNext: (base, next, left) => `${base} × ${next} = ${left}`,
  write25: (left) => `दाईं ओर 25 लिखो → ${left}25`,
  dEquals: (n, d) => `d = ${n} − 100 = ${d}`,
  leftEqNPlusD: (n, d, left) => `बायाँ = ${n} + (${d}) = ${left}`,
  rightEqDSq: (d, right) => `दायाँ = ${d}² = ${right}`,
  carryLeft: (carry, left) => `यह 3 या ज़्यादा अंकों का है, इसलिए ${carry} बाईं ओर कैरी करो → ${left}`,
  distFrom100: (a, da, b, db) => `100 से दूरी: ${a} → ${da}, ${b} → ${db}`,
  leftEqAPlusDb: (a, db, left) => `बायाँ = ${a} + (${db}) = ${left}`,
  rightEqDaDb: (da, db, right) => `दायाँ = ${da} × ${db} = ${right}`,
  unitsEq: (a0, b0, units) => `इकाई: ${a0} × ${b0} = ${units}`,
  crossEq: (a1, b0, a0, b1, cross, carryU, mid) => `आड़ा: ${a1}×${b0} + ${a0}×${b1} = ${a1 * b0} + ${a0 * b1} = ${cross}` + (carryU ? ` (इकाई से ${carryU} कैरी जोड़कर → ${mid})` : ``),
  leftTensEq: (a1, b1, left, carryM) => `बायाँ: ${a1} × ${b1} = ${a1 * b1}` + (carryM ? ` (${carryM} कैरी जोड़कर → ${left})` : ``),
  joinCarryEach: (answer) => `हर कॉलम कैरी करते हुए जोड़ो: ${answer}`,
  digitsOf: (n, digits) => `${n} के अंक: ${digits}`,
  singleDigit: (d, answer) => `एक अंक — बस ${d} . ${d} → ${answer}`,
  neighbourSums: (pairs) => `पड़ोसी योग: ${pairs}`,
  outerStayCarry: (answer) => `बाहरी अंक वैसे रहते हैं, योग बीच में जाते हैं, योग ≥ 10 हो तो बाईं ओर कैरी → ${answer}`,
  hasKDigits: (n, k, nines) => `${n} में ${k} अंक हैं, इसलिए ${nines} (${k} नौ) से गुणा करो।`,
  leftMinus1: (n, left) => `बायाँ = ${n} − 1 = ${left}`,
  rightPowerMinusN: (power, n, right) => `दायाँ = ${power} − ${n} = ${right}`,
  sameTens: (ta, ua, ub) => `समान दहाई अंक: ${ta}। इकाई ${ua} + ${ub} = 10 ✓`,
  leftTensTimes: (ta, left) => `बायाँ = ${ta} × ${ta + 1} = ${left}`,
  rightUnitsTimes: (ua, ub, right) => `दायाँ = ${ua} × ${ub} = ${right}`,
  digitSumInfo: (digitSum, last1, last2, last3, altSum) => `अंकों का योग = ${digitSum}, अंतिम अंक = ${last1}, अंतिम 2 = ${last2}, अंतिम 3 = ${last3}, एकांतर-योग = ${altSum}`,
  divisibleBy: (hits) => `इनसे विभाज्य: ${hits}`,
  notDivisible: "2, 3, 4, 5, 6, 8, 9, 10, 11 में से किसी से भी विभाज्य नहीं",
  sqrtTest: (n, sqrt, bound, primes) => `√${n} ≈ ${sqrt}, इसलिए ${bound} तक के अभाज्य जाँचो: ${primes}`,
  isPrime: (n) => `कोई नहीं बाँटता → ${n} अभाज्य है`,
  isComposite: (n, factor, quotient) => `${n} ÷ ${factor} = ${quotient} → ${n} भाज्य है`,
  euclidStep: (p, q, quot, r) => (r === 0 ? `${p} = ${quot}×${q} + 0` : `${p} = ${quot}×${q} + ${r}`),
  hcfResult: (hcf) => `म.स. = ${hcf}`,
  lcmResult: (a, b, hcf, lcm) => `ल.स. = (${a} × ${b}) ÷ ${hcf} = ${lcm}`,
  tenPercentOf: (n, ten) => `${n} का 10% = ${ten}`,
  percentMultiplier: (p, factor) => `${p}% = ${factor} × 10%`,
  percentOfResult: (p, n, answer) => `${n} का ${p}% = ${answer}`,
  multiplierEq: (p, mult) => `गुणक = 1 ${p >= 0 ? "+" : "−"} ${Math.abs(p)}/100 = ${mult}`,
  timesMultiplier: (n, mult, answer) => `${n} × ${mult} = ${answer}`,
  increaseNote: (p) => `यह ${p}% वृद्धि है।`,
  decreaseNote: (p) => `यह ${Math.abs(p)}% कमी है।`,
  fracTimes100: (num, den) => `${num}/${den} = ${num} ÷ ${den} × 100`,
  percentResult: (pct) => `= ${pct}%`,
  midpointEq: (a, b, mid) => `मध्यबिंदु = (${a} + ${b}) ÷ 2 = ${mid}`,
  distanceEq: (d) => `दूरी = ${d}`,
  midSqMinusDSq: (mid, d, answer) => `${mid}² − ${d}² = ${mid * mid} − ${d * d} = ${answer}`,
  squaresBetween: (lo, loSq, hi, hiSq, n) => `${lo}² = ${loSq} और ${hi}² = ${hiSq}, इसलिए ${lo}² < ${n} < ${hi}²`,
  sqrtBetween: (n, lo, hi) => `√${n}, ${lo} और ${hi} के बीच है`,
  linearEstimate: (lo, frac, estimate, actual) => `रैखिक अनुमान: ${lo} + ${frac} ≈ ${estimate} (असली ≈ ${actual})`,
  numbersCount: (nums, n) => `संख्याएँ: ${nums} (${n} मान)`,
  assumedMean: (assumed) => `अनुमानित माध्य = ${assumed}`,
  deviations: (devs) => `विचलन: ${devs}`,
  avgDeviation: (sumDev, n, avgDev) => `औसत विचलन = ${sumDev} ÷ ${n} = ${avgDev}`,
  averageResult: (assumed, avgDev, answer) => `औसत = ${assumed} + ${avgDev} = ${answer}`,
  legsSquareSum: (a, b, a2, b2, c2) => `${a}² + ${b}² = ${a2} + ${b2} = ${c2}`,
  perfectSquareHyp: (c2, c) => `${c2} पूर्ण वर्ग है → √${c2} = ${c}`,
  notPerfectSquare: (c2, approx) => `${c2} पूर्ण वर्ग नहीं है — पूर्ण-संख्या त्रिक नहीं (कर्ण ≈ ${approx})`,
  sumInteriorAngles: (n, sum) => `योग = (${n} − 2) × 180° = ${sum}°`,
  eachAngleIfRegular: (sum, n, each) => `नियमित हो तो, हर कोण = ${sum}° ÷ ${n} = ${each}°`,
  areaEq: (l, w, area) => `क्षेत्रफल = ${l} × ${w} = ${area}`,
  perimeterEq: (l, w, perimeter) => `परिमाप = 2 × (${l} + ${w}) = ${perimeter}`,
  mulByEq: (n, factor, product) => `${n} × ${factor} = ${product}`,
  divByEq: (value, div, answer) => `${value} ÷ ${div} = ${answer}`,
  sumTwoParts: (p1, p2, sum) => `${p1} + ${p2} = ${sum}`,
  errNeedEven: "दोनों में से कम से कम एक संख्या सम होनी चाहिए — जैसे 16 और 25, या 14 और 15।",
  halveDoubleStep: (a, newA, b, newB) => `${a} को आधा करो → ${newA}, ${b} को दोगुना करो → ${newB}`,
  finalMultiply: (a, b, answer) => `${a} × ${b} = ${answer}`,
  factorSplit: (divisor, a, b) => `${divisor} = ${a} × ${b}`,
  errNoFactorPair: "यह संख्या दो आसान गुणनखंडों में नहीं बँटती — 12, 15, 16, 18, 20, या 24 आज़माओ।",
  errCubeRange: "1 से 20 तक की कोई पूर्ण संख्या लिखो।",
  cubesBetween: (lo, loCube, hi, hiCube, n) => `${lo}³ = ${loCube} और ${hi}³ = ${hiCube}, इसलिए ${lo}³ < ${n} < ${hi}³`,
  cbrtBetween: (n, lo, hi) => `∛${n}, ${lo} और ${hi} के बीच है`,
  errBaseExp: "आधार 2, 3, 5, या 10 होना चाहिए, और घातांक 1 से 8 तक की पूर्ण संख्या।",
  errRatePercent: "वार्षिक ब्याज या वृद्धि दर प्रतिशत में लिखो (जैसे 8)।",
  doublingTime: (years) => `यानी राशि लगभग ${years} सालों में दोगुनी हो जाती है।`,
  errNeedThree: "बिल्कुल तीन संख्याएँ लिखो: जिन दो संख्याओं को गुणा किया, फिर जो उत्तर मिला (जैसे 47, 63, 2961)।",
  digitalRootOf: (n, dr) => `${n} का अंकमूल = ${dr}`,
  rootProductCheck: (drA, drB, drProduct) => `${drA} × ${drB} = ${drA * drB} → अंकमूल = ${drProduct}`,
};

const M_TE: M = {
  errWhole: "ధనాత్మక పూర్ణ సంఖ్య రాయండి.",
  errTwoWhole: "రెండు పూర్ణ సంఖ్యలు రాయండి.",
  errWholeGt1: "1 కంటే పెద్ద పూర్ణ సంఖ్య రాయండి.",
  errPositiveTwo: "రెండు ధనాత్మక పూర్ణ సంఖ్యలు రాయండి.",
  errNumEndsIn5: "ఈ ఉపాయం 5తో ముగిసే సంఖ్యలకు మాత్రమే పనిచేస్తుంది — 15, 45, 95 ప్రయత్నించండి…",
  errNumNear100: "80, 120 మధ్య ఉన్న సంఖ్యను ఎంచుకోండి (60–140 కూడా పనిచేస్తుంది).",
  errBothSide100: "రెండు సంఖ్యలూ 100కి ఒకే వైపు ఉండాలి (రెండూ తక్కువ, లేదా రెండూ ఎక్కువ) — 96 & 94, లేదా 103 & 106 ప్రయత్నించండి.",
  errBothSameSign: "రెండు దూరాలకూ ఒకే గుర్తు ఉండాలి — 100కి ఒకే వైపు ఉన్న రెండు సంఖ్యలు ఎంచుకోండి.",
  errTwoDigit: "రెండు 2-అంకెల సంఖ్యలు రాయండి (10–99).",
  errSameTensSum10a: "రెండు సంఖ్యలకూ ఒకే పదుల అంకె ఉండాలి — 43 & 47 ప్రయత్నించండి.",
  errSameTensSum10b: "ఒకట్ల అంకెలు కలిపితే 10 కావాలి — 43 & 47 (3+7=10) ప్రయత్నించండి.",
  errNumeratorDen: "లవం, సున్నా కాని హారం రాయండి.",
  errEvenSum: "రెండు సంఖ్యల మొత్తం సరి సంఖ్య కావాలి, తద్వారా మధ్యబిందువు పూర్ణ సంఖ్య అవుతుంది — 48 & 52 ప్రయత్నించండి.",
  errSidesGE3: "భుజల సంఖ్య రాయండి (3 లేదా ఎక్కువ).",
  errPosLengthWidth: "ధనాత్మక పొడవు, వెడల్పు రాయండి.",
  join: (l, r, ans) => `కలపండి: ${l} మరియు ${r} → ${ans}`,
  digitsBefore5: (base) => `5కి ముందున్న అంకెలు: ${base}`,
  mulNext: (base, next, left) => `${base} × ${next} = ${left}`,
  write25: (left) => `కుడివైపు 25 రాయండి → ${left}25`,
  dEquals: (n, d) => `d = ${n} − 100 = ${d}`,
  leftEqNPlusD: (n, d, left) => `ఎడమ = ${n} + (${d}) = ${left}`,
  rightEqDSq: (d, right) => `కుడి = ${d}² = ${right}`,
  carryLeft: (carry, left) => `ఇది 3 లేదా ఎక్కువ అంకెలు, కాబట్టి ${carry}ను ఎడమవైపు క్యారీ చేయండి → ${left}`,
  distFrom100: (a, da, b, db) => `100 నుండి దూరం: ${a} → ${da}, ${b} → ${db}`,
  leftEqAPlusDb: (a, db, left) => `ఎడమ = ${a} + (${db}) = ${left}`,
  rightEqDaDb: (da, db, right) => `కుడి = ${da} × ${db} = ${right}`,
  unitsEq: (a0, b0, units) => `ఒకట్లు: ${a0} × ${b0} = ${units}`,
  crossEq: (a1, b0, a0, b1, cross, carryU, mid) => `అడ్డం: ${a1}×${b0} + ${a0}×${b1} = ${a1 * b0} + ${a0 * b1} = ${cross}` + (carryU ? ` (ఒకట్ల నుండి ${carryU} క్యారీ కలిపి → ${mid})` : ``),
  leftTensEq: (a1, b1, left, carryM) => `ఎడమ: ${a1} × ${b1} = ${a1 * b1}` + (carryM ? ` (${carryM} క్యారీ కలిపి → ${left})` : ``),
  joinCarryEach: (answer) => `ప్రతి కాలమ్‌ను క్యారీ చేస్తూ కలపండి: ${answer}`,
  digitsOf: (n, digits) => `${n} యొక్క అంకెలు: ${digits}`,
  singleDigit: (d, answer) => `ఒకే అంకె — కేవలం ${d} . ${d} → ${answer}`,
  neighbourSums: (pairs) => `పక్క మొత్తాలు: ${pairs}`,
  outerStayCarry: (answer) => `బయటి అంకెలు అలాగే ఉంటాయి, మొత్తాలు మధ్యలో వస్తాయి, మొత్తం ≥ 10 అయితే ఎడమవైపు క్యారీ → ${answer}`,
  hasKDigits: (n, k, nines) => `${n}కి ${k} అంకెలు ఉన్నాయి, కాబట్టి ${nines} (${k} తొమ్మిదులు)తో గుణించండి.`,
  leftMinus1: (n, left) => `ఎడమ = ${n} − 1 = ${left}`,
  rightPowerMinusN: (power, n, right) => `కుడి = ${power} − ${n} = ${right}`,
  sameTens: (ta, ua, ub) => `ఒకే పదుల అంకె: ${ta}. ఒకట్లు ${ua} + ${ub} = 10 ✓`,
  leftTensTimes: (ta, left) => `ఎడమ = ${ta} × ${ta + 1} = ${left}`,
  rightUnitsTimes: (ua, ub, right) => `కుడి = ${ua} × ${ub} = ${right}`,
  digitSumInfo: (digitSum, last1, last2, last3, altSum) => `అంకెల మొత్తం = ${digitSum}, చివరి అంకె = ${last1}, చివరి 2 = ${last2}, చివరి 3 = ${last3}, ఏకాంతర-మొత్తం = ${altSum}`,
  divisibleBy: (hits) => `వీటితో భాగించబడుతుంది: ${hits}`,
  notDivisible: "2, 3, 4, 5, 6, 8, 9, 10, 11లో దేనితోనూ భాగించబడదు",
  sqrtTest: (n, sqrt, bound, primes) => `√${n} ≈ ${sqrt}, కాబట్టి ${bound} వరకు ప్రధాన సంఖ్యలు పరీక్షించండి: ${primes}`,
  isPrime: (n) => `ఏదీ సరిగ్గా భాగించదు → ${n} ప్రధాన సంఖ్య`,
  isComposite: (n, factor, quotient) => `${n} ÷ ${factor} = ${quotient} → ${n} సంయుక్త సంఖ్య`,
  euclidStep: (p, q, quot, r) => (r === 0 ? `${p} = ${quot}×${q} + 0` : `${p} = ${quot}×${q} + ${r}`),
  hcfResult: (hcf) => `గ.సా.భా = ${hcf}`,
  lcmResult: (a, b, hcf, lcm) => `క.సా.గు = (${a} × ${b}) ÷ ${hcf} = ${lcm}`,
  tenPercentOf: (n, ten) => `${n}లో 10% = ${ten}`,
  percentMultiplier: (p, factor) => `${p}% = ${factor} × 10%`,
  percentOfResult: (p, n, answer) => `${n}లో ${p}% = ${answer}`,
  multiplierEq: (p, mult) => `గుణకం = 1 ${p >= 0 ? "+" : "−"} ${Math.abs(p)}/100 = ${mult}`,
  timesMultiplier: (n, mult, answer) => `${n} × ${mult} = ${answer}`,
  increaseNote: (p) => `ఇది ${p}% పెరుగుదల.`,
  decreaseNote: (p) => `ఇది ${Math.abs(p)}% తగ్గుదల.`,
  fracTimes100: (num, den) => `${num}/${den} = ${num} ÷ ${den} × 100`,
  percentResult: (pct) => `= ${pct}%`,
  midpointEq: (a, b, mid) => `మధ్యబిందువు = (${a} + ${b}) ÷ 2 = ${mid}`,
  distanceEq: (d) => `దూరం = ${d}`,
  midSqMinusDSq: (mid, d, answer) => `${mid}² − ${d}² = ${mid * mid} − ${d * d} = ${answer}`,
  squaresBetween: (lo, loSq, hi, hiSq, n) => `${lo}² = ${loSq} మరియు ${hi}² = ${hiSq}, కాబట్టి ${lo}² < ${n} < ${hi}²`,
  sqrtBetween: (n, lo, hi) => `√${n} అనేది ${lo}, ${hi} మధ్య ఉంటుంది`,
  linearEstimate: (lo, frac, estimate, actual) => `రేఖీయ అంచనా: ${lo} + ${frac} ≈ ${estimate} (వాస్తవం ≈ ${actual})`,
  numbersCount: (nums, n) => `సంఖ్యలు: ${nums} (${n} విలువలు)`,
  assumedMean: (assumed) => `అంచనా మధ్యమం = ${assumed}`,
  deviations: (devs) => `విచలనాలు: ${devs}`,
  avgDeviation: (sumDev, n, avgDev) => `సగటు విచలనం = ${sumDev} ÷ ${n} = ${avgDev}`,
  averageResult: (assumed, avgDev, answer) => `సగటు = ${assumed} + ${avgDev} = ${answer}`,
  legsSquareSum: (a, b, a2, b2, c2) => `${a}² + ${b}² = ${a2} + ${b2} = ${c2}`,
  perfectSquareHyp: (c2, c) => `${c2} పూర్ణ వర్గం → √${c2} = ${c}`,
  notPerfectSquare: (c2, approx) => `${c2} పూర్ణ వర్గం కాదు — పూర్ణ-సంఖ్య త్రికం కాదు (కర్ణం ≈ ${approx})`,
  sumInteriorAngles: (n, sum) => `మొత్తం = (${n} − 2) × 180° = ${sum}°`,
  eachAngleIfRegular: (sum, n, each) => `క్రమమైతే, ప్రతి కోణం = ${sum}° ÷ ${n} = ${each}°`,
  areaEq: (l, w, area) => `వైశాల్యం = ${l} × ${w} = ${area}`,
  perimeterEq: (l, w, perimeter) => `చుట్టుకొలత = 2 × (${l} + ${w}) = ${perimeter}`,
  mulByEq: (n, factor, product) => `${n} × ${factor} = ${product}`,
  divByEq: (value, div, answer) => `${value} ÷ ${div} = ${answer}`,
  sumTwoParts: (p1, p2, sum) => `${p1} + ${p2} = ${sum}`,
  errNeedEven: "రెండు సంఖ్యల్లో కనీసం ఒకటి సరి సంఖ్య అయి ఉండాలి — 16 & 25, లేదా 14 & 15 ప్రయత్నించండి.",
  halveDoubleStep: (a, newA, b, newB) => `${a}ను సగం చేయండి → ${newA}, ${b}ను రెట్టింపు చేయండి → ${newB}`,
  finalMultiply: (a, b, answer) => `${a} × ${b} = ${answer}`,
  factorSplit: (divisor, a, b) => `${divisor} = ${a} × ${b}`,
  errNoFactorPair: "ఆ సంఖ్య రెండు సులభమైన కారణాంకాలుగా విడిపోదు — 12, 15, 16, 18, 20, లేదా 24 ప్రయత్నించండి.",
  errCubeRange: "1 నుండి 20 వరకు పూర్ణ సంఖ్య రాయండి.",
  cubesBetween: (lo, loCube, hi, hiCube, n) => `${lo}³ = ${loCube} మరియు ${hi}³ = ${hiCube}, కాబట్టి ${lo}³ < ${n} < ${hi}³`,
  cbrtBetween: (n, lo, hi) => `∛${n} అనేది ${lo}, ${hi} మధ్య ఉంటుంది`,
  errBaseExp: "ఆధారం 2, 3, 5, లేదా 10 అయి ఉండాలి, ఘాతం 1 నుండి 8 వరకు పూర్ణ సంఖ్య అయి ఉండాలి.",
  errRatePercent: "వార్షిక వడ్డీ లేదా వృద్ధి రేటును శాతంలో రాయండి (ఉదా. 8).",
  doublingTime: (years) => `అంటే మొత్తం సుమారు ${years} సంవత్సరాల్లో రెట్టింపు అవుతుంది.`,
  errNeedThree: "సరిగ్గా మూడు సంఖ్యలు రాయండి: మీరు గుణించిన రెండు సంఖ్యలు, తర్వాత మీకు వచ్చిన సమాధానం (ఉదా. 47, 63, 2961).",
  digitalRootOf: (n, dr) => `${n} యొక్క అంకెల మూలం = ${dr}`,
  rootProductCheck: (drA, drB, drProduct) => `${drA} × ${drB} = ${drA * drB} → అంకెల మూలం = ${drProduct}`,
};

const M_BY_LANG: Record<DictLang, M> = { en: M_EN, hi: M_HI, te: M_TE };

/** Smallest-difference factor pair of d (a<=b), or null if d has no factor pair (prime/1). */
function factorPair(d: number): [number, number] | null {
  let best: [number, number] | null = null;
  for (let a = 2; a * a <= d; a++) {
    if (d % a === 0) {
      const b = d / a;
      if (!best || Math.abs(a - b) < Math.abs(best[0] - best[1])) best = [a, b];
    }
  }
  return best;
}

/* ─────────────────────────── trick-specific calculators ─────────────────────────── */

type CalcResult = { steps: string[]; answer: number; checkOk: boolean };

function pad2(n: number): string {
  const s = Math.abs(n).toString();
  return s.length >= 2 ? s : "0" + s;
}

function computeTrick(id: string, x1: number, x2: number, m: M): CalcResult | string {
  switch (id) {
    case "square-ending-5": {
      const n = x1;
      if (!Number.isInteger(n) || n <= 0) return m.errWhole;
      if (n % 10 !== 5) return m.errNumEndsIn5;
      const base = Math.floor(n / 10);
      const left = base * (base + 1);
      const answer = left * 100 + 25;
      return { answer, checkOk: answer === n * n, steps: [m.digitsBefore5(base), m.mulNext(base, base + 1, left), m.write25(left)] };
    }
    case "square-near-100": {
      const n = x1;
      if (!Number.isInteger(n) || n < 60 || n > 140) return m.errNumNear100;
      const d = n - 100;
      let left = n + d;
      let right = d * d;
      const steps = [m.dEquals(n, d), m.leftEqNPlusD(n, d, left), m.rightEqDSq(d, right)];
      if (right >= 100) {
        const carry = Math.floor(right / 100);
        right = right % 100;
        left += carry;
        steps.push(m.carryLeft(carry, left));
      }
      const answer = left * 100 + right;
      steps.push(m.join(left, pad2(right), answer));
      return { answer, checkOk: answer === n * n, steps };
    }
    case "multiply-near-100": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b)) return m.errTwoWhole;
      const sameSide = (a < 100 && b < 100) || (a > 100 && b > 100);
      if (a === 100 || b === 100 || !sameSide || a < 70 || a > 130 || b < 70 || b > 130) return m.errBothSide100;
      const da = a - 100, db = b - 100;
      let left = a + db;
      let right = da * db;
      const steps = [m.distFrom100(a, da, b, db), m.leftEqAPlusDb(a, db, left), m.rightEqDaDb(da, db, right)];
      if (right >= 100) {
        const carry = Math.floor(right / 100);
        right = right % 100;
        left += carry;
        steps.push(m.carryLeft(carry, left));
      } else if (right < 0) {
        return m.errBothSameSign;
      }
      const answer = left * 100 + right;
      steps.push(m.join(left, pad2(right), answer));
      return { answer, checkOk: answer === a * b, steps };
    }
    case "crosswise-2x2": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 10 || a > 99 || b < 10 || b > 99) return m.errTwoDigit;
      const a1 = Math.floor(a / 10), a0 = a % 10, b1 = Math.floor(b / 10), b0 = b % 10;
      let units = a0 * b0, carryU = Math.floor(units / 10); const u = units % 10;
      let middle = a1 * b0 + a0 * b1 + carryU; const carryM = Math.floor(middle / 10); const midDigit = middle % 10;
      const left = a1 * b1 + carryM;
      const answer = left * 100 + midDigit * 10 + u;
      return {
        answer, checkOk: answer === a * b,
        steps: [m.unitsEq(a0, b0, units), m.crossEq(a1, b0, a0, b1, a1 * b0 + a0 * b1, carryU, middle), m.leftTensEq(a1, b1, left, carryM), m.joinCarryEach(answer)],
      };
    }
    case "times-11": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1 || n > 999999) return m.errWhole;
      const answer = n * 11;
      const digits = n.toString().split("").map(Number);
      const pairs: string[] = [];
      for (let i = 0; i < digits.length - 1; i++) pairs.push(`${digits[i]}+${digits[i + 1]}=${digits[i] + digits[i + 1]}`);
      return {
        answer, checkOk: true,
        steps: [m.digitsOf(n, digits.join(" ")), digits.length === 1 ? m.singleDigit(digits[0], answer) : m.neighbourSums(pairs.join(", ")), m.outerStayCarry(answer)],
      };
    }
    case "times-9-99-999": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1) return m.errWhole;
      const k = n.toString().length;
      const power = Math.pow(10, k);
      const left = n - 1;
      const right = power - n;
      const answer = left * power + right;
      const nines = "9".repeat(k);
      return {
        answer, checkOk: answer === n * (power - 1),
        steps: [m.hasKDigits(n, k, nines), m.leftMinus1(n, left), m.rightPowerMinusN(power, n, right), m.join(left, right.toString().padStart(k, "0"), answer)],
      };
    }
    case "same-first-sum-10": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 10 || a > 99 || b < 10 || b > 99) return m.errTwoDigit;
      const ta = Math.floor(a / 10), tb = Math.floor(b / 10);
      const ua = a % 10, ub = b % 10;
      if (ta !== tb) return m.errSameTensSum10a;
      if (ua + ub !== 10) return m.errSameTensSum10b;
      const left = ta * (ta + 1);
      const right = ua * ub;
      const answer = left * 100 + right;
      return { answer, checkOk: answer === a * b, steps: [m.sameTens(ta, ua, ub), m.leftTensTimes(ta, left), m.rightUnitsTimes(ua, ub, pad2(right)), m.join(left, pad2(right), answer)] };
    }
    case "divisibility-rules": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1) return m.errWhole;
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
      return { answer: n, checkOk: true, steps: [m.digitSumInfo(digitSum, last1, last2, last3, altSum), hits.length ? m.divisibleBy(hits.join(", ")) : m.notDivisible] };
    }
    case "quick-prime-check": {
      const n = x1;
      if (!Number.isInteger(n) || n < 2) return m.errWholeGt1;
      const bound = Math.floor(Math.sqrt(n));
      const testPrimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31].filter((p) => p <= bound);
      let factor: number | null = null;
      for (const p of testPrimes) { if (n % p === 0) { factor = p; break; } }
      const isPrime = factor === null;
      return { answer: n, checkOk: true, steps: [m.sqrtTest(n, Math.sqrt(n).toFixed(2), bound, testPrimes.join(", ") || "—"), isPrime ? m.isPrime(n) : m.isComposite(n, factor as number, n / (factor as number))] };
    }
    case "hcf-lcm-shortcut": {
      let a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) return m.errPositiveTwo;
      const origA = a, origB = b;
      const steps: string[] = [];
      let p = Math.max(a, b), q = Math.min(a, b);
      while (q !== 0) { const r = p % q; steps.push(m.euclidStep(p, q, Math.floor(p / q), r)); p = q; q = r; }
      const hcf = p;
      const lcm = (origA * origB) / hcf;
      steps.push(m.hcfResult(hcf), m.lcmResult(origA, origB, hcf, lcm));
      return { answer: lcm, checkOk: hcf * lcm === origA * origB, steps };
    }
    case "percent-of-number": {
      const n = x1, p = x2;
      if (!Number.isFinite(n) || !Number.isFinite(p)) return m.errTwoWhole;
      const ten = n / 10;
      const answer = (n * p) / 100;
      return { answer, checkOk: true, steps: [m.tenPercentOf(n, ten), m.percentMultiplier(p, (p / 10).toFixed(1)), m.percentOfResult(p, n, answer)] };
    }
    case "percent-change-one-step": {
      const n = x1, p = x2;
      const multiplier = 1 + p / 100;
      const answer = n * multiplier;
      return { answer, checkOk: true, steps: [m.multiplierEq(p, multiplier), m.timesMultiplier(n, multiplier, answer), p >= 0 ? m.increaseNote(p) : m.decreaseNote(p)] };
    }
    case "fraction-to-percent": {
      const num = x1, den = x2;
      if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) return m.errNumeratorDen;
      const answer = (num / den) * 100;
      return { answer, checkOk: true, steps: [m.fracTimes100(num, den), m.percentResult(answer.toFixed(2).replace(/\.00$/, ""))] };
    }
    case "difference-of-squares": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || (a + b) % 2 !== 0) return m.errEvenSum;
      const mid = (a + b) / 2;
      const d = Math.abs(b - a) / 2;
      const answer = mid * mid - d * d;
      return { answer, checkOk: answer === a * b, steps: [m.midpointEq(a, b, mid), m.distanceEq(d), m.midSqMinusDSq(mid, d, answer)] };
    }
    case "sqrt-estimate": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1) return m.errWhole;
      const lo = Math.floor(Math.sqrt(n));
      const hi = lo + 1;
      const actual = Math.sqrt(n);
      const frac = (n - lo * lo) / (hi * hi - lo * lo);
      const estimate = lo + frac;
      return {
        answer: Math.round(actual * 100) / 100, checkOk: true,
        steps: [m.squaresBetween(lo, lo * lo, hi, hi * hi, n), m.sqrtBetween(n, lo, hi), m.linearEstimate(lo, frac.toFixed(2), estimate.toFixed(2), actual.toFixed(2))],
      };
    }
    case "pythagorean-triples": {
      const a = x1, b = x2;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) return m.errPositiveTwo;
      const c2 = a * a + b * b;
      const c = Math.round(Math.sqrt(c2));
      const isTriple = c * c === c2;
      return { answer: c, checkOk: isTriple, steps: [m.legsSquareSum(a, b, a * a, b * b, c2), isTriple ? m.perfectSquareHyp(c2, c) : m.notPerfectSquare(c2, Math.sqrt(c2).toFixed(2))] };
    }
    case "polygon-angle-sum": {
      const n = x1;
      if (!Number.isInteger(n) || n < 3) return m.errSidesGE3;
      const sum = (n - 2) * 180;
      const each = sum / n;
      return { answer: sum, checkOk: true, steps: [m.sumInteriorAngles(n, sum), m.eachAngleIfRegular(sum, n, each.toFixed(1))] };
    }
    case "rectangle-area-perimeter": {
      const l = x1, w = x2;
      if (!Number.isFinite(l) || !Number.isFinite(w) || l <= 0 || w <= 0) return m.errPosLengthWidth;
      const area = l * w;
      const perimeter = 2 * (l + w);
      return { answer: area, checkOk: true, steps: [m.areaEq(l, w, area), m.perimeterEq(l, w, perimeter)] };
    }
    case "times-5": {
      const n = x1;
      if (!Number.isInteger(n) || n <= 0) return m.errWhole;
      const ten = n * 10;
      const answer = ten / 2;
      return { answer, checkOk: answer === n * 5, steps: [m.mulByEq(n, 10, ten), m.divByEq(ten, 2, answer)] };
    }
    case "times-25": {
      const n = x1;
      if (!Number.isInteger(n) || n <= 0) return m.errWhole;
      const hundred = n * 100;
      const answer = hundred / 4;
      return { answer, checkOk: answer === n * 25, steps: [m.mulByEq(n, 100, hundred), m.divByEq(hundred, 4, answer)] };
    }
    case "times-50": {
      const n = x1;
      if (!Number.isInteger(n) || n <= 0) return m.errWhole;
      const hundred = n * 100;
      const answer = hundred / 2;
      return { answer, checkOk: answer === n * 50, steps: [m.mulByEq(n, 100, hundred), m.divByEq(hundred, 2, answer)] };
    }
    case "times-125": {
      const n = x1;
      if (!Number.isInteger(n) || n <= 0) return m.errWhole;
      const thousand = n * 1000;
      const answer = thousand / 8;
      return { answer, checkOk: answer === n * 125, steps: [m.mulByEq(n, 1000, thousand), m.divByEq(thousand, 8, answer)] };
    }
    case "times-12": {
      const n = x1;
      if (!Number.isInteger(n) || n <= 0) return m.errWhole;
      const tenPart = n * 10, twoPart = n * 2;
      const answer = tenPart + twoPart;
      return { answer, checkOk: answer === n * 12, steps: [m.mulByEq(n, 10, tenPart), m.mulByEq(n, 2, twoPart), m.sumTwoParts(tenPart, twoPart, answer)] };
    }
    case "double-half-strategy": {
      const n1 = x1, n2 = x2;
      if (!Number.isInteger(n1) || !Number.isInteger(n2) || n1 < 1 || n2 < 1) return m.errPositiveTwo;
      let a: number, b: number;
      if (n1 % 2 === 0) { a = n1; b = n2; }
      else if (n2 % 2 === 0) { a = n2; b = n1; }
      else return m.errNeedEven;
      const steps: string[] = [];
      let guard = 0;
      while (a % 2 === 0 && a > 9 && guard < 8) {
        const newA = a / 2, newB = b * 2;
        steps.push(m.halveDoubleStep(a, newA, b, newB));
        a = newA; b = newB;
        guard++;
      }
      const answer = a * b;
      steps.push(m.finalMultiply(a, b, answer));
      return { answer, checkOk: answer === n1 * n2, steps };
    }
    case "div-by-5": {
      const n = x1;
      if (!Number.isFinite(n) || n < 0) return m.errWhole;
      const doubled = n * 2;
      const answer = doubled / 10;
      return { answer, checkOk: Math.abs(answer * 5 - n) < 1e-9, steps: [m.mulByEq(n, 2, doubled), m.divByEq(doubled, 10, answer)] };
    }
    case "div-by-20": {
      const n = x1;
      if (!Number.isFinite(n) || n < 0) return m.errWhole;
      const times5 = n * 5;
      const answer = times5 / 100;
      return { answer, checkOk: Math.abs(answer * 20 - n) < 1e-9, steps: [m.mulByEq(n, 5, times5), m.divByEq(times5, 100, answer)] };
    }
    case "div-by-25": {
      const n = x1;
      if (!Number.isFinite(n) || n < 0) return m.errWhole;
      const times4 = n * 4;
      const answer = times4 / 100;
      return { answer, checkOk: Math.abs(answer * 25 - n) < 1e-9, steps: [m.mulByEq(n, 4, times4), m.divByEq(times4, 100, answer)] };
    }
    case "div-by-50": {
      const n = x1;
      if (!Number.isFinite(n) || n < 0) return m.errWhole;
      const times2 = n * 2;
      const answer = times2 / 100;
      return { answer, checkOk: Math.abs(answer * 50 - n) < 1e-9, steps: [m.mulByEq(n, 2, times2), m.divByEq(times2, 100, answer)] };
    }
    case "div-by-125": {
      const n = x1;
      if (!Number.isFinite(n) || n < 0) return m.errWhole;
      const times8 = n * 8;
      const answer = times8 / 1000;
      return { answer, checkOk: Math.abs(answer * 125 - n) < 1e-9, steps: [m.mulByEq(n, 8, times8), m.divByEq(times8, 1000, answer)] };
    }
    case "div-by-10-100-1000": {
      const n = x1;
      if (!Number.isFinite(n) || n < 0) return m.errWhole;
      const answer = n / 10;
      return { answer, checkOk: Math.abs(answer * 10 - n) < 1e-9, steps: [m.divByEq(n, 10, answer)] };
    }
    case "div-by-factor-pairs": {
      const dividend = x1, divisor = x2;
      if (!Number.isFinite(dividend) || !Number.isInteger(divisor) || divisor < 2) return m.errTwoWhole;
      const pair = factorPair(divisor);
      if (!pair) return m.errNoFactorPair;
      const [a, b] = pair;
      const step1 = dividend / a;
      const answer = step1 / b;
      return {
        answer, checkOk: Math.abs(answer * divisor - dividend) < 1e-9,
        steps: [m.factorSplit(divisor, a, b), m.divByEq(dividend, a, step1), m.divByEq(step1, b, answer)],
      };
    }
    case "cubes-1-20": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1 || n > 20) return m.errCubeRange;
      const square = n * n;
      const answer = square * n;
      return { answer, checkOk: answer === n * n * n, steps: [m.mulByEq(n, n, square), m.mulByEq(square, n, answer)] };
    }
    case "cube-root-estimate": {
      const n = x1;
      if (!Number.isInteger(n) || n < 1) return m.errWhole;
      let lo = 1;
      while ((lo + 1) ** 3 <= n) lo++;
      const hi = lo + 1;
      const loCube = lo ** 3, hiCube = hi ** 3;
      const actual = Math.cbrt(n);
      const frac = hiCube === loCube ? 0 : (n - loCube) / (hiCube - loCube);
      const estimate = lo + frac;
      return {
        answer: Math.round(actual * 100) / 100, checkOk: true,
        steps: [m.cubesBetween(lo, loCube, hi, hiCube, n), m.cbrtBetween(n, lo, hi), m.linearEstimate(lo, frac.toFixed(2), estimate.toFixed(2), actual.toFixed(2))],
      };
    }
    case "powers-quick-recall": {
      const base = x1, exp = x2;
      if (![2, 3, 5, 10].includes(base) || !Number.isInteger(exp) || exp < 1 || exp > 8) return m.errBaseExp;
      const steps: string[] = [];
      let cur = 1;
      for (let i = 1; i <= exp; i++) {
        const next = cur * base;
        steps.push(m.mulByEq(cur, base, next));
        cur = next;
      }
      return { answer: cur, checkOk: cur === Math.pow(base, exp), steps };
    }
    case "rule-of-72": {
      const rate = x1;
      if (!Number.isFinite(rate) || rate <= 0) return m.errRatePercent;
      const years = Math.round((72 / rate) * 100) / 100;
      return { answer: years, checkOk: true, steps: [m.divByEq(72, rate, years), m.doublingTime(years)] };
    }
    default:
      return "Unknown trick.";
  }
}

function computeListTrick(id: string, nums: number[], m: M): CalcResult | string {
  switch (id) {
    case "digital-root-check": {
      if (nums.length !== 3) return m.errNeedThree;
      const [a, b, claimed] = nums;
      if (![a, b, claimed].every((v) => Number.isInteger(v) && v >= 0)) return m.errNeedThree;
      const dr = (v: number) => (v === 0 ? 0 : v % 9 === 0 ? 9 : v % 9);
      const drA = dr(a), drB = dr(b), drClaimed = dr(claimed);
      const drProduct = dr(drA * drB);
      return {
        answer: claimed, checkOk: drProduct === drClaimed,
        steps: [m.digitalRootOf(a, drA), m.digitalRootOf(b, drB), m.rootProductCheck(drA, drB, drProduct), m.digitalRootOf(claimed, drClaimed)],
      };
    }
    case "assumed-mean-average": {
      if (nums.length < 2) return m.errTwoWhole;
      const n = nums.length;
      const rawAvg = nums.reduce((a, b) => a + b, 0) / n;
      const assumed = Math.round(rawAvg / 5) * 5 || Math.round(rawAvg);
      const devs = nums.map((x) => x - assumed);
      const sumDev = devs.reduce((a, b) => a + b, 0);
      const avgDev = sumDev / n;
      const answer = assumed + avgDev;
      return {
        answer, checkOk: Math.abs(answer - rawAvg) < 1e-9,
        steps: [
          m.numbersCount(nums.join(", "), n),
          m.assumedMean(assumed),
          m.deviations(devs.map((d) => (d >= 0 ? "+" + d : d.toString())).join(", ")),
          m.avgDeviation(sumDev, n, avgDev.toFixed(2)),
          m.averageResult(assumed, avgDev.toFixed(2), answer.toFixed(2)),
        ],
      };
    }
    default:
      return "Unknown trick.";
  }
}

function TrickCalc({ t, lang }: { t: Trick; lang: DictLang }) {
  const c = CHROME[lang];
  const m = M_BY_LANG[lang];
  const content = trick(lang, t);
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [vList, setVList] = useState("");
  const [out, setOut] = useState<CalcResult | string | null>(null);

  function run() {
    if (t.calcInputs === "list") {
      const nums = vList.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean).map(Number);
      if (nums.length === 0 || nums.some((n) => Number.isNaN(n))) {
        setOut(c.listPlaceholder === vList ? c.typeNumber : c.typeNumber);
        return;
      }
      setOut(computeListTrick(t.id, nums, m));
      return;
    }
    const n1 = parseFloat(v1);
    const n2 = t.calcInputs === "two" ? parseFloat(v2) : 0;
    if (Number.isNaN(n1) || (t.calcInputs === "two" && Number.isNaN(n2))) {
      setOut(c.typeNumber);
      return;
    }
    setOut(computeTrick(t.id, n1, n2, m));
  }

  return (
    <div className="fm-algo-lab">
      <h4>{c.tryIt}</h4>
      <p className="fm-algo-hint">{content.calcLabel} — {content.calcHint}</p>
      <div className="fm-algo-controls">
        {t.calcInputs === "list" ? (
          <input className="fm-algo-select" style={{ width: 260 }} placeholder={c.listPlaceholder} value={vList}
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
        <button className="fm-algo-btn primary" onClick={run}>{c.showMe}</button>
      </div>
      {out && typeof out === "string" && <p className="fm-algo-note">⚠️ {out}</p>}
      {out && typeof out !== "string" && (
        <div className="fm-algo-note">
          {out.steps.map((s, i) => <div key={i}>{s}</div>)}
          <div style={{ marginTop: 6, fontWeight: 700 }}>
            {c.answer}: {out.answer} {out.checkOk ? c.checksOut : c.doubleCheck}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── card ─────────────────────────── */

function TrickCard({ t, lang }: { t: Trick; lang: DictLang }) {
  const content = trick(lang, t);
  return (
    <article className="fm-algo-card">
      <h3 className="fm-algo-name">{content.name} <span className="fm-algo-badge">{content.sutra}</span></h3>
      <p className="fm-algo-idea"><b>Rule:</b> {content.rule}</p>
      <div className="fm-algo-when">
        <div className="good"><b>Use when</b> {content.whenToUse}</div>
      </div>
      <ol className="fm-algo-idea" style={{ paddingLeft: 20, margin: "10px 0" }}>
        {content.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
      </ol>
      <div className="fm-algo-tablewrap">
        <table className="fm-algo-table">
          <thead><tr><th>Problem</th><th>Working</th><th>Answer</th></tr></thead>
          <tbody>
            {content.examples.map((ex, i) => (
              <tr key={i}><td className="mono">{ex.problem}</td><td>{ex.working}</td><td className="mono ok">{ex.answer}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <TrickCalc t={t} lang={lang} />
    </article>
  );
}

/* ─────────────────────────── main screen ─────────────────────────── */

export function TipsAndTricks({ lang = "en" }: { lang?: DictLang }) {
  const [cat, setCat] = useState<TrickCatId | "all">("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const c = CHROME[lang];

  const list = useMemo(() => TRICKS.filter((t) => {
    if (cat !== "all" && t.cat !== cat) return false;
    if (!q) return true;
    const content = trick(lang, t);
    return (content.name + " " + content.rule + " " + content.whenToUse + " " + content.sutra).toLowerCase().includes(q);
  }), [cat, q, lang]);

  return (
    <div className="fm-algo">
      <header className="fm-algo-head">
        <h1>{c.title}</h1>
        <p className="fm-dash-sub">{c.subtitle}</p>
      </header>

      <div className="fm-algo-cats">
        <button className={"fm-fact-chip" + (cat === "all" ? " on" : "")} onClick={() => setCat("all")}>{c.allChip}</button>
        {TRICK_CATS.map((tc) => (
          <button key={tc.id} className={"fm-fact-chip" + (cat === tc.id ? " on" : "")} onClick={() => setCat(tc.id)}>{tc.icon} {trickCatLabel(tc.id, lang)}</button>
        ))}
      </div>

      <div className="fm-search-wrap fm-algo-search">
        <span className="fm-search-ic"><Search size={16} /></span>
        <input className="fm-search-input" value={query} placeholder={c.searchPlaceholder} onChange={(e) => setQuery(e.target.value)} aria-label={c.searchAria} />
        {query && <button className="fm-search-clear" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
      </div>

      <section className="fm-algo-sec">
        {list.map((t) => <TrickCard key={t.id} t={t} lang={lang} />)}
        {list.length === 0 && <p className="fm-search-count">{c.noMatch(query)}</p>}
      </section>

      {!q && (
        <section className="fm-algo-sec">
          <div className="fm-algo-card">
            <h3 className="fm-algo-name">{c.historyHeading}</h3>
            <p className="fm-algo-idea">{TRICKS_HISTORY_NOTE[lang]}</p>
          </div>
        </section>
      )}
    </div>
  );
}
