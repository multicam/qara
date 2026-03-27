# Observation Format Specification

## File Location

`~/qara/thoughts/shared/introspection/observations/YYYY-MM-DD.md`

One file per day. Created by the daily reflect workflow.

## Structure

### YAML Frontmatter

```yaml
---
date: "2026-03-28"
sessions: 5
tools_total: 342
errors_total: 2
corrections: 1
---
```

### Body

Each observation is a markdown list item with tags in square brackets:

```
- [primary-tag] Observation text with specific evidence
- [primary-tag][secondary-tag] Observation with combined tags
```

## Tag Taxonomy (Fixed Set)

| Tag | Meaning | Examples |
|-----|---------|---------|
| `tool-usage` | Tool call patterns, frequencies, preferences | "Read 43%, Bash 33%" |
| `session-quality` | Session duration, stop reasons, productivity | "5 sessions, no interrupts" |
| `security` | Security decisions, risk trends, false positives | "12 REQUIRE_APPROVAL, 9 were rm" |
| `user-correction` | JM corrected Qara's behavior or output | "JM: 'use sonnet for this'" |
| `harness-change` | CC version, settings, hook, or config changes | "CC upgraded 2.1.84 -> 2.1.85" |
| `git-activity` | Commit patterns, branch usage, workflow | "7 commits on master" |
| `anomaly` | Orthogonal — any unexpected deviation | Always paired with a primary tag |
| `improvement` | Opportunity spotted for self-improvement | "Delegation guide may need update" |

## Rules

- Tags are lowercase, hyphenated
- `anomaly` and `improvement` are always secondary tags (paired with a primary)
- Observations should be specific with evidence (numbers, session IDs, quotes)
- One observation per line — no multi-line entries
- Frontmatter totals must match the miner output
- Do not add new tags without updating this spec and the SKILL.md taxonomy list

## Examples

```markdown
- [tool-usage] Read (43%) and Bash (33%) dominate; Grep up 15% from 7-day average
- [tool-usage][anomaly] 8 Bash errors in session abc123 — all bun test timeouts
- [user-correction] JM: "use sonnet for this" after haiku delegation for code analysis
- [security] 12 REQUIRE_APPROVAL decisions, 9 were rm operations in /home
- [session-quality] 5 sessions today, no interrupts, average depth normal
- [harness-change] CC version unchanged at 2.1.85
- [git-activity] 7 commits on master, 1 merge, no force pushes
- [tool-usage][improvement] Agent usage at 2% — consider delegating more analysis tasks
```
