# Experiment Format

Experiments track the before/after impact of harness changes.

## File Location

`~/qara/thoughts/shared/introspection/experiments/exp-YYYYMMDD-NNN.md`

## Structure

### Experiment Definition (YAML frontmatter)

id: exp-YYYYMMDD-NNN
title: [short description]
status: proposed | active | completed | abandoned
started: YYYY-MM-DD
ended: YYYY-MM-DD (when completed/abandoned)
duration_days: N
hypothesis: [what we expect to change]
proposal: proposals-YYYY-MM.md #N (link to originating proposal)

### Body Sections

**Change:**
[What was modified — reference the proposal, file paths, and exact changes]

**Baseline Metrics (pre-change):**
[Metrics from the N days before the change was applied]
- Error rate: X%
- Recovery rate: Y%
- [custom metric]: [value]

**Experiment Metrics (post-change):**
[Metrics from the experiment period — same metrics as baseline]
- Error rate: X%
- Recovery rate: Y%
- [custom metric]: [value]

**Result:** confirmed | refuted | inconclusive
**Decision:** keep | revert | modify
**Notes:** [qualitative observations, unexpected side effects]

## Lifecycle

1. **proposed** — created from a monthly-evolve proposal, not yet applied
2. **active** — change applied, measuring impact
3. **completed** — enough data collected, result determined
4. **abandoned** — change reverted before measurement period ended

## Rules

- Minimum measurement period: 7 days (one weekly synthesize cycle)
- Baseline period: 7 days before the change
- Same metrics must appear in both baseline and experiment sections
- Monthly evolve reviews active experiments and flags stale ones (>30 days active)
- Weekly synthesize checks if active experiments have sufficient data
