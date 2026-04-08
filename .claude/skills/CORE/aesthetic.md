# PAI Visual Aesthetic System

**Warm, systematic, anti-generic. Informed by Impeccable.style's vocabulary rigor and Tailwind Oatmeal's approachable warmth.**

---

## Core Concept: Intentional Clarity

Every visual output earns its existence through purpose. No decoration for decoration's sake. Typography drives hierarchy. Color communicates meaning. Space gives the eye room to think.

**The Philosophy:** *"If it doesn't clarify, remove it."*
- Hierarchy before aesthetics
- Warmth before coldness
- Systematic before arbitrary
- Accessible before clever

---

## Color System (OKLCH-Based)

Use OKLCH for perceptual uniformity — colors that *feel* equally spaced, not just mathematically so.

### Warm Neutrals (Foundation)

```
Warm White      oklch(0.98 0.005 80)    #FAF9F7   — Primary background
Cream           oklch(0.95 0.01  75)    #F2EDE6   — Secondary background, cards
Sand            oklch(0.88 0.015 70)    #DED4C6   — Borders, dividers
Stone           oklch(0.65 0.01  60)    #9A9288   — Secondary text, captions
Charcoal        oklch(0.35 0.015 55)    #4A443D   — Primary text
Deep Brown      oklch(0.20 0.02  50)    #2A2520   — Headings, emphasis
```

