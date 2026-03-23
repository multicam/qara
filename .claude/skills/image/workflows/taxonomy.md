# Taxonomy — Classification Grid Visual Workflow

Visual classification grids, periodic-table-style layouts, and categorization diagrams. Makes the relationships between categories and items visible at a glance.

---

## Step 1: Understand What's Being Classified

Before generating, map the classification system:

1. **Domain** — What field or subject is being categorized? (typeface families, color harmonies, layout patterns, design movements, visual principles)
2. **Classification logic** — What property defines each category? (historical period, structural characteristic, visual style, function)
3. **Categories** — How many top-level groups? What are their names?
4. **Items** — What specific examples belong in each category?
5. **Hierarchy depth** — Is this one level (flat) or multiple levels (nested categories)?
6. **Educational goal** — What should a student understand after seeing this diagram?

A taxonomy with wrong category logic teaches bad mental models. Get the classification right before generating.

---

## Step 2: Determine Grid Structure

| Classification Type | Grid Structure |
|---|---|
| Small set, equal categories | Equal-cell grid (e.g., 2x3, 3x3) |
| Many items, periodic-table style | Dense grid with color-coded categories |
| Hierarchical categories | Indented or nested grid with category headers |
| Timeline-based (historical periods) | Left-to-right horizontal bands |
| Proportional (items per category vary) | Irregular grid weighted by item count |

Decide:
- **Number of columns** — driven by item count and readability
- **Category headers** — row labels, column labels, or color-coded zones
- **Item density** — how many items per cell (1 item = spacious, multiple = dense)

---

## Step 3: Select Aesthetic

| Is this for design education or TGDS? | Aesthetic |
|---|---|
| Yes — course material, TGDS reference card, student handout | Load `${PAI_DIR}/skills/image/references/tgds-aesthetic.md` |
| No — other project, generic classification | Load `${PAI_DIR}/skills/CORE/aesthetic.md` |

Most taxonomy visuals for JM will be TGDS — design classification is core teaching content.

---

## Step 4: Select Model

Always `nano-banana-pro` for taxonomy visuals.

Classification grids are dense with text: category headers, item names, labels, annotations. nano-banana-pro is the only model that reliably renders readable text in structured multi-cell layouts. Flux will produce artistic-looking grids with illegible or hallucinated text.

---

## Step 5: Construct the Prompt

Taxonomy prompts require exact structural description. The more precise the layout spec, the more accurate the output:

```
[Classification name — e.g., "Periodic Table of Typeface Families"] — educational classification grid.

STRUCTURE:
[Describe the grid precisely:]
- [N] columns x [N] rows grid
- Category headers: [list category names and their position — left column / top row / color zone]
- Items in each category:
  [Category A]: [item 1], [item 2], [item 3]
  [Category B]: [item 1], [item 2]
  [etc.]
- [Color coding: each category uses a distinct accent color]

STYLE: Clean educational reference graphic. [TGDS: TGDS design school aesthetic. | CORE: Warm neutral editorial.]
Dense but legible. Teaching-quality layout. Reference card design.

COLOR:
[TGDS: Deep blue (#2E00B2) for structural headers. Yellow (#FFE900) for emphasis. White (#FFFFFF) cells. Each category distinguished by a tint or border variation.]
[CORE: Charcoal (#2A2520) headers. Signal Orange (#E8652A) for primary category. Teal (#2B8A8A) for secondary. Warm white (#FAF9F7) cell backgrounds.]

TYPOGRAPHY:
- Category headers: bold, larger weight
- Item names: regular weight, slightly smaller
- All text: readable at print size

CRITICAL:
- All item names must be accurate and correctly spelled
- Items must appear in their correct categories
- Grid structure must be visually clear — categories distinguishable at a glance
- No decorative elements that obscure the classification logic
```

---

## Step 6: Determine Size

Size depends on grid density — denser grids need more horizontal space:

| Grid Density | Size |
|---|---|
| Compact (under 20 items) | 1:1 — fits on a slide or post |
| Moderate (20-40 items) | 3:2 — standard reference card |
| Dense (40+ items, periodic table style) | 16:9 — landscape reference poster |

Pass to CLI:
- `nano-banana-pro`: `--size 2K --aspect-ratio 16:9` for dense, `--size 2K --aspect-ratio 1:1` for compact

---

## Step 7: Validate Classification Accuracy

Before presenting to JM, verify:

1. Items are in their correct categories — wrong placement teaches wrong mental models
2. Category names are accurate and use standard terminology (verify against reference materials if uncertain)
3. Grid structure makes the classification logic visually obvious — a student should understand the groupings without needing to read explanatory text
4. No items are missing from named categories (if the brief was "all major typeface families," make sure none are absent)

If items are misclassified or categories are unclear, it's a content error — correct and regenerate.

---

## Execute

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model nano-banana-pro \
  --prompt "<constructed-prompt>" \
  --slug <taxonomy-name> \
  --size 2K \
  --aspect-ratio <1:1|3:2|16:9> \
  [--project <path>]
```

---

## Quick Reference

| JM says... | Grid Shape | Aspect | Slug pattern |
|---|---|---|---|
| "periodic table of typography" | Dense grid, many items | 16:9 | `periodic-table-typography` |
| "color harmony types grid" | Medium grid, 7 types | 3:2 | `color-harmony-types` |
| "design movement timeline" | Horizontal bands | 16:9 | `design-movement-timeline` |
| "layout pattern taxonomy" | 3x3 or 4x3 | 1:1 or 3:2 | `layout-pattern-taxonomy` |
| "typeface classification chart" | Category grid | 3:2 | `typeface-classification` |
