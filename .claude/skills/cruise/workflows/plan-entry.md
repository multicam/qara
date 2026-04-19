# Workflow: Plan-Aware Execution

Activated by `cruise/SKILL.md` when `ModeState.planPath` is set. Replaces cruise's Phase 3 + Phase 4 for plan-driven sessions. Task-mode cruise (no plan file) still uses the original cruise phases.

## Prerequisites

- `ModeState.planPath` set (keyword-router extracts `plans/*.md` from activation text).
- Plan file already read during cruise's Plan-Aware Entry; `mode-decisions.md` populated.
- Plan follows `plan-template.md` structure (`## Phase N:` headings + `#### Automated Verification:` subsections). Readiness enforced upstream by `plan-readiness-assessment.md`.

## Plan Cache

On first entry (or when cache is missing/stale), parse the plan once into `$STATE_DIR/sessions/{session_id}/memory/plan-cache.json`:

```json
{
  "plan_path": "thoughts/shared/plans/domain--feature-v1.md",
  "mtime_ms": 1712345678000,
  "phases": [
    {
      "n": 1,
      "title": "...",
      "line_start": 42,
      "line_end": 98,
      "automated": [
        {"text": "bun test ./foo.test.ts passes", "done": false, "line": 67},
        ...
      ],
      "manual": [
        {"text": "Verify UI behavior", "done": false, "line": 85},
        ...
      ]
    },
    ...
  ]
}
```

**Cache invalidation rules:**
- Stat plan file; if `mtime_ms > cache.mtime_ms` → re-parse (JM hand-edited).
- After step 5 (Tick Checkboxes) mutates the plan file → re-parse.
- Otherwise: read cache (500 bytes), skip full plan re-read.

**This replaces the old "Read the plan file fully" on every phase identification.** Full re-read happens only on invalidation.

## Phase Identification

On entry and after every completed phase:

1. Load plan cache (parse plan file if cache missing or stale).
2. Find the lowest-numbered phase with at least one `automated.done == false`.
3. **Current phase** = that phase. If all phases are fully ticked (automated + manual), proceed to Final Regression.
4. **Ambiguity fallback**: if parse yields 0 phases, or a phase has no Automated Verification subsection, STOP and output:
   ```
   PLAN STRUCTURE AMBIGUOUS: expected `## Phase N: Name` headings with `#### Automated Verification:` subsections.
   ```
   Deactivate with reason `plan-structure-ambiguous` and escalate.

**Scope:** only scan `#### Automated Verification:` bullets inside phase bodies. Do NOT scan Pre-flight Checklist, Testing Strategy, or top-level plan sections.

## Per-Phase Loop

For each current phase, run steps 1–6 in order. After step 6, re-run Phase Identification. Loop until no current phase remains.

### 1. Critic Gate

