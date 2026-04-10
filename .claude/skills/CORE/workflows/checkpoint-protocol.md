# Checkpoint Protocol

CC 2.0+ auto-checkpoints before file modifications. Use `/rewind` to recover.

---

## Commands

| Command | Effect |
|---------|--------|
| `/rewind` | Interactive checkpoint selection |
| `/rewind 1` | Go back 1 checkpoint |
| `/rewind 3` | Go back 3 checkpoints |

---

## Auto-Checkpoints

CC checkpoints before:
- File modifications (Write, Edit)
- Destructive bash (rm, git reset, etc.)
- Multi-file refactoring
- Git history-modifying ops

## Explicit Checkpoints

Request at milestones: `"Create a checkpoint before we begin the migration"`

Use before: experimental changes, DB migrations, multi-step refactors, anything irreversible outside git.

---

## Rollback Decision Tree

```
Operation Failed?
├── File changes only    → /rewind
├── Git changes          → git reflog + /rewind
├── Database changes     → Manual restore (CC cannot help)
└── External API calls   → Manual rollback (CC cannot help)
```

---

## Patterns

### Destructive File Ops

1. List targets: `ls -la <targets>`
2. Verify intent
3. Execute (CC auto-checkpoints)
4. Verify expected state
5. Recover if needed: `/rewind`

### Multi-File Refactor

1. Identify all affected files
2. Run tests first → baseline
3. Refactor incrementally (CC checkpoints each edit)
4. Test after each major change
5. Tests fail after 2 attempts → `/rewind` to last green state

### Git History Changes

For `git rebase`, `git reset --hard`, `git push --force`, `git clean -fd`:

1. `git stash` — backup uncommitted work
2. `git reflog` — note current HEAD
3. Execute git operation
4. If wrong: `git reflog` → `git reset --hard <ref>` → `/rewind`

### Iteration Loop Safety

1. Attempt fix (CC checkpoints)
2. Test
3. Failing after 3 iterations:
   - STOP
   - `/rewind` to iteration 0
   - Try fundamentally different approach
4. Still failing → escalate to Jean-Marc

**Max iterations: 5.**

### Database Migrations (CC Cannot Rollback DB)

1. Backup first: `pg_dump` or equivalent
2. Explicit checkpoint: "Checkpoint before migration"
3. Run migration
4. Verify data integrity
5. Failed → `/rewind` for files, restore DB from backup manually

### Parallel Agent Conflicts

1. `/rewind` to before agent launch
2. Re-decompose with explicit file ownership:
   - Agent A: `src/api/**`
   - Agent B: `src/ui/**`
3. Relaunch with non-overlapping constraints

---

## Hook Integration

- `pre-tool-use-security.ts` logs to `memory/security-checks.jsonl` and CC auto-checkpoints before dangerous ops
- Stop hook may suggest `/rewind` on repeated failures or destructive-op errors
- Events logged to `state/checkpoint-events.jsonl`:
  ```json
  {"timestamp": "2026-01-12T10:30:00Z", "event": "pre_destructive", "operation": "rm -rf dist/", "session_id": "abc123"}
  ```

---

## When to `/rewind`

**YES:**
- Same error 3+ times (loop)
- Tests that were passing now fail (regression)
- Undo attempts making things worse
- File corruption or unexpected deletions

**NO:**
- Making progress (errors decreasing)
- Learning new info from errors
- External system issues (API, network)
- Database state issues

---

## Limitations

**Restores:** file changes, conversation context.

**Does NOT restore:** database state, already-sent API calls, pushed git remotes, running processes, environment variables.

---

## Rules

1. Trust auto-checkpoints — don't over-checkpoint
2. Name explicit checkpoints descriptively
3. Test `/rewind` early
4. Checkpoints are file-based, not system-wide

---

## Related

- `pre-tool-use-security.ts` — security hook triggering checkpoints
- `stop-hook.ts` — error detection and recovery suggestions

Supports 12-Factor Agent Factor 6 (Launch, Pause, Resume).
