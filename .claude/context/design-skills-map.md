# Design Skills — Landscape & Pipeline

**Purpose:** one-page map of Qara's design-skill terrain after the 2026-04-16 pipeline-stage consolidation (plan v1.1) + skill review fixes.

**Source of truth for pipeline:** `.claude/skills-external/impeccable/reference/craft.md`. This map points there; it does not duplicate it.

**Recipes for common tasks:** `.claude/context/design-cookbook.md` — 18 recipes keyed to situations.

**Session guard:** Design Context is checked once per session (see CORE's Design Context Session Guard), not repeated per skill invocation.

---

## Pipeline

```
design-research (optional, fills research/inspiration gap)
  ↓
shape (optional, feature-scoped)
  ↓
impeccable teach       ← load Context Gathering Protocol + Design Context
  ↓
impeccable craft       ← 5-step methodology (see craft.md)
  OR
design-implementation  ← automated dev-server + browser verify loop
  ↓
review (UX + technical, dual-assessment)    ← replaces critique + audit
  ↓
[ enhance | tune | impeccable-typeset ]     ← thin dispatchers, doctrine in impeccable refs
  ↓
finish (polish + copy)                       ← replaces polish + clarify
  ↓
ship

Orthogonal:
design-system       ← generate/consume/extract/enforce DESIGN.md + tokens (replaces tokens)
flows               ← product-scoped journeys, IA, navigation (distinct from shape's feature scope)
```

---

## Inventory (post-consolidation v1.1)

**Local (canonical in qara):** 13 skills
- `review` — UX + technical design review (absorbs critique, audit). Dual-assessment with scored dimensions.
- `enhance` — thin dispatcher for layout, motion, responsive, performance (absorbs layout, animate, adapt, optimize).
- `finish` — pre-ship polish + copy clarity (absorbs polish, clarify). Default runs both.
- `design-system` — DESIGN.md generation/consumption, token extraction, enforcement (subsumes tokens).
- `design-research` — mood boards, competitive analysis, inspiration (fills research/inspiration gap).
- `tune` — intensity dispatcher (bolder/quieter/colorize modes).
- `impeccable-typeset` — typography wrapper over `impeccable/reference/typography.md`.
- `flows` — user journey / IA / navigation.
- `design-it-twice` — parallel-agent module design (software-biased; not UI-only).
- `design-implementation` — automated dev-server + browser loop.
- `product-shaping` — problem framing through research and specs.
- `image` — AI image generation / stock sourcing.
- `csf-view` — tldraw canvas input.

**Symlinks to `skills-external/`:** 2 active
- `harden` — resilience (a11y, i18n, edge cases).
- `visual-explainer` — diagrams + visual explainers.

**Reference-only (in `skills-external/`, no activation path):** impeccable, shape, layout, critique, audit, polish, animate, adapt, clarify, optimize, bolder, quieter, colorize, typeset, arrange, normalize, onboard, extract, delight, distill, overdrive, frontend-design, teach-impeccable. Content preserved for `designer` agent and reference reads. Each lists its absorber in the Source Heritage section of the absorbing skill.

**Agent:** `designer` (opus, loads `impeccable` skill).

---

## Consolidation rules

0. **Design Context Session Guard.** CORE checks for Design Context once per session. Individual skills reference this guard instead of repeating the full preparation protocol.
1. **`review` absorbs critique + audit.** Three sub-modes: ux (sequential dual-assessment: LLM then automated), technical (5 scored dimensions), full (default, both). Doctrine: `impeccable/reference/{cognitive-load, heuristics-scoring, personas}.md`.
2. **`enhance` absorbs layout, animate, adapt, optimize.** Thin dispatcher (follows `tune` pattern). Four sub-modes: layout, motion, responsive, performance. Doctrine in `impeccable/reference/{spatial-design, motion-design, responsive-design}.md`.
3. **`finish` absorbs polish + clarify.** Default runs both sub-modes. Polish: 12-dimension systematic pass + 20-item checklist. Copy: UX writing clarity across 9 areas.
4. **`design-system` subsumes `tokens`.** Four modes: generate (create DESIGN.md via devtools-mcp), consume (load as context), extract (6-step protocol from extract.md), enforce (lint compliance).
5. **`design-research` fills the research/inspiration gap.** Three modes: moodboard, competitive, inspiration. Output: structured research brief.
6. **`tune` is a thin dispatcher.** Three modes share MANDATORY PREPARATION and reference `impeccable/reference/*.md` for doctrine.
7. **`impeccable-typeset` is a local wrapper.** Upstream `typeset` was a procedural shell over `typography.md`.
8. **`flows` is additive.** Product-scoped, distinct from shape's feature scope.

---

## Lifecycle coverage

| Stage | Skill(s) | Status |
|---|---|---|
| Research / inspiration | `design-research` | ✓ (was gap) |
| Problem framing | `shape`° | ref-only |
| Concept exploration | `design-it-twice`, `csf-view` | ✓ |
| Wireframe / shape | `shape`°, `csf-view` | ref-only + active |
| Visual design | `impeccable`°, `enhance layout`, `tune`, `image` | ref-only + active |
| Motion | `enhance motion` + `motion-design.md` | ✓ |
| Implementation | `design-implementation`, `impeccable`° craft | ✓ |
| Critique / review | `review` | ✓ |
| Technical audit | `review` (technical sub-mode) | ✓ |
| Polish | `finish` (polish sub-mode) | ✓ |
| Copy clarity | `finish` (copy sub-mode) | ✓ |
| Accessibility | `harden`, `review` | active |
| Responsive | `enhance responsive` | ✓ |
| Performance | `enhance performance` | ✓ |
| User flow / IA | `flows` | ✓ |
| Design tokens | `design-system` (extract/consume) | ✓ |
| Design compliance | `design-system` (enforce) | ✓ |
| Post-ship iteration | — | **parked gap** (Q3 2026) |

° = reference-only (in `skills-external/`). Accessible via `designer` agent or direct Read.

---

## Keyword routing (design-skill phrases)

Routes live in `.claude/hooks/lib/keyword-routes.json`. Tested via `.claude/tests/keyword-router.test.ts`.

| Phrase cluster | Route |
|---|---|
| "critique / audit / review / is this shippable / empty state / loading state / error state" | `review` |
| "fix layout / add animation / make responsive / bundle size / Core Web Vitals" | `enhance` |
| "polish / pre-ship / ship-ready / clarify / UX copy" | `finish` |
| "design system / design tokens / DESIGN.md / hardcoded colors / brand system" | `design-system` |
| "mood board / competitive analysis / design research / inspiration" | `design-research` |
| "too loud / too safe / too gray" | `tune` |
| "typography off / fonts look wrong / readability issues / typeset" | `impeccable-typeset` |
| "user flow / user journey / information architecture / site map" | `flows` |

---

## Open questions (parked)

- Absorb `typeset` into upstream `impeccable` as a core mode — removes the need for `impeccable-typeset` local wrapper. Low-priority external PR.
- Post-ship iteration skill — revisit Q3 2026.
- Mode skills (drive/cruise/turbo) design-aware routing — revisit after 2 weeks of instrumented usage.

---

## References

- Canonical pipeline: `.claude/skills-external/impeccable/reference/craft.md`
- Token / design-system protocol: `.claude/skills-external/impeccable/reference/extract.md`
- Doctrine library: `.claude/skills-external/impeccable/reference/{typography,color-and-contrast,spatial-design,motion-design,interaction-design,responsive-design,ux-writing}.md`
- Research: VoltAgent awesome-design-md (DESIGN.md spec), recursive-mode (audited-phase pattern)
- Consolidation plan: `thoughts/shared/plans/design--skills-landscape-consolidation-v1.md`
