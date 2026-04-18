---
name: design-system
context: same
description: |
  Create, consume, extract, and enforce design systems. Generates DESIGN.md brand files, extracts tokens, enforces compliance.
  USE WHEN: "design system", "design tokens", "DESIGN.md", "brand system", "hardcoded colors".
version: 1.0.0
user-invocable: true
argument-hint: "[generate|consume|extract|enforce] [target]"
---

Design system lifecycle management. Four modes: generate (create DESIGN.md from a website), consume (load DESIGN.md as context), extract (6-step token extraction), enforce (lint against design system).

**Source heritage:** Subsumes tokens v1.0.0 (was alias for `/impeccable extract`). Protocol: `../impeccable/reference/extract.md`. Format: VoltAgent awesome-design-md / Google Stitch DESIGN.md spec.

## Workflow Routing (SYSTEM PROMPT)

Four modes. Select by argument or infer from phrasing.

- Argument `generate` OR phrasing "generate DESIGN.md / create design system from / brand from this website / extract design from URL" → `## Mode: generate`
- Argument `consume` OR phrasing "use this DESIGN.md / load design context from / apply this brand" → `## Mode: consume`
- Argument `extract` OR phrasing "extract tokens / design tokens / hardcoded colors / theme variables / token hierarchy / build a design system" → `## Mode: extract`
- Argument `enforce` OR phrasing "enforce design system / check design compliance / lint tokens / find hardcoded values" → `## Mode: enforce`

If no argument and intent is ambiguous, ask which mode.

## MANDATORY PREPARATION

