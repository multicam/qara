# Blueprint Pattern (Stripe Minions)

Every workflow step is explicitly typed as **deterministic** or **agentic**. This is the core reliability pattern from Stripe's Minions architecture (1,300+ PRs/week, zero human-written code, all human-reviewed).

## Principle

> "Putting LLMs into contained boxes compounds into system-wide reliability upside."
> — Stripe Engineering

Blueprints combine the determinism of workflows with agents' flexibility:
- **Deterministic nodes** run code, not LLMs. They cannot hallucinate. They guarantee execution.
- **Agentic nodes** use LLM reasoning. They're powerful but unpredictable. They need guardrails.

The guardrails ARE the deterministic nodes. They're checkpoints where you stop and verify before proceeding.

## Node Classification

### Deterministic Nodes (rectangles in Stripe's diagrams)
- File I/O: reading specs, writing test files, copying templates
- Test execution: `bun test`, `bun --check`, `playwright test`
- Comparison: JUnit XML diff, lcov diff, baseline update
- Formatting: linting, code formatting
- Git operations: commit, branch, push
- Template instantiation: init-project scaffolding

**Property:** Given the same input, always produces the same output. No LLM involved.

### Agentic Nodes (clouds in Stripe's diagrams)
- Code generation: writing test cases (RED step), writing implementation (GREEN step)
- Scenario authoring: translating requirements into Given/When/Then specs
- Failure interpretation: understanding why a test failed, proposing a fix
- Refactoring: cleaning up code while tests stay green
- E2E execution: driving browser via devtools-mcp

**Property:** Uses LLM judgment. Output varies. Bounded by retry policy.

## Retry Policy

- **Deterministic nodes:** No retry. Failure is signal, not error. If `bun test` fails, the test caught something real.
- **Agentic nodes:** Max 2 attempts. After 2 failures, structured escalation:
  ```
  Problem: [precise statement]
  Tried: [what was attempted]
  Hypothesis: [best guess at root cause]
  Need: [specific information or decision from JM]
  ```

This aligns with Stripe's "at most two CI rounds" policy and JM's existing CLAUDE.md escalation rule.

## Workflow Classifications

| Workflow | Deterministic Nodes | Agentic Nodes |
|---|---|---|
| **tdd-cycle** | VERIFY (bun test), type-check (bun --check) | RED (write test), GREEN (write code), REFACTOR |
| **backtest** | ALL: baseline capture, XML diff, coverage diff, gate check | none |
| **run-pyramid** | ALL: static → unit → integration → e2e in sequence | none |
| **e2e-verify** | server start/stop, pass/fail record, .spec.ts draft write | scenario execution via devtools-mcp |
| **write-scenarios** | file creation in specs/ | scenario authoring from requirements |
| **init-project** | ALL: template copy, dir creation, bunfig write | none |

**Key insight:** backtest, run-pyramid, and init-project are 100% deterministic. They're the guardrails. tdd-cycle and write-scenarios are where agentic work happens, bounded by deterministic checkpoints.

## Sources

- [Minions Part 1](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) — Overview, developer experience, scale
- [Minions Part 2](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2) — Blueprints, devboxes, bounded feedback loops
- Diderot vault: `knowledge/ai-agents/minions_stripe_s_one_shot_end_to_end_coding_agents.md`
- Diderot vault: `knowledge/ai-agents/agent-tools/minions_stripe_s_one_shot_end_to_end_coding_agents_part_2.md`
