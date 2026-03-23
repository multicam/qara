# Teaching Diagram — Educational Visual Workflow

Educational diagram generation for TGDS students. Prioritizes instructional clarity: legible labels, visible hierarchy, and design that demonstrates the principle it teaches.

---

## Step 1: Understand the Concept Being Taught

Ask or confirm:

1. **Subject area** — Typography, color theory, grid systems, layout, composition, hierarchy, branding, UX?
2. **Specific concept** — What exactly is being explained? (e.g., "x-height vs cap height" or "analogous color schemes")
3. **Student level** — Foundation, intermediate, advanced? (affects label density and assumed vocabulary)
4. **Instructional goal** — What should students understand after seeing this diagram?

If multiple concepts are being taught simultaneously, create separate diagrams. One concept per diagram.

---

## Step 2: Determine Diagram Type

| What's being taught | Diagram type |
|---|---|
| Anatomy of a letter / typeface / element | Labeled anatomy |
| Two or more options compared | Comparison grid |
| A sequence of steps | Process flow |
| Levels of importance or organization | Hierarchy diagram |
| A good vs bad example | Annotated example (good/bad pair) |
| A concept with multiple sub-parts | Category breakdown |

### Common Teaching Diagrams

| Topic | Diagram Type | Notes |
|---|---|---|
| Letterform anatomy | Labeled anatomy | x-height, baseline, descender, ascender, stem, bowl, counter |
| Typeface classification | Category breakdown | Serif / Sans / Slab / Script / Display with examples |
| Color wheel | Radial diagram | Primary, secondary, tertiary with relationships |
| Color harmony | Comparison grid | Complementary, analogous, triadic, monochromatic |
| Grid systems | Annotated layout | Columns, gutters, margins, baseline grid |
| Type hierarchy | Hierarchy diagram | H1 → H2 → body → caption with scale contrast |
| Design principles | Side-by-side pair | Proximity, alignment, repetition, contrast — good vs bad |
| Layout composition | Annotated example | Rule of thirds, golden ratio, visual weight |
| Kerning | Annotated pair | Bad kerning vs corrected kerning |

---

## Step 3: Aesthetic

Always TGDS aesthetic for teaching materials. Load: `${PAI_DIR}/skills/image/references/tgds-aesthetic.md`

Key TGDS teaching conventions:
- Green (#0AC057) for "good" or "correct" examples
- Red (#B51429) for "bad" or "incorrect" examples
- TGDS Blue (#2E00B2) for structural elements, labels, and headings
- Yellow (#FFE900) for highlight callouts and key terms
- White or 10% Grey (#F2F2F2) background

---

## Step 4: Select Model

Default: `nano-banana-pro`

Reason: Teaching diagrams require readable labels, technical vocabulary, measurement callouts, and multi-element layouts. nano-banana-pro has the strongest text rendering of the available models.

Only deviate if JM explicitly requests a different model.

---

## Step 5: Construct the Prompt

Emphasize educational clarity above all else. The diagram should be immediately understandable to a design student seeing it for the first time.

```
[Concept name] educational diagram for graphic design students.

DIAGRAM TYPE: [anatomy / comparison grid / process flow / hierarchy / annotated example]

CONTENT:
[List every labeled element with its value or position]
[e.g., "label 'x-height' with arrow to the space between baseline and mean line"]

STYLE: Clean TGDS educational diagram. Professional design school quality.
Bold geometric sans-serif labels. Strong typographic hierarchy.
Deep blue (#2E00B2) structural elements and headings.
Yellow (#FFE900) for key term highlights.
[Green (#0AC057) for good examples / Red (#B51429) for bad examples — if applicable]

COMPOSITION:
[Main diagram element — placement and size]
[Label positions — all labels visible, no overlap]
[Legend or key — if needed]
[Title — top or bottom, TGDS Blue, bold]

COLOR:
- Background: White (#FFFFFF) or light grey (#F2F2F2)
- Structure: Deep blue (#2E00B2)
- Labels: Near black (#222222), caption grey (#909090) for secondary
- Highlights: Yellow (#FFE900)

CRITICAL:
- All labels must be legible — minimum readable text size
- No overlapping labels or callout lines
- Visual hierarchy must teach — most important element is most prominent
- Diagram itself must demonstrate good design principles
```

---

## Step 6: Execute

Use 2K resolution and an aspect ratio appropriate for the diagram type:

| Diagram type | Aspect ratio |
|---|---|
| Wide comparison grid | 16:9 |
| Tall anatomy (letterform, page layout) | 3:4 or 1:1 |
| Process flow (horizontal) | 16:9 |
| Process flow (vertical) | 9:16 |
| General teaching slide | 16:9 |

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model nano-banana-pro \
  --prompt "<constructed-prompt>" \
  --slug <concept-diagram> \
  --size 2K \
  --aspect-ratio <ratio> \
  [--project <path>]
```

---

## Step 7: Validate Legibility

Before showing to JM, check:

1. **Text is readable** — All labels legible at the output size
2. **Hierarchy is clear** — Most important element reads first
3. **Labels don't overlap** — No callout lines crossing
4. **Concept is self-explanatory** — A student unfamiliar with the topic should understand the diagram without external narration
5. **Good/bad coding is unambiguous** — If green/red are used, the judgment is unmistakable

If labels are too small or overlapping, regenerate with fewer labeled elements or a larger canvas.
