---
description: Create detailed implementation plans through interactive research and iteration
model: opus
---

# Create Implementation Plan

Produce implementation plans interactively. Skeptical, thorough, collaborative.

## Invocation

With args: read any referenced file fully, skip the intro, jump to Step 1.
Without args:
```
I'll create an implementation plan. Give me:
1. Task/ticket (or path to a file)
2. Constraints or non-obvious requirements
3. Links to prior research or similar implementations

Tip: `/create_plan path/to/plan.md` — direct entry
     `/create_plan think deeply about path/to/plan.md` — extended reasoning
```

## Pre-Step: Reasoning Gate (compressed)

Before Step 1, write ONE bullet per dimension inline — not a page:

1. **Hard constraints** (security/architecture/policy): ...
2. **Hypotheses** (2-3 contrarian options): ...
3. **Critical path** (what decides what): ...
4. **Gaps** (need tools vs. need JM): ...
5. **Ready?** (yes / still uncertain about X): ...

Expand to full paragraphs **only** when:
- Task spans ≥5 phases, OR
- Architecture decisions are load-bearing, OR
- User says "think deeply"

## Step 1: Context Gathering

1. **Read referenced files fully.** No limit/offset. Read them yourself in the main context — don't delegate upfront.

2. **Decide whether to spawn research agents.** Gate:
   - Task names a specific existing file/function → **skip** thoughts-analyzer; scope codebase-analyzer-low (haiku) to that file's neighborhood.
   - Task is "add a flag" / "fix bug in X" / "rename Y" → **skip both agents**.
   - Task touches a subsystem you haven't seen before → spawn `codebase-analyzer` (sonnet).
   - Task has historical context implications ("why is X structured this way", "we tried Y before") → spawn `thoughts-analyzer` (sonnet).
   - Genuinely novel, cross-cutting architecture → spawn both in parallel.

3. **Trust agent summaries.** When agents return file:line references + extracts, use those. Re-read a file only when (a) the summary has a gap relevant to a decision, or (b) you need verbatim code for the plan. DO NOT re-read every file the agents touched — that defeats delegation.

4. **Verify against reality.** Cross-reference ticket → actual code. Note discrepancies and assumptions.

5. **Present findings + focused questions.** Only ask what you genuinely can't resolve via code.

## Step 1.5: Adaptation

After research:
- Did any finding contradict a hypothesis? Revise.
- Does the problem statement need re-scoping? Revise.
- New constraints (coupling, patterns, tech debt)? Fold in.

If yes to any → loop back to the specific gap. Otherwise proceed.

## Step 2: Research & Discovery (only if Step 1 had gaps)

1. If user corrected a misunderstanding: spawn new research to verify, don't accept blind.
2. Parallel sub-tasks for specific aspects. Use the cheapest sufficient tier:
   - `codebase-analyzer-low` (haiku) — file discovery, pattern finding
   - `codebase-analyzer` (sonnet) — data flow, implementation tracing
   - `thoughts-analyzer` (sonnet) — historical research extraction
3. Wait for all to complete before proceeding.
4. Present design options (2-3) with trade-offs. Ask which aligns.

## Step 3: Plan Structure

Propose phase outline, get feedback before writing details:

```
## Overview
{1-2 sentences}

## Phases
1. {name} — {what it accomplishes}
2. ...
```

## Step 4: Write the Plan

**Now** — and only now — `READ .claude/skills/CORE/workflows/plan-template.md` for the canonical structure.

Plan path: `thoughts/shared/plans/{domain}--{specific-feature}-v{N}.md`
- `domain`: kebab-case broad area (planning-ux, tdd-qa, auth, infra)
- `specific-feature`: kebab-case what this addresses
- `vN`: starts at v1, bump only for major rewrites
- Old versions → `thoughts/shared/plans/archive/`

Common patterns reference (lazy-load): if the plan involves multi-service changes, migrations, or unusual phasing → `READ .claude/skills/CORE/workflows/plan-common-patterns.md`. Otherwise skip.

## Step 5: Review & Iterate

1. Present the plan path. Ask: phases scoped right? Success criteria specific? Missing edge cases?
2. Iterate on feedback. No open questions in the final plan — resolve them before finalizing.

## Guidelines

- **Skeptical.** Question vague requirements. Verify with code, not assumptions.
- **Interactive.** Get buy-in at each major step. Don't write the whole plan in one shot.
- **Specific.** File paths, line numbers, measurable criteria (automated vs manual).
- **Practical.** Incremental, testable. Include "what we're NOT doing."
- **Complete.** Every decision made before finalizing. No TBDs.
