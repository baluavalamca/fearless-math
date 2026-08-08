/**
 * Math Tips & Tricks — data for the Tips & Tricks screen.
 *
 * Two layers of content:
 *  1. Vedic-maths style shortcuts (squaring, multiplying) sourced from
 *     docs/VEDIC-MATH-REFERENCE.md — cross-checked by code against ordinary arithmetic.
 *  2. Broader, standard CBSE/NCERT shortcuts spanning number sense, factors/LCM/HCF,
 *     percentages, algebra, quick estimation, and geometry — added so this screen covers
 *     the syllabus broadly rather than only multiplication. Every example in both layers
 *     was numerically verified (Python) before being written in — none are hand-typed guesses.
 *
 * Each trick also has a `calcInputs` shape powering a live "Try it yourself" calculator
 * in the screen (see TipsAndTricks.tsx) — so a learner isn't limited to the printed
 * examples, they can test their own numbers and see the same shortcut applied step by
 * step, cross-checked against the plain-arithmetic answer.
 */

export type TrickCatId =
  | "squaring" | "multiplying" | "special"
  | "numbersense" | "factors" | "percent" | "algebra" | "estimation" | "geometry";

export const TRICK_CATS: { id: TrickCatId; icon: string; label: string }[] = [
  { id: "squaring", icon: "🟩", label: "Squaring" },
  { id: "multiplying", icon: "✖️", label: "Multiplying" },
  { id: "special", icon: "✨", label: "Special patterns" },
  { id: "numbersense", icon: "🔢", label: "Number Sense" },
  { id: "factors", icon: "🧩", label: "Factors, LCM & HCF" },
  { id: "percent", icon: "💯", label: "Fractions & Percentages" },
  { id: "algebra", icon: "🅰️", label: "Algebra Shortcuts" },
  { id: "estimation", icon: "🎯", label: "Quick Estimation" },
  { id: "geometry", icon: "📐", label: "Geometry Shortcuts" },
];

export type TrickExample = { problem: string; working: string; answer: string };

export type CalcInputKind = "one" | "two" | "list";

export type Trick = {
  id: string;
  cat: TrickCatId;
  name: string;
  sutra: string;
  rule: string;
  whenToUse: string;
  steps: string[];
  examples: TrickExample[];
  calcInputs: CalcInputKind;
  calcLabel: string;
  calcHint: string;
};

