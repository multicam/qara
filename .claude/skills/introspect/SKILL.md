---
name: introspect
context: fork
description: |
  Cognitive introspection. Mines session logs, extracts observations, synthesizes
  patterns, proposes memory/infrastructure improvements.
  Three cadences: daily reflect, weekly synthesize, monthly evolve.
  USE WHEN: "daily reflect", "introspect", "mine logs", "weekly synthesize",
  "monthly evolve", "self-audit", "what patterns do you see", "review sessions"
---

## Workflow Routing

| Trigger | Read | Action |
|---------|------|--------|
| "daily reflect", "introspect today", "mine today's logs" | `workflows/daily-reflect.md` | Mine today's logs → observations |
| "weekly synthesize", "update patterns" | `workflows/weekly-synthesize.md` | Cluster observations → patterns |
| "monthly evolve", "strategic review", "self-audit" | `workflows/monthly-evolve.md` | Strategic review + proposals |
| "introspect [topic]", "mine [topic] logs" | — | Run miner (`--mode daily`), filter to topic, analyze |

Triggers: introspect / self-reflection / mine / reflect / synthesize / evolve / audit / daily / weekly / monthly / session mining / log analysis / behavioral patterns.

## Pipeline

```
Session hooks (tool-usage.jsonl, checkpoints, security, transcripts)
  → introspect-miner CLI (deterministic TS: parse, aggregate, anomalies)
  → Daily reflect (AI interprets → observations/YYYY-MM-DD.md)
  → Weekly synthesize (AI clusters → patterns/*.md)
  → Monthly evolve (AI reviews → memory proposals + adaptation)
```

## Three Cadences

| Cadence | Frequency | Input | Output | Autonomy |
|---------|-----------|-------|--------|----------|
| Daily reflect | Evening | Today's miner JSON | `observations/YYYY-MM-DD.md` | Full auto |
| Weekly synthesize | Monday AM | 7 days of observations | `patterns/*.md` updates | Full auto |
| Monthly evolve | 1st of month | Patterns + memory | `reports/monthly-YYYY-MM.md` + proposals | JM reviews |

## Observation Taxonomy (fixed)

`tool-usage`, `session-quality`, `security`, `user-correction`, `harness-change`, `git-activity`, `anomaly`, `improvement`, `recovery`, `repeated-failure`

## Data Locations

| Tier | Path |
|------|------|
| Observations | `~/qara/thoughts/shared/introspection/observations/` |
| Patterns | `~/qara/thoughts/shared/introspection/patterns/` |
| Reports | `~/qara/thoughts/shared/introspection/reports/` |
| Glacier | `~/qara/thoughts/shared/introspection/glacier/` |

## Extended Context

| Topic | File |
|-------|------|
| Observation format | `references/observation-format.md` |
| Pattern format | `references/pattern-format.md` |
| Proposal format | `references/proposal-format.md` |
| Experiment format | `references/experiment-format.md` |
| System overview | `references/system-overview.md` |
| Miner CLI | `tools/introspect-miner.ts` |
| Miner library | `tools/miner-lib.ts` |
| Trace library | `tools/miner-trace-lib.ts` |
| Experiment tracker | `tools/experiment-tracker.ts` |

## Integration

- **Reads:** `~/.claude/state/*.jsonl` (hook logs), `~/.claude/projects/-home-jean-marc-qara/*.jsonl` (transcripts), `git log`
- **Writes:** `~/qara/thoughts/shared/introspection/`
- **Complements:** `cc-upgrade-pai` (infra audit) — monthly evolve checks recency
- **CLI:** `bun ${PAI_DIR}/skills/introspect/tools/introspect-miner.ts --mode [daily|weekly|monthly]`
- **Experiment tracker:** `bun ${PAI_DIR}/skills/introspect/tools/experiment-tracker.ts --check|--compare <id>`
- **Miner features:** time-gap session detection (>5 min), baseline comparison, correction detection, trace analysis (recovery, repeated failures, profiles), error hotspots, security noise filtering, RTK savings, stop_reason heuristic
