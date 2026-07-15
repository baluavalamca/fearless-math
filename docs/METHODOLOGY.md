# FearlessMath — Teaching Methodology (the Concept Standard)

This is the single standard **every concept must follow**, in every class (PP1 → Class 5)
and every strand (Foundation, Numbers, Operations, Fractions, Decimals, Geometry,
Measurement, Data). New concepts are only "done" when they meet all of it. It exists so
the app teaches the way a great, patient teacher does — **see it, understand it, learn the
easy way, then practise** — never "here is a rule, now do 20 sums."

---

## 1. Guiding principles

1. **Fear-free.** One question at a time. Three hints before the answer is ever shown.
   Warm feedback. Never a red ✗. A mistake is a teaching moment, explained from authored
   content, not punished.
2. **See it before you read it (CRA).** Every idea is taught **Concrete → Representational
   → Abstract**. Comparison and quantity words (big, small, tall, tens, half, 0.3, angle)
   must be **shown as pictures with several examples** before any symbol or sentence.
   (Research: CRA sequence effect size ≈ 0.99; dual-coding; virtual manipulatives.)
3. **Teach the easy way school skips.** For every concept, surface the **simplest trick to
   remember and solve** — and let the child **drill the trick itself**, not only the long
   standard method. This is the app's core value: classes cannot cover every method; we do.
4. **Teach first, then practise.** Practice is **locked** until the child has been through
   the lesson. The concept stays one tap away during practice.
5. **Grounded truth.** Answers are judged locally by the math layer, never by AI. AI only
   ever *guides* (Socratic hints), never reveals or contradicts the verified answer.
6. **Local & Indian.** Stories use Indian, nativity, and folk context — names, festivals,
   bazaars, food, villages — so the maths feels like home.

---

## 2. The Concept Contract (required fields)

Every concept JSON MUST contain:

| Field | Rule |
|---|---|
| `id`, `name`, `grade`, `strand`, `prerequisites` | identity + the learning graph |
| `whatIsIt`, `whyNeeded`, `realLifeUses[]` | plain-English meaning + motivation |
| `vocabulary[]` | the words to know, each with a kid-friendly meaning |
| `story` | an **Indian/local** story → `extractedProblem` → `answerInStory` |
| `visual` | ONE hero picture of the idea (never formula-first) |
| **`teachingGallery[]`** | **NEW — the "👀 See it" section. ≥1 group; each group ≥5 picture examples** |
| `standardMethod` | the reliable full method, `summary` + `steps[]` (≥2) |
| `mentalMathMethod` / `abacusMethod` / `vedicMethod` / `alternateMethods[]` | ≥1 **easy method** |
| **`trickPractice`** | **NEW — the signature shortcut + its own guided drill (≥3 Qs)** |
| `workedExamples[]` | ≥2, each with `steps[]` and (where objects exist) a `visual` |
| `commonMistakes[]` | ≥2, each `mistake` + `fix` (the mistake clinic) |
| `practice` | easy / medium / challenge — backed by a generator giving **≥25 unique, self-verifying Qs per level** |
| `masteryCheck` | questions + `passThreshold` + `requireTeachBack` |
| `teachBackPrompt`, `revisionCard` | teach-back = mastery; spaced revision |

### 2.1 How the Contract maps to NEP 2020 / NCERT (the 5E model)

CBSE/NCERT schools are being moved (under NEP 2020 and NCF) from rote learning to a
**constructivist, competency-based, experiential** style, delivered through the **5E lesson
model: Engage → Explore → Explain → Elaborate → Evaluate.** The Concept Contract is
deliberately built to follow that same flow, so every FearlessMath lesson is NEP-aligned by
construction — not by accident.

| 5E stage | What NEP/NCERT expects | Concept Contract field(s) that deliver it |
|---|---|---|
| **Engage** | hook curiosity with a real, relatable context | `story` (an Indian/local story) → `extractedProblem` |
| **Explore** | concrete-before-abstract, "learning by doing" (CRA) | `visual` hero + `teachingGallery[]` (👀 See it) + tap-to-count objects |
| **Explain** | teacher makes the idea + vocabulary explicit | `whatIsIt`, `whyNeeded`, `vocabulary[]`, `standardMethod`, `workedExamples[]` |
| **Elaborate** | apply, extend, connect to life; easy/efficient methods | `realLifeUses[]`, `mentalMathMethod`/`abacusMethod`/`vedicMethod`, `trickPractice`, graded `practice` |
| **Evaluate** | competency check + reflection + retention | `masteryCheck` (+ `passThreshold`), `teachBackPrompt` (peer-teaching), `commonMistakes[]`, `revisionCard` (spaced revision) |

Notes on alignment:
- **Constructivist / experiential:** the child meets the idea as a *problem in a story* and a
  *picture they can touch* before any formula — matching NCF's "learning through doing."
