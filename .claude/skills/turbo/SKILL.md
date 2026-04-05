---
name: turbo
description: Parallel agent dispatch mode. Decomposes tasks into independent subtasks, spawns parallel agents, collects and verifies results.
context: fork
argument-hint: "<task description>"
---

# Turbo Mode

Parallel agent dispatch that decomposes a task into independent subtasks, runs them concurrently via subagents, and synthesizes results. Maximizes throughput for tasks with natural parallelism.

## Activation

Activated by keyword "turbo" in prompt (via keyword-router hook). Default: 30 max iterations.

## Workflow

### 1. Decompose
Analyze the task and identify independent subtasks that can run in parallel.
- Each subtask must be self-contained (no dependency on other subtasks' output)
- Aim for 3-5 parallel subtasks (diminishing returns beyond that)
- Document the decomposition in `decisions.md`

### 2. Dispatch
Spawn parallel agents using the Agent tool with appropriate `subagent_type`:
- `engineer` for implementation subtasks
- `codebase-analyzer` for research subtasks
- `reviewer` for review subtasks
- Launch all independent agents in a single message (parallel execution)

SubagentStart/Stop hooks track active agents and deliverables.

### 3. Collect
Wait for all agents to complete. Review each deliverable:
- Does it meet the subtask's requirements?
- Are there conflicts between agent outputs? (e.g., both modified the same file)
- Are there gaps? (subtask missed, edge case uncovered)

### 4. Synthesize
Merge results into a coherent whole:
- Resolve any conflicts (prefer the more conservative/correct approach)
- Run full test suite to verify integration
- Type check: `bunx tsc --noEmit`

### 5. Verify
- Run `bun test` — all tests must pass
- Review for coherence — changes should feel like one person wrote them
- If issues found → fix and re-verify

## Completion

When synthesis passes verification → deactivate mode with reason `complete`.

## Working Memory

Session-scoped 4-file memory (decisions, learnings, problems, issues) in `.claude/state/sessions/{session_id}/memory/`. Survives compression via Stop hook re-injection. Write after decomposition, after each agent completes, and during synthesis.

## Error Recovery

If a subagent fails: re-dispatch with adjusted parameters or different agent type. If synthesis fails repeatedly: fall back to sequential execution (cruise mode pattern).
