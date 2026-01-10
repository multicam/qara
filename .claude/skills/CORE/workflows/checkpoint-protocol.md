# Checkpoint Protocol

## Overview

Claude Code 2.0+ supports checkpoints for session safety and rollback. This workflow documents how to effectively use checkpoints in PAI workflows.

## Using /rewind

The `/rewind` command shows checkpoint history and allows rollback:

```bash
# In Claude Code session
/rewind
```

This displays:
- List of available checkpoints with timestamps
- Description of what changed at each checkpoint
- Option to restore to any previous checkpoint

## Checkpoint Types

### Automatic Checkpoints

Claude Code creates checkpoints automatically before:
- File modifications (Write, Edit tools)
- Destructive bash operations
- Multi-file refactoring
- Git operations that modify history

### Manual Checkpoints

Create explicit checkpoints at important milestones:

```
# Request a checkpoint in conversation
"Create a checkpoint before we begin the refactor"
```

Use manual checkpoints:
- Before experimental changes
- After completing a significant phase
- Before testing destructive operations
- At natural "save points" in complex workflows

## When to Checkpoint

### Always Checkpoint Before:
- Large-scale refactoring
- Database migrations
- Git operations (rebase, reset, force push)
- Deleting files or directories
- Installing/removing system packages
- Configuration changes

### Checkpoint After:
- Successfully completing multi-step workflows
- Passing all tests after changes
- Merging complex branches
- Deploying to staging

## Rollback Safety Pattern

For risky operations, follow this pattern:

1. **Verify current state** - Ensure working directory is clean
2. **Create checkpoint** - Request explicit checkpoint
3. **Execute operation** - Perform the risky change
4. **Verify success** - Check that changes are correct
5. **Continue or rollback** - Use /rewind if needed

## Integration with PAI Workflows

### Pre-Destructive Hook Pattern

The `pre-tool-use-security.ts` hook can trigger checkpoint creation:

```typescript
// Before destructive operations, ensure checkpoint exists
if (isDestructiveOperation(tool, args)) {
  // CC creates checkpoint automatically
  logSecurityCheck("checkpoint_created", operation);
}
```

### Git Workflow Integration

When using `git-update-repo.md` workflow:
1. CC checkpoints before git operations
2. If push fails, /rewind restores pre-push state
3. Allows safe experimentation with branches

## Factor 6 Compliance

Checkpoints support **Factor 6: Launch, Pause, Resume**:
- **Launch** - Session starts with clean checkpoint
- **Pause** - Checkpoint preserves exact state
- **Resume** - /rewind restores any checkpoint

## Best Practices

1. **Trust automatic checkpoints** - CC is smart about when to checkpoint
2. **Use /rewind proactively** - Check checkpoint history regularly
3. **Don't over-checkpoint** - Manual checkpoints for milestones only
4. **Document checkpoint purpose** - "Checkpoint: before API migration"
5. **Test rollback** - Verify /rewind works before relying on it

## Troubleshooting

### "No checkpoints available"
- Session may be too new
- No file modifications yet
- Try making a small edit to trigger checkpoint

### Checkpoint doesn't restore expected state
- Checkpoints are file-based, not memory-based
- External systems (databases) won't rollback
- Git state is separate from CC checkpoints

## Related Documentation

- `git-update-repo.md` - Git workflow with checkpoint safety
- `pre-tool-use-security.ts` - Security hook with checkpoint triggers
- Factor 6 in 12-factor checklist - Launch/Pause/Resume principle
