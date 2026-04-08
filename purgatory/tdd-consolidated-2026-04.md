# TDD Infrastructure: Consolidated Plan

## Context

Two rounds of review on Qara's TDD infrastructure:
1. Code-level audit → DRY consolidation, test-deletion defense, dead code removal (implemented)
2. Process-level review → first-principles critique eliminated 8/10 proposals, surfaced the real problem

**The real problem:** The TDD system is well-built infrastructure that doesn't activate. Zero production TDD cycles have ever run. The fix isn't hardening — it's activation plus three high-signal improvements.

---

## Already Done (Code Changes)

- [x] Replaced 6 inline session ID chains with `getSessionId()`
- [x] Replaced duplicate `atomicWriteState()` with `atomicWriteJson()` in tdd-state.ts and mode-state.ts
- [x] Extracted `isTestFile()` to `file-patterns.ts`, reduced 8 regex patterns to 5
- [x] Added removed-test gate to backtest `compare()` — gate fails when tests are deleted
- [x] Added test-shrinking detection in GREEN phase — `ask` prompt when Edit reduces test content
- [x] Deduped scenario parser flush logic
- [x] Moved pre-commit-scan.ts to purgatory (AI review contradicts deterministic-first)
- [x] All 1442 tests pass, 0 failures

---

## Remaining Changes

### 1. Auto-activate TDD from drive/cruise modes

**What:** When drive mode starts a story's TDD cycle (SKILL.md step 3), it already calls `bun tdd-state.ts activate`. This works. But cruise mode's Implement phase doesn't activate TDD enforcement — it just runs `bun test` after edits.

**Change:** In cruise SKILL.md Implement phase, add: when task involves new functions or modified public interfaces, activate TDD enforcement before implementation begins. Deactivate after verify phase passes.

**Files:** `.claude/skills/cruise/SKILL.md`

### 2. Structured checkpoints at scenario boundaries

**What:** After each scenario completes in tdd-cycle, write a checkpoint to working memory:

```json
{"scenario": "login-success", "phase": "complete", "test_file": "auth.test.ts", "impl_file": "auth.ts"}
```

When PreCompact fires mid-cycle, the agent recovers from checkpoint state + files on disk, not from compressed conversation history. Prevents context degradation across 5-10 scenario iterations.

**Change:** Add a deterministic step between step 9 (Next Scenario) and step 1 (RED) in tdd-cycle.md. Uses existing `working-memory.ts` — no new infrastructure.

**Files:** `.claude/skills/tdd-qa/workflows/tdd-cycle.md`

### 3. Mutation-guided test generation (narrow scope)

**What:** After REFACTOR phase passes, run StrykerJS on ONLY the files touched in this TDD cycle (not the whole codebase). For surviving mutants, generate targeted test scenarios: "This mutation on line 47 (changed `>` to `>=`) survived — write a test that kills it."

Feed surviving mutants as inputs to the next RED phase — mutation-guided scenarios. This addresses the fundamental weakness of agent TDD: tests that confirm assumptions instead of challenging them.

**Change:** Add step 7.5 between VERIFY REFACTOR and Next Scenario in tdd-cycle.md. Uses existing mutation-check.md targeted mode (`npx stryker run --mutate "src/auth.ts"`). Surviving mutants become additional scenarios appended to the loop.

**Files:** `.claude/skills/tdd-qa/workflows/tdd-cycle.md`, `.claude/skills/tdd-qa/workflows/mutation-check.md` (document targeted integration)

### 4. Demote Bombadil to research

**What:** Remove explore-bombadil from SKILL.md default routing. Keep workflow file but mark as experimental/research. Remove from "minimum complete lifecycle" and "optional extensions" table.

**Files:** `.claude/skills/tdd-qa/SKILL.md`

### 5. Remove trace-informed RED

**What:** Delete step 0.5 from tdd-cycle.md. Optional step with 100% skip rate (no TDD cycles have ever run, so no introspection patterns exist). Dead workflow that adds invisible complexity.

If/when introspection data exists and proves valuable, add it back with enforcement, not as an optional step that silently skips.

**Files:** `.claude/skills/tdd-qa/workflows/tdd-cycle.md`

### 6. Async uncorrelated review via Gemma 4

**What:** After a TDD cycle completes (all scenarios done, enforcement cleared), send the full diff to Gemma 4 via ollama-client.ts for independent review. Log findings to `tdd-enforcement.jsonl`. Surface in daily reflect, not in the TDD loop.

Not a gate. Not in the critical path. Background intelligence at $0 that catches correlated blindness (both test and impl wrong in the same way).

**Files:** `.claude/skills/tdd-qa/workflows/tdd-cycle.md` (add post-cycle advisory step), existing `ollama-client.ts`

---

## Execution Order

| # | Change | Type | Risk |
|---|--------|------|------|
| 1 | Remove trace-informed RED | Workflow deletion | None |
| 2 | Demote Bombadil | Workflow routing change | None |
| 3 | Structured checkpoints at scenario boundaries | Workflow addition | Low |
| 4 | Auto-activate TDD from cruise mode | Workflow instruction | Low |
| 5 | Mutation-guided test generation | Workflow + integration | Medium |
| 6 | Async Gemma 4 review | Workflow + integration | Low |

---

## Verification

1. Read modified workflow files — instructions are clear, deterministic/agentic nodes typed
2. Run a manual TDD cycle on a test feature to validate checkpoint + mutation integration
3. `bun run test` — all tests still pass
4. Verify Gemma 4 review produces useful output on a sample diff
