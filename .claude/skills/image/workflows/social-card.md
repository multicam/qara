# Social Card — Social Media Image Workflow

Social media card generation for TGDS and general accounts. Platform-specific sizing, readability-first design, bold contrast at thumbnail scale.

---

## Step 1: Determine Platform and Dimensions

| Platform | Format | Dimensions | Flag |
|---|---|---|---|
| Instagram post | 1:1 | 1024x1024 | `--size 1024x1024` |
| Instagram story | 9:16 | 1024x1820 | `--aspect-ratio 9:16` |
| LinkedIn | 16:9 | 1536x1024 | `--size 1536x1024` |
| Twitter / X | 16:9 | 1536x1024 | `--size 1536x1024` |
| Facebook post | 16:9 | 1536x1024 | `--size 1536x1024` |

If JM doesn't specify a platform, ask. The platform determines the crop, and a wrong ratio will get letterboxed or cropped by the feed.

---

## Step 2: Get the Content

Clarify what the card communicates before designing:

1. **Core message** — The single thing the card must say. One sentence.
2. **Supporting detail** — Subtitle, stat, CTA, hashtag? (keep it to 1-2 elements)
3. **Visual anchor** — Does the card need a photo, graphic, abstract shape, or pure typography?
4. **Goal** — Awareness, link click, course enrollment, quote share?

**Rule:** One message per card. If it tries to say three things, it says nothing.

---

## Step 3: Select Aesthetic

| Is this for TGDS accounts? | Aesthetic |
|---|---|
| Yes — TGDS Instagram, LinkedIn, Twitter | Load `${PAI_DIR}/skills/image/references/tgds-aesthetic.md` |
| No — other project, personal, general | Load `${PAI_DIR}/skills/CORE/aesthetic.md` |
| Unclear | Ask JM |

**TGDS social cards:** Blue background + white/yellow text, or white background + blue text. High contrast. No ambiguity about brand.

**CORE social cards:** Warm neutrals, Signal Orange accent, Instrument Serif/Sans typography. Editorial magazine feel.

---

## Step 4: Select Model

Always `nano-banana-pro` for social cards.

Text on social cards must be readable. nano-banana-pro is the only model that reliably renders legible typography in generated images. flux and gpt-image-1 cannot be trusted for text accuracy at this scale.

---

## Step 5: Construct the Prompt

Social card prompts must be explicit about readability:

```
Social media card: [main message or headline text] — for [platform].

STYLE: Bold, high-contrast graphic. Typography-led. Readable at 150px wide on a phone screen.
[TGDS: Professional design school. Bold brand colors. | CORE: Warm editorial. Clean authority.]

LAYOUT:
- Large bold headline: "[exact text]" — dominant, takes 50-60% of visual weight
- [Optional: subtitle or supporting text: "[exact text]"]
- [Optional: visual element — geometric shape / abstract graphic in background]
- Strong contrast: text must read clearly against background

COLOR:
[TGDS: Blue (#2E00B2) background + yellow (#FFE900) or white headline. Or white background + blue headline.]
[CORE: Warm white (#FAF9F7) background + deep charcoal (#2A2520) headline + Signal Orange (#E8652A) accent.]

CRITICAL:
- Readable at thumbnail size — no thin fonts, no low-contrast color combos
- Text must be correct and legible, not approximated or distorted
- Bold weight contrast — hierarchy must be immediately clear
- No cluttered backgrounds competing with the text
```

---

## Step 6: Validate at Thumbnail Scale

Before presenting to JM, mentally shrink the card to 150px wide — roughly phone-screen card width in a social feed.

Ask:
- Is the headline still readable at that size?
- Does the main message land in under 2 seconds?
- Is the brand clear without needing to read fine details?

If any answer is no, tighten the prompt: increase text size in the description, reduce background complexity, push contrast harder.

---

## Step 7: TGDS Branding Compliance

For TGDS social cards specifically:

- **Option A:** TGDS Blue (#2E00B2) background + White (#FFFFFF) or Yellow (#FFE900) headline
- **Option B:** White (#FFFFFF) background + TGDS Blue (#2E00B2) headline + Yellow (#FFE900) accent
- No other color combinations for TGDS brand accounts
- Typography must feel Gotham-weight — bold, geometric, no decorative touches

---

## Execute

```bash
bun run ${PAI_DIR}/skills/image/tools/generate-image.ts \
  --model nano-banana-pro \
  --prompt "<constructed-prompt>" \
  --slug <card-topic-platform> \
  --size <platform-dimensions> \
  [--aspect-ratio <ratio>]  # use for story (9:16)
  [--project <path>]
```

---

## Quick Reference

| JM says... | Platform | Size | Aesthetic |
|---|---|---|---|
| "Instagram post for TGDS — typography tip" | Instagram | 1024x1024 | TGDS |
| "LinkedIn card for the new course launch" | LinkedIn | 1536x1024 | TGDS |
| "quote card for Twitter — Dieter Rams" | Twitter/X | 1536x1024 | TGDS or CORE |
| "Instagram story promoting the free guide" | Instagram Story | 9:16 | TGDS |
| "social card for my personal project" | Confirm platform | varies | CORE |
