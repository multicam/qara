# Workflow: Run Pyramid

Execute test layers bottom-up, failing fast. **100% deterministic — no agentic nodes.**

## Steps

### 1. Static Analysis [DETERMINISTIC]

```bash
bun --check
```

**Gate:** Zero type errors. If any exist, STOP and report.

### 2. Unit Tests [DETERMINISTIC]

```bash
bun test --only-failures
```

If no `--only-failures` needed (first run or clean state):

```bash
bun test
```

Exclude E2E tests (they live in `tests/e2e/` and use `.spec.ts`).

**Gate:** Zero failures. If any exist, STOP and report failing tests with file:line references.

### 3. Integration Tests [DETERMINISTIC]

```bash
bun test **/*.integration.test.ts
```

**Gate:** Zero failures. If any exist, STOP and report.

### 4. E2E Tests [DETERMINISTIC] (only if frozen .spec.ts files exist)

```bash
bun playwright test
```

Only runs if `tests/e2e/*.spec.ts` files exist. Skip this step if no frozen E2E tests.

**Gate:** Zero failures. If any exist, STOP and report.

### 5. Report [DETERMINISTIC]

```
Pyramid complete:
  Static:      ✓ 0 type errors
  Unit:        ✓ {n} pass, 0 fail
  Integration: ✓ {n} pass, 0 fail
  E2E:         ✓ {n} pass, 0 fail (or "skipped — no frozen .spec.ts")

All gates passed.
```

If any layer failed:

```
Pyramid STOPPED at {layer}:
  {failure details with file:line references}

Fix the failures before proceeding.
```

## When to Use

- Before merging a PR
- After refactoring
- After dependency upgrades
- As the "confidence check" (Mode 3)
- As part of the backtest workflow (run-pyramid feeds into baseline comparison)
