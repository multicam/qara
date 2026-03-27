# Daily Reflect Workflow

Mine today's session logs and produce an observation file.

## Prerequisites

- Miner CLI: `${PAI_DIR}/skills/introspect/tools/introspect-miner.ts`
- Format spec: `${PAI_DIR}/skills/introspect/references/observation-format.md`

## Steps

### 1. Determine Date

Default to today (Sydney time). If JM specifies a date, use that. For cold start (no prior observations exist), use `--date-range` for the past 7 days.

### 2. Run Miner

```bash
bun ${PAI_DIR}/skills/introspect/tools/introspect-miner.ts --mode daily --date YYYY-MM-DD
```

Capture the JSON output. If the miner reports zero data across all categories, note this as an observation (`[session-quality] No activity detected`) and write a minimal file.

### 3. Interpret Results

For each section of the miner output, compose observations following the tag taxonomy:

**Tool usage** (`tool_usage` section):
- Note the top 3 tools by count with percentages
- Flag any tool with error_rate > 5% as `[tool-usage][anomaly]`
- Note significant shifts from typical distribution (Read ~43%, Bash ~33% is the known baseline)
- If `anomalies` array is non-empty, create one observation per anomaly

**Sessions** (`sessions` section):
- Note session count and any unusual stop reasons
- If session count is 0, flag as `[session-quality][anomaly]`

**Security** (`security` section):
- Note decision distribution (APPROVED/BLOCKED/REQUIRE_APPROVAL)
- Flag any `new_risks` entries as `[security]` observations
- If BLOCKED count > 0, note what was blocked

**Corrections** (`corrections` array):
- Each correction becomes a `[user-correction]` observation
- Include JM's message (quoted, truncated) and what the preceding assistant action was
- These are high-value signals — never skip them

**Git** (`git` section):
- Note commit count and branches if non-trivial
- Flag force pushes as `[git-activity][anomaly]`

**CC Version** (`cc_version`):
- If version changed from yesterday's observation, create `[harness-change]` observation
- To check yesterday's version: read the previous observation file if it exists

### 4. Compose Observation File

Write to `~/qara/thoughts/shared/introspection/observations/YYYY-MM-DD.md`

Follow the format in `observation-format.md`:
- YAML frontmatter with date, sessions, tools_total, errors_total, corrections count
- Bulleted observations with tags
- Aim for 5-15 observations per day (skip trivial "everything normal" entries unless nothing else happened)

### 5. Idempotency Check

If the observation file already exists for this date:
- Read it
- Compare new observations against existing ones
- Append only genuinely new observations (avoid duplicates)
- Update frontmatter totals if they've increased

### 6. Cold Start Bootstrap

If `~/qara/thoughts/shared/introspection/observations/` is empty:
- Run miner with `--date-range` covering the past 7 days
- Create one observation file per day that had activity
- Add `is_bootstrap: true` to the frontmatter of bootstrapped files

### 7. Summary

Output a brief summary to the conversation:
- Date processed
- Number of observations generated
- Any anomalies or corrections flagged
- Path to the written file
