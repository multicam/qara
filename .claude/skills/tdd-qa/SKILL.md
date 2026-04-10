---
name: tdd-qa
context: fork
effort: high
description: |
  Test-driven development and QA architecture. Agent-executable blueprints for
  scenario definitions, TDD cycles, back-testing loops, and quality gates.
  Complements CORE/testing-guide.md (philosophy) with runnable workflows (blueprints).
  Uses Stripe Minions' deterministic/agentic node pattern for reliable automation.
  USE WHEN: "run TDD", "write scenarios", "backtest", "set up testing",
  "run the pyramid", "verify E2E", "init testing", "quality gates"
---

## Workflow Routing (SYSTEM PROMPT)

**Set up testing:** "set up testing", "init testing", "bootstrap test infra"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/init-project.md`
-> **EXECUTE:** Copy templates, create specs/ dir, configure bunfig.toml

**Define test scenarios:** "write scenarios for X", "define test cases", "spec out the feature"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/write-scenarios.md`
-> **EXECUTE:** Create Given/When/Then specs from requirements

**Run a TDD cycle:** "run TDD on X", "red green refactor", "TDD this feature"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/tdd-cycle.md`
-> **EXECUTE:** RED→GREEN→VERIFY loop with 2-retry escalation

**Run test pyramid:** "run the pyramid", "run all test layers", "full test suite"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/run-pyramid.md`
-> **EXECUTE:** Static→Unit→Integration→E2E in sequence

**Check for regressions:** "backtest", "check regressions", "compare test results", "quality gate"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/backtest.md`
-> **EXECUTE:** Compare JUnit XML baselines, check coverage delta, enforce gates

**E2E browser verification:** "verify E2E", "browser test", "e2e scenarios", "smoke test the UI"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/e2e-verify.md`
-> **EXECUTE:** Run scenarios via devtools-mcp, auto-draft .spec.ts

**Mutation testing:** "run mutation tests", "check mutation score", "how good are my tests"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/mutation-check.md`
-> **EXECUTE:** Run StrykerJS, report mutation score (advisory)

**Philosophy/patterns/mocking:** Not in this skill — see CORE `testing-guide.md`, `mocking-guidelines.md`, `interface-design.md`.

**Boundary:** CORE/testing-guide.md = philosophy (always loaded). This skill = executable blueprints (on-demand fork context).

## Usage Modes

| Mode | Flow |
|------|------|
| New feature | write-scenarios -> tdd-cycle -> backtest |
| Bug fix | triage-issue -> fix -> backtest |
| Confidence | backtest or run-pyramid |
| New project | init-project (once) |

Workflow steps are typed **deterministic** or **agentic** (Stripe Minions pattern). See `references/blueprint-pattern.md`.

> **Bombadil (v0.3.2)** is experimental — invoke explicitly (`explore-bombadil`), not routed by default.

## Lifecycle Completion

### Minimum Complete Cycle

1. `write-scenarios` — Given/When/Then specs (mandatory human review gate at step 4)
2. `tdd-cycle` — RED→GREEN→REFACTOR for each scenario
3. `backtest` — regression check, baseline update

Complete when backtest passes with zero regressions and baseline updated.

### Optional Extensions

| Extension | When to suggest | Prerequisite |
|-----------|----------------|--------------|
| `mutation-check` | After backtest passes, for critical code paths | StrykerJS installed |
| `e2e-verify` | When feature has a browser UI | devtools-mcp available |
| `run-pyramid` | Before merging a PR, as final confidence check | Tests exist at multiple layers |

### System-Level "Done"

A feature is fully tested when:
- All quality gates pass (zero regressions, coverage not decreased)
- Baseline updated
- JM has reviewed and approved scenarios

Do not proactively run optional extensions unless JM asks or the feature touches critical code paths.

## Composing Workflows

### Canonical Sequences

| Request type | Sequence | Skippable steps |
|---|---|---|
| **New feature** | write-scenarios → tdd-cycle → backtest | write-scenarios skippable if JM provides inline requirements |
| **Bug fix** | tdd-cycle (RED: failing test for bug) → backtest | write-scenarios usually skipped for single bugs |
| **Confidence check** | backtest or run-pyramid | Both standalone |
| **Refactoring** | backtest (before) → refactor → backtest (after) | No TDD cycle — existing tests are the safety net |

### Ambiguous Requests

If a request spans multiple workflows, **ask which workflow to start with** rather than guessing. Example: "add auth and make sure nothing breaks" could mean write-scenarios + tdd-cycle + backtest, or just a confidence backtest on existing code.
