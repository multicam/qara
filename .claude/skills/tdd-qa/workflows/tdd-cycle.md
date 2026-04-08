# Workflow: TDD Cycle

RED-GREEN-VERIFY-REFACTOR loop driven by scenario specs. This is the core blueprint.

## Prerequisites

- Scenario spec exists in `specs/{feature}.md` (from write-scenarios workflow)
- OR JM provides inline requirements (scenarios created on the fly)
- Project has test infrastructure (from init-project, or pre-existing)

### Detect Test Runner [DETERMINISTIC]

-> **READ:** `../references/detect-runner.md` for test runner detection heuristic

### Activate TDD Enforcement [DETERMINISTIC]

```bash
bun ${PAI_DIR}/hooks/lib/tdd-state.ts activate --feature {feature-name} --phase RED
```

This enables the PreToolUse hook to enforce phase discipline:
- **RED phase:** only test files can be edited (source file edits are blocked)
- **GREEN phase:** source files allowed (writing implementation)
- **REFACTOR phase:** both allowed (cleaning up)

> **Why phase enforcement?** It prevents the most common TDD failure mode: writing implementation and tests together, which produces tests that verify what the code *does* rather than what it *should do*. The RED phase guarantees every test is written against a *missing* behavior, not an existing one. Without enforcement, it's too easy to "peek" at the implementation and write a test that passes by accident.

## The Loop

For each scenario in priority order (critical first):

### 1. RED — Write Failing Test [AGENTIC]

Read the scenario's Given/When/Then and write a test that:
- Describes the behavior, not implementation
- Uses the public interface only
- Would survive an internal refactor
- Follows AAA pattern (Arrange/Act/Assert)

```typescript
// From specs/user-auth.md → Scenario: successful login
it('Scenario: successful login with valid credentials', async () => {
  // Given a registered user
  const user = await createUser({ email: 'test@example.com', password: 'valid' });

  // When they submit login
  const result = await login({ email: 'test@example.com', password: 'valid' });

  // Then they receive an auth token
  expect(result.token).toBeDefined();
});
```

**File placement:** Co-locate with source as `*.test.ts` (unit/integration) or in `tests/e2e/*.spec.ts` (E2E).

### 2. VERIFY RED [DETERMINISTIC]

```bash
bun test path/to/file.test.ts
```

The test MUST fail. If it passes, either:
- The behavior already exists (skip this scenario)
- The test is wrong (fix it)

### 3. Transition to GREEN [DETERMINISTIC]

```bash
bun ${PAI_DIR}/hooks/lib/tdd-state.ts phase GREEN
```

### 4. GREEN — Write Minimal Code [AGENTIC]

Write the minimum code to make the test pass. Nothing more.

**Rules:**
- No speculative features
- No premature abstractions
- No "while I'm here" changes
- If the minimal fix feels wrong, that's signal for the next scenario, not this one

### 5. VERIFY GREEN [DETERMINISTIC]

```bash
bun test path/to/file.test.ts
```

The test MUST pass. If it fails:

2 fix attempts. If both fail, escalate.

- **Attempt 1:** Read the error, fix the code [AGENTIC]
- **Attempt 2:** Read the error, fix the code [AGENTIC]
- **Attempt 3:** STOP. Structured escalation to JM:
  ```
  Problem: [test name] fails after 2 fix attempts
  Tried: [what was attempted]
  Hypothesis: [best guess]
  Need: [what JM needs to decide]
  ```

### 6. Transition to REFACTOR [DETERMINISTIC]

```bash
bun ${PAI_DIR}/hooks/lib/tdd-state.ts phase REFACTOR
```

### 7. REFACTOR [AGENTIC]

Only when GREEN. Clean up:
- Remove duplication introduced by this cycle
- Improve naming
- Simplify logic

**Never refactor while RED.** If refactoring breaks a test, undo immediately.

### 8. VERIFY REFACTOR [DETERMINISTIC]

```bash
bun test path/to/file.test.ts
```

All tests must still pass. If any fail, undo the refactor.

