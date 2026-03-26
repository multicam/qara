# Quality Gates

Pass/fail criteria for the back-testing loop. All gates are deterministic — no LLM judgment involved.

## Gates

| Gate | Threshold | Blocks Merge? | Data Source |
|------|-----------|---------------|-------------|
| **Zero regressions** | 0 new test failures vs baseline | Yes | JUnit XML diff |
| **Coverage delta** | Line coverage must not decrease | Yes | lcov file comparison |
| **Critical scenarios** | 100% pass rate on Priority: critical | Yes | JUnit XML + scenario metadata |
| **Mutation score** | >70% (future, advisory only) | No | StrykerJS output |

## Data Contracts

### Test Results: JUnit XML

```bash
bun test --reporter=junit --reporter-outfile=.test-baseline.xml
```

Produces structured XML with:
- Test names, classnames, file:line references
- Pass/fail/skip status per test
- Timing per test and per suite
- Assertion counts

### Coverage: lcov

```bash
bun test --coverage --coverage-reporter=lcov --coverage-dir=.coverage
```

Produces `lcov.info` with:
- Per-file line coverage (LF/LH)
- Per-file function coverage (FNF/FNH)
- Per-file branch coverage (BRF/BRH)

### Comparison

`test-report.ts` compares baseline vs current:

```
REGRESSIONS (new failures):
  auth.test.ts > login > should reject expired tokens  [PASS → FAIL]

FIXED (newly passing):
  cart.test.ts > checkout > should apply discount       [FAIL → PASS]

COVERAGE:
  Baseline: 82.3%  Current: 83.1%  Delta: +0.8%  ✓ PASS

GATE RESULT: PASS (0 regressions, coverage increased)
```

## Baseline Management

- **Location:** `.test-baseline.xml` and `.coverage-baseline/` in project root
- **Gitignored:** Yes — baselines are machine-local, not committed
- **Update policy:** Only update baseline when all gates pass
- **Reset:** Delete baseline files to start fresh (next backtest creates new baseline)

## Gate Escalation

When a gate fails:
1. `test-report.ts` exits with code 1
2. Agent reports regressions with file:line references
3. If agentic fix attempted: max 2 retries before structured escalation to JM
4. Structured escalation format: Problem / Tried / Hypothesis / Need
