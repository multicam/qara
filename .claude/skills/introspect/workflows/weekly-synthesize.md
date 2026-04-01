# Weekly Synthesize Workflow

Cluster the past 7 days of observations into pattern updates.

## Prerequisites

- Pattern spec: `${PAI_DIR}/skills/introspect/references/pattern-format.md`
- Observation files in `~/qara/thoughts/shared/introspection/observations/`

## Steps

### 1. Gather Observations

Read all observation files from the past 7 days in `~/qara/thoughts/shared/introspection/observations/`.

Parse each file:
- Extract YAML frontmatter for aggregate stats
- Parse each bullet into (tags[], text) tuples
- Build a flat list of all observations with their dates

If fewer than 3 days of observations exist, note this in the output but proceed anyway (early data is still useful).

### 2. Load Existing Patterns

Read all files in `~/qara/thoughts/shared/introspection/patterns/` (if any exist):
- `tool-usage.md`
- `session-quality.md`
- `user-corrections.md`
- `harness-evolution.md`

Parse each pattern entry: title, confidence tier, evidence count, trend, supporting dates.

### 3. Match and Cluster

For each topic file, process the relevant observations:

**Matching existing patterns:**
- Compare each observation against existing pattern titles (semantic match, not exact)
- If an observation supports an existing pattern: increment evidence count, add date to supporting dates, update last-seen date
- Update trend: compare this week's observation count for the pattern vs prior (increasing/stable/decreasing)

**Creating new patterns:**
- Group unmatched observations by similarity (same primary tag + related keywords)
- If a cluster has 3+ observations across 2+ days, create a new pattern entry with confidence: `emerging`, trend: `new`
- Write a descriptive title that captures the specific insight (not generic like "Bash errors" but "Bash errors correlate with large test suite runs")

**Recalculate confidence tiers:**
- emerging: 3-9 total observations
- established: 10-25 total observations
- confirmed: 25+ total observations

### Cross-Session Recovery & Failure Patterns

Process `[recovery]` and `[repeated-failure]` observations from the week's observation files:

- Look for `[recovery]` observations that appear on 3+ different days — these represent systemic workarounds that should become infrastructure fixes. Promote to a pattern in `patterns/error-recovery.md`.
- Look for `[repeated-failure]` observations that span multiple days — these represent unresolved issues the system is not learning from. Create or update a pattern entry in `patterns/error-recovery.md` with trend: `increasing` if the count is growing.
- When creating new patterns from recovery/failure observations, use `patterns/error-recovery.md` as the target file (create it if it does not exist, following `pattern-format.md`).
- Cross-reference with `patterns/tool-usage.md` for tool-specific patterns that correlate with recovery events (e.g. if a tool has high error_rate and also appears frequently in recovery chains).

### 4. Detect Trends

Compare this week's observation distribution against prior observations (if available):
- Which tags are increasing in frequency?
- Are there new tag categories appearing?
- Are there patterns that haven't received new evidence in 14+ days? Flag them as potentially stale.

### 5. Write Pattern Files

Write/update each pattern topic file following the format in `pattern-format.md`:
- One `## ` section per pattern, separated by `---`
- Cap supporting dates list at 10 most recent
- Preserve existing patterns even if no new evidence this week (but flag stale ones)

Create topic files that don't yet exist if observations warrant them.

### 6. Glacier Check

Count files in `observations/`:
- If > 50 files, archive the oldest 30 days
- Create `glacier/YYYY-MM/observations-YYYY-MM-DD-to-YYYY-MM-DD.md`
- The glacier file combines all observations from the archived period with YAML frontmatter:
  ```yaml
  ---
  date_range: "2026-01-01 to 2026-01-30"
  observation_count: 187
  archived_at: "2026-03-28"
  ---
  ```
- Move (not copy) the observation files to glacier
- Update `glacier/index.md` with the new archive entry

### 7. Summary

Output to the conversation:
- Number of observations processed
- Patterns updated (with evidence count changes)
- New patterns created
- Stale patterns flagged
- Glacier archival status (if triggered)
- Path to updated pattern files
