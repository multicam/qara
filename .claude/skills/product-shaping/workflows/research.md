---
description: "Phase 2 — Orchestrate parallel research, delegating to the research skill"
---

# Phase 2: Research

**Goal:** Build the evidence base. AI does 80% of the work here.
**Output:** Research files in the project's `thoughts/research/` folder.

---

## Delegation Strategy

Phase 2 is a **thin orchestrator**. It defines what to research and where to put it, then delegates execution to the `research` skill's workflows.

### For web research (competitors, APIs, domain learning):

-> **READ:** `${PAI_DIR}/skills/research/workflows/conduct.md`
-> **EXECUTE:** Use **Extensive mode** (8 agents) with `run_in_background: true` — researcher agents run at their declared tier (haiku), do NOT override to opus

### For codebase exploration:

-> **EXECUTE:** Launch `codebase-analyzer` agent via Agent tool to audit the codebase

---

## Research Streams

Launch all selected streams simultaneously. Maximise parallelisation.

| Stream | Method | Output file |
|--------|--------|-------------|
| Competitive research | `research` skill — 1 agent per platform, parallel | `thoughts/research/competitive.md` |
| Codebase exploration | `codebase-analyzer` agent | `thoughts/research/codebase.md` |
| External API/docs | `research` skill — WebFetch + WebSearch | `thoughts/research/api.md` |
| User evidence | Extract from `evidence_source` dumps | `thoughts/research/user-evidence.md` |

Additional streams go to `thoughts/research/{stream-name}.md`.

---

## Competitive Research (Detail)

When running competitive research:

1. Launch **one agent per platform** in parallel with `run_in_background: true` (let agents run at their declared tier — haiku for researchers)
2. Give each agent the problem framing from Phase 1 so they search with the right lens
3. Each agent: 3-5 web searches + 2-4 page fetches
4. Each agent writes `thoughts/research/{platform-name}.md`
5. After all complete, synthesize into `thoughts/research/best-practices.md`: patterns, anti-patterns, how they handle our open questions

**Gotcha:** Review sites return 403 on WebFetch — use `gemini-researcher` as fallback.

---

## Codebase Audit (Detail)

Launch `codebase-analyzer` agent to audit the `codebase` and `server` paths. The agent should report on:

- Existing user flows this feature touches
- Data models, API surfaces, DB schemas
- Integration points
- What can be reused vs. what's net new
- Internal docs, prior art

Output: `thoughts/research/codebase-analysis.md`

---

## After Research Completes

Present a synthesis to JM. Don't dump raw findings — distill into:

1. **Key patterns from competitors** — what the best platforms do, what to avoid
2. **Customer signal strength** — how many requests, what stage, attributed quotes
3. **What the codebase already has** — what's reusable, what's missing
4. **Open questions** the research surfaced

Once JM has reviewed the synthesis, proceed to Phase 3.
