# Working Directory

**Purpose**: Unified execution state for transient session data (Factor 5: Unified Execution State).

## What Goes Here

| File | Purpose | Lifecycle |
|------|---------|-----------|
| `current-task.md` | Active task context | Cleared on task completion |
| `agent-state.json` | Running agent IDs for resume | Updated per agent launch |
| `scratch.md` | Temporary notes during complex operations | Cleared per session |
| `iterations.log` | Iteration tracking for convergence detection | Cleared per task |

## Usage Patterns

### Task State
```markdown
# current-task.md
Task: Implement user authentication
Started: 2024-01-15T10:30:00Z
Agents: [agent-123, agent-456]
Status: in_progress
```

### Agent Resume State
```json
// agent-state.json
{
  "active_agents": [
    {"id": "agent-123", "task": "research auth libraries", "started": "2024-01-15T10:30:00Z"},
    {"id": "agent-456", "task": "implement JWT handling", "started": "2024-01-15T10:31:00Z"}
  ],
  "completed_agents": ["agent-001", "agent-002"]
}
```

### Iteration Tracking
```
# iterations.log
[2024-01-15T10:30:00] Iteration 1: Initial implementation
[2024-01-15T10:35:00] Iteration 2: Fixed type error in auth.ts
[2024-01-15T10:40:00] Iteration 3: Added error handling
# Converging - each iteration smaller scope
```

## Rules

1. **Transient only** - Nothing here persists across sessions
2. **No secrets** - Use environment variables for sensitive data
3. **Auto-cleanup** - Clear on session end or task completion
4. **JSON for state** - Machine-readable for agent consumption
5. **Markdown for context** - Human-readable for debugging

## Factor 5 Compliance

This directory supports 12-Factor Agent compliance:
- **Factor 5: Unified Execution State** - Single source of truth for session state
- Enables agent resume via stored agent IDs
- Supports iteration tracking for convergence detection
- Provides scratch space for complex multi-step operations
