# Unsplash Source — Stock Photo Workflow

Workflow for sourcing stock photography from Unsplash with proper attribution.

---

## Step 1: Clarify the Need

Before searching, understand:

1. **Subject** — What should the photo show?
2. **Mood** — Bright and energetic? Dark and moody? Warm and natural?
3. **Orientation** — Landscape (wide), portrait (tall), or square?
4. **Usage** — Blog hero, background, inline illustration, social post?

If JM gives a vague request like "find a photo for the blog", ask:
- "What's the blog post about?"
- "Any preference on orientation — wide hero or something else?"

---

## Step 2: Search

Run the search tool:

```bash
bun run ${PAI_DIR}/skills/image/tools/search-unsplash.ts \
  --query "<specific search terms>" \
  [--orientation landscape|portrait|squarish] \
  --count 5
```

**Search tips:**
- Use specific, descriptive terms: "modern web design workspace" > "design"
- Combine subject + mood: "minimal typography poster warm lighting"
- Use design vocabulary: "flat lay", "overhead shot", "bokeh background"
- Try multiple searches with different terms if first results aren't good

---

## Step 3: Present Results

Show JM the numbered results with descriptions and URLs. Let them browse and choose.

If results aren't right:
- Refine search terms
- Try different orientation
- Suggest alternative phrasing

---

## Step 4: Download

Once JM picks a photo:

```bash
bun run ${PAI_DIR}/skills/image/tools/search-unsplash.ts \
  --query "<same query>" \
  --download <number> \
  --slug <descriptive-name> \
  [--project <path>]
```

This saves:
- `~/thoughts/global/shared/generated/{date}-{slug}/image.jpg` — the photo
- `~/thoughts/global/shared/generated/{date}-{slug}/attribution.json` — photographer credit

The `--project` flag overrides the output base directory.

---

## Step 5: Attribution Reminder

After downloading, remind JM of the attribution requirement:

> The attribution for this photo is:
> **"Photo by [Photographer Name] on Unsplash"**
>
> This is saved in `attribution.json` alongside the image. Include this credit
> wherever the photo is published (blog post footer, image caption, credits page).

Unsplash License allows free use for commercial and non-commercial purposes, but attribution is expected and good practice.
