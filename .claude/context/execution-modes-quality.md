# Execution Modes — Quality Enforcement Reference

**Purpose:** What quality discipline does each execution path enforce? Answers "if I invoke X, which gates am I getting?" and captures the `/implement_plan → drive` migration decision.

**Load trigger:** On-demand. Read this when deciding which mode to activate, when debugging why a quality pass didn't fire, or when revisiting the implement_plan migration.

---

## The Gap Matrix

| Mode | TDD cycle | Quality sniff | Critic gate | Verifier agent | Mutation check | Human pause |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **drive** | always | ✓ | ✓ | ✓ | ✓ | ✗ (verifier replaces) |
| **cruise** | conditional¹ | ✓ | ✗ | ✗ | ✗ | ✗ (checkpoints only) |
| **/implement_plan** | conditional¹ | **✗** | ✗ | ✗ | ✗ | ✓ between phases |
| **turbo** | per-agent | varies | ✗ | ✗ | ✗ | — |
| **ad-hoc (no mode)** | ✗ | principle only² | ✗ | ✗ | ✗ | — |

¹ **Conditional** = fires only on behavioral edits to `.ts`/`.tsx`/`.js`/`.jsx`/`.svelte` source files. Skipped for docs, configs, renames, type-only, and formatting.

² **Principle only** = CORE lists `Quality Sniff Test` as an operating principle (always loaded) but nothing executes it outside modes. Relies on model discipline.

---

## What Each Gate Does

- **TDD cycle** — RED→GREEN→REFACTOR via `tdd-qa/workflows/tdd-cycle.md`. Scenarios derived from success criteria or `specs/` files. Drive adds a mutation bonus round at the end.
- **Quality sniff test** — After implementation, per changed file (via `git diff --name-only`): "would un-smell, un-slop, un-stale, refactor-for-DRY find anything?" Fixes in place. Reverts the quality-pass changes for that file on test failure.
- **Critic gate** — *Pre*-implementation. Spawns `critic` agent with proposed approach + acceptance criteria. Returns `proceed` or `revise`. Catches bad approaches before tokens are spent on code.
- **Verifier agent** — *Post*-implementation. Spawns `verifier` agent with acceptance criteria. Returns `PASS` or `FAIL` per criterion. Independent from the implementing session — fresh evidence gathering.
- **Mutation check** — Bonus round in drive's TDD cycle. Stryker-style mutant injection verifies tests *actually* assert behavior, not just execute lines. Catches the "test runs but doesn't fail when code is broken" problem.
- **Human pause** — /implement_plan specific: between phases, stops and asks JM to manually verify before proceeding. Drive replaces this with the verifier agent gate.

---

## When to Use What

```
Is there a plan file?
├─ Yes, 1-2 phases, <5 files       → /implement_plan (today) / drive (future)
├─ Yes, 3+ sequential phases       → cruise  OR  drive
├─ Yes, 3+ independent phases      → turbo
└─ Yes, but vague / needs research → /create_plan → grill-me → readiness → mode

Ad-hoc code-gen (no plan)?
├─ Trivial (rename, typo, log line, comment)  → direct edit
├─ Single-file, <20 lines, no new API         → direct edit + manual sniff
├─ New function / behavior change             → activate cruise
└─ Cross-cutting / multi-file refactor        → activate cruise (or /create_plan first)
```

**Rule of thumb:** If the work is non-trivial and you catch yourself writing *"enforce TDD, DRY, quality pass, good coverage"* into a prompt — you should have activated `cruise` or `drive` instead. That's the hand-written checklist JM keeps re-typing; it's a signal the wrong mode is active.

---

## Coverage, Translated

JM's shorthand "coverage 100%" does NOT mean literal line coverage. It means "don't leave stuff untested." Operationally:

- **drive / cruise TDD path** — every scenario derived from a success criterion has a RED→GREEN cycle. Drive adds a mutation check that kills mutants of the touched code, which is a stronger guarantee than line coverage.
- **acceptance-criteria coverage** — verifier agent validates each AC individually. If an AC lacks a test, verifier fails it.
- **what we reject** — literal 100% line coverage as a blanket rule. Encourages tests that execute without asserting, and forces test-writing for unreachable error branches. Gameable, distracting, not the actual goal.

---

## The `/implement_plan → drive` Decision

**Status:** Planned. Not implemented.

**Why it should change.** /implement_plan is strictly weaker than drive on every quality dimension except the human-verification pause. That single pattern isn't worth maintaining a second execution path — especially because:

