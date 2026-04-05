---
name: cruise
description: Phased autonomous execution mode. Discover → Plan → Implement → Verify with checkpoints between phases.
context: fork
argument-hint: "<task description>"
---

# Cruise Mode

Phased autonomous execution that works through a structured pipeline. Each phase completes before the next begins, with checkpoint summaries between phases.

## Activation

Activated by keyword "cruise" in prompt (via keyword-router hook). Default: 20 max iterations.

## Phases

### Phase 1: Discover
- Explore the codebase relevant to the task
- Read existing implementations, patterns, tests
- Identify files that will be affected
- Map dependencies and constraints
- **Checkpoint:** Emit summary of what was found, what's relevant, what constraints exist

### Phase 2: Plan
- Produce an implementation plan based on discovery
- Identify risks and edge cases
- Determine test strategy (which scenarios, which layers)
- **Checkpoint:** Emit the plan for JM to review. If JM provides feedback, incorporate it.

### Phase 3: Implement
- Execute the plan step by step
- Follow TDD when writing code (activate tdd-state if appropriate)
- Run tests after each significant change
- **Checkpoint:** Emit summary of what was built, what tests pass

### Phase 4: Verify
- Run full test suite: `bun test`
- Type check: `bunx tsc --noEmit`
- Review changes for quality and completeness
- **Checkpoint:** Emit verification results. If issues found, loop back to Phase 3.

## Completion

When Phase 4 passes with no issues → deactivate mode with reason `complete`.

## Working Memory

Session-scoped 4-file memory (decisions, learnings, problems, issues) in `.claude/state/sessions/{session_id}/memory/`. Survives compression via Stop hook re-injection. Write at phase transitions and when encountering surprises.

## Error Recovery

If stuck for 3+ iterations on the same phase: escalate to JM with a clear problem statement and what was tried.
