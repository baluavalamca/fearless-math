/**
 * Cross-concept mistake-pattern families (#433).
 *
 * A child's wrong answers are already tracked per (concept, question) via
 * store.wrongQuestions(). On their own those are just a list. This module
 * groups concepts that draw on the SAME underlying skill -- e.g. addition
 * regrouping and subtraction regrouping both need "carrying/borrowing" --
 * so that if a child is stuck across two or more of them, the parent sees
 * one clear, named skill gap instead of a pile of unrelated question IDs.
 *
 * Membership is a hand-curated, grounded mapping from real concept ids
 * (not a fuzzy keyword guess) so it stays accurate as content grows.
 * Families with fewer than 2 concepts are not worth flagging as
 * "cross-concept" and are simply left out.
 */

const FAMILIES = [
  {
    id: "regrouping",
    label: "Carrying & borrowing (regrouping)",
    tip: "Regrouping trips up a lot of children in both addition and subtraction. A few minutes with base-10 blocks or the Abacus tool, going slowly digit-by-digit, usually makes it click.",
    concepts: ["ops-07-addition-regrouping", "ops-08-subtraction-regrouping"],
  },
  {
    id: "place-value",
    label: "Place value",
    tip: "Place value is the foundation under almost everything else in number work. Practising reading numbers aloud digit-by-digit (ones, tens, hundreds...) helps it stick.",
    concepts: ["num-01-place-value", "num-04-place-value-6digit", "num-19-large-numbers", "num-59-crores"],
  },
  {
    id: "multiplication-division",
    label: "Multiplication & division",
    tip: "These build on each other -- a shaky times-table makes division slower and more error-prone. A quick daily tables drill pays off across both.",
    concepts: ["ops-09-multiplication-groups", "ops-10-tables-patterns", "ops-11-area-multiplication", "ops-12-mult-2x2", "ops-13-division-sharing", "ops-14-long-division", "ops-16-division"],
  },
  {
    id: "order-of-operations",
    label: "Number properties & order of operations",
    tip: "Mixing up the order operations happen in (BODMAS) is one of the most common silent errors. Working through one step at a time, out loud, helps catch it.",
    concepts: ["ops-17-properties", "ops-18-order-of-operations"],
  },
  {
    id: "factors-multiples",
    label: "Factors, multiples & divisibility",
    tip: "Factors, primes, divisibility rules and HCF/LCM all lean on the same number sense. Skip-counting practice and divisibility-rule flashcards help across all of them.",
    concepts: ["num-16-factors-multiples", "num-24-primes", "num-25-divisibility", "num-26-hcf-lcm", "num-27-squares-roots"],
  },
  {
    id: "fractions-core",
    label: "Comparing & simplifying fractions",
    tip: "Equivalence, comparing and simplifying fractions all come down to seeing a fraction as parts of a whole. The Pizza Slices visual is a quick way to rebuild that picture.",
    concepts: ["frac-01-equal-parts", "frac-03-equivalent", "frac-04-comparing", "frac-08-simplifying"],
  },
  {
    id: "fraction-operations",
    label: "Fraction operations",
    tip: "Adding, multiplying and working with mixed numbers/fractions-of-quantities all trip up the same underlying step. Slowing down to draw the fraction first usually fixes it.",
    concepts: ["frac-05-adding-like", "frac-06-fraction-of-quantity", "frac-07-mixed-numbers", "frac-09-multiply-divide"],
  },
  {
    id: "decimal-operations",
    label: "Decimal place value & operations",
    tip: "Decimals are place value in disguise. Lining up the decimal point every time before adding/subtracting/multiplying clears up most of these mistakes.",
    concepts: ["dec-01-decimal-tenths", "dec-02-money-decimals", "dec-03-hundredths", "dec-04-fraction-decimal-link", "dec-05-decimal-operations"],
  },
  {
    id: "percentages-money",
    label: "Percentages, profit, loss & discount",
    tip: "Percentages, discounts and profit/loss questions all use the same \"part of 100\" idea. Converting the percentage to a fraction first often makes the calculation click.",
    concepts: ["dec-06-percentages", "apt-09-discount-marked-price", "apt-14-profit-loss", "meas-07-financial-literacy"],
  },
  {
    id: "ratio-proportion",
    label: "Ratio & proportion",
    tip: "Ratio and proportion questions both come down to keeping two quantities scaled together. Writing both as a fraction side-by-side usually untangles the mistake.",
    concepts: ["num-22-ratio-proportion", "num-31-proportion"],
  },
  {
    id: "angles-lines",
    label: "Angles & lines",
    tip: "Angle and line questions share the same core vocabulary (acute, obtuse, parallel, perpendicular). A quick recap with a real protractor helps it transfer between lessons.",
    concepts: ["geo-05-angles", "geo-09-lines-angles", "geo-23-euclid-geometry", "geo-24-straight-lines", "geo-family-of-lines"],
  },
  {
    id: "area-perimeter",
    label: "Area & perimeter",
    tip: "Mixing up area and perimeter formulas is extremely common. A simple check -- perimeter is a length (one unit), area is a covering (squared units) -- resolves most of these.",
    concepts: ["geo-02-perimeter", "geo-03-area", "geo-08-area-boundary", "geo-15-area-formulas", "geo-18-heron", "geo-20-areas-circles"],
  },
  {
    id: "shapes-solids",
    label: "Shapes & solids",
    tip: "Recognising and naming 2D shapes and 3D solids is foundational to all later geometry. Handling real objects (a ball, a box, a cone) alongside the lesson helps it stick.",
    concepts: ["found-10-shapes", "found-15-3d-shapes", "geo-01-shapes", "geo-06-solids-nets", "geo-07-3d-shapes", "geo-16-surface-volume"],
  },
  {
    id: "triangles-circles",
    label: "Triangles, circles & geometry theorems",
    tip: "Congruence, Pythagoras, circle theorems and tangents all build on the same proof-style reasoning. Working through one worked example slowly, step-justified, transfers well.",
    concepts: ["geo-10-triangles-quads", "geo-11-circles", "geo-12-congruence-similarity", "geo-13-pythagoras", "geo-19-circle-tangents"],
  },
  {
    id: "coordinate-geometry",
    label: "Coordinate geometry",
    tip: "Plotting points, straight lines and conic sections all rest on reading the x/y grid correctly. A quick warm-up plotting a few points before the question helps.",
    concepts: ["geo-14-coordinate-geometry", "geo-24-straight-lines", "geo-25-conic-sections", "geo-family-of-lines"],
  },
  {
    id: "trigonometry",
    label: "Trigonometry",
    tip: "Trig ratios, applications and inverse trig all depend on knowing sin/cos/tan cold. A laminated ratio table nearby while practising takes the memory load off.",
    concepts: ["geo-17-trigonometry", "geo-21-trig-applications", "geo-sine-cosine-rule", "geo-trigonometric-equations", "num-49-trigonometric-functions", "num-52-inverse-trigonometry"],
  },
  {
    id: "algebra-equations",
    label: "Algebra & equations",
    tip: "Expressions, equations, polynomials and inequalities all rely on the same \"do the same thing to both sides\" rule. Narrating each step out loud catches most slips.",
    concepts: ["num-23-algebra-intro", "num-32-expressions", "num-33-linear-equations", "num-34-polynomials", "num-35-quadratics", "num-41-pair-linear-equations", "num-51-linear-inequalities"],
  },
  {
    id: "integers-signed",
    label: "Integers & signed numbers",
    tip: "Sign errors with negative numbers are one of the most common silent mistakes going into algebra. A number line with negatives marked out helps a lot.",
    concepts: ["num-21-integers", "num-28-integer-operations"],
  },
  {
    id: "probability",
    label: "Probability",
    tip: "Basic, conditional and axiomatic probability all lean on the same \"favourable over total outcomes\" idea. Listing outcomes out fully before calculating helps.",
    concepts: ["data-05-probability", "data-07-probability-depth", "data-10-probability-axiomatic", "data-11-conditional-probability", "data-probability-distributions"],
  },
  {
    id: "statistics-averages",
    label: "Statistics & averages",
    tip: "Mean, grouped statistics, dispersion and averages questions all share the same \"add up, divide by how many\" core. Slowing down on the counting step usually fixes the mistake.",
    concepts: ["data-06-statistics", "data-08-grouped-statistics", "data-09-statistics-dispersion", "data-cumulative-frequency", "data-mean-deviation", "apt-15-averages"],
  },
  {
    id: "speed-distance-time",
    label: "Speed, distance & time problems",
    tip: "Trains, boats-and-streams, and speed-distance-time questions are all the same formula (speed = distance / time) in a new costume. Writing out what's known/unknown first helps transfer the skill.",
    concepts: ["meas-08-speed-distance-time", "apt-05-boats-streams", "apt-07-trains", "apt-01-time-work", "apt-02-pipes-cisterns"],
  },
  {
    id: "patterns-sequences",
    label: "Patterns & sequences",
    tip: "Spotting the rule in a pattern or sequence is a transferable skill across number and reasoning work. Asking \"what changed from one term to the next?\" every time builds the habit.",
    concepts: ["found-12-patterns", "num-17-patterns", "num-18-patterns", "num-20-patterns", "num-40-arithmetic-progressions", "num-47-sequences-series"],
  },
  {
    id: "money-finance",
    label: "Money & financial maths",
    tip: "Money questions across grades reuse the same decimal/percentage skills in real-life contexts. Practising with real (or play) coins and notes makes the numbers feel concrete.",
    concepts: ["found-08-money", "meas-05-money", "dec-02-money-decimals", "meas-07-financial-literacy", "meas-09-advanced-finance", "apt-08-simple-interest"],
  },
  {
    id: "time-calendar",
    label: "Time & calendar",
    tip: "Clocks and calendars both use non-decimal counting (60 minutes, 12 months) which trips up children used to base-10. A real clock face nearby while practising really helps.",
    concepts: ["found-09-calendar", "found-17-telling-time", "meas-02-time", "apt-11-clock-aptitude", "apt-12-calendar-odd-days"],
  },
  {
    id: "counting-early-number",
    label: "Counting & early number sense",
    tip: "These are the very first building blocks of number sense. Counting real objects together (fingers, toys, snacks) at home reinforces the same skill the lesson is teaching.",
    concepts: ["found-01-prenumber", "found-02-numbers-11-20", "num-00-counting-to-100", "found-16-numbers-to-999", "pp1-01-count-to-10"],
  },
  {
    id: "addition-subtraction-basic",
    label: "Basic addition & subtraction",
    tip: "Early addition/subtraction fluency is worth extra practice minutes since so much later maths depends on it. Short, frequent practice beats one long session.",
    concepts: ["found-03-number-bonds", "found-06-add-sub-within-20", "found-07-add-sub-within-100", "pp1-03-add-within-10", "pp1-04-subtract-within-10"],
  },
  {
    id: "unit-conversion",
    label: "Units & measurement conversion",
    tip: "Converting between units (cm/m, ml/l, grams/kg) is a skill that transfers across every measurement topic. A quick \"bigger unit or smaller unit?\" check before converting helps.",
    concepts: ["meas-01-units", "meas-03-maps-scale", "meas-06-unit-conversion", "meas-04-volume"],
  },
  {
    id: "reasoning-series",
    label: "Pattern & series reasoning",
    tip: "Number, letter and figure series all reward the same habit: write down the rule you spot before picking an answer, rather than guessing.",
    concepts: ["reason-01-number-series", "reason-02-letter-series", "reason-19-figure-series"],
  },
  {
    id: "reasoning-spatial",
    label: "Spatial & visual reasoning",
    tip: "Mirror images, paper folding, embedded figures and dice/cubes all use the same mental-rotation skill. Practising with real paper folding and a mirror builds it fastest.",
    concepts: ["reason-16-mirror-water-images", "reason-17-paper-folding", "reason-18-embedded-figures", "reason-20-dice-cubes"],
  },
  {
    id: "reasoning-logic",
    label: "Logical reasoning",
    tip: "Syllogisms, statement-conclusion and data-sufficiency questions all need slow, careful reading rather than quick guessing. Underlining the given facts before answering helps.",
    concepts: ["reason-08-syllogisms", "reason-11-statement-conclusion", "reason-12-coded-inequalities", "reason-13-data-sufficiency"],
  },
  {
    id: "reasoning-arrangement",
    label: "Arrangement & relation puzzles",
    tip: "Seating arrangements, blood relations, ranking and direction puzzles all reward drawing a quick diagram before answering rather than working it out in your head.",
    concepts: ["reason-05-direction-sense", "reason-06-ranking-order", "reason-07-blood-relations", "reason-09-seating-arrangement", "reason-10-puzzles"],
  },
];

