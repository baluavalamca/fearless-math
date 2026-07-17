"""Batch 3: rememberIt / studentQuestions / formulas for junior / foundation concepts."""
import json, os

CONCEPTS = os.path.join(os.path.dirname(__file__), "..", "content-packs",
                        "cbse-class3-5-en-v1", "concepts")

DATA = {
  "num-01-place-value": {
    "rememberIt": {"hook": "Each place is 10 times the one to its right",
      "unpack": "Ones, Tens, Hundreds, Thousands... every step left is x10. The 5 in 50 means five TENS; the 5 in 500 means five HUNDREDS."},
    "studentQuestions": [
      {"q": "Why does the same digit mean different amounts?", "a": "Its PLACE decides its value. The 3 in 30 is thirty; the 3 in 300 is three hundred. Position is everything."},
      {"q": "What does the 0 do in a number like 305?", "a": "It holds the tens place empty so the 3 stays in hundreds. Without it, 305 would shrink to 35."}
    ]
  },
  "num-03-rounding": {
    "rememberIt": {"hook": "5 or more, round up. 4 or less, stay",
      "unpack": "Look at the digit just AFTER the place you are rounding to. 5,6,7,8,9 -> round up; 0,1,2,3,4 -> stay the same."},
    "studentQuestions": [
      {"q": "Do I look at all the digits or just one?", "a": "Just the one digit right after your rounding place. To round 47 to the nearest ten, look at the 7 -> round up to 50."},
      {"q": "What about exactly 5?", "a": "5 rounds UP by the usual rule. 45 to the nearest ten becomes 50."}
    ]
  },
  "num-21-integers": {
    "rememberIt": {"hook": "Number line: left = smaller, right = bigger. Negatives sit below zero",
      "unpack": "-5 is LESS than -2 (further left). Adding moves right, subtracting moves left. Two minuses touching make a plus: -(-3) = +3."},
    "studentQuestions": [
      {"q": "Is -5 bigger or smaller than -2?", "a": "Smaller. On the number line -5 is further left. Think temperature: -5 degrees is colder than -2."},
      {"q": "Why does minus a minus become plus?", "a": "Taking away a loss makes you better off. Removing a -3 (a debt) adds +3."}
    ]
  },
  "num-28-integer-operations": {
    "rememberIt": {"hook": "Same signs -> add and keep the sign. Different signs -> subtract and keep the bigger one's sign",
      "unpack": "For multiplying: same signs -> +, different signs -> -. (+ x + = +, - x - = +, + x - = -)."},
    "studentQuestions": [
      {"q": "How do I add -7 and +3?", "a": "Different signs: subtract (7 - 3 = 4) and keep the bigger number's sign (7 is negative) -> -4."},
      {"q": "Why is negative times negative positive?", "a": "Flipping a flip returns to the start. Removing a debt again and again builds a gain."}
    ]
  },
  "num-22-ratio-proportion": {
    "rememberIt": {"hook": "Ratio compares parts (3:2). Proportion says two ratios are equal",
      "unpack": "Keep the ORDER (3:2 is not 2:3). To share in a ratio, add the parts (3+2=5) and split into that many equal shares."},
    "studentQuestions": [
      {"q": "How do I share 100 in the ratio 3:2?", "a": "Add the parts: 3+2 = 5 shares. Each share = 100/5 = 20. So 60 and 40."},
      {"q": "Does the order matter in a ratio?", "a": "Yes. 3:2 means 3 of the first for every 2 of the second - swapping it changes the meaning."}
    ]
  },
  "num-16-factors-multiples": {
    "rememberIt": {"hook": "Factors go INTO a number; multiples come OUT (its times table)",
      "unpack": "Factors of 12: 1,2,3,4,6,12 (they divide it exactly). Multiples of 12: 12,24,36... Factors are few and small; multiples never end."},
    "studentQuestions": [
      {"q": "Factor or multiple - how do I keep them straight?", "a": "Factors FIT into the number (they divide it exactly, so they are small). Multiples are the number's times-table (they get big and never stop)."},
      {"q": "Is 1 a factor of every number?", "a": "Yes - 1 divides everything. And every number is a factor of itself."}
    ]
  },
  "num-24-primes": {
    "rememberIt": {"hook": "Prime = exactly TWO factors: 1 and itself",
      "unpack": "2,3,5,7,11,13... 2 is the only even prime. 1 is NOT prime (it has only one factor). Numbers with more factors are 'composite'."},
    "studentQuestions": [
      {"q": "Is 1 a prime number?", "a": "No. A prime needs exactly two different factors; 1 has only one (itself). So 1 is neither prime nor composite."},
      {"q": "Why is 2 special?", "a": "It is the only EVEN prime - every other even number is divisible by 2, giving it an extra factor."}
    ]
  },
  "num-25-divisibility": {
    "rememberIt": {"hook": "Quick tests: 2 (even), 3 (digit sum /3), 5 (ends 0 or 5), 9 (digit sum /9), 10 (ends 0)",
      "unpack": "4: last two digits /4. 6: divisible by 2 AND 3. 8: last three digits /8."},
    "studentQuestions": [
      {"q": "Fastest check for divisible by 3?", "a": "Add the digits. If the total is divisible by 3, so is the number. 123 -> 1+2+3 = 6 -> yes."},
      {"q": "How do I check divisible by 6?", "a": "It must pass BOTH the 2-rule (even) and the 3-rule (digit sum divisible by 3)."}
    ]
  },
  "dec-01-decimal-tenths": {
    "rememberIt": {"hook": "The dot splits whole from part. First place after = tenths",
      "unpack": "Places after the point: tenths, hundredths, thousandths (each one-tenth of the one before). 0.7 = seven tenths = 7/10."},
    "studentQuestions": [
      {"q": "What does the first digit after the dot mean?", "a": "Tenths - one of ten equal pieces of a whole. 0.3 means 3 tenths, 3/10."},
      {"q": "Is 0.5 the same as 1/2?", "a": "Yes - five tenths (5/10) simplifies to one half."}
    ]
  },
  "dec-05-decimal-operations": {
    "rememberIt": {"hook": "Add/subtract: LINE UP the dots. Multiply: count the decimal places",
      "unpack": "When adding, keep decimal points under each other. When multiplying, the answer has as many decimal places as both numbers together (0.2 x 0.3 = 0.06, two places)."},
    "studentQuestions": [
      {"q": "Why line up the decimal points?", "a": "So tenths add to tenths and ones to ones. Misaligning mixes up place values and gives a wrong answer."},
      {"q": "0.2 x 0.3 = 0.06 - why so small?", "a": "You are taking a fraction of a fraction. Count decimal places: 1 + 1 = 2, so the answer has 2 decimal places."}
    ]
  },
  "frac-06-fraction-of-quantity": {
    "rememberIt": {"hook": "'of' means multiply. Fraction of an amount: divide by the bottom, times the top",
      "unpack": "3/4 of 20: divide by 4 (=5), times 3 (=15). Bottom = how many pieces, top = how many you take."},
    "studentQuestions": [
      {"q": "How do I find 3/4 of 20?", "a": "Divide by the bottom (20/4 = 5), then multiply by the top (5 x 3 = 15)."},
      {"q": "What do the top and bottom mean?", "a": "Bottom (denominator) = how many equal pieces the whole is cut into. Top (numerator) = how many of those pieces you take."}
    ]
  },
  "frac-09-multiply-divide": {
    "rememberIt": {"hook": "Multiply: straight across. Divide: flip the second and multiply (KFC)",
      "unpack": "a/b x c/d = ac/bd. a/b / c/d = a/b x d/c. KFC = Keep, Flip, Change."},
    "studentQuestions": [
      {"q": "Why flip when dividing fractions?", "a": "Dividing by 1/2 asks 'how many halves fit?' - the same as multiplying by 2. Flipping turns divide into multiply."},
      {"q": "Do I need a common denominator to multiply?", "a": "No - only for adding and subtracting. To multiply, go straight across: top x top and bottom x bottom."}
    ]
  },
  "geo-02-perimeter": {
    "rememberIt": {"hook": "Perimeter = the fence AROUND (add all the sides)",
      "unpack": "'Peri' = around, 'meter' = measure. Rectangle = 2(l + b). Square = 4 x side. It is a LENGTH (cm, m), not an area."},
    "studentQuestions": [
      {"q": "Perimeter or area - what is the difference?", "a": "Perimeter is the distance AROUND the edge (the fence). Area is the space INSIDE (the grass). Perimeter uses cm/m; area uses square units."},
      {"q": "Quick rectangle perimeter?", "a": "Add length and breadth, then double: 2(l + b). You have two of each side."}
    ],
    "formulas": [
      {"name": "Rectangle perimeter", "formula": "P = 2(l + b)"},
      {"name": "Square perimeter", "formula": "P = 4 x side"}
    ]
  },
  "geo-05-angles": {
    "rememberIt": {"hook": "Acute < 90 ('a cute' small angle), Right = 90, Obtuse > 90, Straight = 180",
      "unpack": "Angles on a straight line add to 180. Around a point they add to 360. A right angle is the corner of a square."},
    "studentQuestions": [
      {"q": "How do I remember acute vs obtuse?", "a": "Acute is 'a cute' little angle (small, under 90). Obtuse is the big blunt one (over 90)."},
      {"q": "What do angles on a straight line add up to?", "a": "180 degrees - a half turn. So if one is 120, the other is 60."}
    ]
  },
  "ops-14-long-division": {
    "rememberIt": {"hook": "DMSB: Divide, Multiply, Subtract, Bring down (repeat)",
      "unpack": "'Does McDonald's Sell Burgers?' Divide, Multiply, Subtract, Bring down the next digit, then repeat until no digits are left."},
    "studentQuestions": [
      {"q": "I keep forgetting the steps - is there an order?", "a": "DMSB: Divide, Multiply, Subtract, Bring down. Repeat. 'Does McDonald's Sell Burgers?'"},
      {"q": "What if a digit is too small to divide?", "a": "Put a 0 in the answer for that place and bring down the next digit to make a bigger number."}
    ]
  },
  "num-29-rational-numbers": {
    "rememberIt": {"hook": "Rational = can be written as a fraction p/q (q not 0)",
      "unpack": "Includes whole numbers, decimals that end or repeat, and fractions. To compare, use a common denominator or convert to decimals."},
    "studentQuestions": [
      {"q": "Are negative fractions rational?", "a": "Yes - -3/4 is still p/q. Any fraction of integers with a non-zero bottom is rational."},
      {"q": "How do I compare 2/3 and 3/5?", "a": "Make the bottoms the same (15): 2/3 = 10/15, 3/5 = 9/15. So 2/3 is bigger."}
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