### 8.5. Mutation Bonus Round [DETERMINISTIC + AGENTIC] (after all planned scenarios)

After the **last** planned scenario's REFACTOR completes (not after each scenario), run targeted mutation testing on files touched during this TDD cycle:

```bash
npx stryker run --mutate "src/touched-file-1.ts,src/touched-file-2.ts"
```

For each surviving mutant (max 5, prioritized by line proximity to changes):
- **RED:** Write a test that fails when the mutation is applied
- **GREEN:** Verify the test passes against the original code
- No REFACTOR needed (these are surgical single-assertion tests)

Skip this step if: StrykerJS not installed, no surviving mutants, or cycle was interrupted/escalated.

See also: `${PAI_DIR}/skills/tdd-qa/workflows/mutation-check.md` for standalone mutation testing.

### 9. Next Scenario [DETERMINISTIC]

Transition back to RED for the next scenario:

```bash
bun ${PAI_DIR}/hooks/lib/tdd-state.ts phase RED
```

Return to step 1 with the next scenario. Each cycle responds to what was learned from the previous one.

### 9.5. Checkpoint [DETERMINISTIC]

Write scenario completion to working memory for compression resilience. When PreCompact fires mid-cycle, the agent recovers from checkpoint + files on disk, not compressed conversation.

```bash
# Via working-memory.ts
echo '{"scenario":"{name}","status":"complete","test":"{test-path}","impl":"{impl-path}"}' | \
  bun ${PAI_DIR}/hooks/lib/working-memory.ts write tdd-checkpoint
```

Skip if: working-memory.ts unavailable.

## After All Scenarios

### Deactivate TDD Enforcement [DETERMINISTIC]

```bash
bun ${PAI_DIR}/hooks/lib/tdd-state.ts clear
```

### Uncorrelated Review [DETERMINISTIC] (optional)

If Ollama is available, send the cycle's diff for independent review to catch correlated blindness (test + impl wrong in the same systematic way):

```bash
git diff HEAD~{n} -- '*.ts' '*.tsx' | \
  bun ${PAI_DIR}/hooks/lib/ollama-client.ts chat \
  "Review this diff for logical errors, missed edge cases, and security issues. Be specific."
```

Log findings to tdd-enforcement.jsonl. Advisory only — does not block.
Skip if: Ollama unavailable, diff empty, or cycle was interrupted.

### Type Check [DETERMINISTIC]

```bash
bunx tsc --noEmit
```

### Full Test Suite [DETERMINISTIC]

```bash
bun test
```

Verify no regressions in existing tests.

### Summary [DETERMINISTIC]

```
TDD cycle complete: {feature-name}
  Scenarios implemented: {n}/{total}
  Tests: {pass} pass, {fail} fail
  Skipped: {n} (behavior already existed)

Next: "backtest" to update baseline and verify quality gates.
```

## Interruption Handling

If JM cancels mid-cycle or the session ends unexpectedly:
- Run `bun tdd-state.ts clear` to deactivate enforcement immediately
- TDD state also auto-expires after 2 hours (crash resilience)
- Partial work (tests without implementation) is safe to leave — pick up in the next session

## Blueprint Summary

| Step | Node Type | Retries |
|------|-----------|---------|
| Activate enforcement | Deterministic | 0 |
| RED (write test) | Agentic | — |
| VERIFY RED | Deterministic | 0 |
| Transition to GREEN | Deterministic | 0 |
| GREEN (write code) | Agentic | — |
| VERIFY GREEN | Deterministic | 0 (code fix is agentic, max 2) |
| Transition to REFACTOR | Deterministic | 0 |
| REFACTOR | Agentic | — |
| VERIFY REFACTOR | Deterministic | 0 (undo on fail) |
| Mutation bonus round | Deterministic + Agentic | 0 (after last scenario only) |
| Transition to RED (next) | Deterministic | 0 |
| Checkpoint | Deterministic | 0 |
| Deactivate enforcement | Deterministic | 0 |
| Uncorrelated review | Deterministic | 0 (advisory, optional) |
| Type check | Deterministic | 0 |
| Full suite | Deterministic | 0 |
