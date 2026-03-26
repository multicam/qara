# Workflow: TDD Cycle

RED-GREEN-VERIFY-REFACTOR loop driven by scenario specs. This is the core blueprint.

## Prerequisites

- Scenario spec exists in `specs/{feature}.md` (from write-scenarios workflow)
- OR JM provides inline requirements (scenarios created on the fly)
- Project has test infrastructure (from init-project, or pre-existing)

### Detect Test Runner [DETERMINISTIC]

- If `vitest.config.ts` or `vitest.config.js` exists → use `vitest run` for test commands
- If `bunfig.toml` has `[test]` section → use `bun test`
- Else check `package.json` `scripts.test` → fall back to `bun test`

Use the detected runner for all `bun test` commands below.

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

### 3. GREEN — Write Minimal Code [AGENTIC]

Write the minimum code to make the test pass. Nothing more.

**Rules:**
- No speculative features
- No premature abstractions
- No "while I'm here" changes
- If the minimal fix feels wrong, that's signal for the next scenario, not this one

### 4. VERIFY GREEN [DETERMINISTIC]

```bash
bun test path/to/file.test.ts
```

The test MUST pass. If it fails:
- **Attempt 1:** Read the error, fix the code [AGENTIC]
- **Attempt 2:** Read the error, fix the code [AGENTIC]
- **Attempt 3:** STOP. Structured escalation to JM:
  ```
  Problem: [test name] fails after 2 fix attempts
  Tried: [what was attempted]
  Hypothesis: [best guess]
  Need: [what JM needs to decide]
  ```

### 5. REFACTOR [AGENTIC]

Only when GREEN. Clean up:
- Remove duplication introduced by this cycle
- Improve naming
- Simplify logic

**Never refactor while RED.** If refactoring breaks a test, undo immediately.

### 6. VERIFY REFACTOR [DETERMINISTIC]

```bash
bun test path/to/file.test.ts
```

All tests must still pass. If any fail, undo the refactor.

### 7. Next Scenario

Return to step 1 with the next scenario. Each cycle responds to what was learned from the previous one.

## After All Scenarios

### Type Check [DETERMINISTIC]

```bash
bun --check
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

## Blueprint Summary

| Step | Node Type | Retries |
|------|-----------|---------|
| RED (write test) | Agentic | — |
| VERIFY RED | Deterministic | 0 |
| GREEN (write code) | Agentic | — |
| VERIFY GREEN | Deterministic | 0 (code fix is agentic, max 2) |
| REFACTOR | Agentic | — |
| VERIFY REFACTOR | Deterministic | 0 (undo on fail) |
| Type check | Deterministic | 0 |
| Full suite | Deterministic | 0 |