export const TRICKS: Trick[] = [
  {
    id: "square-ending-5",
    cat: "squaring",
    name: "Squaring a number ending in 5",
    sutra: "Ekadhikena Purvena — “by one more than the one before”",
    rule: "Take the part before the 5, multiply it by the next number up, then write 25 on the right.",
    whenToUse: "Any time you need to square a number that ends in 5 — instantly, in your head.",
    steps: [
      "Look at the digits before the 5 (for 85, that's 8).",
      "Multiply that by the next number up (8 × 9 = 72).",
      "Write 25 on the right of it.",
      "So 85² = 7225 — no long multiplication needed.",
    ],
    examples: [
      { problem: "15²", working: "1 × 2 = 2, append 25", answer: "225" },
      { problem: "35²", working: "3 × 4 = 12, append 25", answer: "1225" },
      { problem: "45²", working: "4 × 5 = 20, append 25", answer: "2025" },
      { problem: "65²", working: "6 × 7 = 42, append 25", answer: "4225" },
      { problem: "85²", working: "8 × 9 = 72, append 25", answer: "7225" },
      { problem: "105²", working: "10 × 11 = 110, append 25", answer: "11025" },
    ],
    calcInputs: "one",
    calcLabel: "Number ending in 5",
    calcHint: "Try 25, 65, 95, 115…",
  },
  {
    id: "square-near-100",
    cat: "squaring",
    name: "Squaring numbers near 100",
    sutra: "Yaavadunam — “whatever the deficiency”",
    rule: "Let d = the number minus 100. Left part = number + d. Right part = d² written as two digits (carry left if d² ≥ 100).",
    whenToUse: "Squaring any number roughly 80–120, where the usual method feels slow.",
    steps: [
      "Find d = n − 100 (can be negative, e.g. 93 → d = −7).",
      "Left part = n + d (93 + (−7) = 86).",
      "Right part = d² as two digits (7² = 49).",
      "Join them: 93² = 8649.",
    ],
    examples: [
      { problem: "93²", working: "d=−7; 93−7=86; d²=49", answer: "8649" },
      { problem: "97²", working: "d=−3; 97−3=94; d²=09", answer: "9409" },
      { problem: "99²", working: "d=−1; 99−1=98; d²=01", answer: "9801" },
      { problem: "102²", working: "d=+2; 102+2=104; d²=04", answer: "10404" },
      { problem: "105²", working: "d=+5; 105+5=110; d²=25", answer: "11025" },
      { problem: "111²", working: "d=+11; 111+11=122; d²=121 (carry 1 left)", answer: "12321" },
    ],
    calcInputs: "one",
    calcLabel: "Number near 100",
    calcHint: "Try 88–119, e.g. 96, 104, 112…",
  },
  {
    id: "multiply-near-100",
    cat: "multiplying",
    name: "Multiplying two numbers near 100",
    sutra: "Nikhilam Navatashcaramam Dashatah — “all from 9, last from 10”",
    rule: "Find each number's distance from 100 (deficit if below, excess if above — both must be on the same side). Left = one number plus the other's distance. Right = product of the two distances, as two digits.",
    whenToUse: "Multiplying two numbers that are both a little below 100, or both a little above 100.",
    steps: [
      "Find each number's distance from 100 (97 → −3, 96 → −4).",
      "Cross-add: 97 + (−4) = 93 (or 96 + (−3) — same answer either way).",
      "Multiply the two distances: 3 × 4 = 12.",
      "Join them: 97 × 96 = 9312.",
    ],
    examples: [
      { problem: "97 × 96", working: "97−4=93; 3×4=12", answer: "9312" },
      { problem: "98 × 97", working: "98−3=95; 2×3=06", answer: "9506" },
      { problem: "92 × 91", working: "92−9=83; 8×9=72", answer: "8372" },
      { problem: "103 × 104", working: "103+4=107; 3×4=12", answer: "10712" },
      { problem: "107 × 108", working: "107+8=115; 7×8=56", answer: "11556" },
      { problem: "110 × 112", working: "110+12=122; 10×12=120 (carry 1)", answer: "12320" },
    ],
    calcInputs: "two",
    calcLabel: "Two numbers, both below 100 or both above 100",
    calcHint: "Try 96 & 94, or 103 & 106…",
  },
  {
    id: "crosswise-2x2",
    cat: "multiplying",
    name: "Multiplying two 2-digit numbers",
    sutra: "Ūrdhva-Tiryagbhyām — “vertically and crosswise”",
    rule: "For (10a+b)×(10c+d): units = b×d, middle = a×d + b×c, left = a×c. Carry each column left.",
    whenToUse: "Multiplying ANY two 2-digit numbers in one line — the only fully general trick here.",
    steps: [
      "Units: multiply the ones digits (23 × 21: 3 × 1 = 3).",
      "Middle: cross-multiply and add (2×1 + 3×2 = 8).",
      "Left: multiply the tens digits (2 × 2 = 4).",
      "Write them together, carrying left where needed → 483.",
    ],
    examples: [
      { problem: "12 × 13", working: "units 2×3=6; cross 1×3+2×1=5; left 1×1=1", answer: "156" },
      { problem: "23 × 21", working: "units 3×1=3; cross 2×1+3×2=8; left 2×2=4", answer: "483" },
      { problem: "35 × 35", working: "units 5×5=25; cross 3×5+5×3=30; left 3×3=9", answer: "1225" },
      { problem: "56 × 54", working: "units 6×4=24; cross 5×4+6×5=50; left 5×5=25", answer: "3024" },
      { problem: "61 × 29", working: "units 1×9=9; cross 6×9+1×2=56; left 6×2=12", answer: "1769" },
      { problem: "99 × 99", working: "units 9×9=81; cross 9×9+9×9=162; left 9×9=81", answer: "9801" },
    ],
    calcInputs: "two",
    calcLabel: "Two 2-digit numbers",
    calcHint: "Try 34 & 26, or 48 & 23…",
  },
  {
    id: "times-11",
    cat: "multiplying",
    name: "Multiplying by 11",
    sutra: "Add-the-neighbours",
    rule: "Keep the outer digits; between each pair of neighbouring digits, write their sum, carrying left whenever a sum reaches 10.",
    whenToUse: "Multiplying any whole number by 11 — a favourite mental-maths party trick.",
    steps: [
      "Keep the first and last digit as the outer digits (3 _ 2 for 32).",
      "Insert the sum of each pair of neighbouring digits (3 + 2 = 5).",
      "3 . 5 . 2 → 352.",
      "If a sum reaches 10 or more, carry the extra 1 into the digit on its left.",
    ],
    examples: [
      { problem: "32 × 11", working: "3 . [5] . 2, then carry", answer: "352" },
      { problem: "45 × 11", working: "4 . [9] . 5, then carry", answer: "495" },
      { problem: "74 × 11", working: "7 . [11] . 4, then carry", answer: "814" },
      { problem: "99 × 11", working: "9 . [18] . 9, then carry", answer: "1089" },
      { problem: "234 × 11", working: "2 . [5 7] . 4, then carry", answer: "2574" },
      { problem: "819 × 11", working: "8 . [9 10] . 9, then carry", answer: "9009" },
    ],
    calcInputs: "one",
    calcLabel: "Any whole number",
    calcHint: "Try 46, 128, 573…",
  },
  {
    id: "times-9-99-999",
    cat: "multiplying",
    name: "Multiplying by 9, 99, 999…",
    sutra: "Ekanyunena Purvena — “one less than the previous”",
    rule: "Left part = n − 1. Right part = (that power of 10) − n. Join them.",
    whenToUse: "Multiplying by a run of 9s — 9, 99, 999, 9999…",
    steps: [
      "Subtract 1 from n for the left part (76 − 1 = 75).",
      "Subtract n from the matching power of 10 for the right part (100 − 76 = 24).",
      "Join them → 76 × 99 = 7524.",
    ],
    examples: [
      { problem: "7 × 9", working: "7−1=6; 10−7=3", answer: "63" },
      { problem: "23 × 99", working: "23−1=22; 100−23=77", answer: "2277" },
      { problem: "76 × 99", working: "76−1=75; 100−76=24", answer: "7524" },
      { problem: "123 × 999", working: "123−1=122; 1000−123=877", answer: "122877" },
      { problem: "678 × 999", working: "678−1=677; 1000−678=322", answer: "677322" },
      { problem: "1234 × 9999", working: "1234−1=1233; 10000−1234=8766", answer: "12338766" },
    ],
    calcInputs: "one",
    calcLabel: "Number to multiply by a run of 9s",
    calcHint: "Pick how many 9s below, then a number with that many digits or fewer",
  },
  {
    id: "same-first-sum-10",
    cat: "special",
    name: "Same first digit, last digits add to 10",
    sutra: "Antyayordasake'pi — “even when the last digits sum to 10”",
    rule: "For two 2-digit numbers with the same tens digit a, whose units digits add to 10: left = a×(a+1), right = (units product) as two digits.",
    whenToUse: "Two 2-digit numbers that share a tens digit and whose units digits add up to 10 — e.g. 43 and 47.",
    steps: [
      "Check: same tens digit, units add to 10 (43 & 47: tens both 4; 3+7=10 ✓).",
      "Left part = tens × (tens + 1) → 4 × 5 = 20.",
      "Right part = the two units multiplied, as two digits → 3 × 7 = 21.",
      "Join them → 43 × 47 = 2021.",
    ],
    examples: [
      { problem: "43 × 47", working: "4×5=20; 3×7=21", answer: "2021" },
      { problem: "62 × 68", working: "6×7=42; 2×8=16", answer: "4216" },
      { problem: "81 × 89", working: "8×9=72; 1×9=09", answer: "7209" },
      { problem: "35 × 35", working: "3×4=12; 5×5=25", answer: "1225" },
      { problem: "72 × 78", working: "7×8=56; 2×8=16", answer: "5616" },
      { problem: "91 × 99", working: "9×10=90; 1×9=09", answer: "9009" },
    ],
    calcInputs: "two",
    calcLabel: "Two numbers, same tens digit, units add to 10",
    calcHint: "Try 54 & 56, or 28 & 22…",
  },

  /* ── Broader number-sense, factors, percentages, algebra, estimation, geometry ──
   * These aren't Vedic sutras — they're standard, well-known shortcuts taught
   * across the CBSE/NCERT curriculum, added so the screen covers the syllabus
   * more broadly rather than only multiplication/squaring. Every example below
   * was numerically verified (Python) before being written in. */

  {
    id: "divisibility-rules",
    cat: "numbersense",
    name: "Divisibility Rules (2 to 11)",
    sutra: "Number sense shortcut",
    rule: "Check the last digit(s) or the digit sum instead of actually dividing — each divisor has its own quick test.",
    whenToUse: "Simplifying fractions, finding factors, or sanity-checking a division answer without a calculator.",
    steps: [
      "By 2: last digit is even (0,2,4,6,8).",
      "By 3: digit sum is divisible by 3. By 9: digit sum is divisible by 9.",
      "By 4: last two digits form a number divisible by 4. By 8: last three digits divisible by 8.",
      "By 5: last digit is 0 or 5. By 10: last digit is 0.",
      "By 6: passes both the by-2 AND by-3 tests.",
      "By 11: alternating digit sum (add and subtract digits from the right) is divisible by 11 (including 0).",
    ],
    examples: [
      { problem: "132", working: "even→2; digit sum 6→3; 32÷4✓→4; alt-sum 0→11", answer: "2, 3, 4, 6, 11" },
      { problem: "245", working: "ends in 5→5 only (digit sum 11, not ÷3)", answer: "5" },
      { problem: "396", working: "even→2; digit sum 18→3,9; 96÷4✓→4; alt-sum 0→11", answer: "2, 3, 4, 6, 9, 11" },
      { problem: "1001", working: "odd, digit sum 2 — only alt-sum 1−0+0−1=0→11", answer: "11" },
      { problem: "5040", working: "digit sum 9→3,9; ends 0→5,10; last3 040÷8✓→8; 40÷4✓→4", answer: "2, 3, 4, 5, 6, 8, 9, 10" },
    ],
    calcInputs: "one",
    calcLabel: "Any whole number",
    calcHint: "Try 132, 396, 1001, 5040…",
  },
  {
    id: "quick-prime-check",
    cat: "numbersense",
    name: "Quick Prime Check (Trial Division to √N)",
    sutra: "Number sense shortcut",
    rule: "A number N is prime only if no whole number from 2 up to √N divides it evenly — you never need to test past √N.",
    whenToUse: "Deciding whether a number is prime without a huge division table — great up to a few hundred.",
    steps: [
      "Find √N, or the whole number just below it.",
      "Test divisibility by every prime from 2 up to that point (2, 3, 5, 7, 11, 13…), using the divisibility rules where you can.",
      "If none divide evenly, N is prime. If one does, N is composite — you've also found a factor.",
    ],
    examples: [
      { problem: "91", working: "√91≈9.5 → test 2,3,5,7 → 91÷7=13", answer: "composite (7×13)" },
      { problem: "97", working: "√97≈9.8 → test 2,3,5,7 → none divide", answer: "prime" },
      { problem: "143", working: "√143≈12 → test 2,3,5,7,11 → 143÷11=13", answer: "composite (11×13)" },
      { problem: "149", working: "√149≈12.2 → test 2,3,5,7,11 → none divide", answer: "prime" },
      { problem: "221", working: "√221≈14.9 → test up to 13 → 221÷13=17", answer: "composite (13×17)" },
    ],
    calcInputs: "one",
    calcLabel: "Any whole number > 1",
    calcHint: "Try 91, 97, 143, 149, 221…",
  },
  {
    id: "hcf-lcm-shortcut",
    cat: "factors",
    name: "HCF × LCM = Product Shortcut",
    sutra: "HCF(a,b) × LCM(a,b) = a × b",
    rule: "For any two whole numbers, HCF × LCM always equals their product. Find the HCF quickly with the Euclidean algorithm, then get the LCM by one division — no factor trees needed.",
    whenToUse: "Finding the LCM of two numbers fast once you have (or can quickly find) their HCF.",
    steps: [
      "Euclidean algorithm: replace the larger number with the remainder of (larger ÷ smaller), repeat until the remainder is 0.",
      "The last non-zero remainder is the HCF.",
      "LCM = (a × b) ÷ HCF.",
    ],
    examples: [
      { problem: "12, 18", working: "18=12+6, 12=2×6+0 → HCF=6; LCM=(12×18)/6", answer: "HCF 6, LCM 36" },
      { problem: "24, 36", working: "36=24+12, 24=2×12+0 → HCF=12; LCM=(24×36)/12", answer: "HCF 12, LCM 72" },
      { problem: "15, 20", working: "20=15+5, 15=3×5+0 → HCF=5; LCM=(15×20)/5", answer: "HCF 5, LCM 60" },
      { problem: "48, 60", working: "60=48+12, 48=4×12+0 → HCF=12; LCM=(48×60)/12", answer: "HCF 12, LCM 240" },
      { problem: "7, 13", working: "13=7+6, 7=6+1, 6=6×1+0 → HCF=1; LCM=7×13", answer: "HCF 1, LCM 91" },
    ],
    calcInputs: "two",
    calcLabel: "Two whole numbers",
    calcHint: "Try 24 & 36, or 48 & 60…",
  },
  {
    id: "percent-of-number",
    cat: "percent",
    name: "Quick % of a Number (10s, 5s & 1s)",
    sutra: "Percentage shortcut",
    rule: "Break any percentage into easy chunks of 10%, 5%, and 1%, then add them. 10% = ÷10. 5% = half of 10%. 1% = ÷100.",
    whenToUse: "Working out a percentage of any number in your head — tips, discounts, marks, taxes.",
    steps: [
      "Find 10% (divide by 10).",
      "Build the percentage from multiples of 10%, plus 5% (half of 10%) and 1% (÷100) as needed.",
      "Add the pieces together.",
    ],
    examples: [
      { problem: "20% of 250", working: "10% = 25; 20% = 2×25", answer: "50" },
      { problem: "15% of 80", working: "10% = 8; 5% = 4; 15% = 8+4", answer: "12" },
      { problem: "25% of 640", working: "10% = 64; 25% = 2×10%+5% = 128+32", answer: "160" },
      { problem: "110% of 90", working: "10% = 9; 110% = 11×9", answer: "99" },
      { problem: "7% of 1200", working: "1% = 12; 7% = 7×12", answer: "84" },
    ],
    calcInputs: "two",
    calcLabel: "Number and percentage",
    calcHint: "e.g. 250 and 20, for 20% of 250",
  },
  {
    id: "percent-change-one-step",
    cat: "percent",
    name: "Percentage Increase/Decrease in One Step",
    sutra: "new value = N × (1 ± p/100)",
    rule: "To increase a number by p%, multiply by (1 + p/100). To decrease by p%, multiply by (1 − p/100) — one multiplication instead of two steps.",
    whenToUse: "Price hikes, discounts, population growth/decline, exam-mark adjustments.",
    steps: [
      "Turn the percentage into a decimal multiplier: increase → 1 + p/100, decrease → 1 − p/100.",
      "Multiply the original number by that multiplier.",
      "The result IS the new value — no separate add/subtract step.",
    ],
    examples: [
      { problem: "200 up 10%", working: "200 × 1.10", answer: "220" },
      { problem: "150 down 20%", working: "150 × 0.80", answer: "120" },
      { problem: "500 up 5%", working: "500 × 1.05", answer: "525" },
      { problem: "80 down 25%", working: "80 × 0.75", answer: "60" },
      { problem: "1000 up 12%", working: "1000 × 1.12", answer: "1120" },
    ],
    calcInputs: "two",
    calcLabel: "Number and % change (negative = decrease)",
    calcHint: "e.g. 150 and -20, for a 20% decrease",
  },
  {
    id: "fraction-to-percent",
    cat: "percent",
    name: "Fraction to Percent — Quick Conversions",
    sutra: "Percentage shortcut",
    rule: "Memorise the common fraction-percent pairs (halves, quarters, fifths, eighths, tenths) and scale them, instead of long-dividing every time.",
    whenToUse: "Converting a fraction to a percentage fast — especially halves, quarters, fifths, eighths, or tenths.",
    steps: [
      "Know the base facts: 1/2=50%, 1/4=25%, 1/5=20%, 1/8=12.5%, 1/10=10%, 1/3≈33.3%.",
      "Scale up: e.g. 3/8 = 3 × 12.5% = 37.5%.",
      "Anything else: numerator ÷ denominator × 100 — still fast with a friendly denominator.",
    ],
    examples: [
      { problem: "1/4", working: "known fact", answer: "25%" },
      { problem: "3/8", working: "3 × 12.5%", answer: "37.5%" },
      { problem: "2/5", working: "2 × 20%", answer: "40%" },
      { problem: "7/20", working: "7/20 = 35/100", answer: "35%" },
      { problem: "1/3", working: "1 ÷ 3 × 100 (repeating)", answer: "≈33.3%" },
    ],
    calcInputs: "two",
    calcLabel: "Numerator and denominator",
    calcHint: "e.g. 3 and 8, for 3/8",
  },
  {
    id: "difference-of-squares",
    cat: "algebra",
    name: "Equidistant Multiplication (Difference of Squares)",
    sutra: "a² − b² = (a+b)(a−b)",
    rule: "If two numbers sit equally spaced around a round midpoint, their product = (midpoint)² − (distance)² — squaring two round numbers beats multiplying two odd ones.",
    whenToUse: "Multiplying two numbers spaced symmetrically around a nice midpoint, like 48×52 (around 50) or 97×103 (around 100).",
    steps: [
      "Find the midpoint: (a + b) ÷ 2.",
      "Find the distance from the midpoint to each number: (b − a) ÷ 2.",
      "Answer = midpoint² − distance².",
    ],
    examples: [
      { problem: "48 × 52", working: "mid=50, d=2 → 2500−4", answer: "2496" },
      { problem: "97 × 103", working: "mid=100, d=3 → 10000−9", answer: "9991" },
      { problem: "19 × 21", working: "mid=20, d=1 → 400−1", answer: "399" },
      { problem: "88 × 92", working: "mid=90, d=2 → 8100−4", answer: "8096" },
      { problem: "996 × 1004", working: "mid=1000, d=4 → 1000000−16", answer: "999984" },
    ],
    calcInputs: "two",
    calcLabel: "Two numbers equally spaced around a round midpoint",
    calcHint: "Try 48 & 52, or 97 & 103…",
  },
  {
    id: "sqrt-estimate",
    cat: "estimation",
    name: "Quick Square Root Estimate",
    sutra: "Estimation shortcut",
    rule: "Find the two perfect squares your number sits between, then use how close it is to each to estimate the decimal part — no calculator needed for a good ballpark.",
    whenToUse: "Estimating √N quickly for a number that isn't a perfect square — exams and real-life sanity checks.",
    steps: [
      "Find the perfect squares just below and above N.",
      "√N lies between their square roots.",
      "Estimate the decimal by how close N is to the lower square versus the gap to the next one.",
    ],
    examples: [
      { problem: "√50", working: "49<50<64 → between 7 and 8, close to 7", answer: "≈7.07" },
      { problem: "√75", working: "64<75<81 → between 8 and 9", answer: "≈8.66" },
      { problem: "√120", working: "100<120<121 → between 10 and 11, very close to 11", answer: "≈10.95" },
      { problem: "√200", working: "196<200<225 → between 14 and 15, very close to 14", answer: "≈14.14" },
      { problem: "√90", working: "81<90<100 → between 9 and 10, roughly halfway", answer: "≈9.49" },
    ],
    calcInputs: "one",
    calcLabel: "Any whole number (not a perfect square)",
    calcHint: "Try 50, 90, 120, 200…",
  },
  {
    id: "assumed-mean-average",
    cat: "estimation",
    name: "Assumed-Mean Quick Average",
    sutra: "Estimation shortcut",
    rule: "Pick a round 'assumed mean' near your numbers, find each number's deviation from it, average the deviations, then add that back to the assumed mean.",
    whenToUse: "Averaging a list of numbers that cluster around a round value — faster than adding everything and dividing.",
    steps: [
      "Choose a round number near the middle of your list as the assumed mean.",
      "Find each number's deviation from the assumed mean (can be negative).",
      "Average the deviations (sum ÷ count).",
      "True average = assumed mean + average deviation.",
    ],
    examples: [
      { problem: "82, 79, 85, 91, 78", working: "assumed 80; devs +2,-1,+5,+11,-2 → avg dev +3", answer: "83" },
      { problem: "48, 52, 55, 45, 50, 47", working: "assumed 50; devs -2,+2,+5,-5,0,-3 → avg dev -0.5", answer: "49.5" },
      { problem: "31, 29, 33, 28, 30", working: "assumed 30; devs +1,-1,+3,-2,0 → avg dev +0.2", answer: "30.2" },
      { problem: "67, 72, 65, 70, 71", working: "assumed 70; devs -3,+2,-5,0,+1 → avg dev -1", answer: "69" },
      { problem: "24, 27, 22, 29, 26, 25", working: "assumed 25; devs -1,+2,-3,+4,+1,0 → avg dev +0.5", answer: "25.5" },
    ],
    calcInputs: "list",
    calcLabel: "A list of numbers",
    calcHint: "Try 82, 79, 85, 91, 78 (comma or space separated)",
  },
  {
    id: "pythagorean-triples",
    cat: "geometry",
    name: "Spot a Pythagorean Triple",
    sutra: "3-4-5, 5-12-13, 8-15-17, 7-24-25 …",
    rule: "Some right-triangle side sets are 'famous' whole-number triples. Recognising them (or their multiples) gives the third side instantly, with no square root to compute.",
    whenToUse: "Finding the third side of a right triangle fast when the two known sides look like a scaled-up famous triple.",
    steps: [
      "Check if your two sides are a multiple of a known triple (3-4-5, 5-12-13, 8-15-17, 7-24-25).",
      "If yes, the third side is that same multiple of the matching triple number.",
      "Not sure? Compute a² + b² and check whether it's a perfect square.",
    ],
    examples: [
      { problem: "legs 3, 4", working: "3-4-5 triple", answer: "hyp = 5" },
      { problem: "legs 6, 8", working: "2×(3-4-5)", answer: "hyp = 10" },
      { problem: "legs 5, 12", working: "5-12-13 triple", answer: "hyp = 13" },
      { problem: "legs 9, 12", working: "3×(3-4-5)", answer: "hyp = 15" },
      { problem: "legs 8, 15", working: "8-15-17 triple", answer: "hyp = 17" },
      { problem: "legs 7, 24", working: "7-24-25 triple", answer: "hyp = 25" },
    ],
    calcInputs: "two",
    calcLabel: "The two legs of a right triangle",
    calcHint: "Try 6 & 8, or 9 & 12…",
  },
  {
    id: "polygon-angle-sum",
    cat: "geometry",
    name: "Sum of Interior Angles — (n−2)×180° Rule",
    sutra: "Sum = (n − 2) × 180°",
    rule: "Any polygon splits into (n − 2) triangles, and each triangle's angles add to 180° — so a polygon's interior angles always sum to (n − 2) × 180°.",
    whenToUse: "Finding the total (or, for a regular polygon, each) interior angle just from the number of sides.",
    steps: [
      "Count the sides, n.",
      "Sum of interior angles = (n − 2) × 180°.",
      "If the polygon is regular, each angle = sum ÷ n.",
    ],
    examples: [
      { problem: "n=3 (triangle)", working: "(3−2)×180 = 180; ÷3", answer: "180° total, 60° each" },
      { problem: "n=4 (square)", working: "(4−2)×180 = 360; ÷4", answer: "360° total, 90° each" },
      { problem: "n=5 (pentagon)", working: "(5−2)×180 = 540; ÷5", answer: "540° total, 108° each" },
      { problem: "n=6 (hexagon)", working: "(6−2)×180 = 720; ÷6", answer: "720° total, 120° each" },
      { problem: "n=8 (octagon)", working: "(8−2)×180 = 1080; ÷8", answer: "1080° total, 135° each" },
      { problem: "n=10 (decagon)", working: "(10−2)×180 = 1440; ÷10", answer: "1440° total, 144° each" },
    ],
    calcInputs: "one",
    calcLabel: "Number of sides (n)",
    calcHint: "Try 5, 6, 8, 10, 12…",
  },
  {
    id: "rectangle-area-perimeter",
    cat: "geometry",
    name: "Rectangle Area & Perimeter — Quick Formulas",
    sutra: "Area = L×W, Perimeter = 2(L+W)",
    rule: "Area = length × width. Perimeter = 2 × (length + width). Two one-line formulas cover almost every rectangle question.",
    whenToUse: "Any rectangle (or square, where length = width) — flooring, fencing, framing, wrapping paper.",
    steps: [
      "Multiply length × width for the area.",
      "Add length + width, then double it for the perimeter.",
      "Square: both sides equal, so Area = side² and Perimeter = 4 × side.",
    ],
    examples: [
      { problem: "12 × 8", working: "area 12×8; perimeter 2×(12+8)", answer: "Area 96, Perimeter 40" },
      { problem: "15 × 10", working: "area 15×10; perimeter 2×(15+10)", answer: "Area 150, Perimeter 50" },
      { problem: "7.5 × 4", working: "area 7.5×4; perimeter 2×(7.5+4)", answer: "Area 30, Perimeter 23" },
      { problem: "20 × 13", working: "area 20×13; perimeter 2×(20+13)", answer: "Area 260, Perimeter 66" },
      { problem: "9 × 9 (square)", working: "area 9²; perimeter 4×9", answer: "Area 81, Perimeter 36" },
    ],
    calcInputs: "two",
    calcLabel: "Length and width",
    calcHint: "Try 12 & 8, or 9 & 9 for a square",
  },
];

export const TRICKS_HISTORY_NOTE =
  "Attribution is disputed: Tirtha claimed these sutras come from an ancient Vedic text, but historians found no such source — the consensus is this is his own early-20th-century system, not literal ancient scripture. Treat it as “clever mental-maths shortcuts,” not sacred knowledge. Each trick is a special case that's fast only in its own niche (Urdhva-Tiryagbhyam, the crosswise method, is the only fully general one) — the real skill is spotting which trick fits. Learn these ALONGSIDE the standard column method, not instead of it: the standard method builds place-value understanding, these build speed and number sense.";
