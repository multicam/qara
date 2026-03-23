---
name: image
context: same
description: |
  AI image generation and stock photo sourcing for TGDS and general PAI use.
  Smart model routing, per-project gallery output, metadata tracking.
  Supports Flux, Nano Banana Pro (Gemini), GPT-Image-1, and Unsplash.
  USE WHEN: "generate image", "create graphic", "hero image", "blog image",
  "UI mockup", "wireframe", "infographic", "social card", "brand asset",
  "stock photo", "unsplash", "teaching diagram", "visual", "illustration",
  "create a visual", "make an image", "design a graphic"
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests image generation without specifying content type:**
Examples: "generate an image", "create a visual for", "make a graphic"
→ **READ:** `${PAI_DIR}/skills/image/workflows/smart-route.md`
→ **EXECUTE:** Smart router selects best model and aesthetic

**When user requests blog/editorial imagery:**
Examples: "blog header", "hero image for article", "editorial illustration"
→ **READ:** `${PAI_DIR}/skills/image/workflows/blog-hero.md`

**When user requests stock photos:**
Examples: "find a stock photo", "unsplash", "stock image of"
→ **READ:** `${PAI_DIR}/skills/image/workflows/unsplash-source.md`

**When user requests teaching/educational visuals:**
Examples: "teaching diagram", "infographic for students", "explain visually"
→ **READ:** `${PAI_DIR}/skills/image/workflows/teaching-diagram.md`

**When user requests UI/UX mockups:**
Examples: "UI mockup", "wireframe", "dashboard mockup", "app screen"
→ **READ:** `${PAI_DIR}/skills/image/workflows/ui-mockup.md`

**When user requests annotated screenshots:**
Examples: "annotate this screenshot", "design callouts", "mark up this UI"
→ **READ:** `${PAI_DIR}/skills/image/workflows/ui-annotated.md`

**When user requests comparison visuals:**
Examples: "compare X vs Y", "before and after", "good vs bad example"
→ **READ:** `${PAI_DIR}/skills/image/workflows/comparison.md`

**When user requests framework/matrix visuals:**
Examples: "2x2 matrix", "framework diagram", "mental model visual"
→ **READ:** `${PAI_DIR}/skills/image/workflows/framework.md`

**When user requests taxonomy/classification visuals:**
Examples: "taxonomy", "classification grid", "periodic table of"
→ **READ:** `${PAI_DIR}/skills/image/workflows/taxonomy.md`

**When user requests brand assets:**
Examples: "brand asset", "TGDS branded", "brand-consistent graphic"
→ **READ:** `${PAI_DIR}/skills/image/workflows/brand-asset.md`

**When user requests social media cards:**
Examples: "social card", "Instagram post", "LinkedIn image", "social media graphic"
→ **READ:** `${PAI_DIR}/skills/image/workflows/social-card.md`

**When user requests Mermaid-based diagrams:**
Examples: "mermaid diagram", "flowchart", "sequence diagram", "architecture diagram"
→ **READ:** `${PAI_DIR}/skills/image/workflows/mermaid-diagram.md`

---

## When to Activate This Skill

1. **Core Skill Name:** "image", "image generation", "image skill"
2. **Action Verbs:** "generate", "create", "make", "design", "render", "produce"
3. **Modifiers:** "quick mockup", "high-quality hero", "simple diagram", "detailed infographic"
4. **Prepositions:** "image for blog", "graphic for students", "visual for LinkedIn"
5. **Synonyms:** "graphic", "visual", "illustration", "picture", "artwork", "asset"
6. **Use Cases:** "I need a blog header", "make something for the course", "design a social post"
7. **Result-Oriented:** "show me what X looks like", "visualize this concept", "illustrate this idea"
8. **Tool/Method Specific:** "use Flux", "Gemini image", "search Unsplash", "stock photo"

---

## Model Reference

| Model | Best For | Speed | API Key |
|-------|----------|-------|---------|
| **flux** | Artistic, editorial, abstract | Medium | `REPLICATE_API_TOKEN` |
| **nano-banana-pro** | Typography, diagrams, text-heavy, reference images | Fast | `GOOGLE_API_KEY` |
| **gpt-image-1** | Photorealistic, transparency | Medium | `OPENAI_API_KEY` |
| **Unsplash** | Real photography (search & download) | Instant | `UNSPLASH_ACCESS_KEY` |

The **smart-route workflow** selects the best model automatically. Override with `--model` flag when needed.

---

## Tools

### generate-image

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model <flux|nano-banana-pro|gpt-image-1> \
  --prompt "..." \
  --slug <name> \
  [--project <path>] \
  [--size <size>] \
  [--aspect-ratio <ratio>] \
  [--reference-image <path>] \
  [--transparent] \
  [--remove-bg] \
  [--creative-variations <n>]
```

Output: `~/thoughts/global/shared/generated/{YYYY-MM-DD}-{slug}/image.png` + `metadata.json`

The `--project` flag overrides the output base directory.

### search-unsplash

```bash
bun run ${PAI_DIR}/skills/image/tools/search-unsplash.ts \
  --query "..." \
  [--orientation landscape|portrait|squarish] \
  [--count <n>] \
  [--download <n>] \
  [--project <path>] \
  [--slug <name>]
```

Output (download mode): `~/thoughts/global/shared/generated/{YYYY-MM-DD}-{slug}/image.jpg` + `attribution.json`

The `--project` flag overrides the output base directory.

---

## Aesthetic Layers

| Context | Aesthetic File | When |
|---------|---------------|------|
| **TGDS content** | `${PAI_DIR}/skills/image/references/tgds-aesthetic.md` | Blog, teaching, social for The Graphic Design School |
| **General/other projects** | `${PAI_DIR}/skills/CORE/aesthetic.md` | Everything else |

When the content is explicitly for TGDS, load the TGDS aesthetic. Otherwise, use CORE.

---

## Extended Context

- TGDS aesthetic: `references/tgds-aesthetic.md`
- CORE aesthetic: `${PAI_DIR}/skills/CORE/aesthetic.md`
- Skill architecture: `${PAI_DIR}/skills/CORE/skill-structure.md`
