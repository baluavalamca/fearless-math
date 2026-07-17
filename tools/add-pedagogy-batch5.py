"""Batch 5: rememberIt / studentQuestions / formulas for mid-tier + senior straggler concepts."""
import json, os

CONCEPTS = os.path.join(os.path.dirname(__file__), "..", "content-packs",
                        "cbse-class3-5-en-v1", "concepts")

DATA = {
  "frac-01-equal-parts": {
    "rememberIt": {"hook": "A fraction = EQUAL parts of a whole. Bottom = pieces, top = how many you take",
      "unpack": "3/4: cut into 4 EQUAL pieces, take 3. The pieces must be equal, or it is not a fair fraction."},
    "studentQuestions": [
      {"q": "Do the pieces have to be equal?", "a": "Yes! A fraction only works if the whole is split into EQUAL parts. Three unequal bits are not thirds."},
      {"q": "What do the top and bottom mean?", "a": "Bottom (denominator) = how many equal pieces in all. Top (numerator) = how many of them you are talking about."}
    ]
  },
  "frac-03-equivalent": {
    "rememberIt": {"hook": "Equivalent = same amount, different numbers. Times/divide top AND bottom by the same",
      "unpack": "1/2 = 2/4 = 3/6 = 50/100. Do the same thing to top and bottom and the value does not change."},
    "studentQuestions": [
      {"q": "How can 1/2 equal 2/4?", "a": "Same slice of pizza cut differently. Multiply top and bottom of 1/2 by 2 -> 2/4. Same amount."},
      {"q": "How do I make an equivalent fraction?", "a": "Multiply (or divide) BOTH top and bottom by the same number. 2/3 times 3 -> 6/9."}
    ]
  },
  "frac-05-adding-like": {
    "rememberIt": {"hook": "Same bottom? Add the tops, keep the bottom",
      "unpack": "2/7 + 3/7 = 5/7. The bottom (piece size) stays the same; you are just counting more pieces. Different bottoms -> make them the same first."},
    "studentQuestions": [
      {"q": "Why not add the bottoms too?", "a": "The bottom tells the PIECE SIZE, which does not change. 2 sevenths + 3 sevenths = 5 sevenths, not 5 fourteenths."},
      {"q": "What if the bottoms are different?", "a": "Make them the same first using equivalent fractions, THEN add the tops."}
    ]
  },
  "frac-08-simplifying": {
    "rememberIt": {"hook": "Simplify = divide top and bottom by their biggest common factor (HCF)",
      "unpack": "6/8: both divide by 2 -> 3/4. Keep going until no number divides both. Lowest terms = simplest form."},
    "studentQuestions": [
      {"q": "When is a fraction fully simplified?", "a": "When no number except 1 divides both top and bottom. 3/4 is done; 6/8 is not (both share 2)."},
      {"q": "Fastest way to simplify?", "a": "Divide both by their HCF in one go. For 12/18, the HCF is 6 -> 2/3."}
    ]
  },
  "num-27-squares-roots": {
    "rememberIt": {"hook": "Square = number times itself. Square root undoes it",
      "unpack": "7^2 = 49, so sqrt(49) = 7. Perfect squares: 1,4,9,16,25,36,49,64,81,100. Learn these and roots become instant."},
    "studentQuestions": [
      {"q": "What does 'squared' mean?", "a": "Multiply the number by itself. 5^2 = 5 x 5 = 25. It is called 'square' because it is the area of a square of that side."},
      {"q": "What is a square root?", "a": "The number that was squared to get it. sqrt(36) = 6 because 6 x 6 = 36. Root undoes square."}
    ],
    "formulas": [
      {"name": "Square", "formula": "n^2 = n x n"},
      {"name": "Square root", "formula": "sqrt(n^2) = n", "remember": "Root undoes square"}
    ]
  },
  "num-05-even-odd": {
    "rememberIt": {"hook": "Even ends in 0,2,4,6,8 (splits in two). Odd ends in 1,3,5,7,9",
      "unpack": "Even + even = even, odd + odd = even, even + odd = odd. Only the LAST digit decides."},
    "studentQuestions": [
      {"q": "How do I check a big number like 3458?", "a": "Only the last digit matters. 8 is even, so 3458 is even."},
      {"q": "Is zero even or odd?", "a": "Even - it splits into two equal halves and sits between two odd numbers."}
    ]
  },
  "num-06-roman-numerals": {
    "rememberIt": {"hook": "I V X L C D M = 1 5 10 50 100 500 1000",
      "unpack": "'I Value Xylophones Like Cows Do Milk'. Smaller BEFORE bigger = subtract (IV=4, IX=9). Smaller after = add (VI=6). Never four in a row."},
    "studentQuestions": [
      {"q": "Why is 4 written IV, not IIII?", "a": "A smaller numeral BEFORE a bigger one means subtract: IV = 5-1 = 4. It avoids four in a row."},
      {"q": "How do I read a mix like XIV?", "a": "Left to right, adding, but subtract when a smaller symbol sits before a bigger one. X + IV = 10 + 4 = 14."}
    ]
  },
  "num-23-algebra-intro": {
    "rememberIt": {"hook": "A letter is just a box for an unknown number",
      "unpack": "x means 'the number we do not know yet'. 3x means 3 times x. Whatever you do to one side of '=', do to the other."},
    "studentQuestions": [
      {"q": "Why use letters instead of numbers?", "a": "A letter holds a number we do not know yet, so we can write a rule for ANY value. x is a placeholder."},
      {"q": "What does 3x mean?", "a": "3 times x. A number stuck to a letter means multiply - there is a hidden times sign."}
    ]
  },
  "num-33-linear-equations": {
    "rememberIt": {"hook": "Get x alone: do the SAME to both sides, undoing with opposites",
      "unpack": "Opposite of + is -, of x is /. x + 5 = 12 -> subtract 5 -> x = 7. Keep the equation balanced like a see-saw."},
    "studentQuestions": [
      {"q": "How do I get x by itself?", "a": "Undo whatever is attached to x using the opposite operation, and do it to BOTH sides. +5 -> subtract 5 from both."},
      {"q": "Why do the same to both sides?", "a": "The '=' is a balance. Change one side only and it tips - do the same to both and it stays true."}
    ]
  },
  "num-41-pair-linear-equations": {
    "rememberIt": {"hook": "Two equations, two unknowns: substitute or eliminate",
      "unpack": "Substitution: solve one for a letter, plug into the other. Elimination: add/subtract to cancel a letter. On a graph, the answer is where the lines cross."},
    "studentQuestions": [
      {"q": "Why do I need two equations?", "a": "Two unknowns need two clues. One equation has endless solutions; a second pins down the single pair that fits both."},
      {"q": "Substitution or elimination - which?", "a": "Substitution if one letter is already alone; elimination if adding or subtracting cancels a letter neatly."}
    ]
  },
  "num-51-linear-inequalities": {
    "rememberIt": {"hook": "Solve like an equation - but FLIP the sign when you x or / by a negative",
      "unpack": "-2x < 6 -> divide by -2 AND flip -> x > -3. The answer is a RANGE, not one number."},
    "studentQuestions": [
      {"q": "When do I flip the inequality sign?", "a": "Only when you multiply or divide BOTH sides by a NEGATIVE number. Then < becomes > and vice versa."},
      {"q": "How is it different from an equation?", "a": "Same steps to isolate x, but the answer is a range (like x > 3), not a single value - and watch the negative-flip."}
    ]
  },
  "geo-11-circles": {
    "rememberIt": {"hook": "Radius = centre to edge. Diameter = 2 x radius (all the way across)",
      "unpack": "Circumference (distance around) = 2 pi r = pi d. Area = pi r^2. pi is about 3.14."},
    "studentQuestions": [
      {"q": "Radius or diameter?", "a": "Radius is centre to edge; diameter goes all the way across through the centre. Diameter = 2 x radius."},
      {"q": "Circumference vs area?", "a": "Circumference is the distance AROUND (2 pi r). Area is the space INSIDE (pi r^2)."}
    ],
    "formulas": [
      {"name": "Circumference", "formula": "C = 2 pi r = pi d"},
      {"name": "Area", "formula": "A = pi r^2", "remember": "'Pie are squared'"}
    ]
  },
  "geo-18-heron": {
    "rememberIt": {"hook": "Heron: area from 3 sides using s, the semi-perimeter",
      "unpack": "s = (a+b+c)/2. Area = sqrt(s(s-a)(s-b)(s-c)). No height needed!"},
    "studentQuestions": [
      {"q": "When do I use Heron's formula?", "a": "When you know all THREE sides but not the height. It skips needing the height entirely."},
      {"q": "What is s?", "a": "The semi-perimeter - half of (a+b+c). Work it out first, then plug it into the root."}
    ],
    "formulas": [
      {"name": "Semi-perimeter", "formula": "s = (a + b + c) / 2"},
      {"name": "Heron's area", "formula": "Area = sqrt(s(s-a)(s-b)(s-c))", "remember": "Find s first; no height required"}
    ]
  },
  "geo-14-coordinate-geometry": {
    "rememberIt": {"hook": "(x, y): along the corridor, THEN up the stairs",
      "unpack": "x first (left-right), y second (up-down). Origin (0,0) is the centre. 'x before y' in the alphabet too."},
    "studentQuestions": [
      {"q": "Which number comes first, x or y?", "a": "x (across) first, then y (up) - 'along the corridor, then up the stairs'. Same as alphabetical order."},
      {"q": "Where is (0,0)?", "a": "The origin - the centre point where the two axes cross."}
    ],
    "formulas": [
      {"name": "Distance", "formula": "d = sqrt((x2-x1)^2 + (y2-y1)^2)", "remember": "Pythagoras between two points"},
      {"name": "Midpoint", "formula": "((x1+x2)/2, (y1+y2)/2)", "remember": "Average the x's and the y's"}
    ]
  },
  "meas-06-unit-conversion": {
    "rememberIt": {"hook": "Metric climbs by 10s: 'King Henry Died By Drinking Chocolate Milk'",
      "unpack": "Kilo, Hecto, Deca, Base, Deci, Centi, Milli. Moving to smaller units multiply; to bigger units divide. 1 km = 1000 m, 1 m = 100 cm."},
    "studentQuestions": [
      {"q": "Do I multiply or divide when converting?", "a": "Going to a SMALLER unit (m -> cm) multiply; going to a BIGGER unit (cm -> m) divide. More small pieces, fewer big ones."},
      {"q": "How many cm in a metre?", "a": "100. And 1000 m in a km, 1000 g in a kg - metric loves powers of 10."}
    ]
  },
  "meas-08-speed-distance-time": {
    "rememberIt": {"hook": "The D-S-T triangle: cover the one you want",
      "unpack": "D on top, S and T below. Distance = S x T. Speed = D/T. Time = D/S. Units must match (km with hours)."},
    "studentQuestions": [
      {"q": "How do I remember the three formulas?", "a": "Draw a triangle: D on top, S and T below. Cover the one you want - D = S x T, S = D/T, T = D/S."},
      {"q": "Do the units have to match?", "a": "Yes - km with hours gives km/h; mixing km and minutes gives nonsense. Convert first."}
    ],
    "formulas": [
      {"name": "Distance", "formula": "D = S x T"},
      {"name": "Speed", "formula": "S = D / T", "remember": "Cover S in the triangle"},
      {"name": "Time", "formula": "T = D / S"}
    ]
  },
  "num-52-inverse-trigonometry": {
    "rememberIt": {"hook": "Inverse trig ASKS the angle: sin^-1(x) = 'which angle has this sine?'",
      "unpack": "sin^-1, cos^-1, tan^-1 undo sin, cos, tan. sin^-1 is NOT 1/sin. Each has a restricted range so the answer is unique."},
    "studentQuestions": [
      {"q": "Is sin^-1(x) the same as 1/sin(x)?", "a": "No! sin^-1 is the INVERSE (which angle gives this sine). 1/sin is cosec. A common trap."},
      {"q": "Why a restricted range?", "a": "Many angles share the same sine. Restricting the output (e.g. -90 to 90 degrees) makes the answer a single, definite angle."}
    ]
  },
  "num-53-continuity-differentiability": {
    "rememberIt": {"hook": "Continuous = draw without lifting the pen. Differentiable = smooth (no sharp corners)",
      "unpack": "Differentiable implies continuous, but NOT the reverse. A corner (like |x| at 0) is continuous but not differentiable."},
    "studentQuestions": [
      {"q": "What does 'continuous' mean simply?", "a": "You can draw the graph without lifting your pen - no breaks, holes, or jumps."},
      {"q": "Can something be continuous but not differentiable?", "a": "Yes - a sharp corner like |x| at 0. No break (continuous), but no single slope at the point (not differentiable)."}
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
