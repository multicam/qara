# Visual Comparison — X vs Y Workflow

Generate side-by-side comparisons, before/after pairs, and good/bad design examples. Common for teaching, editorial illustration, and design critique.

---

## Step 1: Understand What Is Being Compared

Confirm:

1. **The two items** — What are X and Y? Be precise. ("good kerning vs bad kerning" is better than "kerning comparison")
2. **The judgment** — Is this neutral (A vs B, no winner) or evaluative (good vs bad, correct vs incorrect)?
3. **The teaching point** — What should the viewer understand from this comparison? What should they notice?
4. **The subject matter** — Typography, layout, color, composition, UI, branding?

### Common Design Comparisons

| Subject | Comparison |
|---|---|
| Typography | Serif vs sans-serif, good vs bad kerning, tight vs loose leading, correct vs incorrect hierarchy |
| Layout | Cluttered vs clean, left-aligned vs centered, with vs without whitespace |
| Color | Harmonious vs clashing, accessible vs inaccessible contrast, on-brand vs off-brand |
| Composition | Balanced vs unbalanced, focused vs scattered, strong hierarchy vs flat hierarchy |
| UI | Clear affordance vs unclear, good form design vs bad form design |
| Branding | Consistent vs inconsistent application, appropriate vs inappropriate use |

---

## Step 2: Determine Format

| Format | When to use |
|---|---|
| Side-by-side split | Two options that are equally valid choices (A vs B) |
| Labeled good/bad | One is clearly correct, one is clearly wrong |
| Before/after | Same subject transformed — showing improvement |
| 2x2 grid | Four variants being compared simultaneously |
| Annotated pair | Both items shown with callout notes explaining the difference |

Default: side-by-side split with clear labels.

---

## Step 3: Select Aesthetic

| Context | Aesthetic |
|---|---|
| Teaching material for TGDS students | TGDS aesthetic |
| Editorial illustration for article | CORE aesthetic |
| General reference or personal | CORE aesthetic |
| Unclear | Ask JM |

TGDS comparisons use green (#0AC057) for the correct/better example and red (#B51429) for the incorrect/worse example. CORE comparisons use neutral labels without color judgment unless requested.

Load the appropriate aesthetic file from `${PAI_DIR}/skills/image/references/tgds-aesthetic.md` or `${PAI_DIR}/skills/CORE/aesthetic.md`.

---

## Step 4: Select Model

Default: `nano-banana-pro`

Comparisons require readable labels, dividers, and consistent structure across both panels. nano-banana-pro handles multi-region layouts and text rendering best.

Only deviate if JM requests a specific model.

---

## Step 5: Construct the Prompt

The prompt must enforce visual separation, consistent scale, and clear labeling. Both panels must show the same subject — only the variable being compared should differ.

```
Visual comparison: [Left label] vs [Right label] for [context — teaching / editorial / reference].

FORMAT: [Side-by-side / before-after / 2x2 grid] with [divider line / split] separating panels.

LEFT PANEL — "[Left label]":
[Describe exactly what this panel shows — subject, style, specific characteristic]
[e.g., "word WAVE set in tight tracking (-50), letters overlapping and illegible"]

RIGHT PANEL — "[Right label]":
[Describe exactly what this panel shows — same subject, contrasting characteristic]
[e.g., "word WAVE set in normal tracking (0), letters correctly spaced, comfortable reading"]

LABELS:
- Panel title: "[Left label]" top-center of left panel, "[Right label]" top-center of right panel
- Label style: Bold geometric sans-serif, [TGDS Blue #2E00B2 / Charcoal #2A2520]
[If evaluative: "Green (#0AC057) label for correct / Red (#B51429) label for incorrect"]
- Divider: thin vertical line, center, [TGDS Blue / Stone grey]

STYLE: [From selected aesthetic positive signals]

COMPOSITION:
- Both panels equal width
- Same background color both panels (no visual favoritism via background)
- Subject same scale and position in both panels
- Only the compared variable differs between panels

COLOR:
[From selected aesthetic]

CRITICAL:
- The difference between panels must be immediately visible
- Labels must be unambiguous — viewer should not need to read both labels to tell which is which
- Consistent padding and margin in both panels
- No additional differences beyond the one being compared
```

---

## Step 6: Execute

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model nano-banana-pro \
  --prompt "<constructed-prompt>" \
  --slug <subject>-comparison \
  --size 2K \
  --aspect-ratio 16:9 \
  [--project <path>]
```

| Orientation preference | Aspect ratio |
|---|---|
| Standard landscape (most comparisons) | 16:9 |
| Square panels (typography, color swatches) | 1:1 |
| Tall subject (poster, mobile screen) | 4:3 |

---

## Step 7: Validate the Comparison

After generation, confirm:

1. **Difference is visible** — Can you see the distinction at a glance, without reading the labels?
2. **Labels are legible** — Panel titles and any callout text fully readable
3. **Panels are consistent** — Only the intended variable differs; scale, position, and subject are the same
4. **Judgment is unambiguous** — If good/bad: the green panel clearly looks better, the red panel clearly looks worse
5. **Educational value** — The comparison teaches the intended principle

If the difference is too subtle, adjust the prompt to exaggerate the contrast between panels. Comparisons should be instructive, not subtle.
