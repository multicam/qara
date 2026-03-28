# Workflow: Backtest

Regression detection via baseline comparison. **100% deterministic — no agentic nodes.**

## Prerequisites

- Project has test infrastructure (from init-project or pre-existing)
- `test-report.ts` available at `${PAI_DIR}/skills/tdd-qa/tools/test-report.ts`

-> **READ:** `../references/quality-gates.md` for gate thresholds and pass/fail criteria

## Steps

### 0. Detect Test Runner [DETERMINISTIC]

-> **READ:** `../references/detect-runner.md` for test runner detection heuristic

### 1. Capture Current Results [DETERMINISTIC]

**Bun:**
```bash
bun test --reporter=junit --reporter-outfile=.test-current.xml
```

**Vitest:**
```bash
vitest run --reporter=junit --outputFile=.test-current.xml
```

Optional coverage — **Bun:**
```bash
bun test --coverage --coverage-reporter=lcov --coverage-dir=.coverage-current
```

**Vitest:**
```bash
vitest run --coverage --coverage.reporter=lcov
```

### 2. Check for Baseline [DETERMINISTIC]

If `.test-baseline.xml` exists → proceed to comparison (step 3).
If no baseline exists → this is the first run. Save current as baseline (step 5).

### 3. Compare [DETERMINISTIC]

```bash
bun run ${PAI_DIR}/skills/tdd-qa/tools/test-report.ts compare \
  --baseline .test-baseline.xml \
  --current .test-current.xml \
  --coverage-baseline .coverage-baseline/lcov.info \
  --coverage-current .coverage-current/lcov.info
```

The tool outputs:
- Regressions (tests that went PASS → FAIL)
- Fixed tests (FAIL → PASS)
- New tests added
- Removed tests
- Coverage delta
- Gate result (PASS or FAIL with reasons)

### 3b. Scenario Coverage (optional) [DETERMINISTIC]

If `specs/` directory exists with `.md` files, cross-reference scenario specs against test results:

```bash
bun run ${PAI_DIR}/skills/tdd-qa/tools/test-report.ts scenario-coverage \
  --specs specs/ \
  --results .test-current.xml
```

Reports which scenarios have matching tests and which don't. Fails if critical scenarios lack test coverage. This step is advisory — it does not block the gate in step 4 unless JM opts in.

### 4. Gate Decision [DETERMINISTIC]

If `test-report.ts` exits 0 → all gates pass → proceed to step 5.
If `test-report.ts` exits 1 → gates failed → report regressions and STOP.

**Do not attempt to fix regressions in this workflow.** Report them to JM. If JM says "fix it", switch to tdd-cycle or triage-issue.

### 5. Update Baseline [DETERMINISTIC]

Only when all gates pass:

```bash
cp .test-current.xml .test-baseline.xml
rm -rf .coverage-baseline && cp -r .coverage-current .coverage-baseline
```

### 6. Report [DETERMINISTIC]

```
Backtest complete:
  Baseline: {n} tests → Current: {n} tests
  Regressions: 0
  Fixed: {n}
  New: {n}
  Coverage: {base}% → {current}% ({delta}%)
  Gate: PASS

  Baseline updated.
```

Or on failure:

```
Backtest FAILED:
  {regression details from test-report.ts}

  Baseline NOT updated. Fix regressions before retrying.
```

## When to Use

| Context | Run coverage? | Run scenario-coverage? | Expected outcome |
|---------|--------------|----------------------|------------------|
| After tdd-cycle | Yes | Yes (if specs/ exists) | Baseline updated, ready for next cycle |
| After refactoring | Yes | No | Confidence that refactor was safe |
| Before merging PR | Yes | Yes | Final quality gate |
| After dependency upgrade | Yes | No | Regression check |
| Confidence check (Mode 3) | Optional | No | Quick pass/fail |
