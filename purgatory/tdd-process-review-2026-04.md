# TDD Process Review: Autonomous Software Generation (2026-04)

## Context

Full lifecycle review of Qara's TDD process against state of the art in autonomous agent coding. Three research streams: Diderot vault (~40 notes), web research (30+ sources), and complete workflow file analysis (8 workflows + 2 modes).

**Core thesis from research:** The harness is the differentiator, not the model. Stripe ships 1,300 PRs/week unattended. The best setups share: forced verification loops, fresh context per iteration, subagent isolation, two-attempt caps, and invariants over instructions.

---

## Current State Assessment

### What Qara Does Well (Aligned with State of Art)

1. **Phase enforcement via deterministic hooks** — RED blocks source edits, GREEN allows implementation, REFACTOR relaxes. This is exactly what Stripe/OpenAI/Amazon do: "enforce invariants, not implementations."
2. **2-retry escalation** — Matches Stripe's "pragmatic cap of two fix attempts, human intervenes on third."
3. **Fail-open design** — Hook crashes never block the agent. Production-grade resilience.
4. **Deterministic backtest gates** — JUnit XML diff + coverage delta. Zero LLM involvement in gate decisions. Matches Amazon's "verification > intelligence."
5. **Test pyramid execution** — Static → Unit → Integration → E2E with fail-fast. Textbook.
6. **Baseline comparison** — Regression detection via artifact diff (not LLM judgment).
7. **Blueprint pattern** — Deterministic/agentic node classification from Stripe Minions.
8. **Session-scoped state with TTL** — Crash resilience, cross-session isolation.

### What the Best Teams Do That Qara Doesn't

| Gap | Who Does It | Impact |
|-----|------------|--------|
| Subagent phase isolation (separate agents for RED vs GREEN) | TDAD paper, SWE-bench leaders | Prevents context pollution — same agent seeing tests + impl "cheats" |
| Mutation testing as blocking gate | Meta ACH (73% acceptance rate, 50x more effective than unit tests) | Catches false-green tests that pass but verify nothing |
| Uncorrelated verification (different model reviews output) | elvissun multi-model pipeline, Anthropic's code review squad | Systematic bias in same-model verification |
| Fresh context per loop iteration | Ralph pattern, Stripe devboxes | Context degradation: Chroma 2025 showed 95%→60% accuracy past threshold |
| Cost tracking per cycle | Stripe ROI math, token budget architectures | Can't optimize what you don't measure |
| Self-cleaning monitors | Ramp Labs (40 bugs/week, 1 monitor per 75 LOC) | Agent either fixes bug OR tunes noisy monitor |
| Scenario coverage as blocking gate | Kiro spec-driven development | Spec→test traceability with enforcement |
| Continuous test runner (background) | SWE-bench leaders, CI-in-the-loop | Tests run on every save, not just on-demand |

### Over-Engineered Aspects

1. **Bombadil (v0.3.2)** — Experimental property-based UI testing with separate gate, no backtest integration, JSONL format incompatible with JUnit pipeline. Premature complexity for something not yet proven. Either promote to v1.0 with integration or demote to research.

2. **Trace-informed RED (optional step 0.5)** — Checks introspection patterns before writing tests. Never logs that it skipped. Optional steps that silently skip are invisible complexity — they look impressive in the workflow doc but provide no accountability.

3. **E2E draft freezing (manual)** — `.draft.spec.ts` must be manually renamed to `.spec.ts`. This breaks autonomous flow. Either auto-freeze on gate pass or remove the draft concept.

4. **8 workflows for one skill** — init-project, write-scenarios, tdd-cycle, run-pyramid, backtest, e2e-verify, explore-bombadil, mutation-check. The minimum cycle (write-scenarios → tdd-cycle → backtest) works. The extras add token cost without proportional quality gain in most cases.

### Weaknesses (Process-Level)

1. **Advisory gates weaken the enforcement model.** Scenario coverage, mutation testing, and test shrinking detection all use `ask` or advisory warnings. Per JM's own vault: "hard hooks for constraints that must never be violated, soft steers for operational adjustments." Test deletion during GREEN is a constraint, not an operational adjustment.

2. **No subagent isolation for TDD phases.** The same agent that writes the test also writes the implementation. Research shows this is the #1 source of "tests that pass but verify nothing" — the agent subconsciously designs tests around the implementation it's already planning.

3. **Verifier agent uses same model as implementer.** In drive mode, the verifier agent is a Claude subagent checking Claude's own work. elvissun's research and Anthropic's internal code review tool both use multi-model verification to catch systematic bias.

4. **2-hour TTL can expire mid-cycle.** Long TDD cycles (complex features, slow test suites) lose enforcement silently. No TTL extension on activity.

5. **No cost tracking.** Can't answer "how many tokens did this TDD cycle burn?" or "what's the cost per regression caught?" Without this, can't optimize the autonomous loop.

6. **Write-scenarios requires human review** — hard stop that breaks drive mode autonomy. For non-critical features, scenarios could be auto-approved with a post-hoc review gate instead.

---

## Recommended Changes (Priority Order)

### P0: Harden Existing Gates

**1. Auto-extend TTL on phase transitions**

Currently TTL extends only on `updatePhase()`. But if the agent stays in GREEN for 2+ hours working on a complex implementation, enforcement expires silently.

Change: In `pre-tool-use-tdd.ts`, when enforcement allows an edit during an active phase, touch the TTL. One line in `tdd-state.ts`: add `refreshTTL()` that extends `expiresAt` from now.

File: `.claude/hooks/lib/tdd-state.ts`

**2. Promote scenario coverage to blocking for critical scenarios**

