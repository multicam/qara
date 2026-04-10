# PAI Visual Aesthetic System

Warm, systematic, anti-generic. Hierarchy before aesthetics. Warmth before coldness. Every element earns its place.

**Rule:** If it doesn't clarify, remove it.

---

## Color System (OKLCH)

### Warm Neutrals (Foundation)

```
Warm White      oklch(0.98 0.005 80)    #FAF9F7   Primary background
Cream           oklch(0.95 0.01  75)    #F2EDE6   Secondary background, cards
Sand            oklch(0.88 0.015 70)    #DED4C6   Borders, dividers
Stone           oklch(0.65 0.01  60)    #9A9288   Secondary text, captions
Charcoal        oklch(0.35 0.015 55)    #4A443D   Primary text
Deep Brown      oklch(0.20 0.02  50)    #2A2520   Headings, emphasis
```

No pure black (#000) or pure white (#FFF). Everything has warmth.

### Accent Palette

```
Signal Orange   oklch(0.70 0.20 45)     #E8652A   Primary action, emphasis
Soft Coral      oklch(0.75 0.12 40)     #D98A6A   Secondary warmth
Deep Teal       oklch(0.55 0.10 195)    #2B8A8A   Information, links
Quiet Blue      oklch(0.60 0.08 240)    #5E7FAD   Secondary information
Moss Green      oklch(0.60 0.10 145)    #4A8A5C   Success, positive
Warm Red        oklch(0.55 0.18 25)     #C44030   Error, critical
```

### Usage Proportions

| Role | Color | % |
|------|-------|---|
| Background | Warm White / Cream | 60-70% |
| Text | Charcoal / Deep Brown | 15-20% |
| Primary accent | Signal Orange | 5-10% |
| Supporting accents | Teal / Blue / Coral | 3-5% each |

**Max 3 colors per composition** (background + text + 1 accent). Second accent only when meaning requires it.

### Dark Mode

```
Deep Warm Dark  oklch(0.15 0.02 55)     #1E1A17   NOT pure black
Dark Surface    oklch(0.22 0.015 55)    #322C27   Card/surface elevation
Muted Stone     oklch(0.50 0.01 60)     #7A7470   Secondary text on dark
```

---

## Typography

- **No Inter.** It's the new Arial.
- Optical sizing: display text ≠ body text in the same family.
- Fluid scaling via `clamp()`. No breakpoint jumps.
- Line heights on 8px baseline grid.

### Scale

| Level | Size | Line Height | Weight |
|-------|------|-------------|--------|
| Display | clamp(2.5rem, 5vw, 4rem) | 1.1 | 700-800 |
| H1 | clamp(2rem, 3.5vw, 3rem) | 1.15 | 700 |
| H2 | clamp(1.5rem, 2.5vw, 2rem) | 1.2 | 600 |
| H3 | clamp(1.25rem, 1.75vw, 1.5rem) | 1.3 | 600 |
| Body | clamp(1rem, 1.15vw, 1.125rem) | 1.6 | 400 |
| Caption | clamp(0.8rem, 0.9vw, 0.875rem) | 1.4 | 400 |

### Fonts

| Context | Use | Fallback |
|---------|-----|----------|
| Headings | Instrument Serif, Fraunces | Georgia |
| Body | Instrument Sans, Source Sans 3 | system-ui |
| Mono | JetBrains Mono, Berkeley Mono | ui-monospace |
| Display | Instrument Serif Display | — |

---

## Spacing (0.5rem baseline grid)

All spacing in rem (px only for breakpoints, touch targets, 1-2px optical adjustments).

```
0.25rem (4px)  Tight: icon-to-label
0.5rem  (8px)  Base: default inline gap
1rem    (16px) Comfortable: paragraph spacing
1.5rem  (24px) Section element spacing
2rem    (32px) Subsection separation
3rem    (48px) Section separation
4rem    (64px) Major section breaks
6rem    (96px) Page-level breathing room
```

When in doubt, add more space.

---

## Layout

- **Max content width:** 65ch for body text
- **Grid:** 12-column with generous gutters
- **Section padding:** min 3rem vertical
- **Edge margins:** 4-8vw horizontal (never <1rem)

**Hierarchy:**
1. One focal point per section
2. Size communicates importance (don't use color alone)
3. Group related items by proximity
4. Left-align body text

**Anti-patterns:**
- No generic card grids
- No decoration dividers (spacing separates)
- No icons unless faster to parse than text
- No decorative drop shadows (only functional elevation)
- No gradient backgrounds (unless encoding data)

---

## Composition

1. 40-50% negative space minimum
2. Asymmetric balance preferred over centered
3. 2-4 key elements per composition
4. Clear reading flow (Z, F, or single column)
5. Contrast via size, weight, OR color — never all three

---

## Visual Metaphors

| Concept | Strategy |
|---------|----------|
| Architecture / Systems | Connected boxes, clean lines, orange on key paths |
| Data Flow | Directional arrows, orange primary, teal secondary |
| Comparisons | Side-by-side, split composition |
| Hierarchies | Tree/layered, size encodes importance |
| Processes | Numbered steps, left-to-right or top-to-bottom |
| Relationships | Network with weighted edges, node size = importance |

---

## Image Generation

### Positive Signals

```
clean typographic composition, warm neutral background,
generous whitespace, strong visual hierarchy,
Swiss-inspired grid, contemporary editorial design,
asymmetric balanced layout, warm color accents on neutral ground,
high contrast typography, modern magazine aesthetic
```

### Negative Signals

```
--no generic corporate stock photo feel
--no cluttered busy layouts
--no pure black backgrounds
--no neon or glowing effects
--no hand-drawn sketch style
--no decorative gradients
--no card grid layouts
--no Inter font
--no drop shadows
--no centered-everything symmetric layouts
```

### Prompt Template

```
[Content description] in clean contemporary editorial style.

STYLE: Warm neutral palette. Off-white or cream background.
Strong typographic hierarchy with confident weight contrast.
Swiss-grid-informed layout with generous whitespace.

COMPOSITION:
[2-4 elements with specific placement and proportion]

COLOR:
- Background: Warm white or cream (#FAF9F7 or #F2EDE6)
- Text/lines: Deep warm charcoal (#2A2520)
- Accent: ONE of Signal Orange #E8652A / Deep Teal #2B8A8A / Quiet Blue #5E7FAD
- 40-50% negative space minimum

CRITICAL:
- NOT corporate clipart or stock photo style
- Every element purposeful
- Professional warmth, not cold minimalism
- Contemporary editorial magazine quality
```

---

## Context Adaptation

- **Blog/editorial:** More expressive, larger type, bolder accents
- **Technical diagrams:** Restrained, clarity over aesthetics
- **Presentations:** Larger elements, higher contrast, simpler
- **Social media:** Bolder, more contrast, readable small
- **Documentation:** Most restrained, function over form
