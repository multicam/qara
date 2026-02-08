---
description: Comprehensive multi-source research - Qara orchestrates parallel researcher agents
globs: ""
alwaysApply: false
---

# Comprehensive Research Workflow

**Orchestrate parallel multi-source research through available *-researcher agents.**

---

## Research Modes

| Mode | Agents/Type | Timeout | Trigger |
|------|------------|---------|---------|
| **Quick** | 1 | 2 min | "quick research", simple queries |
| **Standard** | 3 | 3 min | Default for most requests |
| **Extensive** | 8 | 10 min | "extensive research", "deep research" |

---

## Core Workflow (All Modes)

### Step 1: Decompose & Launch

1. **Decompose** the research question into focused sub-questions (N per researcher type, where N = mode agent count)
2. **Discover** available researcher agents (matching `*-researcher` pattern)
3. **Optimize** each query for that researcher type's specific strengths
4. **Launch ALL agents in a SINGLE message** with parallel Task calls

```typescript
// Include instance IDs for observability: [researcher-type-N]
Task({ subagent_type: "[type-A]", description: "Query [type-A-1]", prompt: "..." })
Task({ subagent_type: "[type-A]", description: "Query [type-A-2]", prompt: "..." })
Task({ subagent_type: "[type-B]", description: "Query [type-B-1]", prompt: "..." })
// ... N agents per type, ALL in ONE message
```

Each agent: 1 query + 1 follow-up max. Instruct to return as soon as findings are substantive.

### Step 2: Collect Results

**HARD TIMEOUT:** After the mode's timeout, proceed with whatever results have returned.
- Do NOT wait indefinitely for slow/failed agents
- Note non-responsive agents in final report
- **TIMELY RESULTS > COMPLETENESS**

### Step 3: Synthesize

**Confidence levels:**
- **HIGH:** Corroborated by multiple sources
- **MEDIUM:** Found by one source, seems reliable
- **LOW:** Single source, needs verification

**Structure findings:**
```markdown
## Key Findings
### [Topic Area]
**High Confidence:** Findings corroborated across sources
**Medium Confidence:** Single-source reliable findings

## Source Attribution
- **[Type-A]**: [unique contributions]
- **[Type-B]**: [unique contributions]

## Conflicting Information
[Note disagreements between sources]
```

### Step 4: Return Results

Use mandatory response format:

```
📅 [date]
📋 SUMMARY: Research coordination overview
🔍 ANALYSIS: Synthesis of multi-source results
⚡ ACTIONS: Research commands executed
✅ RESULTS: Synthesized findings with attribution
📊 STATUS: Coverage, confidence, quality
➡️ NEXT: Follow-up research needed
🎯 COMPLETED: Multi-source [topic] research

📈 RESEARCH METRICS:
- Total Queries: [X]
- Services Used: [N] ([list])
- Confidence Level: [High/Medium/Low] ([%])
```

---

## Extensive Mode Additions

When mode is Extensive (8 agents/type):

**Use UltraThink** to generate diverse research angles:
- Explore multiple unusual perspectives and domains
- Make unexpected cross-disciplinary connections
- Cover: technical, historical, practical, controversial, emerging, comparative angles

**Enhanced synthesis:**
- Key Findings by Domain with confidence tiers
- Unique Insights by researcher type
- Coverage Map (aspects, perspectives, time periods)
- Conflicting Information & Uncertainties

---

## Background Execution

**Trigger:** "background research", "research while I work", "async research"

1. Launch agents with `run_in_background: true`
2. Return output file paths to user
3. User continues other work
4. Synthesize when user asks for results

```
📋 Background Research Launched
[N] agents running on [topic].
Output files: [paths]
Check progress: tail -f [output_file]
```

---

## Agent Resume Detection

Before launching new agents, check for resumable ones:
- Agents with `status="running"` older than 5 min are likely orphaned
- Offer to resume existing or start fresh
- Resume using `resume: agent_id` parameter in Task call

---

## Critical Rules

1. ✅ Launch ALL agents in ONE message (parallel execution)
2. ✅ Each agent gets ONE focused sub-question
3. ✅ Balance across all available researcher types
4. ✅ Respect HARD TIMEOUTS per mode
5. ✅ Synthesize (don't concatenate) results
6. ✅ Attribute sources and mark confidence levels
7. ❌ Don't launch sequentially
8. ❌ Don't give broad questions (forces iterations)
9. ❌ Don't let one slow agent block everything

---

## Handling Failures

If agents report blocks, CAPTCHAs, or bot detection:
- Note in synthesis
- Recommend retrieve workflow for alternative content retrieval