- drive can grow `--pause-between-phases` as an opt-in flag
- every quality improvement to drive currently bypasses /implement_plan users
- /implement_plan today is missing: critic gate, quality sniff step, verifier agent, mutation check
- adding all four to /implement_plan is "re-implement drive"

### Migration shape (Path 3 — cleanest)

1. **Drive gains plan-aware entry** (mirror cruise's existing `Plan-Aware Entry` section). When invoked as `drive: implement plans/foo.md`:
   - Read the plan file fully
   - Map each Phase → synthesized story:
     - `story.id = "phase_N"`
     - `story.title = phase heading`
     - `story.description = phase overview`
     - `story.acceptance_criteria = automated + manual verification items`
   - Generate scenarios inline from the phase's Automated Verification (test scenarios) and Manual Verification (user-verifiable scenarios). **No separate `specs/{story-id}.md` ritual required** — this is the key divergence from drive's PRD path.
   - Run the full per-story loop: critic → TDD → verifier → quality pass → next phase

2. **/implement_plan deprecates.** Either delete it or shrink to a three-line shim that activates drive with plan-aware entry. Plan-readiness assessment's routing recommendation updates: `1-2 phases, <5 files → drive (lightweight)` instead of `/implement_plan`.

3. **Drive gains `--pause-between-phases` flag.** Default off (drive's native auto-progression). Opt in via activation: `drive: implement plans/foo.md --pause-between-phases`. Use for DB migrations, breaking changes, live-system work, or anything where JM wants to eyeball each phase before proceeding.

### Risks acknowledged

- **Token cost per phase.** Drive spawns `critic` + `verifier` per story. A 2-phase plan adds ~4 agent spawns vs /implement_plan today. Accepted — they're cheap relative to implementation work and catch things the human pause wouldn't (bad architecture, missed ACs).
- **Small plans get heavier ceremony.** A 1-phase, 3-file plan runs the full drive pipeline. Probably fine because ceremony is per-story not per-line. Watch for friction during rollout.
- **Plan quality becomes load-bearing.** Drive's discipline depends on falsifiable acceptance criteria. Plans with vague "make it work" success criteria either fail at drive's scenario-check or produce weak tests. This is a **feature** — it forces plan readiness upstream, which is where grill-me + readiness assessment already live.

### Open decisions before migration

- [ ] Delete `/implement_plan` entirely, or keep as a three-line shim for muscle memory?
- [ ] Does plan-aware drive need its own section in `drive/SKILL.md`, or a separate `drive/workflows/plan-entry.md`?
- [ ] How to handle plans missing a Testing Strategy section — auto-generate scenarios from success criteria, or STOP like drive does for missing PRD specs?
- [ ] Is `--pause-between-phases` a CLI-style flag or inferred from plan frontmatter (`pause_between_phases: true`)?
- [ ] Does plan-readiness routing update immediately, or wait for the migration to land?
- [ ] Does drive's critic gate add value for every phase, or should it run once per plan (first phase only) to review the overall approach?

---

## What We're NOT Doing

These were considered and rejected during the `grill-me` session on 2026-04-10:

- **No UserPromptSubmit hook for code-gen intent detection.** Intent detection from a prompt string is unreliable. CORE's quality sniff principle + "activate cruise when you catch yourself writing the defaults" is the discipline. Ad-hoc stays ad-hoc.
- **No literal 100% line coverage enforcement.** See the Coverage section above. Shorthand, not a metric.
- **No PreToolUse hook blocking Edit/Write without an active mode.** Would catch "oh this grew" but interrupts legitimate quick fixes constantly. Rejected.
- **No CORE addendum listing blanket code-gen defaults.** CORE already has `Quality Sniff Test` and `Simplify Ruthlessly` as operating principles. Adding more principles doesn't solve the "principle exists but doesn't execute" problem — unifying execution on drive does.

---

## Cross-References

- `drive/SKILL.md` — full drive pipeline (per-story loop)
- `cruise/SKILL.md` — cruise pipeline, includes existing Plan-Aware Entry section (reference for drive migration)
- `commands/implement_plan.md` — current /implement_plan command (to be deprecated)
- `skills/CORE/workflows/plan-readiness-assessment.md` — upstream gate that routes plans to executors
- `skills/tdd-qa/workflows/tdd-cycle.md` — shared TDD cycle blueprint used by drive, cruise, /implement_plan
