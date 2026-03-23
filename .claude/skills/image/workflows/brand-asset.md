# Brand Asset — TGDS Brand Generation Workflow

Brand-consistent graphic elements for The Graphic Design School. Patterns, illustrations, icons, and decorative elements — strictly TGDS-compliant. Not for logos (AI can't do that reliably).

---

## Step 1: Identify the Brand Piece

Clarify what type of brand asset is needed:

| Asset Type | Description |
|---|---|
| Pattern | Repeating geometric or decorative motif for backgrounds, fills, packaging |
| Icon set | Flat or semi-flat icons for UI, course materials, navigation |
| Brand illustration | Conceptual illustration representing a TGDS theme or value |
| Decorative element | Dividers, frames, texture overlays, supporting graphic shapes |
| Course cover | Visual identity for a specific course or module |
| Background graphic | Large-format geometric composition for slides, web sections |

If the asset type is ambiguous, ask JM before proceeding.

---

## Step 2: Load TGDS Aesthetic

This workflow **always** uses the TGDS aesthetic. No exceptions.

Read: `${PAI_DIR}/skills/image/references/tgds-aesthetic.md`

Apply its prompt template, color values, positive/negative signals, and brand rules.

---

## Step 3: Enforce Strict Color Compliance

TGDS brand assets use only these colors:

```
TGDS Blue       #2E00B2   — Primary structure, dominant color
TGDS Dark Blue  #1C0089   — Depth, shadow variant
TGDS Yellow     #FFE900   — Accent, energy, focal point
Clean White     #FFFFFF   — Space, contrast, backgrounds
```

Supporting colors (Near Black, Red, Green, Orange) are for **content**, not brand assets. Do not use them in brand-asset contexts unless JM explicitly requests it.

**Rule:** Blue dominates. Yellow punctuates. White breathes.

---

## Step 4: Select Model

| Asset Type | Model | Reason |
|---|---|---|
| Patterns, abstract compositions | `flux` | Best artistic quality for geometric/abstract work |
| Icon sets, structured illustrations | `nano-banana-pro` | Better at precise shapes and consistent style |
| Text-adjacent elements (course covers, labels) | `nano-banana-pro` | Superior text rendering |
| Decorative, expressive brand illustrations | `flux` | Higher creativity and style range |

Default to `flux` for pure artistic/graphic work. Use `nano-banana-pro` when the asset will sit alongside typography.

---

## Step 5: Construct the Prompt

Use the TGDS aesthetic prompt template as the foundation. Brand asset prompts must be explicit about color and constraint:

```
[Asset description — geometric pattern / set of icons / brand illustration] for The Graphic Design School.

STYLE: Bold geometric design school aesthetic. Swiss-grid-informed.
Professional, authoritative, contemporary. High contrast brand colors.
Clean geometric sans-serif wherever type appears.

COMPOSITION:
[Describe 2-4 structural elements with specific placement]

COLOR:
- Primary: Deep blue (#2E00B2) — dominant
- Accent: Bright yellow (#FFE900) — punctuation only
- Background: White (#FFFFFF) or deep blue (#2E00B2) as field
- No other colors

CRITICAL:
- Exact brand colors — #2E00B2 and #FFE900 only, no off-brand substitutes
- Professional design institution quality
- No neon, no gradients, no hand-drawn style
- No muted or desaturated versions of brand colors
- Must feel like it belongs to a design school identity system
```

---

## Step 6: Validate Brand Consistency

Before presenting to JM, verify:

1. Colors match exact hex values (#2E00B2, #FFE900, #FFFFFF) — no approximate matches
2. Typography feels Gotham-like (bold geometric sans-serif, not rounded, not humanist)
3. Composition follows Swiss grid principles — strong alignment, clear hierarchy
4. Professional tone — design institution quality, not playful startup
5. Asset feels cohesive with other TGDS materials (could sit alongside the TGDS logo without conflict)

If the output drifts from brand (wrong blue, wrong tone, messy composition), regenerate with tighter constraints before presenting.

---

## Step 7: Variations (If Needed)

For exploring brand directions or delivering multiple options:

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model flux \
  --prompt "<brand-compliant-prompt>" \
  --slug <asset-name> \
  --creative-variations 3 \
  [--aspect-ratio 1:1]  # patterns and icons
  [--project <path>]
```

Use a strong first output as `--reference-image` when iterating toward consistency.

---

## Execute

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model <flux|nano-banana-pro> \
  --prompt "<constructed-prompt>" \
  --slug <asset-name> \
  --aspect-ratio <1:1|16:9|4:3> \
  [--project <path>]
```

---

## Quick Reference

| JM says... | Model | Aspect | Slug pattern |
|---|---|---|---|
| "geometric pattern for course backgrounds" | `flux` | 1:1 | `course-bg-pattern` |
| "icon set for typography module" | `nano-banana-pro` | 1:1 | `typography-icons` |
| "brand illustration for the homepage hero" | `flux` | 16:9 | `homepage-brand-hero` |
| "decorative divider for slides" | `nano-banana-pro` | 16:9 (cropped narrow) | `slide-divider` |
| "course cover for Layout Fundamentals" | `nano-banana-pro` | 3:4 | `layout-fund-cover` |
