"""Batch 1: add rememberIt / studentQuestions / formulas to flagship concepts."""
import json, os

CONCEPTS = os.path.join(os.path.dirname(__file__), "..", "content-packs",
                        "cbse-class3-5-en-v1", "concepts")

DATA = {
  "ops-18-order-of-operations": {
    "rememberIt": {"hook": "BODMAS",
      "unpack": "Brackets -> Orders (powers & roots) -> Division and Multiplication (left to right) -> Addition and Subtraction (left to right)."},
    "studentQuestions": [
      {"q": "Why can't I just work left to right?",
       "a": "Because x and / are 'stronger' than + and -. 2 + 3 x 4 = 14, not 20 - the 3 x 4 happens first. BODMAS makes sure everyone gets the SAME answer."},
      {"q": "Are x and / done in a fixed order?",
       "a": "No - do whichever comes FIRST from left to right. Same for + and -. BODMAS pairs them, it does not rank x above /."}
    ]
  },
  "ops-10-tables-patterns": {
    "rememberIt": {"hook": "Tables have patterns - spot the trick, don't cram",
      "unpack": "9x: tens digit goes up, ones go down (09,18,27...) and the two digits add to 9. 5x: ends in 0 or 5. 4x: double, then double again. 8x: double three times. 11x (up to 9): repeat the digit (11 x 3 = 33)."},
    "studentQuestions": [
      {"q": "Do I really have to memorise every table?",
       "a": "No. Learn 2, 5, 10 first (easy patterns), then 3 and 4. Build the hard ones: 7 x 8 = (7 x 4) doubled = 28 doubled = 56."},
      {"q": "What is the fastest 9x trick?",
       "a": "Hold up 10 fingers. For 9 x 3, fold down finger number 3. Fingers to the LEFT of the fold = tens (2), fingers to the RIGHT = ones (7). Answer 27."}
    ]
  },
  "geo-13-pythagoras": {
    "rememberIt": {"hook": "a^2 + b^2 = c^2  (c is the longest side)",
      "unpack": "Only for RIGHT-angled triangles. c is the hypotenuse - always opposite the right angle and the longest side. Famous whole-number triple: 3, 4, 5."},
    "studentQuestions": [
      {"q": "Why does it only work for right triangles?",
       "a": "The square on the slanted side equals the two smaller squares added together ONLY when the corner is exactly 90 degrees. Tilt that corner and the balance breaks."},
      {"q": "Which side is c?",
       "a": "Always the hypotenuse - the longest side, sitting opposite the right angle. Never one of the two sides that form the corner."}
    ],
    "formulas": [
      {"name": "Pythagoras", "formula": "a^2 + b^2 = c^2",
       "remember": "c = hypotenuse (longest, opposite the right angle)",
       "whenToUse": "Find a missing side of a right-angled triangle."},
      {"name": "Find a shorter side", "formula": "a = sqrt(c^2 - b^2)",
       "remember": "Subtract when the side you want is NOT the hypotenuse",
       "whenToUse": "When the hypotenuse and one leg are known."}
    ]
  },
  "geo-17-trigonometry": {
    "rememberIt": {"hook": "SOH-CAH-TOA",
      "unpack": "Sin = Opposite / Hypotenuse, Cos = Adjacent / Hypotenuse, Tan = Opposite / Adjacent. Say it: 'Some Old Horse Came A-Hopping Through Our Alley.'"},
    "studentQuestions": [
      {"q": "How do I know which side is 'opposite' or 'adjacent'?",
       "a": "Stand at the angle. Opposite is the side across from you; adjacent is the side touching you (but not the hypotenuse). The hypotenuse is always the longest, opposite the right angle."},
      {"q": "Which ratio should I use?",
       "a": "Look at the two sides you have or want. Opp and hyp -> sin. Adj and hyp -> cos. Opp and adj -> tan."}
    ],
    "formulas": [
      {"name": "Sine", "formula": "sin A = Opposite / Hypotenuse", "remember": "SOH"},
      {"name": "Cosine", "formula": "cos A = Adjacent / Hypotenuse", "remember": "CAH"},
      {"name": "Tangent", "formula": "tan A = Opposite / Adjacent", "remember": "TOA (also tan = sin/cos)"}
    ]
  },
  "geo-15-area-formulas": {
    "rememberIt": {"hook": "Area = space INSIDE a flat shape (square units)",
      "unpack": "Rectangle = l x b. Square = side^2. Triangle = 1/2 x base x height. Circle = pi x r^2. Parallelogram = base x height."},
    "studentQuestions": [
      {"q": "Why is a triangle 1/2 base x height?",
       "a": "A triangle is exactly half of the rectangle drawn around it - so find the rectangle's area and halve it."},
      {"q": "Why is there a pi in the circle formula?",
       "a": "Pi (about 3.14) is how many times the diameter fits around the circle. It ties a round shape to a number so we can measure it."}
    ],
    "formulas": [
      {"name": "Rectangle", "formula": "A = l x b"},
      {"name": "Triangle", "formula": "A = 1/2 x b x h", "remember": "Half of the rectangle around it"},
      {"name": "Circle", "formula": "A = pi x r^2", "remember": "'Pie are squared' - pi times radius squared"}
    ]
  },
  "geo-16-surface-volume": {
    "rememberIt": {"hook": "Volume = space it fills (cube units). Surface area = its skin (square units)",
      "unpack": "Cube: V = a^3, SA = 6a^2. Cuboid: V = l.b.h. Cylinder: V = pi.r^2.h. Sphere: V = 4/3 pi.r^3, SA = 4 pi.r^2. Cone: V = 1/3 pi.r^2.h."},
    "studentQuestions": [
      {"q": "What is the difference between surface area and volume?",
       "a": "Surface area is the wrapping paper (the outside, in square units). Volume is how much water would fill it (the inside, in cube units)."},
      {"q": "Why is a cone one-third of a cylinder?",
       "a": "Three identical cones with the same base and height pour in to fill one cylinder exactly - so one cone is one-third."}
    ],
    "formulas": [
      {"name": "Cuboid volume", "formula": "V = l x b x h"},
      {"name": "Cylinder volume", "formula": "V = pi x r^2 x h", "remember": "Circle area (pi r^2) times height"},
      {"name": "Sphere volume", "formula": "V = 4/3 x pi x r^3"},
      {"name": "Cone volume", "formula": "V = 1/3 x pi x r^2 x h", "remember": "One-third of a cylinder of the same base and height"}
    ]
  },
  "dec-06-percentages": {
    "rememberIt": {"hook": "'Per cent' = per hundred (out of 100)",
      "unpack": "x% = x/100. The word 'of' means multiply. 20% of 150 = 20/100 x 150 = 30. To find what percent a is of b: (a/b) x 100."},
    "studentQuestions": [
      {"q": "Is 50% always half?",
       "a": "Yes - 50% = 50/100 = 1/2. Also 25% = 1/4 and 10% = 1/10. Learn these few and many percentages become mental maths."},
      {"q": "How do I find a percentage fast?",
       "a": "10% is just move the decimal one place left (10% of 250 = 25). Then build: 20% = double it, 5% = half of 10%, 15% = 10% + 5%."}
    ],
    "formulas": [
      {"name": "Percent of a number", "formula": "x% of N = (x/100) x N"},
      {"name": "a as a % of b", "formula": "(a / b) x 100", "remember": "Part over whole, times 100"}
    ]
  },
  "num-26-hcf-lcm": {
    "rememberIt": {"hook": "HCF = biggest shared factor. LCM = smallest shared multiple",
      "unpack": "Factors are small, so HCF is at most your numbers. Multiples are big, so LCM is at least your numbers. Handy link: HCF x LCM = the two numbers multiplied."},
    "studentQuestions": [
      {"q": "How do I stop mixing up HCF and LCM?",
       "a": "HCF = Highest Common FACTOR - factors are small, so HCF is at most your numbers. LCM = Lowest Common MULTIPLE - multiples are big, so LCM is at least your numbers."},
      {"q": "When do I use each one?",
       "a": "HCF: splitting things into the biggest equal groups. LCM: when events repeat together - bells ringing, or buses arriving at the same time."}
    ],
    "formulas": [
      {"name": "HCF-LCM link", "formula": "HCF x LCM = a x b",
       "remember": "Their product equals the product of the two numbers",
       "whenToUse": "Find one when you know the other and both numbers."}
    ]
  },
  "num-35-quadratics": {
    "rememberIt": {"hook": "x = (-b +/- sqrt(b^2 - 4ac)) / 2a",
      "unpack": "For a x^2 + b x + c = 0. The b^2 - 4ac part (the discriminant) tells you the number of real answers. Tip: sing it to 'Pop Goes the Weasel'."},
    "studentQuestions": [
      {"q": "When do I use the formula instead of factorising?",
       "a": "Try factorising first - it is fast when it works. If the equation will not factor into neat whole numbers, the formula ALWAYS works."},
      {"q": "What does b^2 - 4ac tell me?",
       "a": "The discriminant: positive -> two real answers, zero -> one repeated answer, negative -> no real answers."}
    ],
    "formulas": [
      {"name": "Quadratic formula", "formula": "x = (-b +/- sqrt(b^2 - 4ac)) / 2a",
       "remember": "Sing it to 'Pop Goes the Weasel'",
       "whenToUse": "Solve a x^2 + b x + c = 0 that will not factor nicely."},
      {"name": "Discriminant", "formula": "D = b^2 - 4ac",
       "remember": "The sign of D = how many real roots"}
    ]
  },
  "num-32-expressions": {
    "rememberIt": {"hook": "(a + b)^2 = a^2 + 2ab + b^2  - don't drop the middle 2ab!",
      "unpack": "Square of a sum = first^2 + twice the product + last^2. (a - b)^2 just flips the middle sign. (a + b)(a - b) = a^2 - b^2, the difference of squares."},
    "studentQuestions": [
      {"q": "Why isn't (a + b)^2 just a^2 + b^2?",
       "a": "Squaring means (a + b)(a + b). Multiplying it out gives an extra 2ab in the middle. Forgetting that 2ab is the number-one algebra slip."},
      {"q": "Which identity is quickest to spot?",
       "a": "a^2 - b^2 = (a + b)(a - b). Anything that looks like 'something squared minus something squared' factors instantly."}
    ],
    "formulas": [
      {"name": "Square of a sum", "formula": "(a + b)^2 = a^2 + 2ab + b^2",
       "remember": "The middle 2ab is the one people forget"},
      {"name": "Square of a difference", "formula": "(a - b)^2 = a^2 - 2ab + b^2"},
      {"name": "Difference of squares", "formula": "a^2 - b^2 = (a + b)(a - b)"}
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
    print("OK:", cid, "->", ", ".join(fields.keys()))

print("DONE changed=%d" % changed)
