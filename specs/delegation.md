# Delegation

## How It Works

Delegation uses CC's built-in Task tool with `subagent_type` parameter. No custom agent definitions or delegation guides are maintained -- CC handles parallel execution, model routing, and agent types natively.

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
