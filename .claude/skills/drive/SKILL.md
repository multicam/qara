---
name: drive
description: PRD-driven persistent execution mode. Iterates through user stories until all acceptance criteria pass, with TDD cycles, critic/verifier gates, and regression checks.
context: fork
effort: high
keep-coding-instructions: true
argument-hint: "<task description>"
---

# Drive Mode

Persistent execution. Iterates `prd.json` stories until all pass. Stop hook injects continuation — do NOT stop until criteria met or max iterations (50) reached.

## Bootstrap

1. PRD path from continuation message (`PRD: /path/to/prd.json`); else `prd.json` in cwd.
2. Read PRD. Missing → scaffold from task description, write to project root (NOT `~/.claude/`). Each story: `id`, `title`, `description`, `acceptance_criteria[]`, `passes: false`, `scenario_file: null`.
3. Malformed → fix + rewrite.
4. **Test runner:** follow `tdd-qa/references/detect-runner.md`. Set `$TEST_CMD` + `$FILE_EXT` for the session.
5. Pick first story where `passes == false`.

## Per-Story Loop

### 1. Critic Gate

Write PROPOSED APPROACH: files, strategy per file (1–3 sentences), test strategy (scenarios).

Spawn `critic` (sonnet). Prompt: acceptance criteria + proposed approach.

- `proceed` → step 2
- `revise` (≤2×) → modify approach, re-spawn
- 3rd rejection → `problems.md` + third call uses `model: opus` override. Still `revise` → escalate to JM. STOP.

### 2. Scenario Check

Check `scenario_file` in `prd.json`, or `specs/{story-id}.md`.
- Exists + `>50 bytes` + contains Given/When/Then → proceed
- Missing/empty → `tdd-qa/workflows/write-scenarios.md`, deactivate `awaiting-scenario-review`. STOP.

### 3. TDD Cycle

`tdd-qa/workflows/tdd-cycle.md`. Feature name: `{story-id}`. Workflow handles activation, RED→GREEN→REFACTOR, verification, cleanup.

TDD enforcement cleared after the cycle. Steps 4–5 operate without TDD enforcement — the tests the cycle wrote are the safety net for quality-pass refactoring.

Test runner crash (non-zero exit, no output): read stderr. Import error → fix import. Syntax error → fix. Still crashing after 3 → `problems.md`, ask JM.

### 4. Verifier Gate

Spawn `verifier` (sonnet). Prompt: story's acceptance criteria.

- `PASS` → step 5
- `FAIL` → extract failing criteria, fix, re-spawn. Max 3 attempts.
- 3rd failure → third call uses `model: opus` override. Still failing → `problems.md`, escalate. STOP.

### 5. Quality Pass

`git diff --name-only HEAD~1 -- $FILE_EXT` → changed files. Per file: apply sniff test ("un-smell, un-slop, un-stale, refactor for DRY"). Fix in place. Run `$TEST_CMD`; tests failing → revert that file's quality-pass diff.

### 6. Mark Story Passing

```typescript
markStoryPassing(prd, story.id, "verifier")
writePRD(projectDir, prd)
```

### 7. Continue

Stop hook injects continuation with next story.

## Completion

When `allStoriesPassing(prd) == true`:

1. **Regression (NOT per-story re-verification).** Per-story verifier gates already ran; completion only catches cross-story regressions.
   ```bash
   bun test ./.claude/         # catches test regressions
   bunx tsc --noEmit           # catches type regressions
   ```
2. Any failure → identify the offending story from the test/type error, `markStoryFailing(prd, story.id)`, `writePRD(projectDir, prd)`, loop back.
3. Max 3 regression cycles. Exceeded → deactivate `regression-loop`, escalate.
4. All pass → deactivate `complete`.

**Do NOT re-spawn verifier per story at completion.** The per-story gates are the source of truth; tests + tsc are sufficient cross-story coverage.

## Working Memory (Batched)

4-file memory in `$STATE_DIR/sessions/{session_id}/memory/`: `decisions.md`, `learnings.md`, `problems.md`, `issues.md`.

**Batch writes.** Accumulate observations in-context during a story. Flush once per story transition (or immediately on critic/verifier rejection, blocker, or bug discovery).

## Error Recovery

Same error message (>50 char substring match) 3× consecutively:

1. Write `problems.md`: "Stuck on: {error}. Attempts: {count}"
2. Import/module error → grep codebase for the symbol
3. Type error → read the type definition file
4. Test assertion → re-read scenario + acceptance criteria
5. Still failing after 5 total → deactivate `stuck`, output problem summary
