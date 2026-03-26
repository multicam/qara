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

**When user asks about test philosophy, patterns, or mocking:**
-> These live in CORE. See `testing-guide.md`, `mocking-guidelines.md`, `interface-design.md`
-> This skill handles orchestration (blueprints), not philosophy

## When to Activate This Skill

1. **Core Skill Name** - "tdd-qa", "test-driven development", "QA architecture"
2. **Action Verbs** - "run TDD", "backtest", "write scenarios", "verify", "init testing"
3. **Modifiers** - "full TDD cycle", "quick backtest", "complete pyramid"
4. **Prepositions** - "TDD on this feature", "backtest after refactor", "scenarios for auth"
5. **Synonyms** - "red green refactor", "regression check", "test baseline", "quality gate"
6. **Use Case** - New features needing test specs, post-refactor confidence, CI gate checks
7. **Result-Oriented** - "zero regressions", "prove it works", "test coverage report"
8. **Tool/Method Specific** - "JUnit XML comparison", "blueprint pattern", "deterministic nodes"

## Boundary: testing-guide vs tdd-qa

| | CORE/testing-guide.md | This skill (tdd-qa) |
|---|---|---|
| **Audience** | Humans reading context | Agents executing workflows |
| **Purpose** | Philosophy — *what* good testing looks like | Blueprints — *how* to execute it step-by-step |
| **Loaded** | Always (CORE context) | On demand (skill activation) |
| **Contains** | AAA pattern, vertical slices, coverage goals | Runnable workflows with deterministic/agentic nodes |

## Usage Modes

**Mode 1: New feature** — write-scenarios → tdd-cycle → backtest
**Mode 2: Bug fix** — triage-issue (separate skill) → engineer executes fix plan → backtest
**Mode 3: Confidence check** — backtest and/or run-pyramid (pure deterministic)
**Mode 4: New project** — init-project (run once)
**Mode 5: Chaos exploration** — explore-bombadil (find bugs you didn't think of, separate quality gate)

## Blueprint Node Classification

Every workflow step is typed as **deterministic** or **agentic** (Stripe Minions pattern):
- **Deterministic:** File I/O, bun test, bun --check, XML diff, template copy — cannot hallucinate
- **Agentic:** Code generation, scenario authoring, failure interpretation — needs LLM reasoning
- **Retry policy:** Agentic nodes max 2 attempts before structured escalation

See `references/blueprint-pattern.md` for full classification.

## References

- `references/scenario-format.md` — Given/When/Then Markdown spec format
- `references/test-layers.md` — Testing Trophy layers, tools, when-to-use
- `references/quality-gates.md` — Thresholds and pass/fail criteria
- `references/blueprint-pattern.md` — Deterministic/agentic node pattern (Stripe Minions)
- `references/cross-project-config.md` — Portable config templates
- `references/setup-guide.md` — Step-by-step setup for Bun and Vitest projects (incl. tgds-schoolyard, tgds-office)
