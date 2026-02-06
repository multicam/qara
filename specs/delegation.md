# Delegation

## How It Works

Delegation uses CC's built-in Task tool with `subagent_type` parameter. Five custom agent definitions in `.claude/agents/` extend the built-in types with specialized prompts, tool access, and skills. CORE SKILL.md includes an agent roster so the main agent knows what's available.

## Custom Agent Roster

| Agent | Model | Specialization |
|-------|-------|---------------|
| `codebase-analyzer` | sonnet | Trace data flow, find patterns, explain implementation |
| `thoughts-analyzer` | sonnet | Extract insights from thoughts/ documents |
| `thoughts-locator` | haiku | Discover documents in thoughts/ directory |
| `designer` | sonnet | Design review, UX/UI polish (loads frontend-design skill) |
| `architect` | sonnet | PRD creation, system design (loads research skill) |

## Good Candidates for Parallel Agents

- Updating multiple files simultaneously
- Researching multiple topics at once
- Testing multiple approaches in parallel
- Processing lists/batches
- Independent subtasks

## Poor Candidates

- Sequential dependencies
- Single-file edits
- Tasks requiring human judgment
- Quick one-liners

## Model Routing

CC's Task tool supports model selection via the `model` parameter:

| Task Type | Model |
|-----------|-------|
| Analysis, research, complex reasoning | sonnet |
| File location, simple search | haiku |
| Architecture, planning | opus |
| Text editing, lightweight | haiku |
