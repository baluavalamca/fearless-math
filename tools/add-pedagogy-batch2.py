"""Batch 2: rememberIt / studentQuestions / formulas for senior exam-critical concepts."""
import json, os

CONCEPTS = os.path.join(os.path.dirname(__file__), "..", "content-packs",
                        "cbse-class3-5-en-v1", "concepts")

DATA = {
  "num-40-arithmetic-progressions": {
    "rememberIt": {"hook": "AP: same step every time. nth term = a + (n-1)d",
      "unpack": "a = first term, d = common difference (add the same each time). Sum S = n/2 [2a + (n-1)d] = n/2 x (first + last)."},
    "studentQuestions": [
      {"q": "How do I find d?", "a": "Subtract any term from the next: d = a2 - a1. It is the same all the way through an AP."},
      {"q": "Why (n-1)d and not n x d?", "a": "The first term already sits at position 1 with no steps added. To reach the nth term you take (n-1) steps of size d."}
    ],
    "formulas": [
      {"name": "nth term", "formula": "a_n = a + (n-1) d", "remember": "(n-1) steps from the first term", "whenToUse": "Find any term."},
      {"name": "Sum of n terms", "formula": "S_n = n/2 [2a + (n-1)d]", "remember": "= n/2 x (first + last)", "whenToUse": "Add the first n terms."}
    ]
  },
  "num-47-sequences-series": {
    "rememberIt": {"hook": "GP: multiply by the same r each time. nth term = a r^(n-1)",
      "unpack": "r = common ratio (divide a term by the one before). Sum S = a(r^n - 1)/(r - 1). Infinite sum (|r| < 1) = a/(1 - r)."},
    "studentQuestions": [
      {"q": "AP or GP - how do I tell?", "a": "AP adds the same number each time; GP multiplies by the same number each time. 2,4,6 is AP; 2,4,8 is GP."},
      {"q": "When does an infinite GP add up to a finite number?", "a": "Only when |r| < 1 - the terms shrink to nothing, so they total the finite a/(1 - r)."}
    ],
    "formulas": [
      {"name": "nth term", "formula": "a_n = a r^(n-1)"},
      {"name": "Sum of n terms", "formula": "S_n = a(r^n - 1)/(r - 1)", "whenToUse": "r not equal to 1"},
      {"name": "Infinite sum", "formula": "S = a/(1 - r)", "remember": "Only when |r| < 1"}
    ]
  },
  "num-34-polynomials": {
    "rememberIt": {"hook": "Degree = highest power. Roots = where it equals 0",
      "unpack": "A root is where the graph crosses the x-axis. Number of roots is at most the degree. Quadratic: sum of roots = -b/a, product = c/a."},
    "studentQuestions": [
      {"q": "What is a 'root' or 'zero'?", "a": "A value of x that makes the polynomial equal 0 - where its graph touches or crosses the x-axis."},
      {"q": "How many roots can it have?", "a": "At most as many as its degree: a quadratic (degree 2) up to 2, a cubic up to 3."}
    ],
    "formulas": [
      {"name": "Sum of roots (quadratic)", "formula": "alpha + beta = -b/a"},
      {"name": "Product of roots (quadratic)", "formula": "alpha x beta = c/a", "remember": "-b/a and c/a"}
    ]
  },
  "num-42-real-numbers": {
    "rememberIt": {"hook": "Every number is rational (a fraction) or irrational (never-ending, non-repeating)",
      "unpack": "Rational = p/q. Irrational = sqrt(2), pi, ... A decimal that ends OR repeats is rational."},
    "studentQuestions": [
      {"q": "Is a repeating decimal rational?", "a": "Yes - 0.333... = 1/3. A decimal that ends OR repeats is rational. Only never-ending, never-repeating decimals (like sqrt 2) are irrational."},
      {"q": "Why is sqrt(2) irrational?", "a": "You can prove no fraction p/q equals it - assuming one exists leads to a contradiction. So it cannot be written as a fraction."}
    ]
  },
  "num-44-permutations-combinations": {
    "rememberIt": {"hook": "Order matters -> Permutation (P). Order doesn't -> Combination (C)",
      "unpack": "nPr = n!/(n-r)!. nCr = n!/(r!(n-r)!). C is P divided by r!, because we do not count the r! re-orderings."},
    "studentQuestions": [
      {"q": "How do I know P or C?", "a": "Ask: does the ORDER matter? A race podium (1st, 2nd, 3rd) -> permutation. Picking a team of 3 -> combination (order does not matter)."},
      {"q": "Why divide by r! for combinations?", "a": "Every group of r can be arranged in r! orders. Permutations count all of them; combinations count the group once - so divide by r!."}
    ],
    "formulas": [
      {"name": "Permutations", "formula": "nPr = n! / (n-r)!", "remember": "Order matters"},
      {"name": "Combinations", "formula": "nCr = n! / (r! (n-r)!)", "remember": "Order does not matter = nPr / r!"}
    ]
  },
  "num-45-binomial-theorem": {
    "rememberIt": {"hook": "(a+b)^n: coefficients are nCr (Pascal's triangle)",
      "unpack": "General term T(r+1) = nCr a^(n-r) b^r. Powers of a go down, b go up, always adding to n. There are n+1 terms."},
    "studentQuestions": [
      {"q": "How do I find one term without expanding everything?", "a": "Use T(r+1) = nCr a^(n-r) b^r. Pick the r that gives the power you want."},
      {"q": "Where do the coefficients come from?", "a": "The nCr values - the same numbers as the rows of Pascal's triangle."}
    ],
    "formulas": [
      {"name": "General term", "formula": "T(r+1) = nCr a^(n-r) b^r", "remember": "Powers of a and b always add to n", "whenToUse": "Find a specific term or coefficient."}
    ]
  },
  "num-46-complex-numbers": {
    "rememberIt": {"hook": "i = sqrt(-1), so i^2 = -1",
      "unpack": "z = a + bi. Modulus |z| = sqrt(a^2 + b^2). Powers of i cycle every 4: i, -1, -i, 1. Conjugate of a+bi is a-bi."},
    "studentQuestions": [
      {"q": "How can sqrt(-1) be a number?", "a": "We DEFINE a new number i whose square is -1. It obeys the usual algebra rules and lets us solve equations that reals cannot."},
      {"q": "What is i^100?", "a": "Powers of i repeat every 4 (i, -1, -i, 1). 100 divided by 4 leaves remainder 0, so i^100 = 1."}
    ],
    "formulas": [
      {"name": "Modulus", "formula": "|a + bi| = sqrt(a^2 + b^2)", "remember": "Pythagoras on the complex plane"},
      {"name": "Powers of i", "formula": "i, i^2=-1, i^3=-i, i^4=1", "remember": "Cycle of 4 - use the remainder of the power / 4"}
    ]
  },
  "num-48-limits-derivatives": {
    "rememberIt": {"hook": "Derivative = instant rate of change = slope of the curve",
      "unpack": "Power rule: d/dx(x^n) = n x^(n-1) (bring the power down, drop it by 1). A limit is the value a function approaches as x nears a point."},
    "studentQuestions": [
      {"q": "What does a derivative actually mean?", "a": "How fast something changes at an instant - the slope of the curve at that exact point (like speed from a distance-time graph)."},
      {"q": "What is the fastest rule?", "a": "The power rule: for x^n, bring n to the front and reduce the power by 1. x^3 -> 3 x^2."}
    ],
    "formulas": [
      {"name": "Power rule", "formula": "d/dx(x^n) = n x^(n-1)", "remember": "Bring the power down, drop it by 1"},
      {"name": "Product rule", "formula": "(uv)' = u'v + uv'", "remember": "first x d(second) + second x d(first)"}
    ]
  },
  "num-50-matrices-determinants": {
    "rememberIt": {"hook": "Matrix = grid (rows x columns). Determinant tells if it can be inverted",
      "unpack": "2x2 determinant = ad - bc. If det = 0, there is no inverse (no unique solution). Multiply rows-into-columns."},
    "studentQuestions": [
      {"q": "What does the determinant tell me?", "a": "Whether the matrix can be 'undone' (inverted). det = 0 means no inverse - the equations have no single unique solution."},
      {"q": "Why rows times columns when multiplying?", "a": "Each output entry pairs a ROW of the first with a COLUMN of the second, multiplying matching entries and adding - so columns of A must match rows of B."}
    ],
    "formulas": [
      {"name": "2x2 determinant", "formula": "det[[a,b],[c,d]] = ad - bc", "remember": "Main diagonal minus off-diagonal"},
      {"name": "Inverse exists?", "formula": "only if det != 0", "remember": "det = 0 -> no inverse"}
    ]
  },
  "num-55-integrals": {
    "rememberIt": {"hook": "Integration = reverse of differentiation = area under the curve",
      "unpack": "integral x^n dx = x^(n+1)/(n+1) + C (add one to the power, divide by it). Always +C for indefinite integrals."},
    "studentQuestions": [
      {"q": "How is it the 'opposite' of a derivative?", "a": "Differentiating x^n gives n x^(n-1); integrating undoes that - add one to the power and divide by the new power."},
      {"q": "Why the +C?", "a": "Constants vanish when you differentiate, so going back you cannot know the constant - you add C to cover every possibility."}
    ],
    "formulas": [
      {"name": "Power rule (integral)", "formula": "integral x^n dx = x^(n+1)/(n+1) + C", "remember": "Add one to the power, divide by it (n != -1)"},
      {"name": "Definite integral", "formula": "integral a..b f dx = F(b) - F(a)", "remember": "Top value minus bottom value = area"}
    ]
  },
  "data-06-statistics": {
    "rememberIt": {"hook": "Mean = average, Median = middle, Mode = most",
      "unpack": "Mean = sum / count. Median = middle value when sorted. Mode = the value that appears most. 'Median = Middle', 'Mode = Most'."},
    "studentQuestions": [
      {"q": "Which average should I use?", "a": "Mean for balanced data; median when there are extreme outliers (it is not dragged by them); mode for the most common category."},
      {"q": "How do I find the median of an even count?", "a": "Sort the values, then average the two middle ones."}
    ],
    "formulas": [
      {"name": "Mean", "formula": "mean = (sum of values) / (number of values)"},
      {"name": "Median", "formula": "middle value when sorted", "remember": "Even count -> average the two middles"}
    ]
  },
  "data-09-statistics-dispersion": {
    "rememberIt": {"hook": "Spread: range, variance, standard deviation (SD)",
      "unpack": "Variance = average of (value - mean)^2. SD = sqrt(variance), back in the original units. Bigger SD = more spread out."},
    "studentQuestions": [
      {"q": "Why square the differences for variance?", "a": "So positives and negatives do not cancel, and big gaps count more. SD square-roots it back to normal units."},
      {"q": "What does a small SD mean?", "a": "The data is tightly bunched near the mean; a large SD means it is widely spread out."}
    ],
    "formulas": [
      {"name": "Variance", "formula": "variance = mean of (x - xbar)^2"},
      {"name": "Standard deviation", "formula": "SD = sqrt(variance)", "remember": "Square-root brings the units back to normal"}
    ]
  },
  "data-05-probability": {
    "rememberIt": {"hook": "P(event) = favourable / total, always between 0 and 1",
      "unpack": "0 = impossible, 1 = certain. P(not A) = 1 - P(A). All outcome probabilities add up to 1."},
    "studentQuestions": [
      {"q": "Can a probability be more than 1?", "a": "Never. It runs from 0 (impossible) to 1 (certain). If you get more than 1, something is wrong."},
      {"q": "Quickest way to find 'at least one'?", "a": "Use P(at least one) = 1 - P(none). Usually far easier than counting all the cases."}
    ],
    "formulas": [
      {"name": "Probability", "formula": "P(A) = favourable outcomes / total outcomes", "remember": "Always between 0 and 1"},
      {"name": "Complement", "formula": "P(not A) = 1 - P(A)", "remember": "Great for 'at least one' problems"}
    ]
  },
  "num-49-trigonometric-functions": {
    "rememberIt": {"hook": "sin^2 A + cos^2 A = 1 - the master identity",
      "unpack": "From it: 1 + tan^2 A = sec^2 A, and 1 + cot^2 A = cosec^2 A. Quadrant signs: 'All Students Take Calculus' (All+, Sin+, Tan+, Cos+)."},
    "studentQuestions": [
      {"q": "Which identity should I start a proof with?", "a": "sin^2 A + cos^2 A = 1. Most identities fall out once you turn everything into sin and cos."},
      {"q": "How do I remember which ratio is positive in each quadrant?", "a": "'All Students Take Calculus' - Q1 All positive, Q2 Sin, Q3 Tan, Q4 Cos."}
    ],
    "formulas": [
      {"name": "Pythagorean identity", "formula": "sin^2 A + cos^2 A = 1", "remember": "The master identity"},
      {"name": "Secant identity", "formula": "1 + tan^2 A = sec^2 A"},
      {"name": "Quadrant signs", "formula": "All, Sin, Tan, Cos (Q1..Q4)", "remember": "'All Students Take Calculus'"}
    ]
  },
  "geo-21-trig-applications": {
    "rememberIt": {"hook": "Angle of elevation looks UP; depression looks DOWN",
      "unpack": "Draw the right triangle, mark the angle, then use SOH-CAH-TOA. tan is the workhorse: tan(angle) = height / distance."},
    "studentQuestions": [
      {"q": "Elevation vs depression?", "a": "Elevation = you look UP to the object (top of a tower). Depression = you look DOWN (cliff to a boat). Both measured from the horizontal."},
      {"q": "Which ratio usually solves height problems?", "a": "Usually tan, because you know the ground distance and want the height: tan(angle) = opposite/adjacent = height/distance."}
    ],
    "formulas": [
      {"name": "Height from distance", "formula": "tan(angle) = height / distance", "remember": "Use tan when you know the ground distance"}
    ]
  }
}

changed = 0
for cid, fields in DATA.items():
    path = os.path.join(CONCEPTS, cid + ".json")
    if not os.path.exists(path):
        print("MISSING:", cid); continue
    with open(path, "r", encoding="utf-8") as f:
        c = json.load(f)
    for k, v in fields.items():
        c[k] = v
    with open(path, "w", encoding="utf-8") as f:
        json.dump(c, f, ensure_ascii=False, indent=2)
    changed += 1
    print("OK:", cid)

print("DONE changed=%d" % changed)
