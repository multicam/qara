# Execution Modes — Quality Enforcement Reference

**Purpose:** What quality discipline does each execution path enforce? Answers "if I invoke X, which gates am I getting?" Also captures the plan-aware cruise migration decision record (resolved + shipped 2026-04-11).

**Load trigger:** On-demand. Read this when deciding which mode to activate, when debugging why a quality pass didn't fire, or when revisiting the plan-aware cruise architecture.

---

## The Gap Matrix

| Mode | TDD cycle | Quality sniff | Critic gate | Verifier agent | Mutation check | Human pause |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **drive** (PRD-driven) | always | ✓ | ✓ | ✓ | ✓ | ✗ (verifier replaces) |
| **cruise** — task mode | conditional¹ | ✓ | ✗ | ✗ | ✗ | ✗ (checkpoints only) |
| **cruise** — plan-aware³ | on behavioral phases | ✓ | ✓ per phase | ✓ per phase | ✗ | ✓ conditional⁴ |
| **turbo** | per-agent | varies | ✗ | ✗ | ✗ | — |
| **ad-hoc (no mode)** | ✗ | principle only² | ✗ | ✗ | ✗ | — |

¹ **Conditional** = fires only on behavioral edits to `.ts`/`.tsx`/`.js`/`.jsx`/`.svelte` source files. Skipped for docs, configs, renames, type-only, and formatting.

² **Principle only** = CORE lists `Quality Sniff Test` as an operating principle (always loaded) but nothing executes it outside modes. Relies on model discipline.

³ **Plan-aware cruise** activates when invoked as `cruise: implement plans/foo.md` (keyword-router detects the plan path and sets `ModeState.planPath`). Cruise's SKILL.md delegates to `workflows/plan-entry.md` for the per-phase loop. Task-mode cruise (no plan path) continues to use SKILL.md's Phase 1-4.

⁴ **Conditional pause** = plan-aware cruise pauses after a phase's automated verification IF that phase has `#### Manual Verification:` items. Phases without manual items proceed autonomously. No frontmatter flag, no CLI flag — the plan's content is the signal.

---

## What Each Gate Does

- **TDD cycle** — RED→GREEN→REFACTOR via `tdd-qa/workflows/tdd-cycle.md`. Scenarios derived from success criteria or `specs/` files. Drive adds a mutation bonus round at the end.
- **Quality sniff test** — After implementation, per changed file (via `git diff --name-only`): "would un-smell, un-slop, un-stale, refactor-for-DRY find anything?" Fixes in place. Reverts the quality-pass changes for that file on test failure.
- **Critic gate** — *Pre*-implementation. Spawns `critic` agent with proposed approach + acceptance criteria. Returns `proceed` or `revise`. Catches bad approaches before tokens are spent on code.
- **Verifier agent** — *Post*-implementation. Spawns `verifier` agent with acceptance criteria. Returns `PASS` or `FAIL` per criterion. Independent from the implementing session — fresh evidence gathering.
- **Mutation check** — Bonus round in drive's TDD cycle. Stryker-style mutant injection verifies tests *actually* assert behavior, not just execute lines. Catches the "test runs but doesn't fail when code is broken" problem.
- **Human pause** — plan-aware cruise only: after a phase's automated verification, if the phase has `#### Manual Verification:` items, cruise pauses and prompts JM for PASS/FAIL, then ticks manual checkboxes on PASS. Drive has no human pause — its per-story verifier agent replaces that pattern.

---

## When to Use What

```
Is there a plan file?
├─ Yes, any size, sequential phases    → cruise: implement {plan-file}
├─ Yes, 3+ independent phases          → turbo: implement {plan-file}
└─ Yes, but vague / needs research     → /create_plan → grill-me → readiness → mode

Is there a PRD file (stories, not phases)?
└─ Yes                                  → drive: implement (PRD-driven track)

Ad-hoc code-gen (no plan, no PRD)?
├─ Trivial (rename, typo, log line, comment)  → direct edit
├─ Single-file, <20 lines, no new API         → direct edit + manual sniff
├─ New function / behavior change             → activate cruise
└─ Cross-cutting / multi-file refactor        → activate cruise (or /create_plan first)
```

