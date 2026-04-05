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

The miner JSON includes a `baseline` section (null if no prior non-bootstrap observations exist). When baseline is available, use delta values to compare today against the 7-day average — this makes comparisons deterministic rather than relying on hardcoded baselines.

For each section of the miner output, compose observations following the tag taxonomy:

**Tool usage** (`tool_usage` section):
- Note the top 3 tools by count with percentages
- Flag any tool with error_rate > 5% as `[tool-usage][anomaly]`
- Note significant shifts from typical distribution (Read ~43%, Bash ~33% is the known baseline)
- If `anomalies` array is non-empty, create one observation per anomaly

**Sessions** (`sessions` section):
- Session count uses time-gap heuristic (>5 min gap = new session), not session_id
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

**Session Traces & Recovery Patterns** (`session_traces`, `recovery_patterns`, `repeated_failures` sections):

For each `session_trace` in the miner output, compose a brief narrative as a `[session-quality]` observation:
> "Session [id] ([duration] min, [dominant_activity]): [tool_count] tool calls, [error_count] errors. Top tools: [tools_used first 3]."

For each `recovery_pattern`, create a `[tool-usage][recovery]` observation:
> "Error on [error_tool] ([error_input]) recovered by [recovery_tool] ([recovery_input]) after [gap] calls"

For each `repeated_failure`, create a `[tool-usage][repeated-failure]` observation:
> "[tool] failing repeatedly on similar input ([input_pattern]): [count] occurrences from [first_seen] to [last_seen]"

Summarize the day's session mix as a `[session-quality]` observation:
> "Today: [N] sessions — [breakdown by dominant_activity]"

**Hint Compliance** (`hint_compliance` and `hints_loaded` sections):

Record in the observation's YAML frontmatter:
```yaml
hints_loaded:
  - "hint text 1"
  - "hint text 2"
hint_compliance:
  bash_pct: 34.5
  agent_delegation_pct: 1.8
  bash_retry_rate: 0.05
```

If any hint compliance metric has shifted notably from the 7-day baseline, note it as a `[tool-usage]` observation:
> "Hint compliance: Bash at [X]% (baseline [Y]%), agent delegation [X]% (baseline [Y]%), retry rate [X] (baseline [Y])"

This enables measuring whether session hints are changing actual behavior over time.

**Mode Sessions** (`mode_sessions` and `mode_metrics` sections):

If `mode_sessions` is non-empty, create a `[mode-session]` observation per session:
> "Mode [mode] session: [iterations] iterations, [duration] min, [completed/incomplete] — deactivation: [reason]"

Summarize the day's mode usage as a `[mode-session]` observation:
> "Mode metrics: [total] sessions — [by_mode breakdown: count, avg iterations, completion rate per mode type]"

If any mode session used >10 iterations, flag as `[mode-session][anomaly]`:
> "Drive mode session ran [N] iterations — task may need smaller stories"

**TDD Enforcement** (`tdd_metrics` section):

If `tdd_metrics.total_entries` > 0, create `[tdd-enforcement]` observations:
> "TDD enforcement: [total_entries] checks, [denied_in_red] denied in RED, [cycle_count] complete cycles"

Record in the observation's YAML frontmatter:
```yaml
tdd_metrics:
  denied_in_red: 3
  green_first_pass_rate: 85.0
  cycle_count: 4
mode_metrics:
  total_sessions: 1
  drive_completion_rate: 100
```

If `denied_in_red` > 5, flag as `[tdd-enforcement][anomaly]`:
> "Agent attempted [N] source edits during RED phase — TDD discipline needs reinforcement"

If `green_first_pass_rate` < 60%, flag as `[tdd-enforcement]`:
> "GREEN first-pass rate at [X]% — tests may be too complex or implementation too fragmented"

**Infrastructure Drift** (`infrastructure_drift` section):

IF `infrastructure_drift.drifted == true`, create a `[staleness]` observation:
> "Infrastructure drift detected: {category} expected {expected}, actual {actual}. Run cc-upgrade-pai to update audit tools and documentation."

Record in YAML frontmatter:
```yaml
infrastructure_drift: true
drift_details: "hooks: 13→14, skills: 50→52"
```

This closes the loop: when Qara evolves, the miner flags the drift, the synthesizer promotes it to a hint, and the next session reminds the agent to update audit docs.

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
