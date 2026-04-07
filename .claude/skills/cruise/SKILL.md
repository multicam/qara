---
name: cruise
description: Phased autonomous execution mode. Discover → Plan → Implement → Verify with checkpoints between phases.
context: fork
argument-hint: "<task description>"
---

# Cruise Mode

Phased autonomous execution. 4 phases, checkpoints between each. Default: 20 max iterations. Phase budgets: Discover 3, Plan 2, Implement 10, Verify 5.

## Plan-Aware Entry

Before starting Phase 1, check: was this mode activated with a reference to an existing plan file (e.g., `cruise: implement thoughts/shared/plans/domain--feature-v1.md`)?

IF a plan file path was mentioned in the activation prompt:
1. Read the plan file fully.
2. Verify it has implementation phases with success criteria (not just an outline).
3. IF valid plan with phases:
   - Populate `decisions.md` with the plan's key discoveries, constraints, and implementation approach.
   - Skip Phase 1 (Discover) and Phase 2 (Plan).
   - Enter Phase 3 (Implement) directly, using the plan's phases as the step-by-step guide.
   - Output checkpoint: `PLAN IMPORTED: {phase count} phases from {plan file}. Skipping Discover+Plan.`
4. IF plan is just an outline (no file paths, no code examples):
   - Proceed with normal Phase 1 (Discover), using the plan as initial context.
   - Output: `PLAN OUTLINE LOADED: using as research seed, running full discovery.`

## Phase 1: Discover (max 3 iterations)

1. Extract key nouns from task description (module names, file names, feature names).
2. For each noun: `Grep` codebase for matches. Read top 3 matching files.
3. For each file: extract imports to build dependency list.
4. Write to `decisions.md`: affected files, dependencies, constraints.
5. Output checkpoint: `DISCOVER COMPLETE: {file count} files, {dependency count} deps`

EXIT: When `decisions.md` contains discovery entry. IF 3 iterations without checkpoint: escalate to JM.

## Phase 2: Plan (max 2 iterations)

Write plan to `decisions.md`:
```
## Implementation Plan
- Files to create: {paths}
- Files to modify: {paths}
- Test files: {paths}
- Order of operations: {numbered list}
- Risks: {files imported by 3+ modules = high-risk}
- Test strategy: {one test file per modified source file}
```

Output checkpoint: `PLAN COMPLETE: {file count} files, {step count} steps`

EXIT: When plan written. IF 2 iterations without plan: escalate.

## Phase 3: Implement (max 10 iterations)

Execute the plan step by step.

IF task involves new functions or behavior changes: activate TDD.
```bash
bun .claude/hooks/lib/tdd-state.ts activate --feature {task-slug} --phase RED
```

After EVERY Write/Edit on `.ts`/`.tsx` file: run `bun test`.
- IF exit code != 0: read error output, fix before proceeding.
- IF same test fails 3 times: write to `problems.md`, try different approach.

After completing implementation:
```bash
bun .claude/hooks/lib/tdd-state.ts clear
```

Output checkpoint: `IMPLEMENT COMPLETE: {files changed}, {tests passing}`

## Phase 4: Verify (max 5 iterations)

1. `bun test` — all tests must pass.
2. `bunx tsc --noEmit` — zero type errors.
3. Read each modified file. Verify it addresses the task description.
4. Quality sniff test: would "un-smell, un-slop, un-stale, refactor for DRY" find anything? If yes, fix before proceeding.
5. IF a file was supposed to change but didn't: flag as gap.

IF issues found: loop back to Phase 3. MAX Phase 3↔4 loops: 3. After 3: deactivate with reason "verify-loop", escalate to JM.

IF all checks pass: deactivate with reason "complete".

## Working Memory

4-file memory (decisions, learnings, problems, issues) in `STATE_DIR/sessions/{session_id}/memory/`. Survives compression via Stop hook re-injection. Write at phase transitions and surprises.

## Error Recovery

IF stuck for 3+ iterations on same phase: escalate to JM with problem statement and what was tried.
