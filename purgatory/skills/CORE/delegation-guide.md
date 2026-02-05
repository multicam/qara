# Delegation & Task Decomposition Guide

**Purpose**: Practical guide for when to delegate work to agents, how to decompose tasks for parallel execution, and the mandatory spotcheck pattern.

**When to read**: Planning to use parallel agents, decomposing complex tasks, or setting up multi-agent workflows.

---

## Overview

Delegation enables massive parallelization of work through intelligent task decomposition and agent orchestration. The key principles: decompose work into independent subtasks, launch agents liberally, and ALWAYS spotcheck parallel work.

---

## Documentation Structure

This guide is split into focused sections for easier navigation:

### Core Concepts
**[When to Delegate](#when-to-delegate)** - Determining good vs poor parallelization candidates

### Decomposition Patterns
**[delegation-decomposition.md](./delegation-decomposition.md)** - Task Decomposition Patterns
- Pattern 1: File-Based Decomposition
- Pattern 2: Feature-Based Decomposition
- Pattern 3: Research-Based Decomposition
- Pattern 4: Batch-Based Decomposition
- Scalability Guidelines

### Mandatory Patterns
**[delegation-spotcheck.md](./delegation-spotcheck.md)** - Spotcheck Pattern (MANDATORY)
- Why spotcheck is critical
- When spotcheck is required
- What spotcheck reviews
- Spotcheck task template

### Execution Patterns
**[delegation-launch.md](./delegation-launch.md)** - Launch Patterns
- Standard Parallel Execution
- Research & Synthesis
- Batch Processing
- Best Practices
- Model Routing Guidelines

### Advanced Techniques
**[delegation-advanced.md](./delegation-advanced.md)** - Advanced Patterns
- Background Tasks
- Agent Resume
- Interactive Queries (AskUserQuestion)
- Swarm Coordination Patterns

---

## When to Delegate

### Good Candidates for Parallelization

✅ **Updating multiple files simultaneously**
- Example: Update 5 documentation files with new naming convention
- Pattern: 1 agent per file + 1 spotcheck agent

✅ **Researching multiple topics at once**
- Example: Research 3 different libraries for feature comparison
- Pattern: 1 agent per topic + 1 synthesis agent

✅ **Testing multiple approaches in parallel**
- Example: Try 3 different algorithms to solve problem
- Pattern: 1 agent per approach + 1 comparison agent

✅ **Processing lists/batches**
- Example: Analyze 10 code files for security issues
- Pattern: 1 agent per file (or per batch of 2-3) + 1 spotcheck

✅ **Independent subtasks**
- Example: Create components A, B, C for a feature
- Pattern: 1 agent per component + 1 integration agent

### Poor Candidates for Parallelization

❌ **Sequential dependencies**
- Example: "Build feature A, then use A to build B, then test B"
- Why: Each step depends on previous completion

❌ **Single-file edits**
- Example: "Update line 42 in config.ts"
- Why: No parallelization benefit, overhead not worth it

❌ **Tasks requiring human judgment**
- Example: "Decide which architecture to use"
- Why: Need single coherent decision, not multiple opinions

❌ **Quick one-liners**
- Example: "What's the syntax for async/await?"
- Why: Answer faster than launching agents

---

## Quick Reference

```bash
# DECISION TREE
Simple task → Do it yourself
Multi-file task → Parallel agents + spotcheck
Need expertise → Escalate to engineer (see agent-guide.md)

# PATTERN: N parallel tasks + 1 spotcheck
Agents: Launch as many as needed (no limit)
Context: FULL for each agent
Spotcheck: ALWAYS after parallel work

# DECOMPOSITION
Files: 1 agent per file
Features: 1 agent per component
Research: 1 agent per topic
Batches: Group into manageable chunks

# REMEMBER
- No artificial limits on parallel agents
- Full context for every agent
- Never skip spotcheck
- Escalate when appropriate (see agent-guide.md)
```

---

## Related Documentation

- **agent-guide.md** - Agent hierarchy, roles, and escalation patterns
- **swarm-patterns.md** - Advanced swarm coordination patterns
- **SKILL.md** - Quick delegation reference

---

**Core Mantra**: When in doubt, parallelize. Spotcheck everything. Escalate appropriately.
