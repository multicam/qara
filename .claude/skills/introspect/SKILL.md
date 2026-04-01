---
name: introspect
context: fork
description: |
  Cognitive introspection system. Mines session logs, extracts observations,
  synthesizes patterns, and proposes memory/infrastructure improvements.
  Three cadences: daily reflect, weekly synthesize, monthly evolve.
  USE WHEN: "daily reflect", "introspect", "mine logs", "weekly synthesize",
  "monthly evolve", "self-audit", "what patterns do you see", "review sessions"
---

## Workflow Routing (SYSTEM PROMPT)

**When user says "daily reflect", "introspect today", "mine today's logs", "reflect on today":**
Examples: "run daily reflect", "introspect today's sessions", "mine logs for today"
-> **READ:** `${PAI_DIR}/skills/introspect/workflows/daily-reflect.md`
-> **EXECUTE:** Mine today's session logs into observations

**When user says "weekly synthesize", "update patterns", "introspect weekly", "synthesize observations":**
Examples: "run weekly synthesize", "what patterns emerged this week", "update introspection patterns"
-> **READ:** `${PAI_DIR}/skills/introspect/workflows/weekly-synthesize.md`
-> **EXECUTE:** Cluster observations into pattern updates

**When user says "monthly evolve", "strategic review", "introspect monthly", "self-audit", "adapt":**
Examples: "run monthly evolve", "strategic self-audit", "what should Qara improve"
-> **READ:** `${PAI_DIR}/skills/introspect/workflows/monthly-evolve.md`
-> **EXECUTE:** Strategic review with memory proposals and adaptation recommendations

**When user says "introspect [topic]", "what patterns in [X]", "mine [topic] logs":**
Examples: "introspect tool usage", "what patterns in security", "mine correction logs"
-> **RUN:** `bun ${PAI_DIR}/skills/introspect/tools/introspect-miner.ts --mode daily --date [today]`
-> **ANALYZE:** Filter miner output to the requested topic, compose analysis

## When to Activate This Skill

1. **Core name:** "introspect", "introspection", "self-reflection"
2. **Action verbs:** "mine", "reflect", "synthesize", "evolve", "audit"
3. **Modifiers:** "daily", "weekly", "monthly", "deep", "quick"
4. **Prepositions:** "introspect on [date]", "patterns in [topic]", "reflect for [period]"
5. **Synonyms:** "session mining", "log analysis", "behavioral patterns", "self-improvement"
6. **Use cases:** understanding tool usage trends, detecting recurring corrections, adapting to CC updates
7. **Result-oriented:** "what am I doing wrong", "where can Qara improve", "show me trends"
8. **Tool-specific:** "run the miner", "check observations", "review patterns"

## Core Capabilities

### Progressive Condensation Pipeline

```
Session hooks (existing)           tool-usage.jsonl, checkpoints, security, transcripts
        |
        v
introspect-miner CLI               Deterministic TS — parses, aggregates, detects anomalies
        |
        v
Daily reflect                      AI interprets miner output -> observations/YYYY-MM-DD.md
        |
        v
Weekly synthesize                  AI clusters observations -> patterns/*.md
        |
        v
Monthly evolve                     AI reviews patterns -> proposed memory updates + adaptation
```

### Three Cadences

| Cadence | Frequency | Input | Output | Autonomy |
|---------|-----------|-------|--------|----------|
| Daily reflect | Every evening | Miner JSON for today | `observations/YYYY-MM-DD.md` | Full auto |
| Weekly synthesize | Monday morning | 7 days of observations | `patterns/*.md` updates | Full auto |
| Monthly evolve | 1st of month | All patterns + memory | `reports/monthly-YYYY-MM.md` + proposals | JM reviews proposals |

### Observation Taxonomy (fixed)

`tool-usage`, `session-quality`, `security`, `user-correction`, `harness-change`, `git-activity`, `anomaly`, `improvement`

### Data Locations

| Tier | Location |
|------|----------|
| Observations | `~/qara/thoughts/shared/introspection/observations/` |
| Patterns | `~/qara/thoughts/shared/introspection/patterns/` |
| Reports | `~/qara/thoughts/shared/introspection/reports/` |
| Glacier | `~/qara/thoughts/shared/introspection/glacier/` |

## Extended Context

| Topic | File |
|-------|------|
| Observation format spec | `${PAI_DIR}/skills/introspect/references/observation-format.md` |
| Pattern format spec | `${PAI_DIR}/skills/introspect/references/pattern-format.md` |
| Miner CLI source | `${PAI_DIR}/skills/introspect/tools/introspect-miner.ts` |
| Miner library | `${PAI_DIR}/skills/introspect/tools/miner-lib.ts` |
| Trace analysis library | `${PAI_DIR}/skills/introspect/tools/miner-trace-lib.ts` |
| Experiment tracker CLI | `${PAI_DIR}/skills/introspect/tools/experiment-tracker.ts` |
| Proposal format spec | `${PAI_DIR}/skills/introspect/references/proposal-format.md` |
| Experiment format spec | `${PAI_DIR}/skills/introspect/references/experiment-format.md` |
| System overview | `${PAI_DIR}/skills/introspect/references/system-overview.md` |
| Daily reflect workflow | `${PAI_DIR}/skills/introspect/workflows/daily-reflect.md` |
| Weekly synthesize workflow | `${PAI_DIR}/skills/introspect/workflows/weekly-synthesize.md` |
| Monthly evolve workflow | `${PAI_DIR}/skills/introspect/workflows/monthly-evolve.md` |

## Integration Points

- **Reads from:** `~/.claude/state/*.jsonl` (hook logs), `~/.claude/projects/-home-jean-marc-qara/*.jsonl` (session transcripts), `git log`
- **Writes to:** `~/qara/thoughts/shared/introspection/` (observations, patterns, reports, glacier)
- **Complements:** `cc-upgrade-pai` (infrastructure audit) — monthly evolve checks if cc-upgrade-pai was run recently
- **Miner CLI:** `bun ${PAI_DIR}/skills/introspect/tools/introspect-miner.ts --mode [daily|weekly|monthly]`
- **Experiment tracker:** `bun ${PAI_DIR}/skills/introspect/tools/experiment-tracker.ts --check|--compare <id>`
- **Miner features:** time-gap session detection (>5min), baseline comparison, correction detection, session trace analysis (recovery patterns, repeated failures, session profiles), error hotspots, security test noise filtering, RTK savings tracking, stop_reason heuristic
