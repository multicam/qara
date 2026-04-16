# Design Cookbook

Recipes for common design tasks, keyed to Qara's skill surface. Each recipe starts from a situation, names the skills in order, and ends with the verification gate.

> **Companion docs:**
> - `.claude/context/design-skills-map.md` — inventory, lifecycle coverage, pipeline diagram
> - `.claude/skills-external/impeccable/reference/craft.md` — 5-step build methodology (the canonical pipeline)
> - `.claude/skills-external/impeccable/reference/extract.md` — 6-step design-system protocol

**The golden rule:** every recipe begins with ensuring Design Context exists. Without it, every design skill produces generic output. Run `/impeccable teach` if `.impeccable.md` is missing or "Design Context" isn't in your loaded instructions. Don't skip this.

---

## Recipe 1 — Build a feature from scratch

**Starting point:** a PRD row or a user story. Nothing built yet.

**Path:**
1. `/shape` — discovery interview → design brief. Produces a brief you can hand to impeccable or any other implementation approach.
2. `/impeccable craft` — runs shape (internally, if needed) → loads references → builds in 7-step order (structure → layout → typography+color → interactive states → edge cases → motion → responsive) → visual iteration loop → presents. This is `impeccable/reference/craft.md` in motion.
3. `/critique` — UX review against heuristics, personas, AI-slop anti-patterns.
4. `/audit` — technical review (a11y, performance, theming, responsive).
5. `/polish` — final pre-ship pass.

**Verification gate:** `critique` returns no P0/P1. `audit` score ≥ 3/4 on every dimension. `polish` checklist complete.

**When to skip `shape`:** if the feature scope is trivial (one-line text change, swap button copy) OR if the PRD already includes a detailed design brief. If in doubt, run it — shape catches assumptions early.

---

## Recipe 2 — Build a feature with automated browser verification

**Starting point:** any PRD task that targets a running app. You want claude to verify its work by actually rendering it.

**Path:**
1. `/shape` (optional) — same as above.
2. `design-implementation` — starts dev server + browser, implements via impeccable, checks console/TypeScript/network for errors, iterates up to 5 times.
3. `/critique` + `/audit` in parallel.
4. `/polish`.

**When to use over Recipe 1:** the app already runs locally and you want the "it actually works" evidence. When the app is headless or pre-dev-server, stay with Recipe 1.

---

## Recipe 3 — The design feels wrong but you can't name what

**Starting point:** you look at the screen and something is off.

**Path:**
1. `/critique` — run first. Critique's job is to **tell you what's wrong**. It will call out specific failures: hierarchy, density, emotional resonance, AI-slop anti-patterns.
2. Apply the first recommended fix (critique usually ends with a ranked action list).
3. `/critique` again after the fix. Shouldn't fire on the same issues.

**Don't jump to `tune` bolder/quieter/colorize without knowing which direction.** Critique diagnoses; the dials are applied after. Running `tune` blind is how you get design whiplash.

---

## Recipe 4 — "It's too loud / too safe / too gray"

**Starting point:** you know the direction.

**Path:**
- `/tune bolder` — the design feels timid, generic, lacks personality. Amplifies typography scale, color saturation, spatial drama, motion, composition.
- `/tune quieter` — the design feels aggressive, overwhelming, garish. Reduces saturation, weight, visual noise, motion intensity.
- `/tune colorize` — monochrome, dull, needs warmth. Adds strategic color (2–4 colors, 60-30-10 distribution, OKLCH semantic tokens).

**Bold rule:** `tune` is a dispatcher. Doctrine lives in `impeccable/reference/color-and-contrast.md`, `typography.md`, `spatial-design.md`, `motion-design.md`. `tune` references them; it does not copy them.

**Phrase routing** (from `.claude/hooks/lib/keyword-routes.json`):
- "too loud / bold / aggressive / overwhelming / garish" → quieter mode
- "too safe / bland / generic / boring / lacks personality" → bolder mode
- "too gray / monochromatic / dull / needs color" → colorize mode

**After `tune`:** re-run `/critique` to confirm the direction was right.

---

## Recipe 5 — Typography repair

**Starting point:** fonts look generic, hierarchy is muddy, body is hard to read.

**Path:**
1. `/impeccable-typeset` — runs the 5-dimension typography assessment (font choice · hierarchy · sizing · readability · consistency) and applies fixes per `impeccable/reference/typography.md`.

**Key anti-patterns it catches:**
- Invisible defaults (Inter, Roboto, system) when brand personality matters
- Too many font families (>2-3)
- Muddy hierarchy (sizes too close: 14/15/16)
- Body text below 16px
- Arbitrary sizes — no scale

**Phrase routing:** "typography off", "fonts look wrong", "fix typography", "type hierarchy broken", "readability issues".

**After typeset:** likely need `/layout` if spatial rhythm is also off.

---

## Recipe 6 — Design system extraction / design tokens

