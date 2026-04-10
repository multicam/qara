# Workflow: Plan-Aware Execution

Triggered by cruise's SKILL.md `Plan-Aware Execution` section when cruise is
activated with a plan file path (ModeState.planPath is set). Replaces
cruise's Phase 3 + Phase 4 for plan-driven sessions. Task-mode cruise (no
plan file) continues to use the original Phase 3 + Phase 4 described in
cruise/SKILL.md.

## Prerequisites

- `ModeState.planPath` is set (keyword-router extracts `plans/*.md` paths
  from activation text — see `.claude/hooks/keyword-router.ts`).
- Plan file was read during cruise's existing Plan-Aware Entry; `decisions.md`
  is populated with discoveries + approach.
- Plan follows `plan-template.md`: `## Phase N:` headings with
  `#### Automated Verification:` and optional `#### Manual Verification:`
  subsections. Plans reaching this workflow are assumed READY
  (enforced upstream by `plan-readiness-assessment.md`).

## Phase Identification

On entry and after every completed phase, re-identify the current phase:

1. Read the plan file fully.
2. Match `/^## Phase (\d+):/m` to list all phase headings and their line
   positions. Extract the phase number and the body (text between this
   heading and the next `^## ` heading, or EOF).
3. For each phase body in numeric order, scan its `#### Automated
   Verification:` subsection for any unticked `- [ ]` checkbox.
4. **Current phase** = the lowest-numbered phase with at least one
   unticked automated checkbox. If all phases are fully ticked, proceed
   to Final Regression.
5. **Ambiguity fallback**: if the regex matches zero phases, or if the
   same phase number appears twice, or if a phase has no Automated
   Verification subsection at all, STOP and output:
   ```
   PLAN STRUCTURE AMBIGUOUS: manual phase identification required.
   Expected: `## Phase N: Name` headings with `#### Automated Verification:` subsections.
   ```
   Then deactivate mode with reason `plan-structure-ambiguous` and escalate.

**Important**: only scan `#### Automated Verification:` bullets inside phase
bodies. Do NOT scan the Pre-flight Checklist, Testing Strategy, or any
top-level plan sections — those contain unrelated `- [ ]` items that must
not be touched.

## Per-Phase Loop

For each identified current phase, execute steps 1-6 in order. After
step 6, re-run Phase Identification. Loop until no current phase remains.

### 1. Critic Gate

Write a PROPOSED APPROACH for the current phase. Include:
- Files to create/modify (extracted from the phase's Changes Required section)
- Strategy per file (1-3 sentences, given current codebase state after
  earlier phases landed)
- Test strategy (which Automated Verification items become test scenarios,
  which become grep/file-existence checks)

Spawn the `critic` agent (`Task` tool, `subagent_type: critic`) with a
prompt containing:
- The phase's heading, Overview, and Changes Required subsections verbatim
- The phase's full Success Criteria (Automated + Manual)
- The PROPOSED APPROACH written above
- Instruction to return `proceed` or `revise` with specific issues

Parse critic response:
- Contains `proceed` → continue to step 2
- Contains `revise` → extract issues, revise the PROPOSED APPROACH,
  re-spawn critic (max 2 revisions)
- After 2 revisions still `revise` → write to working memory `problems.md`:
  "Critic rejected 3x for Phase {N}: {last feedback summary}". Deactivate
  with reason `critic-rejected`. Escalate to JM.

### 2. TDD Cycle (conditional)

IF the phase's Changes Required modify behavioral source files (extensions
`.ts`, `.tsx`, `.js`, `.jsx`, `.svelte`, excluding tests, configs, docs,
and files under `purgatory/` or `thoughts/`), follow
`skills/tdd-qa/workflows/tdd-cycle.md` with inline scenarios derived from
the phase's Automated Verification items.

- Use `plan-phase-{N}` as the feature name for TDD activation:
  ```
  bun .claude/hooks/lib/tdd-state.ts activate --feature plan-phase-{N} --phase RED
  ```
- Scenarios come from the Automated Verification bullets. Each bullet that
  describes runtime behavior (not a grep/test-f check) is a scenario.
- After GREEN passes, clear TDD state:
  ```
  bun .claude/hooks/lib/tdd-state.ts clear
  ```

Skip TDD entirely for documentation-only phases, config-only phases, or
phases whose Changes Required lists only non-source files.