**Rule of thumb:** If the work is non-trivial and you catch yourself writing *"enforce TDD, DRY, quality pass, good coverage"* into a prompt — you should have activated `cruise` or `drive` instead. That's the hand-written checklist JM keeps re-typing; it's a signal the wrong mode is active.

**Mode separation:** Drive is the PRD-driven track (stories + acceptance criteria). Cruise is the plan-driven track (phases + success criteria). They are not substitutable — their data models differ (drive iterates `prd.stories[]`, cruise iterates `plan.phases`). Don't try to run plans through drive or PRDs through cruise.

---

## Coverage, Translated

JM's shorthand "coverage 100%" does NOT mean literal line coverage. It means "don't leave stuff untested." Operationally:

- **drive / cruise TDD path** — every scenario derived from a success criterion has a RED→GREEN cycle. Drive adds a mutation check that kills mutants of the touched code, which is a stronger guarantee than line coverage.
- **acceptance-criteria coverage** — verifier agent validates each AC individually. If an AC lacks a test, verifier fails it.
- **what we reject** — literal 100% line coverage as a blanket rule. Encourages tests that execute without asserting, and forces test-writing for unreachable error branches. Gameable, distracting, not the actual goal.

---

## The `/implement_plan → cruise (plan-aware)` Decision

**Status:** Implemented on 2026-04-11. Plan-aware cruise is live; `/implement_plan` is deleted. See commits `569646e` (Phase 1 schema), `39be32f` (Phase 2 workflow), `1836193` (Phase 3 SKILL.md integration), plus the Phase 5 cutover commits in the session log.

**Why it should change.** `/implement_plan` is strictly weaker than cruise on every quality dimension except the human-verification pause. That pattern isn't worth maintaining a second execution path. More importantly:

- every quality improvement to cruise currently bypasses `/implement_plan` users
- `/implement_plan` today is missing: critic gate, quality sniff step, verifier agent
- adding all three to `/implement_plan` is "re-implement cruise"
- **cruise is already plan-native** — it has `Plan-Aware Entry` in its SKILL.md, reads plan files directly, writes notes to `mode-decisions.md`, and uses plan phases as the execution guide. No refactor needed to make cruise accept plans, only to add the missing quality gates.

### Why cruise, not drive

The first grill session (2026-04-10) recommended `/implement_plan → drive`. That was wrong. Drive's control flow is built on a PRD abstraction — `readPRD(projectDir)` reads `prd.json`, `getIncompleteStories(prd)` filters `Story[]`, `markStoryPassing(prd, ...)` mutates a `passes: bool` field, `writePRD()` persists the JSON. There is no plan.md concept in drive.