- **Competency-based:** `masteryCheck` gates on a competency threshold and a **teach-back**, not
  on marks — the child must be able to *explain* the idea, which is also low-cost **peer teaching**
  (the technique NEP recommends for India's large classrooms).
- **Fear-free:** hint ladders (≥3 hints before any answer), a mistake *clinic* instead of a red ✗,
  and warm spoken praise support the "joyful, engaging" classroom NEP asks for.
- **What we keep from traditional Indian classrooms on purpose:** plenty of **repeated practice**
  (≥25 self-verifying questions per level) and **revision**, because those genuinely work — the app
  bridges the NEP-preferred style and the exam reality most students still face.

---

## 3. The "See it" gallery (`teachingGallery`)

The textbook-style visual section shown right after Story/Picture, **before** Meaning.

```jsonc
"teachingGallery": [
  { "title": "Big and Small",
    "note": "The BIG one takes more space.",
    "examples": [
      { "component": "ObjectRow",
        "props": { "sequences": [ { "items": ["elephant","mouse"], "sizes": [70,26], "markIndex": 0 } ] },
        "caption": "The elephant is BIG. The mouse is small." }
      /* …≥5 examples per idea… */
    ] }
]
```

Rules:
- **≥5 examples per idea** so it feels like a picture textbook, not one token image.
- Use the **right visual for the content** (see §5) — never force one visual everywhere.
- Every example has a `caption` (also read aloud by the Speak button).
- For comparison words, **show the contrast** (size difference, longer row, highlighted answer).

---

## 4. The trick drill (`trickPractice`)

The shortcut, drilled. Every hint walks the trick's **exact steps** on those numbers.

```jsonc
"trickPractice": {
  "trick": "The 9s finger trick",
  "intro": "Your two hands are a 9× calculator.",
  "questions": [
    { "id": "ops10-trick-9x7", "type": "number", "q": "9 × 7 = ?", "answer": "63",
      "hintLadder": [
        "Fold down finger number 7.",
        "Left of the fold = tens (6), right = ones (3).",
        "So 9 × 7 = 63." ],
      "explain": "Fold finger 7 → 6 left, 3 right → 63." }
    /* …≥3 drill questions… */
  ]
}
```

Rules:
- Every `answer` is **computed and verified** — drills are generated programmatically so a
  wrong key can never ship.
- `hintLadder` **is** the trick, step by step — the child rehearses the shortcut.
- Reachable from the **🔀 Another Way** tab via **⚡ Practice this trick**. It does **not**
  gate mastery; it's optional extra fluency.
- Add a trick only where a **genuine** shortcut exists. Concepts without one (e.g.
  "collecting data") keep a gallery but no forced trick.

### Signature tricks by area (the menu to draw from)
- **Tables:** 9s finger trick · ×5 = halve then ×10 · ×4 = double-double · ×11 pattern · square-neighbour
- **Addition:** make-a-ten · count-on-from-bigger · near-doubles · add tens then ones
- **Subtraction:** count-up (shopkeeper) · compensation (round then adjust)
- **Numbers:** compare the leftmost digit · even = last digit · divisibility (2,3,5,9,10) · find-the-rule
- **Fractions:** ×same top&bottom = equivalent · same denominator → compare tops · of a group = ÷ then ×
- **Decimals:** line up the dot · ×/÷ 10 shifts the dot
- **Measurement:** convert by ×/÷ 10, 100, 1000
- **Geometry:** perimeter = add all sides · area = rows × cols
- **Data:** tally in fives · read the tallest bar

---

## 5. Visual component cheat-sheet (props)

| Component | Props | Use for |
|---|---|---|
| `ObjectRow` | `{sequences:[{items[],sizes?[],markIndex?,showOrdinal?,showCount?,label?}]}` | objects, compare, count, order |
| `NumberTrack` | `{tracks:[{terms[],jump?,label?}]}` | sequences, skip-count, patterns, count on/back |
| `NumberLine` | `{lines:[{parts,mark,label,showLabels}]}` | position, fractions on a line |
| `PlaceValueBlocks` | `{sets:[{hundreds,tens,ones,label}]}` | place value, tens & ones |
| `ArrayGrid` | `{grids:[{rows,cols,asGroups}]}` | groups, arrays, even/odd, division |
| `AreaModel` | `{models:[{rowParts[],colParts[],label}]}` | break-apart & 2×2 multiplication |
| `FractionStrip` | `{strips:[{parts,shaded,label}]}` | fractions, equivalence, tenths/hundredths |
| `PizzaSlices` | `{pies:[{parts,shaded,label}]}` | fractions of a circle |
| `BarModel` | `{bars:[{label,parts:[{value,label}],showTotal}]}` | part-whole, word problems |
| `GeometryCanvas` | `{shapes:[{kind,w?,h?,label}]}` | 2D shapes, perimeter, area, angles |
| `ClockFace` | `{clocks:[{hour,minute,label}]}` | time |
| `BarChart` | `{categories:[{label,value,icon?}]}` | data handling |
| `Abacus` | soroban beads | column arithmetic |

**Object icon library** (`ObjectIcon.tsx`) resolves names + synonyms to crisp SVGs
(animals, people, vehicles, food, money, home objects). Prefer a real icon over an emoji;
prefer no image over a wrong/irrelevant one.

---

## 6. Definition of Done (checklist for any concept — existing or new)

- [ ] Indian/local story with a clear extracted problem + answer
- [ ] Hero `visual` that shows the idea (not a formula)
- [ ] **`teachingGallery` — every idea shown with ≥5 picture examples**
- [ ] `standardMethod` with clear steps
- [ ] **≥1 easy method** in "Another Way" **+ a `trickPractice` drill** where a shortcut exists
- [ ] Worked examples carry visuals where objects/quantities appear
- [ ] ≥2 common mistakes with fixes
- [ ] Practice generator: **≥25 unique, self-verifying questions per level**, each with ≥3 hints and a relevant per-question visual
- [ ] Mastery check + teach-back + revision card
- [ ] `npm run validate-content` PASS · `npx tsc --noEmit` clean · `npm test` green

> Ship nothing that fails the checklist. Every new class or concept is authored **against
> this file** so the whole app stays consistent, visual, fear-free, and full of the easy
> methods school leaves out.
