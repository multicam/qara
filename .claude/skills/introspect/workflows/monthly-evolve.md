# Monthly Evolve Workflow

Strategic self-audit: review patterns, propose memory updates, detect harness evolution, recommend self-improvements.

## Prerequisites

- Pattern files in `~/qara/thoughts/shared/introspection/patterns/`
- Memory files in `~/.claude/projects/-home-jean-marc-qara/memory/`
- Miner CLI for CC version check

## Autonomy

This workflow writes PROPOSALS, not direct edits. JM reviews before changes are applied to MEMORY.md or other memory files. Output goes to `~/qara/thoughts/shared/introspection/reports/`.

## Steps

### 1. Gather All Data

Read in parallel:
- All pattern files from `~/qara/thoughts/shared/introspection/patterns/`
- `~/.claude/projects/-home-jean-marc-qara/memory/MEMORY.md` and all `*.md` in that directory
- `~/qara/DECISIONS.md`
- Run `bun ${PAI_DIR}/skills/introspect/tools/introspect-miner.ts --mode monthly` for CC version data

### 2. Pattern-to-Memory Review

For each **confirmed** pattern (25+ observations):
- Is this already captured in MEMORY.md? If yes, is the memory entry still accurate?
- If not captured: draft a proposed MEMORY.md addition or a new individual memory file
- Follow existing memory conventions (YAML frontmatter with name, description, type)

For each **established** pattern (10-25 observations):
- Flag for awareness but don't propose memory changes yet
- Note if it's trending toward confirmed

For patterns with `user-correction` tag at any confidence:
- These are high-priority — corrections indicate Qara is repeating mistakes
- Check if a corresponding `feedback` memory already exists
- If not, draft a proposed feedback memory with the correction pattern

### 3. Harness Evolution Check

From the miner's monthly output:
- Compare current CC version against the version from the previous month's report
- If version changed:
  - Note the version progression (e.g., "2.1.73 -> 2.1.85 over March")
  - List major version jumps (>2 minor versions between sessions)
  - Recommend checking CC changelog for capability changes
  - Flag if new hook events, tools, or features may be available

### 4. cc-upgrade-pai Status

Check when cc-upgrade-pai was last run:
```bash
cd ~/qara && git log --all --oneline --since="30 days ago" | grep -i "cc-upgrade\|pai.*audit\|upgrade.*pai"
```

- If run in past 30 days: note date and summary
- If not: recommend running cc-upgrade-pai as part of monthly hygiene

### 5. Self-Improvement Assessment

Review the introspection system itself:
- Are daily observations being generated consistently? (Check observation file count and dates)
- Are the observation tags adequate? Any observations that don't fit existing taxonomy?
- Are patterns actionable? (Do confirmed patterns lead to memory updates or behavioral changes?)
- Is the correction detection finding real corrections? (Check false positive rate by reviewing recent corrections)
- Propose specific workflow modifications if warranted (but don't apply them directly)

### 6. Architecture Review

Check for staleness:
- `DECISIONS.md` entries: are any "Revisit if" conditions now true?
- Memory files: do any reference files, functions, or patterns that no longer exist?
- CORE SKILL.md doc index: do all paths still resolve?

This is lighter than cc-upgrade-pai — focused on what patterns revealed, not full infrastructure audit.

### 7. Compose Monthly Report

Write to `~/qara/thoughts/shared/introspection/reports/monthly-YYYY-MM.md`:

```markdown
# Monthly Evolution Report — YYYY-MM

## Executive Summary
[2-3 sentences: key findings, version changes, top recommendation]

## Pattern Highlights
| Pattern | Confidence | Trend | Action |
|---------|-----------|-------|--------|
| [title] | confirmed | stable | Proposed for MEMORY.md |
| [title] | established | increasing | Monitor next month |

## Proposed Memory Updates
[Specific additions/changes to MEMORY.md or individual memory files]
[Each proposal includes: what to add/change, which file, why]

## Harness Evolution
- CC version: [current] (was [previous])
- Notable changes: [list]
- cc-upgrade-pai last run: [date or "STALE — recommend running"]

## Self-Improvement Recommendations
[Proposed changes to introspection workflows, tag taxonomy, detection heuristics]

## Architecture Notes
[Stale DECISIONS.md entries, broken references, drift detected]
```

### 8. Write Proposed Updates File

If there are concrete memory changes to propose, also write:
`~/qara/thoughts/shared/introspection/reports/proposed-updates-YYYY-MM.md`

This file contains the exact content to add/modify in memory files, ready for JM to review and apply (or reject). Format each proposal as:

```markdown
### Proposal: [title]

**Target file:** `~/.claude/projects/-home-jean-marc-qara/memory/[file]`
**Action:** Add | Modify | Remove
**Reason:** [pattern evidence]

**Content:**
[exact markdown to add/change]
```

### 9. Summary

Output to the conversation:
- Report location
- Number of proposals generated
- CC version status
- Top recommendation
- Whether cc-upgrade-pai is stale
