# Annotated UI — Design Education Workflow

Take a UI screenshot or interface reference and generate an annotated version that highlights design decisions for educational purposes. Used for TGDS teaching materials, design critiques, and course content.

---

## Step 1: Receive the Reference

JM will provide one of:
- A screenshot path (local file)
- A URL to a live interface
- A description of a known interface to reconstruct

If a URL is provided, fetch the page and save a screenshot, or ask JM to provide the screenshot directly.

Confirm: what is the interface, and what teaching context will this be used in?

---

## Step 2: Identify What to Annotate

Analyze the screenshot and determine which design principles are most teachable from this example. Choose 3-6 annotation points — enough to be educational, not so many that the diagram becomes cluttered.

### Design Vocabulary to Draw From

**Typography:**
- x-height, cap height, ascender, descender
- Leading (line height), tracking (letter spacing), kerning
- Type size contrast, weight hierarchy
- Measure (line length), ragged right edge

**Spacing and Layout:**
- Whitespace ratio — how much empty space vs content
- Alignment — left edge, grid alignment, optical centering
- Proximity — grouping related elements
- Margin and padding consistency

**Color and Contrast:**
- Contrast ratio (accessible vs inaccessible)
- Color hierarchy — which element uses primary accent and why
- Background/foreground relationship

**Hierarchy and Composition:**
- Visual weight — what the eye lands on first
- Reading order — does the layout direct flow?
- Focal point — is there a clear primary action?
- Repetition and consistency — do similar elements look similar?

**Component-Level:**
- Button sizing and touch targets
- Form label positioning
- Navigation pattern and affordances
- Icon clarity and labeling

Select annotation points that are either exemplary (good design to celebrate) or instructive (common mistake to highlight).

---

## Step 3: Aesthetic

Always TGDS aesthetic for annotated screenshots (educational context).

Load: `${PAI_DIR}/skills/image/references/tgds-aesthetic.md`

Annotation color convention:
- Callout lines and labels: TGDS Blue (#2E00B2)
- Positive annotation (good practice): Green (#0AC057)
- Critical annotation (problem or warning): Red (#B51429)
- Measurement indicators: TGDS Yellow (#FFE900)
- Annotation boxes: White with blue border

---

## Step 4: Select Model and Pass Reference

Model: `nano-banana-pro` — the only model that supports `--reference-image`.

Pass the original screenshot as the reference image. The prompt will instruct the model to reproduce the interface with annotations added.

---

## Step 5: Construct the Prompt

```
Annotated design analysis of the provided UI screenshot for graphic design students.

TASK: Reproduce the interface and add educational annotations highlighting design decisions.

ANNOTATIONS TO ADD:
[List each annotation point with label text, arrow/callout direction, and whether it's positive or critical]

Example:
- Label "Leading: 1.5x" with arrow pointing to the space between two text lines — blue callout
- Label "Insufficient contrast ratio (2.8:1)" pointing to grey text on light background — red callout
- Label "Alignment: all elements share left edge" with vertical rule line — blue callout
- Label "Generous whitespace: 40% of this card" with measurement bracket — yellow indicator

ANNOTATION STYLE:
- Callout lines: thin, angled, TGDS Blue (#2E00B2)
- Label pills: white background, TGDS Blue border and text
- Measurement brackets: TGDS Yellow (#FFE900)
- Positive callouts: green dot indicator (#0AC057)
- Critical callouts: red dot indicator (#B51429)
- Labels use bold geometric sans-serif (Gotham style), 12-14px

LAYOUT:
- Original interface centered or left-placed
- Annotations extend into generous white margin (right side or surrounding)
- Title bar at top: "[Interface Name] — Design Analysis" in TGDS Blue
- Legend at bottom if green/red coding is used

TYPOGRAPHY VOCABULARY:
Use precise design terms in all labels. Do not simplify or paraphrase technical terms.

CRITICAL:
- Annotations must not obscure the interface itself
- Callout lines must be unambiguous — exactly one element per annotation
- Labels must be fully legible
- Diagram must feel like TGDS educational material
```

---

## Step 6: Execute

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model nano-banana-pro \
  --prompt "<constructed-prompt>" \
  --slug <interface-name>-annotated \
  --size 2K \
  --aspect-ratio 16:9 \
  --reference-image <path-to-screenshot> \
  [--project <path>]
```

Use 16:9 for most interface annotations. If the UI is mobile (portrait), use 3:2 or 4:3 to give annotation margin room on the sides.

---

## Step 7: Validate Annotations

After generation, confirm:

1. **Accuracy** — Each annotation correctly identifies the stated element (callout line points to the right thing)
2. **Legibility** — All label text is fully readable
3. **Vocabulary** — Design terms are used correctly (e.g., "leading" not "line spacing", "tracking" not "letter spacing" colloquially)
4. **Balance** — Annotations are distributed — not all clustered in one corner
5. **Educational value** — A design student should learn something specific from each callout

If callouts are inaccurate or labels are misplaced, regenerate with more explicit positional descriptions in the prompt (e.g., "callout arrow points to the THIRD line of text in the left column").
