# Pattern Format Specification

## File Location

`~/qara/thoughts/shared/introspection/patterns/[topic].md`

Topic files: `tool-usage.md`, `session-quality.md`, `user-corrections.md`, `harness-evolution.md`

Created/updated by the weekly synthesize workflow.

## Pattern Entry Format

```markdown
## [Pattern Title]

**Confidence:** emerging | established | confirmed
**Evidence:** N observations (first: YYYY-MM-DD, last: YYYY-MM-DD)
**Trend:** stable | increasing | decreasing | new

[Description — 1-3 sentences with specific evidence]

**Supporting dates:** YYYY-MM-DD, YYYY-MM-DD, ...

---
```

## Confidence Tiers

| Tier | Observations | Meaning | Action |
|------|-------------|---------|--------|
| emerging | 3-9 | Tentative signal, needs more data | Monitor |
| established | 10-25 | Reliable signal | Act on it, consider encoding in memory |
| confirmed | 25+ | Settled fact | Encode in MEMORY.md via monthly evolve |

## Trend Values

| Trend | Meaning |
|-------|---------|
| new | First appeared this week |
| increasing | More frequent than prior period |
| stable | Consistent frequency |
| decreasing | Less frequent than prior period |

## Rules

- Each pattern entry is separated by `---`
- Pattern titles should be descriptive and specific (not "Bash errors" but "Bash errors cluster around bun test timeouts")
- Evidence count is incremented by weekly synthesize when matching observations appear
- Supporting dates list is capped at 10 most recent dates
- When a pattern reaches `confirmed` tier, monthly evolve considers it for MEMORY.md promotion
- Contradictory patterns should both be kept with notes on the contradiction
- Stale patterns (no new evidence in 30+ days) get flagged in weekly synthesize output

## Example

```markdown
## Bash errors cluster around bun test timeouts

**Confidence:** established
**Evidence:** 14 observations (first: 2026-03-01, last: 2026-03-28)
**Trend:** stable

Bash tool errors consistently correlate with `bun test` invocations in
sessions testing >50 files. The 2000ms PostToolUse timeout may be
insufficient for large test suites.

**Supporting dates:** 2026-03-01, 2026-03-05, 2026-03-08, 2026-03-12, 2026-03-15, 2026-03-19, 2026-03-22, 2026-03-25, 2026-03-27, 2026-03-28

---

## JM prefers sonnet over haiku for code analysis delegation

**Confidence:** emerging
**Evidence:** 4 observations (first: 2026-03-15, last: 2026-03-27)
**Trend:** new

Multiple corrections where JM redirected haiku-delegated code analysis
tasks to sonnet. Pattern suggests delegation guide should recommend
sonnet as default for codebase-analyzer agent.

**Supporting dates:** 2026-03-15, 2026-03-20, 2026-03-24, 2026-03-27
```