**Starting point:** hardcoded values are scattered; repeated patterns without abstraction; no single source of truth for colors, type, spacing.

**Path:** (either entry point works — they route to the same workflow)
- `/tokens` — alias
- `/impeccable extract` — direct

Both run the 6-step protocol from `impeccable/reference/extract.md`:
1. **Discover** — find the existing system (or lack thereof)
2. **Identify patterns** — apply the "3+ uses" rule (don't abstract until 3+ uses exist)
3. **Plan extraction** — primitive tokens + semantic tokens (two-layer hierarchy)
4. **Extract & enrich** — build the tokens, add ARIA/keyboard on components
5. **Migrate** — update all existing uses
6. **Document** — Storybook / design-system doc

**Anti-patterns it catches:**
- Creating a token for every single value (tokens need semantic meaning)
- Extracting things that differ in intent (not every shared value should be a token)
- Premature abstraction before the 3+ rule is met

**Phrase routing:** "design tokens", "design system", "hardcoded colors", "theme variables", "extract palette", "token hierarchy", "build a design system".

---

## Recipe 7 — User flow / journey / IA

**Starting point:** multi-step tasks, navigation design, cross-feature journeys, site-map questions.

**Not `shape`** — shape is feature-scoped. Use `flows` for product-scope.

**Path:**
1. `/flows` with argument:
   - `/flows journey-map` — map one user goal end-to-end: actor → trigger → steps → decisions → success/failure
   - `/flows ia-audit` — menu / hierarchy / entry points / findability / progressive disclosure
   - `/flows flow-diff` — current vs proposed, side-by-side, with rationale
2. Hand off — if the journey surfaces a new feature, `/shape` → `/impeccable craft` that feature.

**Anti-patterns it catches (IA):**
- Catch-all "More" / "Settings" dumping-ground menus
- Deep hierarchies (>3 levels) for primary tasks
- Labels matching your internal model, not user vocabulary
- Nav that changes across sections (breaks predictability)
- Search used as a substitute for architecture

---

## Recipe 8 — Responsive / multi-device

**Starting point:** design built for one viewport; need to handle others.

**Path:**
1. `/adapt` — applies mobile-first breakpoints, pointer/hover queries, safe areas, adaptive nav patterns, email constraints if relevant. Doctrine in `impeccable/reference/responsive-design.md`.
2. `/harden` if the result has edge cases (text overflow, long strings, i18n expansion).

**When to also run `/layout`:** if the responsive pass exposes spacing issues (gaps that work at desktop break down on mobile).

---

## Recipe 9 — Accessibility / resilience

**Starting point:** features work for the golden path but break on keyboard, screen readers, weird inputs, or long text.

**Path:**
1. `/harden` — systematically covers: keyboard navigation, ARIA labels, reduced motion, RTL, i18n (CJK, pluralization, logical CSS properties), error states, text overflow, screen reader semantics, focus management.
2. `/audit` — scores the theming / a11y / performance / responsive / anti-patterns dimensions. Focus on a11y.

**Verification gate:** `audit` a11y dimension ≥ 3/4. Manual tab-through works end-to-end. Screen reader announces state changes.

---

## Recipe 10 — Performance

**Starting point:** load time, jank, bundle size complaints.

**Path:**
1. `/audit` first — to measure. Audit's performance dimension produces a score + bottleneck list.
2. `/optimize` — systematically addresses loading speed, rendering, animations, images, bundle size.

**When to also run `/animate`:** if optimize removed animations that were serving a purpose, animate can reintroduce purposeful motion with `transform`/`opacity`-only patterns that don't regress performance.

---

## Recipe 11 — Empty / loading / error states

**Starting point:** features work on the happy path; states are missing or generic.

**Path:**
- State design is **not a dedicated skill** (by design — see plan v1.2, `states` was killed). Instead:
  - Copy templates → `impeccable/reference/ux-writing.md` (error formula: what/why/fix; empty-state formula that teaches)
  - Interaction logic → `impeccable/reference/interaction-design.md` (skeleton > spinner, optimistic UI, inert modals)
  - Visual verification → `/polish` (state-phrase routing points here)

**Phrase routing:** "empty state", "loading state", "skeleton screen", "error state", "first-run", "no results", "zero data" → `/polish`.

**During a feature build (Recipe 1):** `craft.md` step 3 explicitly requires state coverage at build time. If `polish` flags missing states, you skipped that step.

---

## Recipe 12 — Pre-ship final pass

**Starting point:** feature is functionally complete. Before shipping.

**Path:**
1. `/polish` — alignment, spacing, consistency, micro-details, state coverage, theme variants, label consistency, validation timing.
2. `/audit` — final technical score across all dimensions.

**Verification gate:** both come back clean. Audit score ≥ 3/4 across the board. No P0/P1 from polish.

**When to add `/humaniser` after polish:** if the feature includes marketing/docs/spec prose, humaniser strips AI writing patterns (inflated symbolism, em-dash overuse, rule-of-three).

---

## Recipe 13 — "Explore multiple approaches before committing"

**Starting point:** you don't know which design direction is right. You want options.

**Path:**
- `/design-it-twice` — spawns parallel sub-agents, each under a different constraint, to force genuine variety. Compares + synthesizes. **Biased toward software/architecture** (module design, API shape, data model), so for UI it's a useful tool but may need a "design this UI" framing in the prompt.
- For UX alternatives specifically (not architecture): run `/shape` multiple times with different "personality directions" as the `tone` input (brutalist vs playful vs editorial).

---

## Recipe 14 — Visual diagrams / architecture explainers / slide-style reviews

**Starting point:** want an HTML diagram, a one-pager architecture view, a diff review, a plan recap.

**Path:**
- `/visual-explainer` — 8 subcommands: diff-review, fact-check, generate-slides, generate-visual-plan, generate-web-diagram, plan-review, project-recap, share. Output lands in `thoughts/shared/diagrams/` (git-tracked).

**When to use `/image` instead:** when you need a raster image (hero, brand asset, social card, stock photo). Image uses Flux / Nano Banana Pro / GPT-Image-1 / Unsplash based on routing.

**When to use `/csf-view`:** input, not output — JM sketches something in tldraw; claude reads the canvas JSON as context for any active workflow.

---

## Recipe 15 — Quick Opus-grade design review (ad-hoc)

**Starting point:** want a senior-designer-grade take on something without picking a specific workflow.

**Path:**
- Spawn the `designer` agent (opus, loads `impeccable` skill). Good for:
  - "is this shippable?" quick read
  - "what would a staff designer at Stripe/Airbnb/Linear say?"
  - "give me the 3 things I'd change"

**When to use a specific skill instead:** if you already know the direction — structured UX critique (`/critique`), technical audit (`/audit`), build (`/impeccable craft`), polish pass (`/polish`) — skills have deeper workflows than the agent.

---

## Pipeline compositions

**Classic TGDS article layout:**
```
shape → impeccable craft → critique → tune (if needed) → adapt → polish → audit
```

**PAI internal tool:**
```
impeccable craft (dev server via design-implementation) → harden → audit → polish
```

**Existing feature refresh:**
```
critique → tune OR impeccable-typeset OR layout (per critique) → polish → audit
```

**Design system build:**
```
tokens (= impeccable extract) → flows ia-audit (if multi-feature) → polish (migrate each surface)
```

**Landing page or marketing surface:**
```
shape → impeccable craft → tune bolder (marketing can be bolder than app UI) → adapt → polish
```

---

## Verification cheatsheet

| Checkpoint | Gate |
|---|---|
| Design Context present | `.impeccable.md` exists OR `/impeccable teach` ran OR Design Context in loaded instructions |
| Post-build | `/critique` no P0/P1 + `/audit` ≥3/4 on every dimension |
| Pre-ship | `/polish` checklist complete + a11y tab-through works |
| Design system | tokens documented + all existing uses migrated + no hardcoded values outside tokens |
| Flow / IA | journey-map covers success + failure paths + IA audit shows ≤3-level depth for primary tasks |

---

## Anti-recipes (things that don't work)

- **Running `tune` without a diagnosis.** You'll whiplash between bolder and quieter. Run `/critique` first.
- **Jumping to `polish` before critique.** Polish catches micro-issues; critique catches conceptual issues. Polish on a conceptually-broken design just polishes the broken.
- **Using `/shape` for navigation / IA work.** Shape is feature-scoped. Use `/flows` for product scope.
- **Creating design tokens before the 3+ uses rule.** Premature abstraction. `/impeccable extract` explicitly refuses.
- **Calling `/impeccable` without Design Context.** Generic output. Run `/impeccable teach` first.
- **Editing upstream `skills-external/*` content directly.** It's an upstream mirror. Edits get clobbered by nightly sync unless the skill is in `EXCLUDED_SKILLS`.

---

## Reference index

**Routing source of truth:** `.claude/context/routing-cheatsheet.md` (all 52+ design-skill keyword patterns)

**Landscape source of truth:** `.claude/context/design-skills-map.md` (inventory · pipeline · lifecycle coverage)

**Pipeline source of truth:** `.claude/skills-external/impeccable/reference/craft.md` (5-step methodology)

**Design-system source of truth:** `.claude/skills-external/impeccable/reference/extract.md` (6-step protocol)

**Doctrine library:** `.claude/skills-external/impeccable/reference/{typography,color-and-contrast,spatial-design,motion-design,interaction-design,responsive-design,ux-writing}.md`

**Consolidation plan:** `thoughts/shared/plans/design--skills-landscape-consolidation-v1.md` (v1.2)

**Introspection:** `miner-skills-lib.ts` + daily reports under `thoughts/shared/introspection/` — tracks `design_skills_used`, `design_chains`, `design_reinvocations`, `design_orphans`, `extract_usage`.
