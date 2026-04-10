# Workflow: TDD Cycle

RED → GREEN → REFACTOR driven by scenario specs. Core blueprint.

## Prerequisites

- Scenario spec in `specs/{feature}.md` (from `write-scenarios.md`), or inline requirements.
- Test infrastructure exists.

## Setup

1. **Detect test runner:** READ `../references/detect-runner.md`. Set `$TEST_CMD` for the rest of this workflow.
2. **Activate enforcement:**
   ```bash
   bun ${PAI_DIR}/hooks/lib/tdd-state.ts activate --feature {feature} --phase RED
   ```
   This enables PreToolUse phase discipline: RED → only tests editable, GREEN → source allowed, REFACTOR → both allowed.
   Phase enforcement prevents the failure mode of writing implementation and tests together (tests verify what code *does*, not what it *should*).

## Loop (per scenario, critical first)

**Verify command** (used after every phase transition): `$TEST_CMD path/to/test_file`

### 1. RED — Failing test

Write a test that describes the behavior (not implementation), uses the public interface, would survive an internal refactor, and follows AAA. Map Given/When/Then → Arrange/Act/Assert.

File placement:
- TS: co-locate as `*.test.ts`, or `tests/e2e/*.spec.ts` for E2E
- Python: `tests/test_*.py`

### 2. Verify RED

Run the verify command. Must FAIL. If it passes: behavior already exists (skip scenario) or test is wrong (fix).

### 3. GREEN — Minimal code

```bash
bun ${PAI_DIR}/hooks/lib/tdd-state.ts phase GREEN
```

Write the minimum to pass. No speculative features, no premature abstractions, no "while I'm here" changes. If the minimal fix feels wrong, that's signal for the *next* scenario.

### 4. Verify GREEN

Run the verify command. Must PASS. On failure:
- Attempt 1 + 2: read error, fix code.
- Attempt 3: STOP. Escalate:
  ```
  Problem: {test} fails after 2 fix attempts
  Tried: {what}
  Hypothesis: {guess}
  Need: {JM decision}
  ```

### 5. REFACTOR

```bash
bun ${PAI_DIR}/hooks/lib/tdd-state.ts phase REFACTOR
```

Only when GREEN. Remove duplication from this cycle, improve naming, simplify. Never refactor while RED. If refactoring breaks a test, undo immediately.

### 6. Verify REFACTOR

Run the verify command. All tests must still pass. Failure → undo the refactor.

### 7. Next scenario

```bash
bun ${PAI_DIR}/hooks/lib/tdd-state.ts phase RED
```

Back to step 1 with next scenario. Each cycle responds to what the previous taught.

## After All Scenarios

### Mutation Bonus (once, after LAST scenario's REFACTOR)

```bash
# TS: npx stryker run --mutate "src/touched-1.ts,src/touched-2.ts"
# Py: uv run mutmut run --paths-to-mutate src/touched_1.py,src/touched_2.py
```

For each surviving mutant (max 5, prioritized by line proximity): RED → GREEN. No REFACTOR (single-assertion surgical tests).

Skip if: StrykerJS/mutmut not installed, no survivors, or cycle was interrupted.

See `${PAI_DIR}/skills/tdd-qa/workflows/mutation-check.md` for standalone runs.

### Checkpoint

```typescript
import { appendLearning } from './lib/working-memory';
appendLearning(`TDD scenario "${name}" complete: test=${testPath}, impl=${implPath}`);
```

Skip if not in a mode session with working memory.

### Deactivate

```bash
bun ${PAI_DIR}/hooks/lib/tdd-state.ts clear
```

### Uncorrelated Review (optional)

If Ollama available, second-opinion the cycle's diff to catch correlated blindness:

```bash
git diff HEAD~{n} -- '*.py' '*.ts' '*.tsx' | \
  bun ${PAI_DIR}/hooks/lib/ollama-client.ts chat \
  "Review this diff for logical errors, missed edge cases, and security issues. Be specific."
```

Log findings to `tdd-enforcement.jsonl`. Advisory only — does not block.
Skip if: Ollama unavailable, diff empty, cycle interrupted.

### Gates

```bash
# TS: bunx tsc --noEmit
# Py: uv run ruff check src/ tests/   (or mypy src/ if typed)
$TEST_CMD                              # full suite — no regressions
```

### Summary

```
TDD cycle complete: {feature}
  Scenarios implemented: {n}/{total}
  Tests: {pass} pass, {fail} fail
  Skipped: {n} (behavior already existed)
Next: "backtest" to update baseline and verify quality gates.
```

## Interruption

Mid-cycle cancellation or unexpected session end:
- `bun tdd-state.ts clear` — deactivate enforcement
- Auto-expires after 2h anyway (crash resilience)
- Partial work (tests without impl) is safe to leave for next session

## Blueprint

| Step | Type | Retries |
|---|---|---|
| Activate | Det | 0 |
| RED | Ag | — |
| Verify RED | Det | 0 |
| → GREEN | Det | 0 |
| GREEN | Ag | — |
| Verify GREEN | Det | code fix Ag, max 2 |
| → REFACTOR | Det | 0 |
| REFACTOR | Ag | — |
| Verify REFACTOR | Det | undo on fail |
| Mutation (after last) | Det+Ag | 0 |
| → RED (next) | Det | 0 |
| Checkpoint | Det | 0 |
| Deactivate | Det | 0 |
| Uncorrelated review | Det | 0 (advisory) |
| Type check | Det | 0 |
| Full suite | Det | 0 |
