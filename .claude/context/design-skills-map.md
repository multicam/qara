# Design Skills — Landscape & Pipeline

**Purpose:** one-page map of Qara's design-skill terrain after the 2026-04-16 consolidation (plan v1.2).

**Source of truth for pipeline:** `.claude/skills-external/impeccable/reference/craft.md`. This map points there; it does not duplicate it.

**Recipes for common tasks:** `.claude/context/design-cookbook.md` — 15 recipes keyed to situations (feature build, critique + fix, tune intensity, typography, tokens, flows, responsive, a11y, performance, states, pre-ship).

---

## Pipeline

```
shape (optional, feature-scoped)
  ↓
impeccable teach       ← load Context Gathering Protocol + Design Context
  ↓
impeccable craft       ← 5-step methodology (see craft.md)
  OR
design-implementation  ← automated dev-server + browser verify loop
  ↓
critique (UX)  +  audit (technical)         ← parallel review
  ↓
[ tune | impeccable-typeset | layout | animate | adapt | clarify | harden | optimize ]
  ↓
polish (includes state-coverage routing)
  ↓
ship

Orthogonal:
impeccable extract  ← design-system + tokens (6-step per extract.md); also reachable as /tokens
flows               ← product-scoped journeys, IA, navigation (distinct from shape's feature scope)
```

---

## Inventory (post-consolidation)

**Local (canonical in qara):** 8 skills
- `tune` — intensity dispatcher (bolder/quieter/colorize modes). Consolidated 2026-04-16.
- `impeccable-typeset` — typography wrapper over `impeccable/reference/typography.md`. Consolidated 2026-04-16.
- `tokens` — thin alias for `/impeccable extract`. Added 2026-04-16.
- `flows` — user journey / IA / navigation. Added 2026-04-16 (real gap).
- `design-it-twice` — parallel-agent module design (software-biased; not UI-only).
- `design-implementation` — automated dev-server + browser loop.
- `image` — AI image generation / stock sourcing.
- `csf-view` — tldraw canvas input.

**Symlinks to `skills-external/`:** 12 active (down from 16)
- `impeccable` — hub skill (craft / teach / extract modes). Owns the reference library.
- `shape` — feature-scoped UX discovery + design brief.
- `layout` — spatial rhythm + composition.
- `critique` — UX review (heuristics, personas, quality scoring).
- `audit` — technical review (a11y, performance, theming).
- `polish` — pre-ship quality pass. Also owns state-coverage (empty/loading/error) verification per the 2026-04-16 routing.
- `animate` — motion + micro-interactions.
- `adapt` — responsive / cross-device.
- `clarify` — UX copy (error messages, labels, empty-state formula).
- `harden` — resilience (a11y, i18n, edge cases).
- `optimize` — performance (bundle, render, images).
- `visual-explainer` — diagrams + visual explainers.

**Removed (symlinks only; upstream preserved in `skills-external/`):**
- `bolder`, `quieter`, `colorize` → merged into `tune`.
- `typeset` → wrapped by `impeccable-typeset`.

**Agent:** `designer` (opus, loads `impeccable` skill). Fix shipped 2026-04-16 from broken `frontend-design` reference.

---

## Consolidation rules

1. **`tune` is a thin dispatcher.** Three modes (bolder/quieter/colorize) share MANDATORY PREPARATION and reference `impeccable/reference/*.md` for doctrine. The skill owns procedure only; it MUST NOT restate OKLCH ranges, 60-30-10, typography scales, or motion timing from impeccable refs.
2. **`impeccable-typeset` is a local wrapper.** Upstream `typeset` was a procedural shell over `typography.md`. Our wrapper preserves the procedure and makes the doctrine pointer explicit. The wrapper is local because upstream `impeccable` doesn't yet expose `typeset` as a mode (see open-questions below).
3. **`tokens` is an alias.** Body ≤ 40 lines, delegates to `/impeccable extract` (6-step protocol in extract.md). Exists because "design tokens" is phrase-distant from "extract."
4. **`flows` is additive.** Covers the gap between `shape` (feature-scoped) and IA/navigation/journey (product-scoped). Not absorbed anywhere.
5. **`states` was not created.** Copy already in `ux-writing.md`, interaction logic in `interaction-design.md`, visual verification routed to `polish` via state-phrase routing (Phase 7 of plan v1.2).