Forcing drive to accept plans would have required either:
- Synthesizing a `prd.json` from `plan.md` at entry time (two sources of truth — plan.md checkmarks vs prd.json passes bool, plus a drift/sync problem)
- Refactoring `prd-utils.ts` + `drive/SKILL.md` to generalize `Story | Phase` (large touch surface, blurs drive's identity)
- Writing a parallel `plan-utils.ts` that mirrors `prd-utils` but reads markdown (doubles maintenance)

Cruise is already plan-native. The migration is ~100 lines of new workflow, not a data-model refactor. Drive stays PRD-pure.

### Migration shape (Path B)

1. **Cruise gains plan-aware quality stack.** New file `cruise/workflows/plan-entry.md`, referenced from cruise/SKILL.md with a new `Plan-Aware Execution` section that triggers when activated with a plan file. The workflow adds:
   - Phase identification via regex on `^## Phase (\d+):` headings (STOP fallback if ambiguous)
   - Per-phase critic gate (cruise synthesizes its own "proposed approach" per phase, passes it + phase ACs to critic agent, inherits drive's 2-revision limit)
   - Per-phase verifier gate (replaces cruise's current Phase 4 simple checks; inherits drive's 3-attempt limit)
   - Plan.md mutation: after automated verification passes, cruise ticks the phase's Automated Verification checkboxes
   - Manual verification pause: if the phase has `#### Manual Verification:` items, cruise pauses and asks JM for PASS/FAIL; on PASS, cruise ticks the manual checkboxes too (shows diff)
   - Final regression: after all phases tick, one last `bun test + bunx tsc --noEmit` sweep

2. **`/implement_plan` is deleted.** No shim. Cold-turkey cutover. The command file at `.claude/commands/implement_plan.md` is removed entirely. Muscle memory is tolerated.

3. **`plan-readiness-assessment.md` routing is updated.** All three tiers (1-2 phases, 3+ sequential, 3+ independent) become `cruise: implement {plan-file-path}` or `turbo: implement {plan-file-path}`. No more `/implement_plan` recommendation.

4. **`ModeState` schema adds `planPath: string | null`** parallel to the existing `prdPath`. `stop-hook.ts`'s `emitContinuation` gains a `planNote` line mirroring the existing `prdNote` logic.

### Iteration budget — no change

Plan-aware cruise works within cruise's existing 20-iteration base + 1×5 extension (25 total). One "iteration" = one stop-hook continuation cycle = one full Claude turn, which can contain ALL of: read plan, spawn critic, run TDD cycle, spawn verifier, quality sniff, tick checkboxes. A single plan phase typically fits inside 1-3 iterations. Plans up to ~8 phases fit comfortably. Plans with 10+ phases may hit the extension cap — that's the right signal to split the plan.

### Risks acknowledged

- **Token cost per phase.** Plan-aware cruise spawns `critic` + `verifier` per phase. A 5-phase plan adds ~10 agent spawns beyond task-mode cruise. Accepted — subagent calls fit inside existing iterations and catch things a simple bun-test pass wouldn't (bad approach pre-coding, missed ACs post-coding).
- **Cruise's identity split.** Task-cruise and plan-cruise now have different Phase 3/4 behavior. Mitigated by putting plan-aware logic in a separate workflow file (`cruise/workflows/plan-entry.md`) rather than inline in SKILL.md — task-cruise remains unchanged by default.
- **Plan quality becomes load-bearing.** Cruise's discipline depends on falsifiable phase success criteria. Plans with vague "make it work" criteria either fail at plan-readiness assessment upstream or produce weak critic/verifier reviews. This is a **feature** — it forces plan readiness upstream, which is where grill-me + readiness assessment already live.
- **Regression scope narrower than drive.** Plan-aware cruise uses a lightweight final `bun test + tsc` sweep instead of drive's full per-story verifier regression loop. Rationale: plan phases are tightly sequenced and TDD cycle tests stay in the suite — the standing test run catches any regression those tests protect against. If a regression escapes `bun test`, re-running per-phase verifier would likely miss it too.

### Resolved decisions (grill-me session 2026-04-11)

| # | Decision | Answer |
|---|---|---|
| 1 | Execution target for plan-driven work | Cruise, not drive |
| 2 | Manual verification handling | Plan content determines pause (phase has Manual items → pause) |
| 3 | Who ticks manual checkboxes | Cruise mutates plan.md based on PASS/FAIL response, shows diff |
| 4 | Phase identification | Regex on `^## Phase N:` headings, STOP fallback if ambiguous |
| 5 | Iteration budget | No change — existing 20+5 handles ≤8-phase plans |
| 6 | `/implement_plan` fate | Deleted cold-turkey, no shim |
| 7 | Critic gate placement | Per phase, cruise writes own proposed approach (drive's pattern) |
| 8 | Critic rejection limit | 2 revisions, then STOP (inherit drive's rule) |
| 9 | Verifier gate placement | Per phase, after TDD + quality sniff (replaces cruise's Phase 4 simple check) |
| 10 | Verifier failure limit | 3 attempts per phase, then STOP (inherit drive's rule) |
| 11 | Final regression | Test sweep only (`bun test + bunx tsc`), not per-phase re-verification |
| 12 | Workflow file location | `cruise/workflows/plan-entry.md`, referenced from cruise/SKILL.md |
| 13 | Missing Testing Strategy | Handled upstream by plan-readiness assessment, not cruise's concern |
| 14 | Routing update timing | Last step of rollout, after cruise smoke-tests cleanly |

### Rollout order (historical, completed 2026-04-11)

The migration self-hosted: once Phase 3 landed, cruise dogfooded the rest of its own migration plan.

1. Phase 1: `ModeState.planPath` + stop-hook `planNote` + keyword-router plan-path detection (commit `569646e`)
2. Phase 2: Write `cruise/workflows/plan-entry.md` with the full plan-aware logic (commit `39be32f`)
3. Phase 3: Wire `cruise/SKILL.md`'s Plan-Aware Entry to delegate to `plan-entry.md` (commit `1836193`)
4. Phase 4: Fresh-session dogfood — JM re-activated cruise with the plan file, plan-aware cruise ran the per-phase loop on Phase 4 itself end-to-end
5. Phase 5: Delete `/implement_plan`, update `plan-readiness-assessment.md` routing, update `routing-cheatsheet.md`, update this doc, update `Readme.md` + `validate_plan.md`

**Order was load-bearing:** Phase 6 (routing update) had to come after the deletion, otherwise routing recommended a non-existent command. Phase 3 had to come after Phase 2's schema, otherwise cruise couldn't pass the plan path through the continuation loop.

---

## What We're NOT Doing

Rejected during grill-me sessions on 2026-04-10 and 2026-04-11:

- **No `/implement_plan → drive` migration (Path A).** Drive's control flow is built on the PRD abstraction (`prd.json`, `Story`, `markStoryPassing`). Retrofitting it to accept plan.md either introduces two sources of truth (plan.md checkmarks vs prd.json `passes` bool) or requires refactoring drive's persistence layer. Cruise is already plan-native and is the correct target. Drive stays PRD-pure.
- **No UserPromptSubmit hook for code-gen intent detection.** Intent detection from a prompt string is unreliable. CORE's quality sniff principle + "activate cruise when you catch yourself writing the defaults" is the discipline. Ad-hoc stays ad-hoc.
- **No literal 100% line coverage enforcement.** See the Coverage section above. Shorthand, not a metric.
- **No PreToolUse hook blocking Edit/Write without an active mode.** Would catch "oh this grew" but interrupts legitimate quick fixes constantly. Rejected.
- **No CORE addendum listing blanket code-gen defaults.** CORE already has `Quality Sniff Test` and `Simplify Ruthlessly` as operating principles. Adding more principles doesn't solve the "principle exists but doesn't execute" problem — unifying plan execution on cruise does.
- **No `--pause-between-phases` flag.** The earlier Path A proposal invented a CLI flag for opt-in pauses. Plan-aware cruise's conditional pause (driven by whether the phase has Manual Verification items) is better because it's self-documenting — you see the pause coming by reading the plan.
- **No /implement_plan shim.** Delete cold-turkey. Muscle memory is tolerated as the cost of a cleaner system.
- **No full per-phase verifier regression loop** (drive-style). Plan phases are sequenced and TDD tests stay in the suite — `bun test + bunx tsc` at the end is sufficient. Drive keeps its full regression because stories are loosely coupled.

---

## Cross-References

- `.claude/skills/drive/SKILL.md` — full drive pipeline (per-story PRD loop)
- `.claude/skills/cruise/SKILL.md` — cruise pipeline; Plan-Aware Entry delegates to `workflows/plan-entry.md` when `ModeState.planPath` is set
- `.claude/skills/cruise/workflows/plan-entry.md` — plan-aware per-phase loop (critic + TDD + quality sniff + verifier + plan.md mutation + conditional manual pause + final regression)
- `.claude/skills/CORE/workflows/plan-readiness-assessment.md` — upstream gate that routes plans to cruise or turbo
- `.claude/skills/CORE/workflows/plan-template.md` — canonical plan structure; plan-aware cruise's regex assumes `^## Phase N:` headings
- `.claude/skills/tdd-qa/workflows/tdd-cycle.md` — shared TDD cycle blueprint used by drive and cruise
- `.claude/hooks/lib/prd-utils.ts` — PRD data model that drive's loop depends on (explains why drive stays PRD-pure)
- `.claude/hooks/lib/mode-state.ts` — ModeState schema, includes `planPath: string | null`
- `.claude/hooks/keyword-router.ts` — detects `plans/*.md` activation paths and writes `planPath` to mode state
- `.claude/hooks/stop-hook.ts` — continuation emits `Plan:` line when `planPath` is set, so plan-aware cruise survives context compression
