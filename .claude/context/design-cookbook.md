# Design Cookbook

Recipes for common design tasks, keyed to Qara's skill surface after the pipeline-stage consolidation (v1.1). Each recipe starts from a situation, names the skills in order, and ends with a verification gate.

> **Companion docs:**
> - `.claude/context/design-skills-map.md` — inventory, pipeline diagram, lifecycle coverage
> - `.claude/skills-external/impeccable/reference/craft.md` — 5-step build methodology
> - `.claude/skills-external/impeccable/reference/extract.md` — 6-step design-system protocol

**The golden rule:** every recipe begins with ensuring Design Context exists. Without it, every design skill produces generic output. The CORE skill's Design Context Session Guard handles this: Design Context is checked once per session (`.impeccable.md` exists or `/impeccable teach` has run), not repeated per skill invocation.

---

## Recipe 1 — Build a feature from scratch

**Situation:** a PRD row or user story. Nothing built yet.

**Path:**
1. `/shape` — discovery interview → design brief.
2. `/impeccable craft` — loads references → builds in 7-step order (structure → layout → typography+color → interactive states → edge cases → motion → responsive) → visual iteration loop → presents.
3. `/review` — combined UX + technical assessment. Dual-assessment scores design health (/40) + audit health (/20).
4. `/finish` — polish + copy clarity pass.

**Verification gate:** `review` returns no P0/P1. `finish` checklist complete.

**When to skip `shape`:** trivial scope (one-line change) OR the PRD already includes a detailed design brief. If in doubt, run it — shape catches assumptions early.

---

## Recipe 2 — Build with automated browser verification

**Situation:** PRD task targeting a running app. Want the "it actually works" evidence.

**Path:**
1. `/shape` (optional).
2. `design-implementation` — starts dev server + browser, implements via impeccable, checks console/TypeScript/network for errors, iterates up to 5 times.
3. `/review`.
4. `/finish`.

**When to use over Recipe 1:** the app runs locally and you want visual verification. When headless or pre-dev-server, stay with Recipe 1.

---

## Recipe 3 — "Something feels wrong but I can't name it"

**Situation:** you look at the screen and something is off. Don't know what.

**Path:**
1. `/review` — tells you what's wrong. Specific failures: hierarchy, density, emotional resonance, AI-slop anti-patterns, accessibility gaps, performance bottlenecks.
2. Apply the first recommended fix (review ends with a ranked action list).
3. `/review` again. Shouldn't fire on the same issues.

**Don't jump to `tune` bolder/quieter/colorize without knowing which direction.** Review diagnoses; the dials are applied after. Running `tune` blind is how you get design whiplash.

---

## Recipe 4 — "It's too loud / too safe / too gray"

**Situation:** you know the direction.

**Path:**
- `/tune bolder` — timid, generic, lacks personality. Amplifies typography scale, color saturation, spatial drama, motion, composition.
- `/tune quieter` — aggressive, overwhelming, garish. Reduces saturation, weight, visual noise, motion intensity.
- `/tune colorize` — monochrome, dull, needs warmth. Adds strategic color (2-4 colors, 60-30-10, OKLCH semantic tokens).

**Phrase routing:**
- "too loud / aggressive / overwhelming / garish" → quieter mode
- "too safe / bland / generic / boring" → bolder mode
- "too gray / monochromatic / dull" → colorize mode

**After `tune`:** re-run `/review` to confirm the direction was right.

---

## Recipe 5 — Typography repair

**Situation:** fonts look generic, hierarchy is muddy, body is hard to read.

**Path:**
1. `/impeccable-typeset` — 5-dimension assessment (font choice, hierarchy, sizing, readability, consistency). Applies fixes per `impeccable/reference/typography.md`.

**Anti-patterns caught:** invisible defaults (Inter, Roboto, system), too many families (>2-3), muddy hierarchy (sizes too close: 14/15/16), body below 16px, no scale.

**After typeset:** likely need `/enhance layout` if spatial rhythm is also off.

---

## Recipe 6 — Design system extraction / tokens

**Situation:** hardcoded values scattered; repeated patterns without abstraction; no single source of truth for colors, type, spacing.

