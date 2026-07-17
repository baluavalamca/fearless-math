# FearlessMath — Curriculum Coverage Audit (beyond CBSE/NCERT)

**Date:** 17 July 2026
**Scope:** All 146 authored concepts (PP1 → Class 12) checked against the *union* of major
school-maths curricula — **CBSE/NCERT, ICSE, Cambridge Primary + IGCSE (0580/0980),
US Common Core, UK National Curriculum (KS1–4)** and the **NEP 2020 / NCF-FS foundational
stage (NIPUN Bharat)**.

Method: dumped every concept's grade/strand/name, then grep-searched the full lesson
bodies (not just titles) for each candidate topic to avoid false "missing" calls.

---

## Verdict

**Foundational numeracy (PP1 → Class 5): fully covered.** Every NEP/NCF-FS and
Cambridge/Common Core primary outcome — pre-number sense, counting to 999, place value,
the four operations with regrouping, fractions, decimals, money, time, calendar, length/
weight/capacity, shapes (2D & 3D), patterns, symmetry, and first data handling — is present.

**CBSE/NCERT Class 1–12: complete**, including the full senior stream (algebra, trigonometry,
calculus, vectors, matrices, probability, statistics, LP, complex numbers, conics).

**Gaps exist only against *other boards* (ICSE / IGCSE / Common Core / UK).** Six topics
that those curricula require are not yet taught as their own concept. None of these is a
CBSE/NCERT requirement, so the app is complete for its stated CBSE alignment — but adding
them would make it board-agnostic.

---

## Confirmed gaps (required by ICSE / IGCSE / Common Core / UK, absent here)

| # | Missing concept | Where it's required | Suggested grade | Priority |
|---|-----------------|---------------------|-----------------|----------|
| 1 | **Geometric Transformations** — reflection, rotation, translation, enlargement/dilation on a grid | IGCSE (in *every* paper), Common Core G8, ICSE, UK KS3 | Class 7–8 (geometry) | **High** |
| 2 | **Sine Rule & Cosine Rule** — solving non‑right‑angled triangles | IGCSE, ICSE X, JEE | Class 10–11 (geometry) | **High** |
| 3 | **Cumulative frequency, quartiles, IQR & box plots** | IGCSE, ICSE, A‑level, CBSE XI (quartiles) | Class 9–10 (data) | Medium |
| 4 | **Temperature** — reading a thermometer, °C, negative temperatures | Cambridge Primary, Common Core, UK KS1–2 | Class 2–3 (measurement) | Medium |
| 5 | **Pie charts** — reading *and constructing* (angle = fraction × 360°) | CBSE VIII itself, ICSE, IGCSE | Class 5–7 (data) | Medium |
| 6 | **Bearings** — three‑figure bearings, navigation angles | IGCSE, ICSE | Class 9–10 (geometry) | Low |

### Evidence (grep of full lesson bodies)
- **Transformations:** the only matches are *Symmetry (the fold)*, *Solid Shapes*, *Congruence & Similarity*, *Conics*, *Complex Numbers*, *Matrices* — none teaches grid transformations. → gap.
- **Sine/Cosine rule:** 0 matches anywhere. → gap.
- **Cumulative frequency / quartiles:** mentioned only *inside* "Statistics of Grouped Data"; no dedicated lesson; **box plots: 0 matches**. → gap.
- **Temperature:** 9 matches, all incidental (used as *context* in Integers, Decimals, Statistics word problems); no lesson teaches temperature as a measure. → gap.
- **Pie charts:** appear only as a mention in "Median, Mode, Range and More Charts"; not taught with construction. → partial gap.
- **Bearings:** single incidental mention in "Inverse Trigonometric Functions". → gap.

---

## Minor / partial (nice-to-have, not board-blocking)

- **Elapsed time, 24‑hour clock, timetables** — clock-reading is taught; elapsed-time problems are light.
- **Significant figures & estimating calculations** — rounding is taught (Class 3); sig-figs (IGCSE) is light.
- **Composite & inverse functions** — touched inside "Relations and Functions"; could be deepened.
- **Set-builder & interval notation** — sets/Venn covered (Class 8); formal notation is light.
- **Area/volume scale factor of similar figures** — similarity covered; the k² / k³ rule is light.

---

## Already covered (spot-check — no action needed)

Number sense • place value to 6 digits • Roman numerals • all four operations incl. long
division • factors/multiples/HCF/LCM/primes/divisibility • fractions (all operations, of a
quantity, simplify, improper/mixed) • decimals (all operations, ↔ fractions) • percentages •
ratio & direct/inverse proportion • integers • rational & real numbers • powers & scientific
notation • squares/cubes/roots • algebra (expressions, linear eq & inequalities, polynomials,
quadratics, AP, functions & graphs, simultaneous equations) • 2D/3D shapes, nets, symmetry •
angles, lines, triangles, quadrilaterals, circles • congruence & similarity • Pythagoras •
coordinate geometry • constructions • Euclid's axioms • Heron's formula • perimeter/area/
surface area/volume • areas related to circles • right-triangle trig, applications, trig
functions, inverse trig • measurement (length/weight/capacity, unit conversion, money) •
data (pictograph, bar graph, tally, mean/median/mode/range, grouped data, variance/SD) •
probability (sample space, combined, addition rule, conditional & Bayes) • sets/Venn/logic •
financial maths (profit/loss/interest/budget, tax/CI/EMI) • calculus (limits, derivatives,
integrals, applications, differential equations) • vectors • matrices/determinants • complex
numbers • conic sections • 3D geometry • linear programming • permutations & combinations •
binomial theorem • sequences & series • computational thinking • mathematical modelling.

---

## Recommendation

The catalogue is **complete for CBSE/NCERT** and covers the **foundational stage fully**.
To make it board-agnostic (ICSE/IGCSE/international families), author the **six gap concepts**
above — the top three (Transformations, Sine/Cosine Rule, Cumulative frequency) give the
biggest coverage lift, and all six together are roughly a one-batch authoring job in the
existing concept format (each auto-validates against the Concept Contract).
