# Smart Route — Model Selection Workflow

Default workflow for image generation requests. Analyzes the request, selects the best model, loads the right aesthetic, and generates.

---

## Step 1: Analyze the Request

Before generating, understand what's being asked:

1. **Content type** — What is this image for? (blog, teaching, UI, social, brand)
2. **Subject matter** — What should the image depict?
3. **Style signals** — Any hints about visual style? (photorealistic, abstract, diagrammatic, editorial)
4. **Text content** — Does the image need readable text or typography?
5. **Technical constraints** — Size, aspect ratio, transparency needed?
6. **Context** — Is this for TGDS specifically or general use?

If any of these are unclear, **ask JM before generating.** Don't guess on style or content.

---

## Step 2: Select Model

Use this decision matrix. Check conditions top-to-bottom; first match wins.

| Condition | Model | Reason |
|-----------|-------|--------|
| Reference image provided | `nano-banana-pro` | Only model supporting reference image input |
| Typography or readable text needed | `nano-banana-pro` | Superior text rendering in generated images |
| Diagram, infographic, chart | `nano-banana-pro` | Best at structured visual layouts |
| UI wireframe or mockup | `nano-banana-pro` | Good at structured, grid-based compositions |
| Transparent background required | `gpt-image-1` | Best native transparency support |
| Photorealistic photo needed | `gpt-image-1` | Most realistic output |
| Artistic, abstract, editorial | `flux` | Highest artistic quality and creativity |
| Fast draft / iteration | `nano-banana-pro` | Fastest generation time |
| No strong signal | `flux` | Best default for general quality |

**Override:** If JM specifies a model explicitly (e.g., "use Gemini"), respect that.

---

## Step 3: Select Aesthetic

| Is the content for TGDS? | Aesthetic |
|---------------------------|-----------|
| Yes — blog post, course material, TGDS social media | Load `${PAI_DIR}/skills/image/references/tgds-aesthetic.md` |
| No — other project, personal, generic | Load `${PAI_DIR}/skills/CORE/aesthetic.md` |
| Unclear | Ask JM |

Read the relevant aesthetic file and apply its prompt templates, color guidance, and anti-patterns.

---

## Step 4: Construct the Prompt

Build the image generation prompt by combining:

1. **Subject description** — What the image shows (from JM's request)
2. **Style directives** — From the selected aesthetic's prompt template
3. **Composition guidance** — Layout, spacing, element count
4. **Color specification** — Exact hex values from the aesthetic
5. **Negative prompts** — Anti-patterns from the aesthetic

**Prompt structure:**
```
[Subject description in clear, specific language]

STYLE: [From aesthetic positive signals]
COMPOSITION: [2-4 elements, specific placement]
COLOR: [Background, primary, accent from aesthetic palette]
CRITICAL: [Anti-patterns as negative constraints]
```

---

## Step 5: Determine Technical Parameters

| Parameter | Decision |
|-----------|----------|
| **Aspect ratio** | 16:9 for blog headers, 1:1 for social/square, 9:16 for stories, 3:2 for editorial |
| **Size** | Flux: use aspect ratio directly. Gemini: 2K default, 4K for hero images. GPT: 1536x1024 for landscape, 1024x1536 for portrait, 1024x1024 for square. |
| **Slug** | Kebab-case descriptive name (e.g., `responsive-hero`, `serif-vs-sans`) |
| **Project** | `~/thoughts/global/shared/generated/` unless JM specifies otherwise via `--project` (output base directory override) |

---

## Step 6: Execute

Run the CLI tool:

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model <selected-model> \
  --prompt "<constructed-prompt>" \
  --slug <slug> \
  --size <size> \
  [--aspect-ratio <ratio>]  # nano-banana-pro only
  [--project <path>]
  [--reference-image <path>]  # if provided
  [--transparent]  # if needed
  [--remove-bg]  # if needed
```

---

## Step 7: Validate and Iterate

After generation:

1. **Show the output path** to JM
2. **Ask if it meets expectations** — the first generation is often a starting point
3. **If iterating:**
   - Refine the prompt based on feedback
   - Consider switching models if the current one isn't producing the right style
   - Use `--creative-variations 3` to generate multiple options
   - Use `--reference-image` with a good output as reference for refinement

---

## Quick Reference: Common Requests → Actions

| JM says... | Model | Size | Aesthetic |
|------------|-------|------|-----------|
| "hero image for the blog" | flux | 16:9 | TGDS |
| "diagram for the course" | nano-banana-pro | 2K, 16:9 | TGDS |
| "mockup of a dashboard" | nano-banana-pro | 2K, 16:9 | CORE |
| "social post for TGDS" | nano-banana-pro | 2K, 1:1 | TGDS |
| "find a photo of a workspace" | Unsplash | — | — |
| "abstract art for article" | flux | 16:9 | CORE or TGDS |
| "product photo style" | gpt-image-1 | 1536x1024 | CORE |
