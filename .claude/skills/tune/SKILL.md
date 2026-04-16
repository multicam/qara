---
name: tune
context: same
description: |
  Tune visual intensity: bolder (amplify), quieter (calm down), or colorize (add color).
  USE WHEN: design feels bland (bolder), too loud (quieter), too gray (colorize).
version: 1.0.0
user-invocable: true
argument-hint: "[bolder|quieter|colorize] [target]"
---

Direction-variant intensity adjustment. Three modes with shared preparation and shared doctrine references. Mode is chosen by argument or inferred from user phrasing.

**Doctrine lives in impeccable references, not here.** This skill is a thin procedural dispatcher. For typography, color, spatial, and motion rules, consult `impeccable/reference/*.md`.

## Workflow Routing (SYSTEM PROMPT)

Three-mode dispatcher. Select by argument; infer from phrasing if missing.

- Argument `bolder` OR phrasing "too safe / bland / generic / boring / timid / lacks personality" → `## Mode: bolder`
- Argument `quieter` OR phrasing "too loud / aggressive / overwhelming / garish / tone down" → `## Mode: quieter`
- Argument `colorize` OR phrasing "too gray / dull / monochromatic / lacking warmth / needs color" → `## Mode: colorize`

If phrasing is ambiguous (e.g. "make it better"), ask the user which direction.

Every mode begins with MANDATORY PREPARATION below.

## MANDATORY PREPARATION

Invoke `/impeccable` — it contains the **Context Gathering Protocol** and design doctrine. If `.impeccable.md` is missing and loaded instructions lack a Design Context section, you MUST run `/impeccable teach` before proceeding.

## Mode selection

Route by argument if given: `bolder | quieter | colorize`.

Otherwise infer from the user's phrasing:
- "too safe / bland / generic / boring / timid / lacks personality / more impact" → **bolder**
- "too loud / bold / aggressive / overwhelming / garish / tone down / calmer" → **quieter**
- "too gray / dull / monochromatic / lacking warmth / needs color / more vibrant" → **colorize**

If phrasing is ambiguous (e.g. "make it better"), ask the user which direction.

---

## Mode: bolder

Amplify visual impact and personality while maintaining usability.

### Assess current state

Identify what makes the design feel too safe:
- **Generic choices** — system fonts, stock colors, predictable layouts
- **Timid scale** — everything medium-sized, no drama
- **Low contrast** — similar visual weight across elements
- **Static** — no motion, no energy
- **Flat hierarchy** — nothing commands attention

Understand context: brand personality, purpose (marketing vs tool vs dashboard), audience, constraints.

**CRITICAL**: Bolder ≠ chaotic or garish. Bolder = distinctive, memorable, confident. Intentional drama, not random effects.

### Plan amplification

- **Focal point** — pick ONE hero moment, make it amazing
- **Personality direction** — maximalist / elegant drama / playful / dark moody (choose a lane)
- **Risk budget** — how experimental, within constraints
- **Hierarchy amplification** — make big things BIGGER, small things smaller

### Amplify across dimensions

| Dimension | Action | Doctrine |
|---|---|---|
| **Typography** | Extreme scale jumps (3-5×), weight contrast (900/200), variable fonts, display fonts for headlines | `impeccable/reference/typography.md` |
| **Color** | Higher saturation, dominant 60% color, sharp accents, tinted neutrals | `impeccable/reference/color-and-contrast.md` |
| **Spatial** | Break the grid, asymmetric layouts, generous whitespace (100-200px gaps), full-bleed elements, overlap | `impeccable/reference/spatial-design.md` |
| **Visual effects** | Dramatic shadows, intentional backgrounds (mesh, noise, geometric), texture (grain, halftone, duotone), thick borders, custom shapes | — |
| **Motion** | Entrance choreography (50-100ms stagger), scroll effects, satisfying micro-interactions, ease-out-quart/quint/expo | `impeccable/reference/motion-design.md` |
| **Composition** | Clear focal points, diagonal flows, 70/30 or 80/20 splits | — |

### Anti-patterns (bolder-specific AI slop)

- Cyan/purple gradients (the AI default)
- Glassmorphism
- Neon accents on dark backgrounds
- Gradient text on metrics
- Effects without purpose (chaos ≠ bold)
- Sacrificing readability for impact
- Making everything bold (then nothing is bold)

### Verify: the "NOT AI slop" test

If someone saw this and you said "AI made this bolder," would they believe you immediately? If yes, start over. Bold means distinctive, not "more AI effects."

---

## Mode: quieter

Reduce visual intensity while preserving quality. Refined, not boring.

### Assess intensity sources

- **Color saturation** — over-bright or over-saturated
- **Contrast extremes** — high-contrast juxtaposition everywhere
- **Visual weight** — too many bold heavy elements competing
- **Animation excess** — too much motion, dramatic effects
- **Complexity** — too many elements, patterns, decorations
- **Scale** — everything large, no hierarchy

