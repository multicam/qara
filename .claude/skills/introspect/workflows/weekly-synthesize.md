# Weekly Synthesize Workflow

Cluster past 7 days of observations into pattern updates.

## Prerequisites

- `${PAI_DIR}/skills/introspect/references/pattern-format.md`
- Observation files in `~/qara/thoughts/shared/introspection/observations/`

## 1. Gather Observations

Read all observation files from past 7 days. Parse each:
- YAML frontmatter → aggregate stats
- Bullets → (tags[], text) tuples with date

If fewer than 3 days exist, note it and proceed anyway.

## 2. Load Existing Patterns

Read all files in `~/qara/thoughts/shared/introspection/patterns/`:
- `tool-usage.md`, `session-quality.md`, `user-corrections.md`, `harness-evolution.md`

Parse: title, confidence tier, evidence count, trend, supporting dates.

## 3. Match and Cluster

**Matching existing:**
- Semantic match observation against pattern titles
- On match: increment evidence count, add date, update last-seen
- Update trend (this week's count vs prior): increasing/stable/decreasing

**New patterns:**
- Group unmatched by similarity (same primary tag + related keywords)
- Cluster with 3+ observations across 2+ days → create pattern, confidence `emerging`, trend `new`
- Title captures specific insight, not generic ("Bash errors correlate with large test runs", not "Bash errors")

**Confidence tiers — evidence-weighted scoring:**

For each pattern, weight supporting observations:
- Unique day → 1.0
- Same day as existing: first counts 1.0, each additional 0.3
- Example: 8 obs on one day = 1.0 + 7×0.3 = 3.1 (emerging)
- Example: 5 obs across 5 days = 5.0 (established)

Thresholds (weighted score):
- **emerging:** 3.0–9.9
- **established:** 10.0–24.9
- **confirmed:** 25.0+

Unique days matter: 5 different days (5.0) > 8 obs on one day (3.1).

## Cross-Session Recovery & Failure Patterns

Process `[recovery]` and `[repeated-failure]` observations:

- `[recovery]` on 3+ different days → systemic workaround → promote to `patterns/error-recovery.md` (infrastructure fix signal)
- `[repeated-failure]` spanning multiple days → unresolved issue, not learning → create/update entry with trend `increasing` if growing
- Create `error-recovery.md` if missing (follow pattern-format.md)
- Cross-ref `tool-usage.md` for tools with high error_rate that also appear in recovery chains

## Mode + TDD Metrics Analysis

**Mode session patterns:**
- `[mode-session]` averaging >10 iterations → "Mode sessions running long — break tasks into smaller stories"
- Completion rate <50% per mode type → `[mode-session][anomaly]` "Low completion rate may indicate overly ambitious scoping or unclear acceptance criteria"
- Critic rejection rate (verifier failures / total stories) >50% → "Spend more time on approach before implementing"
- Track deactivation reasons: `max-iterations`, `cancelled` warrant investigation

**TDD discipline patterns:**
- `green_first_pass_rate < 60%` → "Write simpler tests. Each test verifies ONE behavior."
- `denied_in_red > 5` per session → "Agent trying to write source in RED. Reinforce: tests first."
- `cycle_count == 0` with TDD entries → "TDD hook active but no complete RED→GREEN→REFACTOR cycles"
- `denied_in_red` week-over-week trend: decreasing = learning, increasing = enforcement working but not adapting

**Mode + TDD hints (session-hints.md):**
- Only at `established` confidence (same rule as other hints)
- Examples:
  - "Drive sessions average 15 iterations — break stories into smaller acceptance criteria"
  - "GREEN first-pass at 45% — write tests that verify one behavior"
  - "5+ denied edits per RED — write the failing test completely before implementing"

## 4. Detect Trends

Compare this week vs prior:
- Which tags increasing?
- New tag categories?
- Patterns with no new evidence in 14+ days → flag as potentially stale

## 5. Write Pattern Files

Per `pattern-format.md`:
- One `##` section per pattern, separated by `---`
- Cap supporting dates at 10 most recent
- Preserve existing patterns with no new evidence (flag stale)
- **`first_observed`**: preserve existing, set to today for new. Enables measuring promotion velocity (days to "established").

Create topic files that don't exist if observations warrant.

## 6. Glacier Check

If `observations/` has > 50 files:
- Archive oldest 30 days to `glacier/YYYY-MM/observations-YYYY-MM-DD-to-YYYY-MM-DD.md`
- Combine into one file with frontmatter:
  ```yaml
  ---
  date_range: "2026-01-01 to 2026-01-30"
  observation_count: 187
  archived_at: "2026-03-28"
  ---
  ```
- **Move** (not copy) observation files to glacier
- Update `glacier/index.md`

## 7. Regenerate Session Hints

Regenerate `~/qara/thoughts/shared/introspection/session-hints.md` after updating patterns.

For each `established`/`confirmed` pattern, write one **prescriptive** hint — tells Qara what to DO, not what IS. Hints must change behavior.

**Good (prescriptive):**
- "When a Bash command fails, read the full error output before retrying rather than issuing the same command again."
- "Use Grep instead of `rg` via Bash for content searches — it's faster and the user prefers native tools."

**Bad (descriptive):**
- "Bash usage is at ~33%." (state, changes nothing)
- "Agent delegation is at ~1.8%." (observation, not directive)

Pattern: **When [trigger], do [action] instead of [default].**
Skip hints for patterns that don't imply behavior changes. Remove hints for demoted/stale patterns.

File format:

```markdown
# Session Hints

Auto-generated from confirmed introspection patterns. Loaded by session-start hook.
Last updated: YYYY-MM-DD

## Active Hints

- [one-line actionable hint per established/confirmed pattern]

## How This File Works

The weekly-synthesize workflow updates this file when patterns reach "established" or higher.
The session-start hook reads this file and includes hints in session context.
Hints are removed when their source pattern is demoted below "established".
```

If no patterns at `established`+, write empty `## Active Hints` section (no bullets).

## 8. Summary

Output: observations processed, patterns updated (with evidence count changes), new patterns, stale flagged, glacier status, file paths.