**Path:**
- `/design-system extract` — 6-step protocol from `impeccable/reference/extract.md`:
  1. Discover — find the existing system (or lack thereof)
  2. Identify patterns — "3+ uses" rule (don't abstract until 3+ uses exist)
  3. Plan extraction — primitive + semantic tokens (two-layer hierarchy)
  4. Extract & enrich — build tokens, add ARIA/keyboard on components
  5. Migrate — update all existing uses
  6. Document — design-system doc

**Anti-patterns caught:** token for every value (tokens need semantic meaning), extracting things that differ in intent, premature abstraction before the 3+ rule.

---

## Recipe 7 — User flow / journey / IA

**Situation:** multi-step tasks, navigation design, cross-feature journeys, site-map questions.

**Not `shape`** — shape is feature-scoped. Use `flows` for product-scope.

**Path:**
1. `/flows` with argument:
   - `/flows journey-map` — map one user goal end-to-end: actor → trigger → steps → decisions → success/failure
   - `/flows ia-audit` — menu / hierarchy / entry points / findability / progressive disclosure
   - `/flows flow-diff` — current vs proposed, side-by-side, with rationale
2. Hand off — if the journey surfaces a new feature, `/shape` → `/impeccable craft`.

**IA anti-patterns caught:** catch-all "More" / "Settings" dumping grounds, deep hierarchies (>3 levels), labels matching internal model not user vocabulary, nav that changes across sections, search as substitute for architecture.

---

## Recipe 8 — Responsive / multi-device

**Situation:** design built for one viewport; need to handle others.

**Path:**
1. `/enhance responsive` — mobile-first breakpoints, pointer/hover queries, safe areas, adaptive nav, email constraints. Doctrine in `impeccable/reference/responsive-design.md`.
2. `/harden` if edge cases remain (text overflow, long strings, i18n expansion).

**When to also run `/enhance layout`:** if the responsive pass exposes spacing issues (gaps that work at desktop break down on mobile).

---

## Recipe 9 — Accessibility / resilience

**Situation:** features work for the golden path but break on keyboard, screen readers, weird inputs, or long text.

**Path:**
1. `/harden` — keyboard navigation, ARIA labels, reduced motion, RTL, i18n (CJK, pluralization, logical CSS), error states, text overflow, screen reader semantics, focus management.
2. `/review technical` — scores a11y / performance / theming / responsive / anti-patterns.

**Verification gate:** review technical a11y dimension >= 3/4. Manual tab-through works end-to-end. Screen reader announces state changes.

---

## Recipe 10 — Performance

**Situation:** load time, jank, bundle size complaints.

**Path:**
1. `/review technical` first — to measure. Performance dimension produces a score + bottleneck list.
2. `/enhance performance` — systematically addresses loading speed, rendering, animations, images, bundle size.

**When to also run `/enhance motion`:** if enhance performance removed animations that were serving a purpose, enhance motion can reintroduce purposeful motion with `transform`/`opacity`-only patterns.

---

## Recipe 11 — Empty / loading / error states

**Situation:** features work on the happy path; states are missing or generic.

**Path:**
- State design is not a dedicated skill. Instead:
  - Copy templates → `impeccable/reference/ux-writing.md` (error formula: what/why/fix; empty-state formula that teaches)
  - Interaction logic → `impeccable/reference/interaction-design.md` (skeleton > spinner, optimistic UI, inert modals)
  - Visual verification → `/finish` catches missing states in its 20-item checklist

**Phrase routing:** "empty state", "loading state", "skeleton screen", "error state", "first-run", "no results", "zero data" → `/review` (state coverage is flagged by review).

**During a feature build (Recipe 1):** `craft.md` step 3 explicitly requires state coverage at build time. If `finish` flags missing states, you skipped that step.

---

## Recipe 12 — Pre-ship final pass

**Situation:** feature is functionally complete. Before shipping.

**Path:**
1. `/finish` — 12-dimension polish + 9-area copy clarity. 20-item checklist.
2. `/review technical` — final technical score.

**Verification gate:** both come back clean. Review technical score >= 3/4 across the board. No P0/P1 from finish.

**When to add `/humaniser` after finish:** if the feature includes marketing/docs/spec prose, humaniser strips AI writing patterns.

---

## Recipe 13 — "Explore multiple approaches before committing"

**Situation:** don't know which design direction is right. Want options.

**Path:**
- `/design-it-twice` — spawns parallel sub-agents, each under a different constraint, to force genuine variety. Compares + synthesizes. Biased toward software/architecture (module design, API shape, data model).
- For UX alternatives specifically: run `/shape` multiple times with different personality directions as the `tone` input.

---

## Recipe 14 — Visual diagrams / architecture explainers

**Situation:** want an HTML diagram, a one-pager architecture view, a diff review, a plan recap.

**Path:**
- `/visual-explainer` — 8 subcommands: diff-review, fact-check, generate-slides, generate-visual-plan, generate-web-diagram, plan-review, project-recap, share. Output lands in `thoughts/shared/diagrams/`.

**When to use `/image` instead:** raster images (hero, brand asset, social card, stock photo). Uses Flux / Nano Banana Pro / GPT-Image-1 / Unsplash.

**When to use `/csf-view`:** input, not output — sketch in tldraw; claude reads the canvas JSON as context for any workflow.

---

## Recipe 15 — Quick Opus-grade design review (ad-hoc)

**Situation:** want a senior-designer-grade take without picking a specific workflow.

**Path:**
- Spawn the `designer` agent (opus, loads `impeccable` skill). Good for:
  - "is this shippable?" quick read
  - "what would a staff designer say?"
  - "give me the 3 things I'd change"

**When to use a specific skill instead:** if you already know the direction — `/review` for structured assessment, `/impeccable craft` to build, `/finish` for pre-ship — skills have deeper workflows than the agent.

---

## Recipe 16 — Generate a design system from a brand/website

**Situation:** have a website or brand to match. Want a portable design system file.

**Path:**
1. `/design-system generate` — uses devtools-mcp to capture the target site (screenshot + computed styles). Extracts color palette, typography, spacing, component patterns, elevation. Outputs a DESIGN.md following the VoltAgent/Google Stitch 9-section spec.
2. `/design-system consume` — load the generated DESIGN.md as design context for subsequent work.
3. `/finish` — verify the generated output is internally consistent.

**Verification gate:** DESIGN.md exists with all 9 sections. `/design-system enforce` returns clean.

---

## Recipe 17 — Research before designing

**Situation:** starting a new design project or major redesign. No direction yet.

**Path:**
1. `/design-research` — select mode:
   - `moodboard` — collect visual references from 3-5 URLs, extract color/type/layout patterns
   - `competitive` — analyze 2-5 competitors for common patterns, differentiators, gaps
   - `inspiration` — given a direction keyword, pull references from Diderot vault + web
2. `/shape` — use the research brief's recommendations to inform the discovery interview and design brief.
3. Proceed with Recipe 1 or Recipe 2.

**Verification gate:** research brief produced with actionable directions. Shape brief explicitly references research findings.

---

## Recipe 18 — Enforce design system compliance

**Situation:** design system exists (DESIGN.md or tokens). Want to check codebase compliance.

**Path:**
1. `/design-system enforce` — scans for: hardcoded colors, off-scale spacing, wrong font sizes, missing tokens, token drift, component rule violations. Output: compliance report with P0-P3 violations per file/line.
2. Fix violations (typically via `/design-system extract` for missing tokens or manual edits).
3. Re-run `/design-system enforce` until clean.

**Verification gate:** 0 P0/P1 violations. All values use design tokens.

---

## Pipeline compositions

**Classic article layout:**
```
design-research → shape → impeccable craft → review → enhance (if needed) → finish
```

**PAI internal tool:**
```
impeccable craft (via design-implementation) → review → enhance → finish
```

**Existing feature refresh:**
```
review → tune OR impeccable-typeset OR enhance (per review recommendations) → finish → review technical
```

**Design system build:**
```
design-system generate (or extract) → design-system enforce → finish
```

**Landing page / marketing surface:**
```
design-research → shape → impeccable craft → tune bolder → enhance responsive → finish
```

---

## Verification cheatsheet

| Checkpoint | Gate |
|---|---|
| Design Context | `.impeccable.md` OR `DESIGN.md` exists OR `/impeccable teach` ran |
| Post-build | `/review` no P0/P1 |
| Pre-ship | `/finish` checklist complete + a11y tab-through works |
| Design system | `/design-system enforce` clean + no hardcoded values outside tokens |

---

## Anti-recipes (things that don't work)

- **Running `tune` without a diagnosis.** You'll whiplash between bolder and quieter. Run `/review` first.
- **Jumping to `finish` before `review`.** Finish catches micro-issues; review catches conceptual issues. Finishing a conceptually-broken design just finishes the broken.
- **Using `/shape` for navigation / IA work.** Shape is feature-scoped. Use `/flows` for product scope.
- **Creating design tokens before the 3+ uses rule.** Premature abstraction. `/design-system extract` explicitly enforces this.
- **Calling `/impeccable` without Design Context.** Generic output. Run `/impeccable teach` or `/design-system consume` first.
- **Editing upstream `skills-external/*` content directly.** It's an upstream mirror. Edits get clobbered by nightly sync unless the skill is in `EXCLUDED_SKILLS`.

---

## Reference index

**Routing source of truth:** `.claude/context/routing-cheatsheet.md`

**Landscape source of truth:** `.claude/context/design-skills-map.md`

**Pipeline source of truth:** `.claude/skills-external/impeccable/reference/craft.md`

**Design-system source of truth:** `.claude/skills-external/impeccable/reference/extract.md`

**Doctrine library:** `.claude/skills-external/impeccable/reference/{typography,color-and-contrast,spatial-design,motion-design,interaction-design,responsive-design,ux-writing}.md`

**Research:** VoltAgent awesome-design-md (DESIGN.md spec), recursive-mode (audited-phase pattern)

**Consolidation plan:** `thoughts/shared/plans/design--skills-landscape-consolidation-v1.md`
