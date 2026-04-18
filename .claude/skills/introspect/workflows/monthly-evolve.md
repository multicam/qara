# Monthly Evolve Workflow

Strategic self-audit: review patterns, propose memory updates, detect harness evolution, recommend improvements.

## Prerequisites

- Pattern files in `~/qara/thoughts/shared/introspection/patterns/`
- Memory in `~/.claude/projects/-home-jean-marc-qara/memory/`
- Miner CLI

## Autonomy

Writes **proposals**, not direct edits. JM reviews before applying. Output to `~/qara/thoughts/shared/introspection/reports/`.

## 1. Gather All Data (parallel)

- All pattern files from `patterns/`
- `MEMORY.md` and all `*.md` in `~/.claude/projects/-home-jean-marc-qara/memory/`
- `~/qara/DECISIONS.md`
- `bun ${PAI_DIR}/skills/introspect/tools/introspect-miner.ts --mode monthly` (CC version data)

## 2. Pattern-to-Memory Review

**Confirmed (25+ observations):**
- Captured in MEMORY.md? If yes, still accurate?
- If not: draft MEMORY.md addition or new individual memory file (YAML frontmatter: name, description, type)

**Established (10-25):** flag for awareness, don't propose memory changes. Note trending-toward-confirmed.

**`user-correction` tag (any confidence):**
- High priority — corrections = Qara repeating mistakes
- Corresponding `feedback` memory exists?
- If not: draft proposed feedback memory

## 3. Harness Evolution Check

From miner's monthly output:
- Compare current CC version vs last month
- If changed, note progression ("2.1.73 → 2.1.85 over March") and major jumps (>2 minor versions).

**Then run `/cc-upgrade-review`** (or note pending inbox items). The iterative review inbox (`.claude/skills/cc-upgrade-pai/workflows/review-inbox.md`) consolidates changelog diffs, new hook events, new tools/features, and every other audit feed into one decision stream with persistent state. Skipping changelog review here is fine — the inbox does that work for you.

## 4. Harness Code Proposals

For `confirmed` or `established` patterns, evaluate if CODE change (not just memory update) would address:

1. **Hook changes** — inadequate logging or repeated manual workaround → enrich hook / automate
2. **Miner changes** — weekly synthesize lacks a signal miner doesn't extract → add to miner-lib or miner-trace-lib
3. **Workflow changes** — daily observations miss an insight category → update workflow prompt
4. **Settings changes** — timeout issues, delegation underuse, permission friction → settings.json edit
5. **New tool/skill** — recurring need no skill addresses → propose creation

Each follows `${PAI_DIR}/skills/introspect/references/proposal-format.md`. Write all to `~/qara/thoughts/shared/introspection/reports/proposals-YYYY-MM.md`.

Summary table in monthly report:

```markdown
## Harness Evolution Proposals

| # | Title | Type | Target | Risk | Evidence |
|---|-------|------|--------|------|----------|
| 1 | [title] | hook | post-tool-use.ts | low | [pattern] confirmed |

See `proposals-YYYY-MM.md` for full details.
```

**Safety:** proposals NEVER auto-applied. Each includes risk rating + rollback instructions.

## 5. Diderot Demand Signals

Scan month's observations for research-related sessions:
- `topic_hint` contains "research", "investigate", "search", "explore", "find", "what is", "how does"
- `dominant_activity='searching'` or heavy WebSearch/WebFetch
- Patterns in `tool-usage.md` / `session-quality.md` referencing external knowledge-seeking

Extract topic, append to `~/qara/thoughts/shared/introspection/diderot-signals.md`:

```
- [YYYY-MM-DD] <topic> — <evidence>
```

Example:
```
- [2026-04-15] TypeScript inference performance — WebSearch calls in 3 sessions around TS compiler slowdowns
- [2026-04-22] WCAG 2.2 contrast ratio changes — repeated WebFetch to accessibility docs
```

**Append**, don't overwrite. Chronological order.

Signals can be fed manually into Diderot's `_meta/logs/knowledge_gaps.yaml`. Note in monthly report how many were extracted and top themes.

## 6. cc-upgrade-pai Status

```bash
cd ~/qara && git log --all --oneline --since="30 days ago" | grep -i "cc-upgrade\|pai.*audit\|upgrade.*pai"
```

- Run in past 30 days: note date + summary
- Not run: recommend as monthly hygiene

## 7. Self-Improvement Assessment

Review the introspection system itself:
- Daily observations generated consistently? (file count + dates)
- Observation tags adequate? Any not fitting taxonomy?
- Patterns actionable? (confirmed → memory updates or behavior changes?)
- Correction detection real? (false positive rate in recent corrections)
- Propose workflow modifications if warranted (don't apply)

## 8. Architecture Review

Staleness check:
- `DECISIONS.md` — any "Revisit if" conditions now true?
- Memory files — reference files/functions/patterns that no longer exist?
- CORE SKILL.md doc index — all paths resolve?

Lighter than cc-upgrade-pai — focused on what patterns revealed.

## 9. Compose Monthly Report

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
[Specific additions/changes — what, which file, why]

## Harness Evolution
- CC version: [current] (was [previous])
- Notable changes: [list]
- cc-upgrade-pai last run: [date or "STALE — recommend running"]

## Self-Improvement Recommendations
[Proposed workflow/taxonomy/heuristic changes]

## Architecture Notes
[Stale DECISIONS.md entries, broken references, drift]
```

## 10. Proposed Updates File

If concrete memory changes exist, write `~/qara/thoughts/shared/introspection/reports/proposed-updates-YYYY-MM.md` with exact content for JM to apply:

```markdown
### Proposal: [title]

**Target file:** `~/.claude/projects/-home-jean-marc-qara/memory/[file]`
**Action:** Add | Modify | Remove
**Reason:** [pattern evidence]

**Content:**
[exact markdown]
```

## 11. Summary

Output: report location, proposal count, CC version status, top recommendation, cc-upgrade-pai staleness, Diderot signal count.
