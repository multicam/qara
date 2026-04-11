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

CC checkpoints automatically before file modifications (Write, Edit, NotebookEdit). There is no API for named or explicit checkpoints — the CLI snapshots on every file-touching turn, and `/rewind` shows the list. Treat checkpoint creation as free and automatic; your job is knowing *when to rewind*, not when to create.

For anything outside the file system (DB, external APIs, pushed git), CC can't help — see Limitations below.

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

Two hooks complement CC's built-in checkpointing:

- **`pre-tool-use-security.ts`** — logs destructive-op decisions to `state/security-checks.jsonl` (block/allow + reason). Does NOT trigger CC's checkpoint; CC's auto-checkpoint runs before file writes regardless.
- **`post-tool-failure.ts`** — on rate-limit detection, calls `saveCheckpoint()` (working-memory snapshot, not a CC /rewind point) and appends to `state/checkpoint-events.jsonl`:
  ```json
  {"timestamp": "2026-04-11T10:30:00Z", "event_type": "rate_limit_detected", "session_id": "abc123"}
  ```

These are advisory trails — the authoritative file-recovery mechanism is always `/rewind`.

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

1. Trust auto-checkpoints — CC handles the snapshot side, you handle the rewind decision
2. Test `/rewind` early in unfamiliar codebases so you know the restore cadence
3. Checkpoints are file-based, not system-wide — DB/API/network state is yours to manage

---

## Related

- `pre-tool-use-security.ts` — security hook triggering checkpoints
- `stop-hook.ts` — error detection and recovery suggestions

Supports 12-Factor Agent Factor 6 (Launch, Pause, Resume).