**No pure black (#000) or pure white (#FFF).** Everything has warmth.

### Accent Palette

```
Signal Orange   oklch(0.70 0.20 45)     #E8652A   — Primary action, emphasis
Soft Coral      oklch(0.75 0.12 40)     #D98A6A   — Secondary warmth
Deep Teal       oklch(0.55 0.10 195)    #2B8A8A   — Information, links
Quiet Blue      oklch(0.60 0.08 240)    #5E7FAD   — Secondary information
Moss Green      oklch(0.60 0.10 145)    #4A8A5C   — Success, positive
Warm Red        oklch(0.55 0.18 25)     #C44030   — Error, critical
```

### Color Usage

| Role | Color | Usage % |
|------|-------|---------|
| Background | Warm White / Cream | 60-70% |
| Text | Charcoal / Deep Brown | 15-20% |
| Primary accent | Signal Orange | 5-10% |
| Supporting accents | Teal / Blue / Coral | 3-5% each |

**Rule:** Maximum 3 colors per composition (background + text + 1 accent). Add a second accent only when meaning requires it.

### Dark Mode Variant

When dark backgrounds are needed (presentations, hero sections):

```
Deep Warm Dark  oklch(0.15 0.02 55)     #1E1A17   — NOT pure black
Dark Surface    oklch(0.22 0.015 55)    #322C27   — Card/surface elevation
Muted Stone     oklch(0.50 0.01 60)     #7A7470   — Secondary text on dark
```

---

## Typography

### Principles
- **No Inter.** It's the new Arial — everywhere, nothing.
- **Optical sizing matters.** Display text ≠ body text, even in the same family.
- **Fluid scaling.** Use `clamp()` for responsive type. No breakpoint jumps.
- **Vertical rhythm.** Line heights on the 8px baseline grid.

### Scale (Fluid)

| Level | Size | Line Height | Weight | Use |
|-------|------|-------------|--------|-----|
| Display | clamp(2.5rem, 5vw, 4rem) | 1.1 | 700-800 | Hero, title cards |
| H1 | clamp(2rem, 3.5vw, 3rem) | 1.15 | 700 | Page headings |
| H2 | clamp(1.5rem, 2.5vw, 2rem) | 1.2 | 600 | Section headings |
| H3 | clamp(1.25rem, 1.75vw, 1.5rem) | 1.3 | 600 | Subsections |
| Body | clamp(1rem, 1.15vw, 1.125rem) | 1.6 | 400 | Paragraphs |
| Caption | clamp(0.8rem, 0.9vw, 0.875rem) | 1.4 | 400 | Labels, metadata |

### Font Recommendations

| Context | Recommended | Fallback | Why |
|---------|------------|----------|-----|
| Headings | Instrument Serif, Fraunces | Georgia | Warmth, character, optical sizing |
| Body | Instrument Sans, Source Sans 3 | system-ui | Clean geometric, not Inter |
| Mono | JetBrains Mono, Berkeley Mono | ui-monospace | Coding contexts |
| Display | Instrument Serif Display | — | Maximum impact |

---

## Spacing System

**0.5rem baseline grid.** All spacing derives from multiples of 0.5rem (8px at default 16px base). Use rem for all spacing tokens — scales with user font-size preferences. px only for breakpoints, touch targets, and 1-2px optical adjustments.

```
0.25rem (4px)  — Tight: icon-to-label, related items
0.5rem  (8px)  — Base: default gap between inline elements
1rem    (16px) — Comfortable: paragraph spacing, list gaps
1.5rem  (24px) — Section element spacing
2rem    (32px) — Subsection separation
3rem    (48px) — Section separation
4rem    (64px) — Major section breaks
6rem    (96px) — Page-level breathing room
```

**Principle:** When in doubt, add more space, not less. Generous whitespace signals quality.

---

## Layout

### Grid
- **Max content width:** 65ch for body text (readability optimal)
- **Layout grid:** 12-column with generous gutters
- **Section padding:** Minimum 3rem vertical between sections
- **Edge margins:** 4-8vw horizontal (fluid, never less than 1rem)

### Hierarchy Rules
1. **One focal point per section.** Everything else supports it.
2. **Size communicates importance.** Don't use color alone for hierarchy.
3. **Group related items.** Proximity > labels for showing relationships.
4. **Alignment creates order.** Left-align body text. Center only titles (if at all).

### Anti-Patterns
- **No card soup.** Generic card grids are lazy design. Each layout decision should be intentional.
- **No decoration dividers.** If two sections need separating, spacing alone should do it.
- **No icon-for-the-sake-of-icons.** Only use icons when they're faster to parse than text.
- **No drop shadows as design.** Shadows are functional (elevation), not decorative.
- **No gradient backgrounds.** Unless communicating a specific data dimension.

---

## Composition Rules

1. **40-50% negative space** — The empty space IS the design.
2. **Asymmetric balance preferred** — Dynamic, not static centered layouts.
3. **2-4 key elements per composition** — More than 4 = too complex.
4. **Clear reading order** — Eye should flow naturally (Z-pattern, F-pattern, or single column).
5. **Contrast for emphasis** — Size, weight, or color. Never all three simultaneously.

---

## Visual Metaphors (For Image Generation)

| Concept | Strategy | Notes |
|---------|----------|-------|
| Architecture / Systems | Connected boxes, clean lines | Warm neutrals, accent on key paths |
| Data Flow | Directional arrows, flow lines | Orange for primary flow, teal for secondary |
| Comparisons | Side-by-side, split composition | Clear labels, minimal decoration |
| Hierarchies | Tree or layered diagram | Size encodes importance |
| Processes | Numbered steps, timeline | Left-to-right or top-to-bottom flow |
| Relationships | Network with weighted edges | Node size = importance |

---

## Image Generation Prompting

### Positive Signals

```
"clean typographic composition"
"warm neutral background, cream or off-white"
"generous whitespace, breathing room"
"strong visual hierarchy"
"Swiss-inspired grid discipline"
"contemporary editorial design"
"professional, authoritative but approachable"
"asymmetric balanced layout"
"minimal elements, purposeful placement"
"warm color accents on neutral ground"
"high contrast typography"
"modern magazine aesthetic"
```

### Negative Signals

```
--no generic corporate stock photo feel
--no cluttered busy layouts
--no pure black backgrounds (use warm darks instead)
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
[Describe 2-4 elements with specific placement and proportion]

COLOR:
- Background: Warm white or cream (#FAF9F7 or #F2EDE6)
- Text/lines: Deep warm charcoal (#2A2520)
- Accent: [Choose ONE from: Signal Orange #E8652A, Deep Teal #2B8A8A, Quiet Blue #5E7FAD]
- 40-50% negative space minimum

CRITICAL:
- NOT corporate clipart or stock photo style
- Clean, intentional, every element purposeful
- Professional warmth, not cold minimalism
- Contemporary editorial magazine quality
```

---

## Dynamic Application

**Every visual should:**
- Match content needs (diagram type, information density)
- Use the right level of complexity (simple for simple ideas)
- Maintain warm, accessible tone
- Prioritize legibility and hierarchy over style
- Work at the size it will be displayed (don't over-detail thumbnails)

**Adaptation by context:**
- **Blog/editorial:** More expressive, can use larger type and bolder accents
- **Technical diagrams:** More restrained, clarity over aesthetics
- **Presentations:** Larger elements, higher contrast, simpler compositions
- **Social media:** Bolder, more contrast, readable at small sizes
- **Documentation:** Most restrained, function over form

---

**This is the PAI aesthetic: Warm clarity over cold perfection. Every element earns its place.**