/** conceptId -> [familyId, ...] (a concept may belong to more than one family). */
const BY_CONCEPT = new Map();
for (const fam of FAMILIES) {
  for (const cid of fam.concepts) {
    if (!BY_CONCEPT.has(cid)) BY_CONCEPT.set(cid, []);
    BY_CONCEPT.get(cid).push(fam.id);
  }
}
const BY_ID = new Map(FAMILIES.map((f) => [f.id, f]));

/** Family ids a concept belongs to (usually 0 or 1, occasionally more). */
function familiesForConcept(conceptId) {
  return BY_CONCEPT.get(conceptId) || [];
}

/**
 * Turn a child's still-wrong questions (from store.wrongQuestions) into named,
 * cross-concept skill-gap patterns. Only families where the child has unresolved
 * wrong attempts in at least MIN_CONCEPTS different concepts are returned --
 * that's what makes this "cross-concept" rather than just "wrong in one lesson".
 */
function detectPatterns(wrongQuestions, conceptTitle, opts = {}) {
  const MIN_CONCEPTS = opts.minConcepts || 2;
  const TOP_N = opts.topN || 5;

  const byFamily = new Map(); // familyId -> { conceptIds: Set, totalTries: number }
  for (const w of wrongQuestions) {
    for (const famId of familiesForConcept(w.conceptId)) {
      const g = byFamily.get(famId) || { conceptIds: new Set(), totalTries: 0 };
      g.conceptIds.add(w.conceptId);
      g.totalTries += w.tries || 1;
      byFamily.set(famId, g);
    }
  }

  const patterns = [];
  for (const [famId, g] of byFamily) {
    if (g.conceptIds.size < MIN_CONCEPTS) continue;
    const fam = BY_ID.get(famId);
    if (!fam) continue;
    const concepts = [...g.conceptIds]
      .map((id) => ({ id, name: conceptTitle(id) }))
      .filter((c) => c.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (concepts.length < MIN_CONCEPTS) continue;
    patterns.push({
      familyId: fam.id, label: fam.label, tip: fam.tip,
      concepts, totalWrongAttempts: g.totalTries,
    });
  }
  patterns.sort((a, b) => b.totalWrongAttempts - a.totalWrongAttempts || b.concepts.length - a.concepts.length);
  return patterns.slice(0, TOP_N);
}

module.exports = { FAMILIES, familiesForConcept, detectPatterns };
