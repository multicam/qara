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

## Workflow Integration

### Add to Risky Operations

Include checkpoint reminder before destructive operations:

```markdown
## Before Starting
Note: Claude Code creates automatic checkpoints. If needed: `/rewind`

## Steps
1. [Risky operation here]
2. Verify success
3. If failed: `/rewind` and try alternative approach
```

### Iteration Loop Safety

```markdown
## Iteration Protocol
- Max iterations: 5
- After iteration 3 without convergence: `/rewind` to iteration 1
- Try fundamentally different approach
```

### Multi-Agent Recovery

When parallel agents cause conflicts:
1. `/rewind` to before agent launch
2. Re-decompose task with clearer boundaries
3. Add explicit file ownership per agent

## Factor 6 Compliance

This protocol supports 12-Factor Agent compliance:
- **Factor 6: Launch/Pause/Resume** - Checkpoints enable session recovery
- Improves resilience of long-running agent tasks
- Reduces risk of irreversible mistakes

## Related

- `delegation-guide.md` - Multi-agent coordination
- `agent-guide.md` - Agent hierarchy and escalation