### 3. Quality Sniff Pass

Run `git diff --name-only HEAD` to list changed files. For each file
matching behavioral source extensions, read the file and apply the
quality sniff test:

> "Would un-smell, un-slop, un-stale, refactor-for-DRY find anything?"

Fix in place. After each fix, run the session's `$TEST_CMD` (typically
`bun test ./.claude/`). If tests fail after a quality-pass change, revert
just that file's quality-pass diff — the tests are the safety net for
refactoring, and failure means the refactor was unsafe.

### 4. Verifier Gate

Spawn the `verifier` agent with a prompt containing:
- The phase's heading and Overview
- ONLY the `#### Automated Verification:` items (manual items are handled
  in step 6)
- Instruction to return `PASS` or `FAIL: {criterion}` per item

Parse verifier response:
- All items `PASS` → continue to step 5
- Any `FAIL: {criterion}` → extract failing items, fix each, re-spawn
  verifier (max 3 verification attempts per phase)
- After 3 attempts still failing → write to `problems.md`: "Verifier
  rejected Phase {N} 3x on {criterion}". Deactivate with reason
  `verifier-rejected`. Escalate to JM.

### 5. Mutate plan.md — Tick Automated Checkboxes

For each Automated Verification item the verifier confirmed as PASS, use
the `Edit` tool to change `- [ ]` → `- [x]`. Use the full bullet text
(including backticked commands) as `old_string` to keep each edit unique
without `replace_all`.

**Safety rule**: only tick checkboxes inside the current phase's
`#### Automated Verification:` subsection. Never touch the Pre-flight
Checklist, Testing Strategy, or top-level plan checkboxes.

### 6. Manual Verification Handler (conditional)

IF the current phase has a `#### Manual Verification:` subsection with any
unticked `- [ ]` items:

1. Output to JM: `Phase {N} Complete — Ready for Manual Verification`,
   followed by the ticked automated items and the unticked manual list.
   Prompt: "Reply with PASS to confirm, or FAIL: {item} to flag."
2. Deactivate with reason `awaiting-manual-verification`. STOP.

On re-activation with PASS: tick manual checkboxes (matching rule from
step 5), show `git diff` of the plan file, proceed to next phase.

On FAIL: do NOT tick; write to `issues.md`: "Phase {N} manual verification
failed: {item}"; ask JM whether to re-run or escalate; deactivate with
reason `manual-verification-failed`.

IF the phase has no Manual Verification items (or all already ticked),
skip this step and proceed directly to next phase.

## Final Regression

When Phase Identification finds no current phase (all phases fully ticked
in both Automated and Manual subsections):

1. Run `bun test ./.claude/` — all tests must pass.
2. Run `bunx tsc --noEmit` — zero type errors.

IF either fails: output failure details, write to `problems.md`, and
deactivate with reason `regression-failed`. JM will investigate, fix,
and decide whether to re-activate.

IF both pass: output a completion summary (commits landed, phases
completed, test count) and deactivate with reason `complete`.

## Working Memory & Error Recovery

Use cruise's existing 4-file memory at `$STATE_DIR/sessions/{session_id}/memory/`
(`decisions.md`, `learnings.md`, `issues.md`, `problems.md`). Write at phase
transitions, critic/verifier rejections, and manual-verification pauses.

Error recovery follows `.claude/skills/drive/SKILL.md` Error Recovery section
verbatim: same-error-3x triggers `problems.md`, import errors trigger grep +
fix, type errors trigger definition lookup, still-failing after 5 total
attempts → deactivate with reason `stuck`.

## Cross-References

- `cruise/SKILL.md` — parent skill; delegates here when `planPath` is set
- `drive/SKILL.md` — per-story loop pattern source
- `tdd-qa/workflows/tdd-cycle.md` — shared TDD cycle; supports inline scenarios
- `CORE/workflows/plan-template.md` — canonical `## Phase N:` + checkbox structure
- `CORE/workflows/plan-readiness-assessment.md` — upstream READY gate
- `.claude/context/execution-modes-quality.md` — full decision rationale (all 14 resolved decisions + rollout order)
- `.claude/hooks/lib/mode-state.ts` — `ModeState.planPath` field
- `.claude/hooks/stop-hook.ts` — continuation emits `Plan:` line so this workflow survives compression
