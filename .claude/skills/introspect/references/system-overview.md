# Self-Improving Qara: System Overview

Reference documentation for the complete self-improvement pipeline.
Inspired by Meta-Harness (Lee et al., Stanford, arXiv 2603.28052).

## Architecture

```
ACTIVE SESSION
  User <-> Claude Code <-> Tools (Bash, Read, Write, Grep, etc.)
  |
  |-- RTK (Phase 0)            Filters Bash output, 60-90% token reduction
  |-- PreToolUse Hooks          Security checks, TDD enforcement
  |-- PostToolUse Hook          Logs enriched traces (Phase 1)
  |-- Stop Hook                 Session checkpoints + structural metadata
  |
  v
JSONL STATE FILES (~/.claude/state/)
  tool-usage.jsonl              input_summary, output_len, error_detail
  session-checkpoints.jsonl     message_len, has_code_blocks, topic_hint
  security-checks.jsonl         operation, pattern_matched, decision
  tdd-enforcement.jsonl         file_path, phase, decision
  config-changes.jsonl          source, session_id
  |
  v
INTROSPECT-MINER (CLI)
  miner-lib.ts                  Types, JSONL parsing, date helpers, collectors
  miner-trace-lib.ts            Session traces, recovery patterns (Phase 2)
  introspect-miner.ts           Daily/weekly/monthly report modes
  |
  v
THREE CADENCES
  Daily reflect (cron 10pm)     Miner JSON -> AI observations
  Weekly synthesize (Mon 10am)  Observations -> pattern updates
  Monthly evolve (1st 10am)     Patterns -> proposals (JM reviews)
  |
  v
OUTPUTS
  observations/YYYY-MM-DD.md    Tagged daily insights
  patterns/{topic}.md           Confidence-tiered recurring signals
  proposals/YYYY-MM.md          Code change proposals with diffs
  IMPROVEMENT_LOG.md            Human-readable changelog
  DECISIONS.md                  Strategic architectural decisions
```

## Data Flow

| Stage | Input | Processing | Output | Cadence |
|---|---|---|---|---|
| Collection | Tool calls, session events | Hooks append JSONL | `~/.claude/state/*.jsonl` | Real-time |
| Rotation | JSONL files >7 days | `log-rotate.sh` gzips | `archive/*.jsonl.gz` | Daily 4am |
| Mining | JSONL + transcripts + git | Miner CLI (deterministic) | JSON report | On-demand |
| Observation | Miner JSON | AI interprets, tags | `observations/YYYY-MM-DD.md` | Daily 10pm |
| Synthesis | 7 days of observations | AI clusters patterns | `patterns/{topic}.md` | Weekly Mon |
| Evolution | Patterns + memory + code | AI proposes changes | `proposals/YYYY-MM.md` | Monthly 1st |
| Application | Proposals | JM reviews, applies | Code + memory changes | JM-gated |
| Logging | Applied changes | AI + JM document | `IMPROVEMENT_LOG.md` | Per-change |

## Enriched Trace Fields (Phase 1)

### tool-usage.jsonl

| Field | Type | Source | Purpose |
|---|---|---|---|
| timestamp | string | datetime-utils | When the tool was called |
| tool | string | hook stdin | Which tool (Bash, Read, Write, etc.) |
| error | boolean | hook stdin | Did it fail? |
| session_id | string | env var | Which session |
| input_summary | string | trace-utils | What was requested (truncated, privacy-safe) |
| output_len | number | hook stdin | How much output (bytes, not content) |
| error_detail | string/null | trace-utils | Error text when failed (300 char max) |

### session-checkpoints.jsonl

| Field | Type | Source | Purpose |
|---|---|---|---|
| timestamp | string | datetime-utils | When the session stopped |
| session_id | string | env var | Which session |
| stop_reason | string | hook stdin | Why it stopped |
| summary | string | tab-titles | Brief description |
| message_len | number | hook stdin | Response length |
| has_code_blocks | boolean | regex | Did it include code? |
| topic_hint | string | trace-utils | What was it about? |

## Confidence Tiers

| Tier | Observations | Action |
|---|---|---|
| Emerging (3-9) | Monitor, don't act | Continue observing |
| Established (10-25) | Act with caution | Propose if clear |
| Confirmed (25+) | Act with confidence | Propose code/memory changes |

## Safety Invariants

1. **Proposals, never auto-apply** — all code changes require JM review
2. **Deterministic code, AI interpretation** — miner is TypeScript, synthesis is prompts
3. **Backward compatibility** — all enrichment fields optional
4. **Privacy** — never log output content, only structural metadata
5. **Fail-open hooks** — logging failures never block tool execution
6. **500-line module limit** — per DECISIONS.md

## Key Files

| Component | Path |
|---|---|
| Post-tool-use hook | `.claude/hooks/post-tool-use.ts` |
| Stop hook | `.claude/hooks/stop-hook.ts` |
| Trace utils | `.claude/hooks/lib/trace-utils.ts` |
| RTK hook | `.claude/hooks/rtk-rewrite.sh` |
| Miner lib | `.claude/skills/introspect/tools/miner-lib.ts` |
| Miner CLI | `.claude/skills/introspect/tools/introspect-miner.ts` |
| Daily workflow | `.claude/skills/introspect/workflows/daily-reflect.md` |
| Weekly workflow | `.claude/skills/introspect/workflows/weekly-synthesize.md` |
| Monthly workflow | `.claude/skills/introspect/workflows/monthly-evolve.md` |
| Improvement log | `thoughts/shared/introspection/IMPROVEMENT_LOG.md` |
| Implementation plan | `thoughts/shared/plans/quiet-petting-pascal.md` |