Design Context must be loaded (see CORE's Design Context Session Guard). If not loaded, run `/impeccable teach` first.

---

## Mode: generate

Create a DESIGN.md file from an existing website or project. Uses devtools-mcp for code inspection + screenshot capture.

### Input

- URL of a website to extract from, OR
- Path to an existing project to reverse-engineer

### Process

1. **Capture** — use devtools-mcp to open the target in a browser. Take full-page screenshot. Extract computed styles from key elements (body, headings, buttons, cards, forms, navigation).

2. **Extract visual tokens** — from the computed styles, identify:
   - Color palette (background, surface, text, accent, status colors)
   - Typography (font families, size scale, weight scale, line heights, letter spacing)
   - Spacing (margin/padding patterns, gap values)
   - Component styling (border radius, shadow values, border styles)
   - Elevation (shadow system)

3. **Synthesize** — organize extracted tokens into the 9-section DESIGN.md format.

### Output: DESIGN.md (9 sections)

```markdown
# Design System — [Brand Name]

## 1. Visual Theme & Atmosphere
- Mood (e.g., "premium minimalist", "warm editorial", "cinematic dark")
- Density (compact / comfortable / spacious)
- Design philosophy (1-2 sentences)

## 2. Color Palette & Roles
| Name | Value | Role |
|------|-------|------|
| Background | #hex | Page background |
| Surface | #hex | Cards, panels |
| Surface Elevated | #hex | Elevated elements |
| Text Primary | #hex | Headings, primary text |
| Text Secondary | #hex | Body text |
| Text Muted | #hex | Placeholders, timestamps |
| Accent | #hex | CTAs, links, active states |
| Accent Hover | #hex | Hover states |
| Success | #hex | Positive states |
| Warning | #hex | Caution states |
| Error | #hex | Destructive/error states |
| Border | #hex | Dividers, borders |

## 3. Typography Rules
| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Display | Family | Npx | N | N.N | Npx |
| H1 | Family | Npx | N | N.N | Npx |
| H2 | Family | Npx | N | N.N | Npx |
| H3 | Family | Npx | N | N.N | Npx |
| Body | Family | Npx | N | N.N | normal |
| Body Small | Family | Npx | N | N.N | normal |
| Caption | Family | Npx | N | N.N | Npx |
| Label | Family | Npx | N | N.N | Npx |
| Code | Monospace | Npx | N | N.N | normal |

## 4. Component Stylings
### Buttons
- Primary: background, color, radius, padding, font, hover state
- Secondary: border, color, radius, padding, hover state
- Ghost: color, hover background
- Disabled: opacity, cursor

### Cards
- Background, radius, shadow, padding, border

### Form Inputs
- Background, border, radius, padding, focus ring, error state

### Navigation
- Background, item spacing, active indicator, hover state

## 5. Layout Principles
- Spacing scale: [4, 8, 12, 16, 24, 32, 48, 64]px (or project-specific)
- Grid: N-column, gap Npx
- Max content width: Npx
- Whitespace philosophy

## 6. Depth & Elevation
| Level | Shadow | Use |
|-------|--------|-----|
| 0 | none | Flat elements |
| 1 | subtle | Cards, surfaces |
| 2 | medium | Elevated panels |
| 3 | deep | Modals, overlays |
| Focus | ring | Focus indicators |

## 7. Do's and Don'ts
- DO: [specific positive patterns]
- DON'T: [specific anti-patterns]

## 8. Responsive Behavior
- Breakpoints: mobile (320-767), tablet (768-1023), desktop (1024+)
- Touch targets: 44×44px minimum
- Content reflow strategy

## 9. Agent Prompt Guide
Quick reference for AI consumption:
- Primary font: [family], fallback: [family]
- Accent color: #hex
- Spacing unit: Npx
- Border radius: Npx
- Key constraint: [1-sentence design rule]
```

Write to `DESIGN.md` in the project root. If a `.impeccable.md` already exists, offer to create DESIGN.md alongside or update .impeccable.md.

---

## Mode: consume

Load a DESIGN.md (or .impeccable.md) as design context for the current session.

### Process

1. **Locate** — check for DESIGN.md in project root, then .impeccable.md
2. **Parse** — extract color palette, typography, spacing, component rules, dos/don'ts
3. **Load as constraints** — present the parsed design system as active constraints for any subsequent design work in this session
4. **Validate** — check the loaded tokens against the current codebase for drift

### Output

A structured summary of loaded design context, plus a drift report if the codebase diverges from the defined tokens.

---

## Mode: extract

The 6-step extraction protocol from `../impeccable/reference/extract.md`. Extracts reusable tokens and components from an existing codebase.

### 6-Step Protocol

1. **Discover** — find existing design system/component library/shared UI dir. Understand structure, conventions, import/export patterns. If none exists, ask user before creating.
2. **Identify patterns** — look for: repeated components (3+ uses), hardcoded values (colors, spacing, typography, shadows), inconsistent variations, composition patterns, type styles, animation patterns. **Only extract things used 3+ times with the same intent.**
3. **Plan extraction** — map: components to extract, tokens to create, variants to support, naming conventions (match existing), migration path.
4. **Extract & enrich** — build improved reusable versions: clear props API, proper variants, accessibility built in, documentation. For tokens: clear naming (primitive vs semantic), proper hierarchy.
5. **Migrate** — find all instances, replace systematically, test thoroughly, delete dead code.
6. **Document** — add to component library, document token usage/values, add examples, update Storybook/catalog.

### Anti-patterns

- Creating tokens for every value (tokens need semantic meaning)
- Extracting things that differ in intent (not every shared value should be a token)
- Premature abstraction before the 3+ uses rule
- Skipping TypeScript types
- Overly-generic components

---

## Mode: enforce

Lint existing UI against the loaded design system for compliance.

### Checks

1. **Hardcoded colors** — any color value not from a token
2. **Inconsistent spacing** — values not on the spacing scale
3. **Wrong font sizes** — sizes not in the typography table
4. **Missing tokens** — values that should be tokens but aren't
5. **Token drift** — visual values diverging from defined tokens
6. **Component compliance** — components not following defined styling rules

### Output

Compliance report:
- Total violations by category
- Each violation: file, line, current value, expected token/value, severity (P0-P3)
- Quick-fix suggestions

---

## Hand-off

After design-system work:
- `/review` — verify compliance after extraction or enforcement
- `/finish` — final quality pass after token migration
- `/impeccable craft` — build using the new design system

Doctrine: `../impeccable/reference/extract.md` (6-step protocol)
