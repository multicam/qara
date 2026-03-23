# TGDS Visual Aesthetic

**Brand-specific aesthetic for The Graphic Design School. Extends the CORE aesthetic with TGDS identity.**

For system-wide defaults, see: `${PAI_DIR}/skills/CORE/aesthetic.md`

---

## Brand Identity

**The Graphic Design School** — accredited online design education.
Philosophy: "OLD SCHOOL meets NEW SCHOOL" — design culture understanding paired with solid design process.

---

## Color System

### Primary Brand Colors

```
TGDS Blue       #2E00B2   — Primary brand identifier, headings, key elements
TGDS Dark Blue  #1C0089   — Hover states, depth, emphasis variation
TGDS Yellow     #FFE900   — Energy accent, CTAs, highlights, student engagement
```

### Supporting Palette

```
Clean White     #FFFFFF   — Backgrounds, contrast
Near Black      #222222   — Primary text
Red Accent      #B51429   — Alerts, corrections, critical callouts
Green Accent    #0AC057   — Success, positive examples, "good design" indicators
Orange Accent   #FA4802   — Tertiary warmth
```

### Neutral Scale

```
10% Grey        #F2F2F2   — Light backgrounds, subtle sections
30% Grey        #E0E0E0   — Borders, dividers
50% Grey        #909090   — Secondary text, captions
70% Grey        #545454   — Tertiary text, metadata
```

### Color Usage for Content Types

| Content Type | Primary | Accent | Background |
|-------------|---------|--------|------------|
| Blog posts | TGDS Blue | Yellow highlights | White |
| Teaching materials | TGDS Blue | Green (good) / Red (bad) | White or 10% Grey |
| Social media | TGDS Blue | Yellow | White or Blue background |
| Brand assets | TGDS Blue + Yellow | — | White |
| UI mockups | Neutral greys | Blue for interactive | White |

---

## Typography

### Brand Font: Gotham

| Weight | Value | Usage |
|--------|-------|-------|
| Book (300) | Light body copy | Extended reading, elegant passages |
| Regular (400) | Standard body | Default text |
| Medium (500) | Emphasis | Secondary headings, important labels |
| Bold (700) | Strong emphasis | Primary headings, CTAs |
| Extra Bold (800) | Maximum impact | Hero sections, display text |

### Type Scale (Fluid)

```
Display:    clamp(2.5rem, 7vw, 7vw)       — Hero, title cards
H1:         clamp(2rem, 5vw, 5vw)          — Page headings
H2:         clamp(1.75rem, 3.125vw, 3.125vw) — Section headings
Body:       clamp(1rem, 1.25vw, 1.25vw)    — Paragraphs
Caption:    clamp(0.875rem, 1vw, 1vw)      — Labels, metadata
```

### Typography Rules for Generated Content

- **Headings:** Gotham Bold or Extra Bold, TGDS Blue
- **Body:** Gotham Regular, Near Black
- **Captions/labels:** Gotham Medium, 50% Grey
- **Code/technical:** Monospace (JetBrains Mono, Consolas)
- **Emphasis:** Bold weight, not italic. Never underline for emphasis.

---

## Composition

### Layout Principles
- **Generous whitespace** — Premium feel, not cramped
- **Strong grid** — Content aligns to clear vertical/horizontal guides
- **Blue + Yellow balance** — Blue dominates (professional), yellow punctuates (energy)
- **Left-aligned body text** — Always. Never justify.

### By Content Type

**Blog/Editorial:**
- Large hero image or bold typographic header
- Blue headings, yellow pull-quote accents
- Clean single-column body with comfortable margins
- Images captioned in 50% Grey

**Teaching Materials:**
- Clear numbered steps or labeled diagrams
- Green/Red coding for good/bad examples
- Generous annotation space
- Progressive disclosure (simple → complex)

**Social Media:**
- Bold, high-contrast compositions
- TGDS Blue background + White or Yellow text
- Readable at thumbnail size (test at 150x150px)
- Brand mark placement consistent

**Brand Assets:**
- Strict color compliance (exact hex values)
- Logo clear space rules maintained
- Blue + Yellow only (no supporting colors)

---

## Image Generation Prompting (TGDS-Specific)

### Positive Signals

```
"professional design education aesthetic"
"clean geometric sans-serif typography (Gotham style)"
"deep blue (#2E00B2) and bright yellow (#FFE900) accents"
"white or light grey background"
"strong typographic hierarchy with bold weight contrast"
"contemporary design school quality"
"Swiss-grid-informed layout"
"high contrast, saturated brand colors"
"authoritative yet approachable"
"educational clarity, easy to follow"
```

### Negative Signals

```
--no dark/black backgrounds (unless specifically requested)
--no neon or glowing effects
--no hand-drawn sketch style (this is a professional institution)
--no generic stock photography
--no cluttered or busy compositions
--no muted or desaturated colors (brand is bold)
--no serif fonts for headings
--no decorative elements without purpose
```

### Prompt Template

```
[Content description] for a professional graphic design school.

STYLE: Clean, contemporary, educational. Strong typographic hierarchy.
Deep blue and bright yellow brand accents on white background.

COMPOSITION:
[Describe 2-4 elements with specific placement]

COLOR:
- Background: White (#FFFFFF) or light grey (#F2F2F2)
- Primary: Deep blue (#2E00B2) for headings and structure
- Accent: Bright yellow (#FFE900) for highlights and energy
- Text: Near black (#222222) for body copy

TYPOGRAPHY:
- Bold geometric sans-serif for headings
- Clean, professional hierarchy
- Educational clarity — information is easy to parse

CRITICAL:
- Must feel like it belongs to a design institution
- Professional, not playful (but not stiff)
- Bold brand colors, not muted
- Teach by example — the image itself should demonstrate good design
```

---

## Relationship to CORE Aesthetic

TGDS aesthetic **overrides** CORE when creating content explicitly for The Graphic Design School. Key differences:

| Element | CORE | TGDS |
|---------|------|------|
| Background | Warm cream (#FAF9F7) | Clean white (#FFFFFF) |
| Primary accent | Signal Orange (#E8652A) | TGDS Blue (#2E00B2) |
| Secondary accent | Deep Teal (#2B8A8A) | TGDS Yellow (#FFE900) |
| Heading font | Instrument Serif | Gotham Bold |
| Body font | Instrument Sans | Gotham Regular |
| Mood | Warm editorial | Bold professional |

**When to use which:**
- Creating content FOR TGDS (blog, teaching, social) → **TGDS aesthetic**
- Creating content for other projects or generic PAI use → **CORE aesthetic**
- Unclear context → Default to **CORE**, ask JM if brand-specific

---

**TGDS aesthetic: Design education that teaches by example. Every visual demonstrates the principles it teaches.**
