# Daily Reflect Workflow

Mine today's session logs into an observation file.

## Prerequisites

- Miner: `${PAI_DIR}/skills/introspect/tools/introspect-miner.ts`
- Format: `${PAI_DIR}/skills/introspect/references/observation-format.md`

## 1. Determine Date

Default: today (Sydney time). JM can specify a date. Cold start (no prior observations): use `--date-range` for past 7 days.

## 2. Run Miner

```bash
bun ${PAI_DIR}/skills/introspect/tools/introspect-miner.ts --mode daily --date YYYY-MM-DD
```

If miner reports zero across all categories, write a minimal file with `[session-quality] No activity detected`.

## 3. Interpret Results

The `baseline` field (null until non-bootstrap observations exist) provides 7-day-average deltas — use these instead of hardcoded baselines.

### Tool usage (`tool_usage`)
- Top 3 tools by count with percentages
- `error_rate > 5%` → `[tool-usage][anomaly]`
- Shifts from baseline (Read ~43%, Bash ~33%)
- Each `anomalies` entry → one observation

### Sessions (`sessions`)
- Uses time-gap heuristic (>5 min = new session), not session_id
- Note count + unusual stop reasons
- Count 0 → `[session-quality][anomaly]`

### Security (`security`)
- Decision distribution (APPROVED/BLOCKED/REQUIRE_APPROVAL)
- `new_risks` → `[security]` observation each
- Note what was BLOCKED if count > 0

### Corrections (`corrections`)
- Each → `[user-correction]` observation
- Quote JM's message (truncated) + preceding assistant action
- **High value — never skip**

### Git (`git`)
- Commit count + branches if non-trivial
- Force pushes → `[git-activity][anomaly]`

### CC version (`cc_version`)
- Changed from yesterday's observation → `[harness-change]`

### Session traces / recovery / repeated failures

Per `session_trace` → `[session-quality]`:
> "Session [id] ([duration] min, [dominant_activity]): [tool_count] tools, [error_count] errors. Top: [tools_used first 3]."

Per `recovery_pattern` → `[tool-usage][recovery]`:
> "Error on [error_tool] ([error_input]) recovered by [recovery_tool] ([recovery_input]) after [gap] calls"

Per `repeated_failure` → `[tool-usage][repeated-failure]`:
> "[tool] failing repeatedly on similar input ([input_pattern]): [count] from [first_seen] to [last_seen]"

Day summary → `[session-quality]`:
> "Today: [N] sessions — [breakdown by dominant_activity]"

### Hint compliance (`hint_compliance`, `hints_loaded`)

YAML frontmatter:
```yaml
hints_loaded:
  - "hint text 1"
hint_compliance:
  bash_pct: 34.5
  agent_delegation_pct: 1.8
  bash_retry_rate: 0.05
```

Notable shifts vs 7-day baseline → `[tool-usage]`:
> "Hint compliance: Bash [X]% (baseline [Y]%), agent delegation [X]% (baseline [Y]%), retry [X] (baseline [Y])"

### Mode sessions (`mode_sessions`, `mode_metrics`)

Per session → `[mode-session]`:
> "Mode [mode] session: [iterations] iterations, [duration] min, [completed/incomplete] — deactivation: [reason]"

Day summary → `[mode-session]`:
> "Mode metrics: [total] sessions — [by_mode breakdown: count, avg iterations, completion rate]"

Iterations > 10 → `[mode-session][anomaly]`:
> "Drive mode session ran [N] iterations — task may need smaller stories"

### TDD enforcement (`tdd_metrics`)

`total_entries > 0` → `[tdd-enforcement]`:
> "TDD enforcement: [total_entries] checks, [denied_in_red] denied in RED, [cycle_count] cycles"

YAML frontmatter:
```yaml
tdd_metrics:
  denied_in_red: 3
  green_first_pass_rate: 85.0
  cycle_count: 4
mode_metrics:
  total_sessions: 1
  drive_completion_rate: 100
```

`denied_in_red > 5` → `[tdd-enforcement][anomaly]`:
> "Agent attempted [N] source edits during RED — TDD discipline needs reinforcement"

`green_first_pass_rate < 60%` → `[tdd-enforcement]`:
> "GREEN first-pass rate at [X]% — tests too complex or implementation fragmented"

### Infrastructure drift (`infrastructure_drift`)

`drifted == true` → `[staleness]`:
> "Infrastructure drift: {category} expected {expected}, actual {actual}. Run cc-upgrade-pai."

YAML:
```yaml
infrastructure_drift: true
drift_details: "hooks: 13→14, skills: 50→52"
```

Closes the loop: miner flags → synthesizer promotes to hint → next session reminds agent.

## 4. Compose Observation File

Write to `~/qara/thoughts/shared/introspection/observations/YYYY-MM-DD.md` per `observation-format.md`:
- YAML frontmatter (date, sessions, tools_total, errors_total, corrections count)
- Bulleted tagged observations
- Target 5-15 per day (skip trivial "normal" entries unless nothing else happened)

## 5. Idempotency

If file exists: read, dedupe new observations against existing, append only genuinely new, update frontmatter totals if increased.

## 6. Cold Start Bootstrap

Empty observations dir:
- Run miner with `--date-range` for past 7 days
- One file per day with activity
- Add `is_bootstrap: true` to frontmatter

## 7. Summary

Output to conversation: date processed, observation count, flagged anomalies/corrections, file path.
