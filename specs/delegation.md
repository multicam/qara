# Delegation

## Core Rule

**WHENEVER A TASK CAN BE PARALLELIZED, USE MULTIPLE AGENTS.**

- Use SINGLE message with MULTIPLE Task tool calls
- Each agent gets FULL CONTEXT
- ALWAYS launch spotcheck agent after parallel work

## Good Candidates

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

## Decomposition Patterns

### File-Based
Task: Update 5 files with same change
-> 1 agent per file + 1 spotcheck agent = 6 parallel tasks

### Feature-Based
Task: Build feature with components A, B, C
-> 1 agent per component + 1 integration agent
-> Parallel creation -> integration -> spotcheck

### Research-Based
Task: Research topic from multiple angles
-> 1 agent per angle (3-24 agents) + 1 synthesis agent
-> Parallel research -> synthesis -> report

### Batch-Based
Task: Process 10 code files
-> 1 agent per file (or per batch of 2-3) + 1 spotcheck
-> Parallel processing -> spotcheck -> summary

## Mandatory Spotcheck Pattern

After every parallel delegation:
1. Launch dedicated spotcheck agent
2. Agent reviews: consistency, correctness, completeness, conflicts
3. Reports issues found
4. NEVER skip spotcheck

## Model Routing

| Task Type | Model | Agent Examples |
|-----------|-------|---------------|
| Analysis, research, complex reasoning | sonnet | codebase-analyzer, researcher |
| File location, simple search | haiku | codebase-locator, thoughts-locator |
| Architecture, planning | opus | architect (via /create_plan) |
| Text editing, lightweight | haiku | humaniser |