Currently advisory. Change: In backtest workflow, if specs exist and critical scenarios have 0% test coverage, fail the gate.

File: `.claude/skills/tdd-qa/workflows/backtest.md` (workflow instruction change), `.claude/skills/tdd-qa/tools/test-report-lib.ts` (add `scenarioCoverageGate()`)

**3. Escalate test shrinking from `ask` to `deny` during GREEN**

Current: `ask` (user can override). Research consensus: agents delete tests to make them pass (Kent Beck 2026). This is a constraint, not a suggestion.

File: `.claude/hooks/pre-tool-use-tdd.ts` — change `ask()` to `deny()` for test shrinking in GREEN.

### P1: Add Subagent Phase Isolation

**4. RED phase via isolated subagent**

The single highest-impact architectural change. When entering RED phase in tdd-cycle workflow, spawn a subagent that:
- Receives ONLY the scenario spec and the target module's interface (types, function signatures)
- Does NOT receive the implementation source code
- Writes the failing test in isolation
- Returns the test file path

The main agent then transitions to GREEN and implements against the test it has never seen the "answer" for.

This directly addresses the TDAD research finding: context isolation reduced regressions by 70%.

Implementation: Workflow change in `.claude/skills/tdd-qa/workflows/tdd-cycle.md`. Add a `red-subagent` node type. Use `Agent` tool with `isolation: "worktree"` for full file isolation.

**5. Uncorrelated verification via Gemma 4**

After GREEN phase passes tests, send the diff to Gemma 4 (local Ollama, $0 cost) for independent review. Gemma catches different issues than Claude (elvissun's research).

Implementation: Add a deterministic node in tdd-cycle between GREEN-verify and REFACTOR. Uses existing `ollama-client.ts`. Advisory only (don't block on local model opinion), but log disagreements for pattern analysis.

### P2: Close the Measurement Gap

**6. Add cost tracking per TDD cycle**

Track token usage per phase (RED, GREEN, REFACTOR) and per workflow. Store in `tdd-enforcement.jsonl` as `tokens_used` field.

Problem: CC doesn't expose token counts to hooks directly. Workaround: estimate from input/output sizes in PostToolUse, or use the introspection miner's session stats.

Implementation: Add `tdd_tokens` field to daily report in introspection miner.

**7. Log when optional steps are skipped**

Trace-informed RED and pattern-informed backtest silently skip when no data exists. Add explicit logging: `{ skipped: "trace-informed-red", reason: "no patterns file" }` to tdd-enforcement.jsonl.

Makes invisible complexity visible.

### P3: Simplify

**8. Demote Bombadil to research**

Move `explore-bombadil.md` out of the default workflow list. Keep in skill but mark as `experimental: true` in SKILL.md routing. Remove from the "minimum complete lifecycle" documentation.

Rationale: Separate gate, incompatible format, v0.3.2, no production users. Premature complexity.

**9. Auto-freeze E2E drafts on backtest pass**

When backtest passes and `.draft.spec.ts` files exist, automatically rename to `.spec.ts`. Remove the manual freezing step.

If the draft is bad, it'll fail in the next pyramid run and get caught. Better to have CI running a bad E2E test (which gets caught and fixed) than to have no E2E test at all (which silently passes).

**10. Reduce workflow count**

Merge `run-pyramid` into `backtest` as an optional `--pyramid` flag. They share the same quality gate infrastructure and are always run in sequence. 8 workflows → 7.

---

## What NOT to Change

- **Phase enforcement architecture** — sound, well-tested, production-grade
- **2-retry escalation** — matches Stripe's proven pattern
- **Fail-open hook design** — correct for production hooks
- **Human review gate on scenarios** — right for critical features (add auto-approve for non-critical)
- **Backtest baseline management** — simple, effective, deterministic
- **Drive/cruise mode integration** — well-structured handoff to TDD

---

## Research Insights for Future Consideration

1. **Meta's ACH mutation-guided test generation** — Use mutations to DRIVE test authoring, not just measure quality. Would require StrykerJS integration with scenario-parser.

2. **Ramp Labs self-cleaning monitors** — Deterministic monitors that agents either fix OR tune. Would transform Bombadil from experimental to production.

3. **Ralph loop memory via git** — Memory persists via `progress.txt` + `prd.json` in git, not accumulated context. Qara's working-memory.ts does this but could be more aggressive about context shedding.

4. **OpenAI Pattern 6: Agent-to-Agent Review** — Separate review agent with different system prompt reviews output. Beyond uncorrelated model — uncorrelated persona.

5. **Continuous test runner as background subagent** — Instead of on-demand `bun test`, a persistent background agent runs tests on every file change and reports failures via working memory. Would tighten the feedback loop dramatically.

---

## Sources

- Stripe Minions (InfoQ, Medium, anup.io)
- TDAD: Test-Driven Agentic Development (arXiv)
- Meta ACH: Mutation-Guided Test Generation (engineering.fb.com, arXiv)
- Kent Beck on TDD + AI (Pragmatic Engineer Newsletter)
- Simon Willison: Agentic Engineering Patterns
- Martin Fowler: Harness Engineering
- Boris Cherny: 2-3x quality from verification (Anthropic)
- elvissun: Multi-model review pipeline (Distilled Learnings)
- OpenHands SDK: Event-stream architecture (arXiv)
- AWS Kiro: Spec-Driven Development
- Chroma 2025: Context window degradation study
- Ramp Labs: Self-maintaining verification system
- Ralph Loop: snarktank/ralph, Clayton Farr Playbook, Geoffrey Huntley
- JM's Diderot vault: ~40 notes across knowledge/ai/agents/, knowledge/software-engineering/
