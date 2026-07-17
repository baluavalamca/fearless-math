"""Batch 4: rememberIt / studentQuestions for PP1-Class 2 early-years concepts."""
import json, os

PACK = os.path.join(os.path.dirname(__file__), "..", "content-packs",
                    "cbse-pp1-2-en-v1", "concepts")

DATA = {
  "found-03-number-bonds": {
    "rememberIt": {"hook": "Number bonds = the pairs that make a number",
      "unpack": "Bonds to 10: 1+9, 2+8, 3+7, 4+6, 5+5. Know these by heart and adding gets easy. If 7+3=10, then 70+30=100 too!"},
    "studentQuestions": [
      {"q": "Why learn the pairs that make 10?", "a": "Ten is our friend! When you know 6+4=10, you can add faster and 'make a ten' to jump into bigger numbers."},
      {"q": "Is 3+7 the same as 7+3?", "a": "Yes! You can add in any order - both make 10. A lovely little shortcut."}
    ]
  },
  "found-05-skip-counting": {
    "rememberIt": {"hook": "Skip counting = counting in jumps: 2,4,6... or 5,10,15...",
      "unpack": "Count in 2s for pairs, 5s for hands and the clock, 10s for tens. Skip counting is the start of your times tables!"},
    "studentQuestions": [
      {"q": "Why skip numbers when counting?", "a": "It is faster for groups! Counting socks in 2s or fingers in 5s beats one-by-one, and it builds your times tables."},
      {"q": "Which is easiest to skip-count in?", "a": "10s (10,20,30) and 5s (5,10,15). Your fingers and toes help!"}
    ]
  },
  "found-06-add-sub-within-20": {
    "rememberIt": {"hook": "Make a ten to add across 10",
      "unpack": "8 + 5: take 2 from the 5 to make 8 into 10, then 10 + 3 = 13. Subtraction is just adding backwards."},
    "studentQuestions": [
      {"q": "How do I add 8 + 5 in my head?", "a": "Make a ten: give 2 to the 8 (now 10), 3 is left over, 10 + 3 = 13."},
      {"q": "Is subtraction just adding backwards?", "a": "Yes! 13 - 5 asks 'what adds to 5 to make 13?' - so 8. Add and subtract are a team."}
    ]
  },
  "found-07-add-sub-within-100": {
    "rememberIt": {"hook": "Add tens to tens, ones to ones",
      "unpack": "34 + 23: 30+20 = 50, 4+3 = 7, together 57. Line up tens under tens, ones under ones."},
    "studentQuestions": [
      {"q": "How do I add 34 + 23?", "a": "Add the tens (30+20=50), add the ones (4+3=7), put together: 57."},
      {"q": "What is 'carrying'?", "a": "When the ones add to 10 or more, one ten moves to the tens column. 8+5=13: write 3, carry the 1 ten."}
    ]
  },
  "found-08-money": {
    "rememberIt": {"hook": "100 paise = 1 rupee. Count big coins first",
      "unpack": "Count notes and big coins first, then the small ones. To give change, count UP from the price to the amount paid."},
    "studentQuestions": [
      {"q": "How do I work out change?", "a": "Count UP from the price to what you paid. Bought for 30, gave 50: 30 -> 40 -> 50 is 20 change."},
      {"q": "Which coins do I count first?", "a": "Biggest first (notes, then big coins), then the small ones - faster, and you will not lose track."}
    ]
  },
  "found-09-calendar": {
    "rememberIt": {"hook": "7 days a week, 12 months a year - knuckle trick for long months",
      "unpack": "Make a fist: knuckles = 31-day months, the dips between = 30 (or 28/29 for Feb). '30 days has September, April, June, and November.'"},
    "studentQuestions": [
      {"q": "How do I remember which months have 31 days?", "a": "Make a fist - knuckles are 31-day months, the dips between are shorter. Or the rhyme '30 days has September...'"},
      {"q": "Why is February short?", "a": "It is the leftover month - 28 days, or 29 in a leap year (every 4 years)."}
    ]
  },
  "found-10-shapes": {
    "rememberIt": {"hook": "Count the sides to name the shape",
      "unpack": "3 sides = triangle, 4 = square/rectangle, 5 = pentagon, 6 = hexagon. A circle has no straight sides - it is a curve."},
    "studentQuestions": [
      {"q": "How do I tell a square from a rectangle?", "a": "Both have 4 sides and 4 square corners. A square's sides are ALL equal; a rectangle has two long and two short."},
      {"q": "How many sides does a circle have?", "a": "None straight - it is one smooth curved line all the way round."}
    ]
  },
  "found-11-measure": {
    "rememberIt": {"hook": "Start at 0 on the ruler. Longer = more units",
      "unpack": "Line the object up with 0, read where it ends. Small things in centimetres, big things in metres. 100 cm = 1 m."},
    "studentQuestions": [
      {"q": "Where do I start measuring on a ruler?", "a": "At the 0 mark, not the edge. Line 0 up with one end, read the number at the other end."},
      {"q": "cm or m - which do I use?", "a": "Small things in centimetres (a pencil), big things in metres (a room). 100 cm = 1 m."}
    ]
  },
  "found-12-patterns": {
    "rememberIt": {"hook": "A pattern REPEATS - find the part that repeats",
      "unpack": "AB AB AB (red-blue), or ABB ABB. Say it out loud to hear the repeat, then predict what comes next."},
    "studentQuestions": [
      {"q": "How do I find what comes next?", "a": "Spot the part that repeats (the 'core'), then keep repeating it. Red-blue-red-blue -> next is red."},
      {"q": "Can numbers make patterns too?", "a": "Yes! 2,4,6,8 (adding 2) or 1,2,4,8 (doubling). Patterns are everywhere."}
    ]
  },
  "found-14-groups": {
    "rememberIt": {"hook": "Equal groups -> multiplication. '3 groups of 4' = 3 x 4",
      "unpack": "Multiplication is fast adding of EQUAL groups. 4 + 4 + 4 = 3 x 4 = 12. The 'x' means 'groups of'."},
    "studentQuestions": [
      {"q": "What does 3 x 4 really mean?", "a": "3 groups of 4 (or 4 added 3 times): 4+4+4 = 12. Multiplication is quick repeated adding."},
      {"q": "Does 3 x 4 equal 4 x 3?", "a": "Yes! 3 groups of 4 and 4 groups of 3 both make 12. You can swap them."}
    ]
  },
  "found-04-ordinals": {
    "rememberIt": {"hook": "Ordinals tell POSITION: 1st, 2nd, 3rd...",
      "unpack": "Counting numbers say HOW MANY (three apples); ordinals say WHICH ONE in order (third in line)."},
    "studentQuestions": [
      {"q": "What is the difference between 'three' and 'third'?", "a": "'Three' counts how many; 'third' tells the position. Three runners raced, and you came third."},
      {"q": "Why is it 1st, 2nd, 3rd but then 4th?", "a": "The first three have special endings (st, nd, rd); from fourth on we mostly add 'th'."}
    ]
  },
  "found-02-numbers-11-20": {
    "rememberIt": {"hook": "Teen numbers = a ten and some ones",
      "unpack": "13 = 1 ten + 3 ones. 'Thir-teen' means three and ten. 'Eleven' and 'twelve' are the tricky two to just learn."},
    "studentQuestions": [
      {"q": "Why is 13 called thirteen?", "a": "It is 'three + ten' - a bundle of ten and three more ones. Most teens work this way (four-teen, six-teen)."},
      {"q": "What makes 11 and 12 tricky?", "a": "They do not say their parts clearly like the others - you just learn 'eleven' and 'twelve' by heart."}
    ]
  },
  "found-16-numbers-to-999": {
    "rememberIt": {"hook": "Three digits: hundreds, tens, ones",
      "unpack": "352 = 3 hundreds + 5 tens + 2 ones. Read left to right: 'three hundred fifty-two'."},
    "studentQuestions": [
      {"q": "How do I read a number like 352?", "a": "Break it into hundreds, tens, ones: 3 hundreds, 5 tens, 2 ones -> 'three hundred fifty-two'."},
      {"q": "What is the biggest 3-digit number?", "a": "999 - nine hundreds, nine tens, nine ones. Add one more and you get 1000."}
    ]
  },
  "found-17-telling-time": {
    "rememberIt": {"hook": "Short hand = hours, long hand = minutes",
      "unpack": "Long hand on 12 = o'clock, on 6 = half past. Count minutes in 5s round the clock (each number is 5 minutes)."},
    "studentQuestions": [
      {"q": "Which hand tells the hour?", "a": "The SHORT, fat hand points to the hour. The LONG hand shows the minutes."},
      {"q": "How do I read the minutes?", "a": "Count in 5s from the 12: the 1 is 5 minutes, the 2 is 10, the 3 is 15 (quarter past)..."}
    ]
  },
  "pp1-02-more-fewer": {
    "rememberIt": {"hook": "More = bigger pile, fewer = smaller pile. Match one-to-one",
      "unpack": "Pair them up like socks: whoever has leftovers has MORE; whoever runs out first has FEWER."},
    "studentQuestions": [
      {"q": "How do I know which group has more without counting?", "a": "Match them one-to-one, like pairing socks. The group with leftovers has MORE."},
      {"q": "What does 'fewer' mean?", "a": "Less - the smaller group. If you have 3 sweets and I have 5, you have fewer."}
    ]
  },
  "num-00-counting-to-100": {
    "rememberIt": {"hook": "Count in tens to reach 100: 10,20,...,100",
      "unpack": "On a 100 square: go RIGHT to add 1, go DOWN to add 10. Every new row is a new ten."},
    "studentQuestions": [
      {"q": "What is the easiest way to count to 100?", "a": "In tens: 10,20,30... ten tens make 100. On a hundred square, each row down adds ten."},
      {"q": "What comes after 29?", "a": "30 - when the ones reach 9, the next number rolls into a new ten (29 -> 30, 39 -> 40)."}
    ]
  }
}

changed = 0
for cid, fields in DATA.items():
    path = os.path.join(PACK, cid + ".json")
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
