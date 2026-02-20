# Context Engineering Quick Reference

## Golden Rules

1. **Effective context = 50-60% of stated capacity** — start compacting at 60%, new session at 80%
2. **Full context > summaries** — let agents read files directly, don't pre-digest
3. **Always spotcheck parallel work** — no exceptions
4. **Checkpoint before risk** — high-risk ops, every 5 min during complex refactors

## Session Workflow

### Phase 1: Exploration (Read-Only, 5-15 min)
1. Ask clarifying questions
2. Launch parallel explore agents
3. Spotcheck: synthesize findings
4. Document assumptions

### Phase 2: Planning (Think First, 10-30 min)
1. Enter plan mode
2. Document approach in thoughts/plans/
3. Identify checkpoints and rollback triggers
4. Define success criteria

### Phase 3: Execution (Iterate Safely)
1. Create checkpoint before each operation
2. Implement incrementally, test after each change
3. **If failing after 3 iterations: STOP → rewind → different approach**
4. Max 5 iterations (prevent infinite loops)

### Phase 4: Review (5-10 min)
Run full test suite → check regressions → review git diff → validate against success criteria

## Parallel Agent Patterns

**File-based:** N agents each update one file → 1 spotcheck agent verifies consistency

**Research & synthesis:** N agents research in parallel → 1 synthesis agent consolidates

**Batch processing:** Groups of 5 agents + spotcheck per batch → final spotcheck across all batches

## Context Zones

| Zone | Usage | Action |
|------|-------|--------|
| Green | 0-60% | Continue normally |
| Yellow | 60-80% | Be selective, consider compacting |
| Red | 80-100% | Compact immediately or new session |

**Always preserve:** Current objectives, architectural decisions, known issues, success criteria

**Can discard:** Resolved errors, superseded approaches, successful ops no longer relevant

## Error Loop Detection

**Signs:** Same error 3+ times, different fixes same result, "almost working" for >30 min

**Action:** STOP → rewind → fundamentally different approach. If 2 approaches fail: escalate.

## Checkpoints

**Always checkpoint before:** git reset, rm -rf, DROP/ALTER TABLE, git push --force, migrations, multi-file refactors

**Checkpoints restore:** File changes, conversation context, working directory state

**Checkpoints DON'T restore:** Database state, external API calls, git remote state, running processes
