---
name: tdd-qa
context: fork
description: |
  Test-driven development and QA architecture. Agent-executable blueprints for
  scenario definitions, TDD cycles, back-testing loops, and quality gates.
  Complements CORE/testing-guide.md (philosophy) with runnable workflows (blueprints).
  Uses Stripe Minions' deterministic/agentic node pattern for reliable automation.
  USE WHEN: "run TDD", "write scenarios", "backtest", "set up testing",
  "run the pyramid", "verify E2E", "init testing", "quality gates"
---

## Workflow Routing (SYSTEM PROMPT)

**When user wants to set up testing in a project:**
Examples: "set up testing", "init testing", "bootstrap test infra"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/init-project.md`
-> **EXECUTE:** Copy templates, create specs/ dir, configure bunfig.toml

**When user wants to define test scenarios:**
Examples: "write scenarios for X", "define test cases", "spec out the feature"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/write-scenarios.md`
-> **EXECUTE:** Create Given/When/Then specs from requirements

**When user wants to run a TDD cycle:**
Examples: "run TDD on X", "red green refactor", "TDD this feature"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/tdd-cycle.md`
-> **EXECUTE:** RED→GREEN→VERIFY loop with 2-retry escalation

**When user wants to run the test pyramid:**
Examples: "run the pyramid", "run all test layers", "full test suite"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/run-pyramid.md`
-> **EXECUTE:** Static→Unit→Integration→E2E in sequence

**When user wants to check for regressions:**
Examples: "backtest", "check regressions", "compare test results", "quality gate"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/backtest.md`
-> **EXECUTE:** Compare JUnit XML baselines, check coverage delta, enforce gates

**When user wants E2E browser verification:**
Examples: "verify E2E", "browser test", "e2e scenarios", "smoke test the UI"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/e2e-verify.md`
-> **EXECUTE:** Run scenarios via devtools-mcp, auto-draft .spec.ts

**When user wants autonomous UI exploration (Bombadil):**
Examples: "explore with bombadil", "property-based UI test", "find bugs I didn't think of", "chaos test the UI"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/explore-bombadil.md`
-> **EXECUTE:** Write property specs, run Bombadil exploration, analyze violations

**When user wants mutation testing:**
Examples: "run mutation tests", "check mutation score", "how good are my tests"
-> **READ:** `${PAI_DIR}/skills/tdd-qa/workflows/mutation-check.md`
-> **EXECUTE:** Run StrykerJS, report mutation score (advisory)

**When user asks about test philosophy, patterns, or mocking:**
-> These live in CORE. See `testing-guide.md`, `mocking-guidelines.md`, `interface-design.md`
-> This skill handles orchestration (blueprints), not philosophy

**Boundary:** CORE/testing-guide.md = philosophy (always loaded). This skill = executable blueprints (loaded on demand via fork context).

## Usage Modes

| Mode | Flow |
|------|------|
| New feature | write-scenarios -> tdd-cycle -> backtest |
| Bug fix | triage-issue -> fix -> backtest |
| Confidence | backtest or run-pyramid |
| New project | init-project (once) |
| Chaos | explore-bombadil |

All workflow steps are typed as **deterministic** or **agentic** (Stripe Minions pattern). See `references/blueprint-pattern.md`.

## Lifecycle Completion

### Minimum Complete Cycle

1. `write-scenarios` — define Given/When/Then specs (mandatory human review gate at step 4)
2. `tdd-cycle` — RED→GREEN→REFACTOR loop for each scenario
3. `backtest` — regression check, baseline update

When backtest passes with zero regressions and baseline updated, the minimum cycle is complete.

### Optional Extensions

| Extension | When to suggest | Prerequisite |
|-----------|----------------|--------------|
| `mutation-check` | After backtest passes, for critical code paths | StrykerJS installed |
| `e2e-verify` | When feature has a browser UI | devtools-mcp available |
| `explore-bombadil` | When feature has complex state/UI interactions | Playwright available |
| `run-pyramid` | Before merging a PR, as a final confidence check | Tests exist at multiple layers |

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
| **New feature** | write-scenarios → tdd-cycle → backtest | write-scenarios can be skipped if JM provides inline requirements |
| **Bug fix** | tdd-cycle (RED: write failing test for the bug) → backtest | write-scenarios usually skipped for single bugs |
| **Confidence check** | backtest or run-pyramid | Both standalone |
| **Refactoring** | backtest (before) → refactor → backtest (after) | No TDD cycle needed — existing tests are the safety net |

### When a Request Matches Multiple Workflows

If JM's request is ambiguous or spans multiple workflows, **ask which workflow to start with** rather than guessing. Example: "I want to add auth and make sure nothing breaks" could mean write-scenarios + tdd-cycle + backtest, or just a confidence backtest on existing code.