---

## Lifecycle coverage

| Stage | Skill(s) | Status |
|---|---|---|
| Problem framing | `shape` | ✓ |
| Research / inspiration | — | **parked gap** |
| Concept exploration | `design-it-twice`, `csf-view` | thin |
| Wireframe / shape | `shape`, `csf-view` | ✓ |
| Visual design | `impeccable`, `layout`, `tune`, `image` | ✓ |
| Motion | `animate` + `motion-design.md` | ✓ |
| Implementation | `design-implementation`, `impeccable craft` | ✓ |
| Critique / review | `critique`, `audit` | ✓ |
| Polish | `polish`, `clarify`, `harden` | ✓ (polish also covers state verification via routing) |
| Accessibility | `harden`, `audit`, `adapt` | thin but adequate |
| Responsive | `adapt` + `responsive-design.md` | ✓ |
| Performance | `optimize` | ✓ |
| User flow / IA | `flows` | ✓ (new) |
| Design tokens | `tokens` alias → `/impeccable extract` | ✓ (surfaced) |
| Post-ship iteration | — | **parked gap** |

---

## Keyword routing (design-skill phrases)

Routes live in `.claude/hooks/lib/keyword-routes.json`. All tested via `.claude/tests/keyword-router.test.ts`.

| Phrase cluster | Route |
|---|---|
| "too loud / too bold / too aggressive / overwhelming / garish" | `tune` (quieter mode) |
| "too safe / too bland / generic / boring / lacks personality" | `tune` (bolder mode) |
| "too gray / monochromatic / needs color / more vibrance" | `tune` (colorize mode) |
| "typography off / fonts look wrong / fix typography / readability issues" | `impeccable-typeset` |
| "design tokens / design system / hardcoded colors / theme variables" | `tokens` |
| "user flow / user journey / information architecture / site map / nav structure" | `flows` |
| "empty state / loading state / skeleton screen / error state / first-run" | `polish` |

Routes work via full-SKILL.md injection on match — no schema change was needed beyond route entries.

---

## Introspection

Phase 9 of plan v1.2 wires design-skill usage into the introspect miner:
- `design_skills_used` — counts per skill.
- `design_chains` — detected pipelines (`shape → impeccable → critique → polish`).
- `design_reinvocations` — same skill fired ≥2× (first-pass-insufficiency signal).
- `design_orphans` — critique/audit session without follow-on skill.
- `extract_usage` — `/impeccable extract` vs `/tokens` alias split.

See `.claude/hooks/lib/miner-skills-lib.ts` (pending Phase 9).

---

## Open questions (parked)

- Absorb `typeset` into upstream `impeccable` as a core mode — removes the need for `impeccable-typeset` local wrapper. Low-priority external PR.
- Research/inspiration dedicated skill (lifecycle stage b) — revisit if `research` + Diderot prove insufficient.
- Post-ship iteration skill (stage m) — revisit Q3 2026.
- Mode skills (drive/cruise/turbo) design-aware routing — revisit after 2 weeks of instrumented usage.
- `visual-explainer` + `image` mermaid consolidation — low priority, different surfaces.

---

## References

- Canonical pipeline: `.claude/skills-external/impeccable/reference/craft.md`
- Token / design-system protocol: `.claude/skills-external/impeccable/reference/extract.md`
- Doctrine library: `.claude/skills-external/impeccable/reference/{typography,color-and-contrast,spatial-design,motion-design,interaction-design,responsive-design,ux-writing}.md`
- Consolidation plan: `thoughts/shared/plans/design--skills-landscape-consolidation-v1.md`