Write a PROPOSED APPROACH:
- Files to create/modify (from the phase's Changes Required)
- Strategy per file (1–3 sentences, reflecting current codebase state after earlier phases)
- Test strategy (Automated Verification → test scenarios vs grep/file checks)

Spawn `critic` (Task tool, `subagent_type: critic`, runs at sonnet). Prompt includes:
- Phase heading, Overview, Changes Required verbatim
- Full Success Criteria
- The PROPOSED APPROACH
- Instruction: return `proceed` or `revise` with issues

Parse response:
- `proceed` → step 2
- `revise` → extract issues, revise approach, re-spawn critic.
  Call critic up to 3 times total per phase: attempts 1 and 2 at sonnet (agent default), attempt 3 with `model: opus` override on the Task tool (critic prepends `[ESCALATED]` in its response). After the 3rd rejection: write `problems.md` "Critic rejected 3x for Phase {N}: {last feedback}", deactivate `critic-rejected`, escalate to JM.

### 2. TDD Cycle (conditional)

IF the phase's Changes Required modify behavioral source files (`.ts .tsx .js .jsx .svelte`, excluding tests, configs, docs, `purgatory/`, `thoughts/`):

Follow `skills/tdd-qa/workflows/tdd-cycle.md` with scenarios derived from Automated Verification bullets. Scenarios = bullets describing runtime behavior (not grep/test-f checks).

```bash
bun .claude/hooks/lib/tdd-state.ts activate --feature plan-phase-{N} --phase RED
# ... cycle ...
bun .claude/hooks/lib/tdd-state.ts clear
```

Skip TDD for docs-only, config-only, or non-source phases.

### 3. Quality Sniff Pass

**Skip this step if `git diff --name-only HEAD` returns no behavioral-source files** (`.ts .tsx .js .jsx .svelte`, excluding tests, configs, docs, `purgatory/`, `thoughts/`). Docs-only and config-only phases have nothing to sniff.

Otherwise: `git diff --name-only HEAD` → list changed behavioral-source files. For each: read, apply the sniff test:

> "Would un-smell, un-slop, un-stale, refactor-for-DRY find anything?"

Fix in place. After each fix, run `$TEST_CMD` (typically `bun test ./.claude/`). If tests fail after a quality-pass change, revert that file's quality diff — tests are the safety net.

### 4. Verifier Gate

Spawn `verifier` (sonnet). Prompt includes:
- Phase heading + Overview
- ONLY the `#### Automated Verification:` items (manual handled in step 6)
- Instruction: `PASS` or `FAIL: {criterion}` per item

Parse response:
- All `PASS` → step 5
- Any `FAIL` → extract, fix, re-spawn verifier.
  Call verifier up to 3 times per phase: attempts 1 and 2 at sonnet, attempt 3 with `model: opus` override (verifier prepends `[ESCALATED]`). After the 3rd failure: write `problems.md`, deactivate `verifier-rejected`, escalate.

### 5. Mutate plan.md — Batched Checkbox Tick

**Single-Edit strategy.** Instead of N individual Edits (one per criterion), rewrite the current phase block in ONE Edit:

1. From plan cache, get the phase's `line_start`..`line_end`.
2. Read those lines from the plan file (small read).
3. In the read content, replace every `- [ ]` inside the `#### Automated Verification:` subsection with `- [x]` for items the verifier confirmed PASS.
4. Use a single `Edit` call with the original phase block as `old_string` and the updated block as `new_string`.
5. Update `plan-cache.json`: mark each ticked automated item `done: true`, update `mtime_ms` to the new plan file mtime.

**Safety:** only touch the current phase's Automated Verification. Never touch Pre-flight, Testing Strategy, or other phases' checkboxes.

### 6. Manual Verification Handler (conditional)

IF the phase has a `#### Manual Verification:` subsection with any unticked items:

1. Output to JM: `Phase {N} Complete — Ready for Manual Verification`, followed by the ticked automated items and the unticked manual list. Prompt: "Reply PASS to confirm, or FAIL: {item} to flag."
2. Deactivate `awaiting-manual-verification`. STOP.

On re-activation with PASS: tick manual items (same batched-Edit rule as step 5), show `git diff` of plan file, proceed.

On FAIL: do NOT tick. Write `issues.md`: "Phase {N} manual verification failed: {item}". Ask JM: re-run or escalate. Deactivate `manual-verification-failed`.

IF no manual items (or all already ticked), skip.

## Final Regression

When Phase Identification finds no current phase:

1. `bun test ./.claude/` — all pass.
2. `bunx tsc --noEmit` — zero type errors.

Fail → write `problems.md`, deactivate `regression-failed`. JM investigates.
Pass → output completion summary (commits, phases completed, test count), deactivate `complete`.

## Working Memory (Batched)

4-file memory at `$STATE_DIR/sessions/{session_id}/memory/`: `mode-decisions.md`, `learnings.md`, `issues.md`, `problems.md`.

**Batching rule:** accumulate observations in-context during a phase. Flush once at phase transition with a single Write per touched memory file. Do NOT flush on every small event — batch.

Flush triggers:
- Phase transition (after step 6)
- Critic/verifier rejection (surprise — flush immediately)
- Manual-verification pause (so JM sees current state)
- Mode deactivation (final state snapshot)

## Cross-References

- `cruise/SKILL.md` — parent; delegates here when `planPath` set
- `drive/SKILL.md` — per-story loop pattern source
- `tdd-qa/workflows/tdd-cycle.md` — shared TDD cycle
- `CORE/workflows/plan-template.md` — canonical phase structure
- `CORE/workflows/plan-readiness-assessment.md` — upstream READY gate
- `.claude/context/execution-modes-quality.md` — full decision rationale
- `.claude/hooks/lib/mode-state.ts` — `ModeState.planPath` field
- `.claude/hooks/stop-hook.ts` — continuation survives compression
