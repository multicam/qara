---
description: Comprehensive multi-source research - Qara orchestrates parallel researcher agents
alwaysApply: false
---

# Comprehensive Research Workflow

Orchestrate parallel `*-researcher` agents across available sources.

## Modes

| Mode | Agents/type | Timeout | Trigger |
|------|------------|---------|---------|
| Quick | 1 | 2 min | "quick research" |
| Standard | 3 | 3 min | default |
| Extensive | 8 | 10 min | "extensive research", "deep research" |

## Workflow

### 1. Decompose & launch (single message, parallel Task calls)

- Decompose question into N focused sub-questions per researcher type (N = mode count)
- Discover available `*-researcher` agents
- Launch ALL Task calls in ONE message
- Each agent: 1 query + 1 follow-up max, return early on substantive findings

```typescript
Task({ subagent_type: "[type-A]", description: "Query [A-1]", prompt: "..." })
Task({ subagent_type: "[type-A]", description: "Query [A-2]", prompt: "..." })
Task({ subagent_type: "[type-B]", description: "Query [B-1]", prompt: "..." })
```

### 2. Collect with HARD TIMEOUT

After mode timeout, proceed with what returned. Note non-responders in report. **Timely > complete.**

### 3. Synthesize

Confidence:
- **HIGH** — corroborated by multiple sources
- **MEDIUM** — single reliable source
- **LOW** — single source, needs verification

```markdown
## Key Findings
### [Topic]
**High Confidence:** [findings]
**Medium Confidence:** [findings]

## Source Attribution
- **[Type-A]:** [unique contributions]

## Conflicting Information
[disagreements between sources]
```

### 4. Return results

```
📅 [date]
📋 SUMMARY: [overview]
🔍 ANALYSIS: [synthesis]
⚡ ACTIONS: [commands executed]
✅ RESULTS: [findings with attribution]
📊 STATUS: [coverage, confidence]
➡️ NEXT: [follow-ups]
🎯 COMPLETED: [topic]

📈 RESEARCH METRICS:
- Total Queries: [X]
- Services Used: [N] ([list])
- Confidence Level: [H/M/L] ([%])
```

## Extensive Mode Additions

Use UltraThink to generate diverse angles (technical, historical, practical, controversial, emerging, comparative). Synthesis adds: findings by domain, unique insights per type, coverage map, uncertainties.

## Background Execution

Trigger: "background research", "research while I work".

1. Launch agents with `run_in_background: true`
2. Return output file paths
3. Synthesize when user asks

```
📋 Background Research Launched
[N] agents on [topic]. Files: [paths]
Check: tail -f [file]
```

## Agent Resume

Before launching, check for agents with `status="running"` older than 5 min (orphaned). Offer resume via `resume: agent_id`.

## Critical Rules

- ✅ All agents in ONE message (parallel)
- ✅ One focused sub-question per agent
- ✅ Balance across researcher types
- ✅ Respect hard timeouts
- ✅ Synthesize, don't concatenate
- ✅ Attribute sources + mark confidence
- ❌ No sequential launches
- ❌ No broad questions
- ❌ Don't let one slow agent block all

## Failures

On blocks/CAPTCHAs/bot detection: note in synthesis, recommend `retrieve` workflow.
