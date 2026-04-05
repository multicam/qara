---
name: drive
description: PRD-driven persistent execution mode. Iterates through user stories until all acceptance criteria pass, with TDD cycles, critic/verifier gates, and regression checks.
context: fork
argument-hint: "<task description>"
---

# Drive Mode

Persistent execution mode that works through PRD stories until all pass. Loop via Stop hook continuation — Claude does not stop until acceptance criteria are met or max iterations reached.

## Activation

Activated by keyword "drive" in prompt (via keyword-router hook). Default: 50 max iterations. Mode state written to `STATE_DIR/mode-state.json`. Stop hook reads this state and injects continuation messages.

## Per-Story Loop

For each story in `prd.json` where `passes: false`:

### 1. Critic Gate (Pre-Implementation)
Spawn `critic` agent with the story's acceptance criteria and your proposed approach.
- Critic checks: scenario coverage, criteria alignment, risks, scope creep
- If `verdict: revise` → adjust approach, re-submit (max 2 revisions)
- If `verdict: proceed` → continue

### 2. Scenario Check
Verify scenarios exist — check story's `scenario_file` field in prd.json, or `specs/{story-id}.md`.
- If missing: follow `tdd-qa/workflows/write-scenarios.md`
- Wait for JM to review scenarios before proceeding

### 3. TDD Cycle
Activate TDD enforcement:
```bash
bun .claude/hooks/lib/tdd-state.ts activate --feature {story-id} --phase RED
```

For each scenario in the spec file:
- **RED:** Write a failing test. Hook blocks source file edits.
- **GREEN:** Write minimal code to pass. `bun .claude/hooks/lib/tdd-state.ts phase GREEN`
- **REFACTOR:** Clean up. `bun .claude/hooks/lib/tdd-state.ts phase REFACTOR`
- Back to RED for next scenario.

Deactivate when all scenarios covered:
```bash
bun .claude/hooks/lib/tdd-state.ts clear
```

### 4. Verifier Gate (Post-Implementation)
Spawn `verifier` agent with acceptance criteria.
- Verifier runs quality gates: bun test (JUnit + lcov), test-report.ts compare, tsc --noEmit
- If FAIL: fix failing criteria, re-verify (max 3 attempts)
- If PASS: update test baselines, continue

### 5. Simplify Pass
Run the `simplify` skill on all code changes from this story. Anti-slop enforcement.

### 6. Mark Story Passing
Update `prd.json`: set `passes: true`, `verified_at`, `verified_by: "verifier"`.

### 7. Continue to Next Story
Stop hook injects continuation message with next story context.

## Completion

When all stories have `passes: true`:
- **Full regression pass:** Re-verify ALL stories (not just the latest). Any regression → mark as failing, loop back.
- If regression pass clean → deactivate mode with reason `complete`.

## Working Memory

Session-scoped 4-file memory (decisions, learnings, problems, issues) in `.claude/state/sessions/{session_id}/memory/`. Survives compression via Stop hook re-injection. Write at decision points, surprises, blockers, and bug discoveries.

## Error Recovery

If the same error occurs 3+ times:
- Stop retrying the same approach
- Escalate: try a fundamentally different strategy
- If still stuck after 5 attempts: pause and ask JM for guidance

## PRD Format

Expected at project root as `prd.json`:
```json
{
  "name": "Feature Name",
  "created_at": "2026-04-06T00:00:00Z",
  "stories": [
    {
      "id": "1",
      "title": "Story title",
      "description": "What to build",
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "passes": false,
      "verified_at": null,
      "verified_by": null,
      "scenario_file": null
    }
  ]
}
```

If `prd.json` does not exist, ask JM to create one or offer to scaffold it from the task description.