Understand context: purpose, audience, what's working (don't throw away good ideas), core message.

**CRITICAL**: Quieter ≠ boring or generic. Quieter = refined, sophisticated, easier on the eyes. Luxury, not laziness.

### Plan refinement

- **Color approach** — desaturate or shift to sophisticated tones
- **Hierarchy approach** — which few elements stay bold, which recede
- **Simplification approach** — what can be removed entirely
- **Sophistication signal** — how to signal quality through restraint

### Refine across dimensions

| Dimension | Action | Doctrine |
|---|---|---|
| **Color** | 70-85% saturation, fewer colors, neutral dominance (10% color rule), tinted grays (warm/cool), never gray-on-color | `impeccable/reference/color-and-contrast.md` |
| **Visual weight** | Reduce font weights (900→600, 700→500), white space up, borders thinner or removed | `impeccable/reference/typography.md` |
| **Simplification** | Remove non-purposeful gradients/shadows/patterns, simpler shapes, fewer layers, fewer effects | — |
| **Motion** | Shorter distances (10-20px vs 40px), gentler easing (ease-out-quart), remove decorative animation, no bounce/elastic | `impeccable/reference/motion-design.md` |
| **Composition** | Smaller scale jumps, align to grid, consistent spacing rhythm | `impeccable/reference/spatial-design.md` |

### Anti-patterns (quieter-specific)

- Everything same size/weight (hierarchy still matters)
- Remove all color (quiet ≠ grayscale)
- Eliminate all personality (refinement preserves character)
- Making everything small and light (anchors still needed)

### Verify

- Can users still accomplish tasks easily?
- Is it still distinctive or now generic?
- Is text easier to read for extended periods?
- Does it feel more refined and premium?

---

## Mode: colorize

Introduce strategic color to monochromatic or gray designs. Color with purpose, not rainbow vomit.

### Assess color opportunity

- **Color absence** — pure grayscale, limited neutrals, one timid accent
- **Missed opportunities** — where color could add meaning, hierarchy, delight
- **Context** — domain-appropriate (financial ≠ playful)
- **Brand** — existing colors to use

Identify value-adding roles: semantic (success/error/warning/info), hierarchy, categorization, emotional tone, wayfinding, delight.

Additionally gather: existing brand colors.

**CRITICAL**: More color ≠ better. Strategic color > rainbow vomit. Every color has a purpose.

### Plan color strategy

- **Palette** — 2-4 colors max beyond neutrals
- **Dominant** — which color owns 60%
- **Accents** — which colors cover 30% and 10%
- **Application** — where each color appears and why

### Apply color strategically

| Dimension | Action | Doctrine |
|---|---|---|
| **Semantic** | Success (emerald/forest/mint), error (rose/crimson/coral), warning (amber/orange), info (sky/ocean/indigo) | `impeccable/reference/color-and-contrast.md` (semantic tokens) |
| **Accents** | CTAs, links, key icons, section headings, hover states | — |
| **Backgrounds** | Tinted neutrals via OKLCH instead of pure gray, subtle section tints, intentional gradients (not purple-blue) | `impeccable/reference/color-and-contrast.md` |
| **Data viz** | Encode categories, heatmap intensity, comparison | — |
| **Borders** | Accent left/top borders, colored underlines, colored focus rings | — |
| **Typography** | Colored headings, highlight text, colored labels/tags | `impeccable/reference/ux-writing.md` (label copy) |
| **Decorative** | Illustrations, geometric shapes, soft blobs | — |

### Balance (60-30-10 rule — see color-and-contrast.md)

- Dominant 60% · Secondary 30% · Accent 10% · Neutrals fill the rest

### Accessibility

- WCAG: 4.5:1 text, 3:1 UI components — see `impeccable/reference/color-and-contrast.md`
- Never rely on color alone (icons/labels/patterns alongside)
- Test for color-blind users (red/green combos)

### Anti-patterns (colorize-specific)

- Every color in the rainbow (pick 2-4)
- Random color without semantic meaning
- Gray text on colored backgrounds (use darker-shade-of-background instead)
- Pure gray neutrals (add warm/cool tint)
- Pure black `#000` or white `#fff` for large areas
- Purple-blue gradients (AI slop)
- Color as the only indicator (a11y issue)
- Making everything colorful (defeats the purpose)

### Verify

- Does color guide attention appropriately?
- Does color clarify state/category meaning?
- Does it feel warmer and more inviting?
- Do all combinations meet WCAG?
- Is color balanced, not overwhelming?

---

## Hand-off

After tuning, recommend next steps:
- `/critique` — UX review of the tuned design
- `/audit` — technical quality check (a11y, performance, theming)
- `/polish` — final pre-ship pass

Doctrine source of truth is always `impeccable/reference/*.md`. This skill dispatches procedure; it does not own rules.
