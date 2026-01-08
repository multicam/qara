# Checkpoint Protocol

Claude Code automatically creates checkpoints during your session.

## When to Use /rewind

- After a failed operation that made unwanted changes
- When an iteration loop diverges instead of converging
- After accidentally deleting/overwriting files
- When you want to try a different approach

## Commands

| Command | Effect |
|---------|--------|
| `/rewind` | Go back to last checkpoint |
| `/rewind 3` | Go back 3 checkpoints |
| `/checkpoints` | List available checkpoints |

## Best Practices

1. **Before major operations**: Note that CC creates automatic checkpoints
2. **After errors**: Consider `/rewind` before manual fixes
3. **During iteration**: If not converging after 3 tries, `/rewind` and try different approach

## Integration

Add to long-running workflows:

```markdown
## Safety Net
If something goes wrong: `/rewind` to last checkpoint
```

## Factor 6 Compliance

This protocol supports 12-Factor Agent compliance:
- **Factor 6: Launch/Pause/Resume** - Checkpoints enable session recovery
- Improves resilience of long-running agent tasks
- Reduces risk of irreversible mistakes
