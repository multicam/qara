---
name: cruise
description: Phased autonomous execution mode. Discover → Plan → Implement → Verify with checkpoints between phases.
context: fork
effort: high
keep-coding-instructions: true
argument-hint: "<task description>"
---

# Cruise Mode

Phased autonomous execution. 4 phases, checkpoints between each. Default: 20 max iterations. Phase budgets: Discover 3, Plan 2, Implement 10, Verify 5.

## Plan-Aware Entry

Before Phase 1, check: was cruise activated with a plan file path (e.g. `cruise: implement plans/domain--feature-v1.md`)?

1. Read the plan file fully.
2. Verify it has implementation phases with success criteria (not just an outline).
3. **Valid plan**:
   - Populate `decisions.md` with key discoveries, constraints, approach.
   - Confirm `ModeState.planPath` is set (keyword-router writes it when activation text matches `plans/*.md`).
   - Skip Phases 1–4 below.
   - Delegate to `workflows/plan-entry.md` for the full per-phase loop.
   - Output: `PLAN IMPORTED: {N} phases from {path}. Delegating to plan-entry.md.`
4. **Outline only** (no file paths, no code examples): proceed with normal Phase 1, using the outline as context. Output: `PLAN OUTLINE: using as research seed, running full discovery.`

## Plan-Aware Execution

`ModeState.planPath` set → READ `workflows/plan-entry.md` and follow it. Phases 1–4 DO NOT apply.

`planPath` null → Phases 1–4 below apply as documented (task-mode cruise).

## Phase 1: Discover (max 3 iterations)

1. Extract key nouns from task (module names, file names, feature names).
2. Per noun: `Grep` codebase. Read top 3 matching files.
3. Per file: extract imports → dependency list.
4. Write `decisions.md`: affected files, dependencies, constraints.
5. Checkpoint: `DISCOVER COMPLETE: {files} files, {deps} deps`.

EXIT: `decisions.md` has discovery entry. 3 iterations without checkpoint → escalate.

## Phase 2: Plan (max 2 iterations)

Write to `decisions.md`:
```
## Implementation Plan
- Create: {paths}
- Modify: {paths}
- Tests: {paths}
- Order: {numbered list}
- Risks: {files imported by 3+ modules}
- Test strategy: {one test file per modified source}
```

Checkpoint: `PLAN COMPLETE: {files} files, {steps} steps`.

EXIT: plan written. 2 iterations without plan → escalate.

## Phase 3: Implement (max 10 iterations)

Execute the plan step by step.

**Test runner:** `tdd-qa/references/detect-runner.md` (authoritative 4-step detection). Set `$TEST_CMD`.

IF task adds new functions / behavior changes: follow `tdd-qa/workflows/tdd-cycle.md`. Feature name: `{task-slug}`.

After every Write/Edit on `.ts`/`.tsx`: run `$TEST_CMD`. Exit != 0 → read error, fix. Same test fails 3× → `problems.md`, try different approach.

Checkpoint: `IMPLEMENT COMPLETE: {files changed}, {tests passing}`.

## Phase 4: Verify (max 5 iterations)

1. `bun test` — all pass
2. `bunx tsc --noEmit` — zero type errors
3. Re-read each modified file, verify it addresses the task
4. Sniff test: "un-smell, un-slop, un-stale, refactor for DRY" → fix
5. File supposed to change but didn't → flag as gap

Issues → loop to Phase 3. Max Phase 3↔4 loops: 3. Exceeded → deactivate `verify-loop`, escalate.

All pass → deactivate `complete`.

## Working Memory (Batched)

4-file memory at `$STATE_DIR/sessions/{session_id}/memory/`: `decisions`, `learnings`, `problems`, `issues`. Survives compression via Stop hook re-injection.

**Batch writes.** Accumulate in-context; flush once per phase transition (or immediately on surprises/blockers).

## Error Recovery

Stuck 3+ iterations on same phase → escalate to JM with problem statement and attempts.
