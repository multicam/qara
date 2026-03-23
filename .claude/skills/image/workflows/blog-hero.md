# Blog Hero — Editorial Image Workflow

Hero and header image generation for blog posts and editorial content. Follows the article topic to select the right visual metaphor, aesthetic, and model.

---

## Step 1: Analyze the Article Topic

Before generating, read (or ask JM to describe) the article:

1. **Core topic** — What is the article actually about? (typography basics, color theory, a tool review, a trend piece)
2. **Tone** — Instructional, opinionated, inspirational, analytical?
3. **Audience** — Design students, working designers, general audience?
4. **Visual metaphor** — What image archetype fits? (see table below)

If the article title alone is ambiguous, ask JM for the first paragraph or subtitle.

### Common Blog Image Archetypes

| Article Type | Visual Approach |
|---|---|
| Concept explainer | Abstract — geometric shapes representing the idea |
| Tool or technique | Typographic — bold title card with key term |
| Trend / opinion | Editorial photo — staged or atmospheric composition |
| Before / after | Split composition — metaphorical contrast |
| Step-by-step tutorial | Process visual — numbered flow or sequence |
| Case study | Annotated composition — image with callout overlays |

---

## Step 2: Select Aesthetic

| Is this for TGDS? | Aesthetic |
|---|---|
| Yes — TGDS blog, course announcement, TGDS social | Load `${PAI_DIR}/skills/image/references/tgds-aesthetic.md` |
| No — other project, generic editorial | Load `${PAI_DIR}/skills/CORE/aesthetic.md` |
| Unclear | Ask JM |

Read the selected aesthetic file and use its prompt template, color values, and anti-patterns.

---

## Step 3: Select Model

| Signal | Model |
|---|---|
| Abstract or artistic concept | `flux` |
| Needs readable title text or typographic treatment | `nano-banana-pro` |
| Photorealistic or documentary feel | `gpt-image-1` |
| Fast draft before committing to direction | `nano-banana-pro` |

Default for editorial hero images with no strong signal: `flux`.

---

## Step 4: Construct the Prompt

Use the aesthetic's prompt template as the base. Fill in:

- **Subject:** The visual metaphor from Step 1, described in concrete terms
- **Style:** From the aesthetic's positive signals
- **Composition:** 2-4 elements with placement (e.g., "large typographic title left-aligned, abstract ink wash behind, rule line dividing thirds")
- **Color:** Exact hex values from the selected aesthetic
- **Negative constraints:** Anti-patterns from the aesthetic

**Prompt structure:**

```
[Visual metaphor description — specific, not generic] for a blog article about [topic].

STYLE: [From aesthetic positive signals]

COMPOSITION:
[2-4 elements with specific placement]

COLOR:
- Background: [from aesthetic]
- Primary: [from aesthetic]
- Accent: [from aesthetic]

CRITICAL:
[Aesthetic anti-patterns as hard constraints]
```

---

## Step 5: Determine Size

| Context | Size |
|---|---|
| Blog header / hero | 16:9 (default) |
| Social card (share preview) | 1:1 |
| Newsletter header | 3:1 banner |
| Story / vertical share | 9:16 |

- **flux:** Pass `--aspect-ratio 16:9`
- **nano-banana-pro:** Pass `--size 2K --aspect-ratio 16:9`
- **gpt-image-1:** Pass `--size 1536x1024`

---

## Step 6: Execute

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model <selected-model> \
  --prompt "<constructed-prompt>" \
  --slug <kebab-case-article-topic> \
  --aspect-ratio 16:9 \
  [--size 2K]                    # nano-banana-pro only
  [--project <path>]
```

---

## Step 7: Validate

1. Show the output path to JM
2. Ask: does this match the article's tone and topic?
3. If iterating:
   - Refine the visual metaphor description in the prompt
   - Try `--creative-variations 3` to explore different directions
   - Switch models if the style is wrong (e.g., flux to gpt-image-1 if more realism is needed)
   - Use a strong first output as `--reference-image` for subsequent refinement

---

## Quick Reference

| JM says... | Model | Aesthetic | Slug pattern |
|---|---|---|---|
| "hero for the TGDS typography article" | `flux` | TGDS | `typography-hero` |
| "header for a blog post about Figma" | `flux` | CORE | `figma-post-hero` |
| "bold typographic header for the color theory piece" | `nano-banana-pro` | TGDS | `color-theory-type` |
| "documentary photo feel for the studio visit post" | `gpt-image-1` | CORE | `studio-visit-hero` |
| "abstract header for the whitespace article" | `flux` | TGDS | `whitespace-abstract` |
