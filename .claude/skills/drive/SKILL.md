---
name: drive
description: PRD-driven persistent execution mode. Iterates through user stories until all acceptance criteria pass, with TDD cycles, critic/verifier gates, and regression checks.
context: fork
effort: high
keep-coding-instructions: true
argument-hint: "<task description>"
---

# Drive Mode

Persistent execution. Iterates `prd.json` stories until all pass. Stop hook injects continuation — you do NOT stop until criteria met or max iterations (50) reached.

## Bootstrap

1. The PRD path is injected by the mode system (check the continuation message for `PRD: /path/to/prd.json`). If not present, use `prd.json` in the current working directory.
2. Read the PRD file. IF missing: scaffold from task description. **Write `prd.json` to the project root** (the repo you're working in, NOT ~/.claude/). Each story MUST have `id`, `title`, `description`, `acceptance_criteria[]`, `passes: false`, `scenario_file: null`.
3. IF malformed: fix and rewrite.
4. **Detect test runner:** Follow `tdd-qa/references/detect-runner.md` (authoritative 4-step detection: pytest → Vitest → Bun → package.json fallback). Set `$TEST_CMD` and `$FILE_EXT` for the entire session.
5. Pick first story where `passes == false`.

## Per-Story Loop

### 1. Critic Gate

Write a PROPOSED APPROACH:
- Files to create/modify (list paths)
- Strategy per file (1-3 sentences)
- Test strategy (which scenarios)

Spawn `critic` agent with prompt containing the acceptance criteria AND proposed approach.

Parse critic response:
- IF contains "proceed": continue to step 2.
- IF contains "revise": extract issues, modify approach, re-spawn critic.
- IF 2 revisions exhausted AND still "revise": write to `problems.md` "Critic rejected 3x for story {id}". Ask JM. STOP.

### 2. Scenario Check

Check story's `scenario_file` field in prd.json, OR `specs/{story-id}.md`.
- IF file exists AND contains "Given" or "When" or "Then" AND is >50 bytes: proceed.
- IF missing or empty: follow `tdd-qa/workflows/write-scenarios.md` to generate scenarios. Deactivate mode with reason "awaiting-scenario-review". STOP.

### 3. TDD Cycle

Follow `tdd-qa/workflows/tdd-cycle.md` (authoritative RED→GREEN→REFACTOR blueprint).
Use `{story-id}` as the feature name for TDD activation.

For each scenario in the spec file, the workflow handles: activation, phase transitions,
verification, mutation bonus round, and cleanup.

**Note:** TDD enforcement is cleared after the cycle completes. The subsequent verifier
gate and quality pass (steps 4-5) operate without TDD enforcement — this is intentional,
as existing tests from the TDD cycle provide the safety net for quality-pass refactoring.

IF any test run crashes (non-zero exit, no output): read stderr. IF import error: fix import. IF syntax error: fix syntax. IF still crashing after 3 attempts: write to `problems.md` and ask JM.

### 4. Verifier Gate

Spawn `verifier` agent with the story's acceptance criteria.

Parse verifier response:
- IF contains "PASS": continue to step 5.
- IF contains "FAIL": extract failing criteria, fix each, re-spawn verifier.
- MAX 3 verification attempts. After 3: write to `problems.md`, ask JM. STOP.

### 5. Quality Pass

Run `git diff --name-only HEAD~1 -- $FILE_EXT` to get changed files.
For each file: quality sniff test — would "un-smell, un-slop, un-stale, refactor for DRY" find anything? If yes, fix it.
After changes: run `$TEST_CMD`. IF tests fail: revert quality-pass changes for that file.

### 6. Mark Story Passing

```typescript
markStoryPassing(prd, story.id, "verifier")
writePRD(projectDir, prd)
```

### 7. Continue

Stop hook injects continuation with next story.

## Completion

When `allStoriesPassing(prd) == true`:
- Full regression: for each story, spawn `verifier` agent.
- IF any verifier returns FAIL: `markStoryFailing(prd, story.id)`, `writePRD(projectDir, prd)`, loop back.
- MAX 3 regression cycles. After 3: deactivate with reason "regression-loop", escalate to JM.
- IF all pass: deactivate with reason "complete".

## Working Memory

4-file memory (decisions, learnings, problems, issues) in `STATE_DIR/sessions/{session_id}/memory/`. Survives compression via Stop hook re-injection. Write at decision points, surprises, blockers, and bug discoveries.

## Error Recovery

IF same error message (>50 char substring match) appears 3 consecutive times:
1. Write to `problems.md`: "Stuck on: {error}. Attempts: {count}"
2. IF import/module error: grep codebase for the symbol.
3. IF type error: read the type definition file.
4. IF test assertion: re-read scenario and acceptance criteria.
5. IF still failing after 5 total attempts: deactivate with reason "stuck". Output problem summary.
