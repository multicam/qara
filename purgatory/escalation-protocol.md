# Escalation Protocol

When a subagent hits limits, escalate rather than retry at the same tier.

## Escalation Triggers

| Signal | Action |
|--------|--------|
| haiku agent returns incomplete/shallow results | Re-run with sonnet |
| sonnet agent fails on architectural decisions | Re-run with opus |
| Any agent loops >3 times on the same error | Escalate one tier |
| Agent output contradicts known project patterns | Escalate for review |
| Task requires cross-cutting changes (>5 files) | Start at sonnet minimum |

## Model Tier Boundaries

| Tier | Good at | Escalate when |
|------|---------|---------------|
| **haiku** | File lookups, grep, simple queries | Needs reasoning about patterns or trade-offs |
| **sonnet** | Implementation, debugging, analysis | Needs architectural judgment or design decisions |
| **opus** | Architecture, design review, complex reasoning | N/A — top tier. If stuck, ask JM |

## Escalation Path

```
haiku → sonnet → opus → AskUserQuestion (JM)
```

Never skip tiers unless the task clearly requires it (e.g., don't send a design review to haiku first).

## Anti-patterns

- Retrying the same prompt at the same tier expecting different results
- Escalating to opus for tasks haiku handles fine (wastes tokens/time)
- Not escalating when sonnet is clearly struggling (>2 failed attempts)
