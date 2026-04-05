---
name: turbo
description: Parallel agent dispatch mode. Decomposes tasks into independent subtasks, spawns parallel agents, collects and verifies results.
context: fork
argument-hint: "<task description>"
---

# Turbo Mode

Parallel agent dispatch. Decompose → Dispatch → Collect → Synthesize → Verify. Default: 30 max iterations.

## 1. Decompose

Break task into 2-5 independent subtasks. Write to `decisions.md`:

```
Subtask {n}: {title}
  Agent: {engineer|codebase-analyzer|reviewer}
  Input files: {list}
  Output files: {list}
  Acceptance: {criterion}
```

Independence check: IF any two subtasks share an output file, they are NOT independent. Merge or sequence them.

IF task yields <2 subtasks: fall back to cruise mode. Deactivate turbo, activate cruise with same task.
IF task yields >5 subtasks: group related ones until count is 2-5.

## 2. Dispatch

Spawn ALL agents in a single message (parallel execution) using the Agent tool:
- `engineer` for implementation
- `codebase-analyzer` for research
- `reviewer` for review

Each agent prompt MUST include: the subtask description, input files, expected output, and acceptance criterion.

## 3. Collect

For each completed agent:
1. IF output contains "FAIL" or "Error" at the start: mark subtask as failed.
2. Extract file paths from output (after "Created:", "Modified:", or file paths in code blocks).
3. Build file-to-subtask map. IF any file appears in 2+ subtask outputs: flag as CONFLICT.
4. Check acceptance criterion against output. IF unmet: mark as gap.

IF subtask failed:
1. Read failure output. Write to `problems.md`.
2. Re-dispatch same agent type with additional context from the failure.
3. MAX 2 re-dispatches per subtask. After 2: mark as permanently failed, handle in main thread.

## 4. Synthesize

IF conflicts detected:
1. Read both versions of conflicting file.
2. IF one is strictly additive (only adds lines): prefer it.
3. IF both modify existing lines: run `bun test` with each version. Keep the one that passes.
4. IF neither passes: merge manually, take the smaller diff.

Run `bun test` after merge. Run `bunx tsc --noEmit`.

## 5. Verify

- `bun test` — all tests must pass.
- `bunx tsc --noEmit` — zero type errors.
- IF issues found: fix and re-verify. MAX 3 verify loops.
- IF still failing after 3: deactivate with reason "turbo-verify-failed", escalate to JM.

IF all pass: deactivate with reason "complete".

## Working Memory

4-file memory (decisions, learnings, problems, issues) in `STATE_DIR/sessions/{session_id}/memory/`. Survives compression via Stop hook re-injection. Write after decomposition, after each agent completes, and during synthesis.

## Error Recovery

IF synthesis fails 2 times: deactivate with reason "turbo-fallback". Activate cruise mode with same task. Do NOT re-attempt turbo decomposition.
