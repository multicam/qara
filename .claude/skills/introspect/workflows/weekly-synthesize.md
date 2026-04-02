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

**Recalculate confidence tiers using evidence-weighted scoring:**

For each pattern, compute a weighted score from its supporting observations:
- Each observation from a UNIQUE day contributes 1.0 to the score
- Multiple observations from the SAME day: the first counts 1.0, each additional counts 0.3
- Example: 8 observations all on one day → score = 1.0 + 7×0.3 = 3.1 (emerging)
- Example: 5 observations across 5 different days → score = 5.0 (established)

Tier thresholds (weighted score, not raw count):
- emerging: 3.0–9.9 weighted score
- established: 10.0–24.9 weighted score
- confirmed: 25.0+ weighted score

When updating confidence, count unique days contributing observations, not raw observation count. A pattern seen on 5 different days (weight 5.0) is stronger than one seen 8 times on a single day (weight 1.0 + 7×0.3 = 3.1).

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

### 7. Regenerate Session Hints

After updating pattern files, regenerate `~/qara/thoughts/shared/introspection/session-hints.md`.

For each pattern at 'established' or 'confirmed' confidence, write one actionable hint — a single sentence that tells Qara what to do differently based on what the pattern reveals. Good hints are specific and behavioral (e.g., "When a Bash command fails, read the full error output before retrying rather than issuing the same command again."). Avoid generic advice.

Remove hints for patterns that have been demoted below 'established' or flagged as stale.

Write the file in this format:

```markdown
# Session Hints

Auto-generated from confirmed introspection patterns. Loaded by session-start hook.
Last updated: YYYY-MM-DD

## Active Hints

- [one-line actionable hint per established/confirmed pattern]

## How This File Works

The weekly-synthesize workflow updates this file when patterns reach "established" or higher.
The session-start hook reads this file and includes hints in the session context.
Hints are removed when their source pattern is demoted below "established".
```

If no patterns are at 'established' or above yet, write the file with an empty `## Active Hints` section (no bullet points).

### 8. Summary

Output to the conversation:
- Number of observations processed
- Patterns updated (with evidence count changes)
- New patterns created
- Stale patterns flagged
- Glacier archival status (if triggered)
- Path to updated pattern files
