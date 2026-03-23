# Framework — Mental Model Visual Workflow

2x2 matrices, Venn diagrams, quadrant charts, and other conceptual frameworks. Structured visual thinking made visually clear.

---

## Step 1: Understand the Framework

Before generating, fully map the framework's logic:

1. **Framework type** — What kind of structure? (matrix, Venn, spectrum, concentric circles, quadrant)
2. **Axes or sets** — What are the dimensions? What does each axis measure?
3. **Labels** — What are the quadrant names, category labels, or set names?
4. **Elements inside** — What items, concepts, or examples populate the framework?
5. **Insight** — What does the framework teach? What tension or relationship does it reveal?

If any of these are unclear, ask JM before generating. A framework with wrong axis labels teaches the wrong lesson.

---

## Step 2: Determine Visualization Type

| Framework Logic | Visualization Type |
|---|---|
| Two independent axes, four outcomes | 2x2 matrix |
| Overlapping properties, shared zones | Venn diagram (2 or 3 sets) |
| Ranked positions along one dimension | Spectrum / scale |
| Hierarchical nesting or containment | Concentric circles |
| Four-way categorization with clear tension | Quadrant chart |
| Proportional relationships | Area chart or treemap-style |

**Design teaching frameworks by type:**

| Framework | Type |
|---|---|
| Complexity vs Impact matrix | 2x2 matrix |
| Good design vs Bad design examples | Split / contrast |
| McGuire's design quadrant | Quadrant chart |
| Dieter Rams principles relationships | Concentric or matrix |
| Form vs Function spectrum | Spectrum |
| Typeface personality map | Quadrant chart |

---

## Step 3: Select Aesthetic

| Is this for design teaching or TGDS? | Aesthetic |
|---|---|
| Yes — course material, TGDS slide, student resource | Load `${PAI_DIR}/skills/image/references/tgds-aesthetic.md` |
| No — other project, generic thinking tool | Load `${PAI_DIR}/skills/CORE/aesthetic.md` |

Most framework visuals for JM will be TGDS — design teaching is TGDS's core business.

---

## Step 4: Select Model

Always `nano-banana-pro` for framework visuals.

Frameworks require precise text labels. The axis names, quadrant labels, and element names must be accurate and legible. nano-banana-pro is the only model that reliably renders readable text in structured visual layouts.

---

## Step 5: Construct the Prompt

Framework prompts need explicit structural description — describe the geometry and text placement in detail:

```
[Framework type — 2x2 matrix / Venn diagram / quadrant chart] visualizing [concept].

STRUCTURE:
[Describe the geometry precisely:]
- Horizontal axis: left = [label], right = [label]
- Vertical axis: bottom = [label], top = [label]
- Quadrants (clockwise from top-left): [Q1 name], [Q2 name], [Q3 name], [Q4 name]
- [Key elements placed in their correct quadrants]

STYLE: Clean, educational diagram. [TGDS: TGDS design school aesthetic. | CORE: Warm neutral editorial.]
Typography-led. Clear hierarchy. Teaching quality — legible at slide size.

LABELS:
- Axis labels in bold at extremes
- Quadrant names inside each zone
- [Any example items placed precisely in their quadrant]

COLOR:
[TGDS: Deep blue (#2E00B2) for structure and headings. Yellow (#FFE900) for accent. White (#FFFFFF) background.]
[CORE: Charcoal (#2A2520) for structure. Signal Orange (#E8652A) for accent. Warm white (#FAF9F7) background.]

CRITICAL:
- All text labels must be readable at presentation size
- Structure must be geometrically accurate (equal quadrants, centered axes)
- No decorative elements that compete with the diagram logic
- Clean, uncluttered — whitespace is part of the teaching
```

---

## Step 6: Determine Size

| Framework Shape | Size |
|---|---|
| Square frameworks (equal axes, balanced quadrants) | 1:1 |
| Wide frameworks (timeline, spectrum, wide matrix) | 16:9 |
| Moderately wide frameworks | 3:2 |

Pass to CLI:
- `nano-banana-pro`: `--size 2K --aspect-ratio 1:1` or `--size 2K --aspect-ratio 16:9`

---

## Step 7: Validate

1. Verify axis labels are in the correct positions (horizontal = x-axis, vertical = y-axis)
2. Verify quadrant/zone labels match the intended framework
3. Confirm any example elements are placed in their logically correct quadrant
4. Check that the diagram teaches the intended insight — the tension or relationship should be visually obvious

If labels are misplaced or axis orientation is wrong, the diagram teaches the wrong lesson. Correct and regenerate.

---

## Execute

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model nano-banana-pro \
  --prompt "<constructed-prompt>" \
  --slug <framework-name> \
  --size 2K \
  --aspect-ratio <1:1|16:9|3:2> \
  [--project <path>]
```

---

## Quick Reference

| JM says... | Framework Type | Aspect | Slug pattern |
|---|---|---|---|
| "complexity vs impact 2x2" | 2x2 matrix | 1:1 | `complexity-impact-matrix` |
| "Venn diagram of form, function, meaning" | Venn (3-set) | 1:1 | `form-function-meaning-venn` |
| "typeface personality quadrant" | Quadrant chart | 1:1 | `typeface-personality-quadrant` |
| "design principles spectrum" | Spectrum | 16:9 | `design-principles-spectrum` |
| "Dieter Rams principles grid" | Matrix | 16:9 | `dieter-rams-grid` |
