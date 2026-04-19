---
name: turbo
description: Parallel agent dispatch mode. Decomposes tasks into independent subtasks, spawns parallel agents, collects and verifies results.
context: fork
effort: high
keep-coding-instructions: true
argument-hint: "<task description>"
---

# Turbo Mode

Parallel dispatch. Decompose → Dispatch → Collect → Synthesize → Verify. Default: 30 max iterations.

## Plan-Aware Entry

If activated with a plan file path (e.g. `turbo: implement plans/foo-v1.md`):

1. Read the plan file fully.
2. Check independence: no phase references output from another phase.
3. Independent → use phases as subtasks, map each to an agent type + tier (see Dispatch matrix). Write to `mode-decisions.md`. Skip to step 2 (Dispatch). Output: `PLAN DECOMPOSED: {N} independent subtasks`.
4. Sequential/dependent → deactivate turbo, activate cruise with plan reference. Output: `PLAN IS SEQUENTIAL: falling back to cruise`.
5. `<2` phases → fall back to cruise.

## 1. Decompose

2–5 independent subtasks. Write to `mode-decisions.md`:

```
Subtask {n}: {title}
  Agent: {type}
  Tier: {low|standard|high}
  Input files: {list}
  Output files: {list}
  Acceptance: {criterion}
```

Independence check: any two subtasks sharing an output file → not independent → merge or sequence.
`<2` subtasks → fall back to cruise.
`>5` subtasks → group related ones.

## 2. Dispatch — Tiered Matrix

Spawn ALL agents in a single message (parallel). Pick the cheapest sufficient tier per subtask:

| Subtask kind | Default agent | Tier / model |
|---|---|---|
| File discovery, pattern finding, "where does X live" | `codebase-analyzer-low` | haiku |
| Trivial edit: rename, import fix, type annotation | `engineer-low` | haiku |
| Data-flow trace, implementation analysis | `codebase-analyzer` | sonnet |
| Standard implementation: add function, wire feature, write tests | `engineer` | sonnet |
| Routine review: correctness, style, simple security | `reviewer-low` | haiku |
| Cross-cutting refactor, new abstraction, multi-file redesign | `engineer-high` | opus |
| Security/OWASP review, architectural review | `reviewer` | sonnet |
| PRD, system design, architecture decisions | `architect` | opus |

**Rule:** start at the lowest tier that plausibly covers the subtask. Escalate via re-dispatch if the low-tier output is insufficient (see Collect → "mark as gap").

Each agent prompt MUST include: subtask description, input files, expected output, acceptance criterion.

## 3. Collect

For each completed agent:

1. Output starts with "FAIL" or "Error" → mark failed.
2. Extract file paths (after "Created:", "Modified:", or code-block paths).
3. Build file-to-subtask map. File in 2+ subtask outputs → CONFLICT.
4. Check acceptance criterion. Unmet → mark as gap.

Subtask failed:
1. Write `problems.md`.
2. Re-dispatch SAME agent type at the NEXT tier up (low → standard → high).
3. Max 2 re-dispatches per subtask. Still failing → mark permanently failed, handle in main thread.

## 4. Synthesize

Conflicts:
1. Read both versions.
2. One strictly additive (only adds lines) → prefer it.
3. Both modify existing lines → run `bun test` with each. Keep the one that passes.
4. Neither passes → manual merge, smaller diff wins.

Run `bun test` + `bunx tsc --noEmit` after merge.

## 5. Verify

Test runner: `tdd-qa/references/detect-runner.md` if `$TEST_CMD` unset.

- `$TEST_CMD` — all tests pass
- `bunx tsc --noEmit` — zero type errors (TS only)
- Sniff test: "un-smell, un-slop, un-stale, refactor for DRY" → fix
- Issues → fix + re-verify. Max 3 verify loops.
- Still failing → deactivate `turbo-verify-failed`, escalate.

All pass → deactivate `complete`.

## Working Memory (Batched)

4-file memory in `$STATE_DIR/sessions/{session_id}/memory/`: `mode-decisions.md`, `learnings.md`, `problems.md`, `issues.md`.

**Batch writes.** Flush at: decomposition complete, after each agent completes, during synthesis, at mode deactivation. No per-event flushing.

## Error Recovery

Synthesis fails 2× → deactivate `turbo-fallback`. Activate cruise with same task. Do NOT re-attempt turbo decomposition.
