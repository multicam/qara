# Delegation: Launch Patterns

**Extracted from:** delegation-guide.md

This document covers practical launch patterns for parallel agent execution, including standard parallel execution, research & synthesis, and batch processing.

---

## Launch Patterns

### Pattern 1: Standard Parallel Execution

**Use case**: Update multiple files with similar changes

```typescript
// SINGLE message with MULTIPLE Task tool calls
await Promise.all([
  task({
    agent: "agent",
    task: "Update navigation.tsx: Add Settings route..."
  }),
  task({
    agent: "agent",
    task: "Update routes.ts: Register /settings..."
  }),
  task({
    agent: "agent",
    task: "Update types.ts: Add SettingsPage interface..."
  }),
  task({
    agent: "agent",
    task: "Update tests.ts: Add settings route test..."
  }),
  task({
    agent: "agent",
    task: "Update docs.md: Document settings feature..."
  }),
]);

// Then MANDATORY spotcheck
task({
  agent: "agent",
  task: "SPOTCHECK: Review all 5 updates for consistency..."
});
```

### Pattern 2: Research & Synthesis

**Use case**: Compare multiple options before deciding

```typescript
// Research phase (parallel)
await Promise.all([
  task({
    agent: "agent",
    task: "Research Library A: Features, pros/cons, examples..."
  }),
  task({
    agent: "agent",
    task: "Research Library B: Features, pros/cons, examples..."
  }),
  task({
    agent: "agent",
    task: "Research Library C: Features, pros/cons, examples..."
  }),
]);

// Synthesis phase (single agent)
task({
  agent: "agent",
  task: "SYNTHESIS: Compare findings, create decision matrix..."
});
```

### Pattern 3: Batch Processing

**Use case**: Process large number of items

```typescript
// Batch 1 (files 1-5)
await Promise.all([...5 agent tasks...]);
task({ agent: "agent", task: "SPOTCHECK batch 1..." });

// Batch 2 (files 6-10)
await Promise.all([...5 agent tasks...]);
task({ agent: "agent", task: "SPOTCHECK batch 2..." });

// Continue for remaining batches...

// Final spotcheck
task({
  agent: "agent",
  task: "FINAL SPOTCHECK: Verify all batches consistent..."
});
```

---

## Best Practices

### ✅ Do

**Launch Aggressively**:
- Use parallel agents liberally
- No artificial limits on agent count
- Better to have spotcheck catch duplicates than miss work

**Provide Full Context**:
- Every agent gets complete picture
- Include file paths, examples, success criteria
- Better too much context than too little

**Always Spotcheck**:
- After ANY parallel work
- No exceptions
- This catches 90% of consistency issues

**Escalate Appropriately**:
- Agents can invoke engineers for technical expertise
- See `agent-guide.md` for escalation patterns

**Document Outcomes**:
- Spotcheck reports issues found
- Clear handoffs between agents
- Track what was accomplished

### ❌ Don't

**Don't: Launch 1 agent for trivial task**
```typescript
// Bad
task({ agent: "agent", task: "Add semicolon to line 42" });

// Good: Just do it yourself
```

**Don't: Forget spotcheck after parallel work**
```typescript
// Bad
await Promise.all([...10 tasks...]);
// Done! (NO - you forgot spotcheck)

// Good
await Promise.all([...10 tasks...]);
task({ agent: "agent", task: "SPOTCHECK..." });
```

**Don't: Give vague instructions**
```typescript
// Bad
task({ agent: "agent", task: "Make it better" });

// Good
task({
  agent: "agent",
  task: "Refactor authentication.ts: Extract token validation to separate function, add error handling for expired tokens, update tests..."
});
```

**Don't: Skip context sharing**
```typescript
// Bad
task({ agent: "agent", task: "Update the config" });

// Good
task({
  agent: "agent",
  task: "Update config.ts at /path/to/config.ts: Add DATABASE_URL environment variable to config object (line 23), follow existing pattern for API_KEY..."
});
```

**Don't: Artificially limit parallel agents**
```typescript
// Bad
"I'll only use 3 agents because I don't want to overwhelm the system"

// Good
"I need to update 10 files, so I'll launch 10 agents + 1 spotcheck"
```

**There is NO artificial limit on parallel agents.** Launch as many as the task requires.

---

## Model Routing Guidelines

Select the right model for each task to optimize cost and performance.

### Model Selection Table

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| File lookup, simple search | **haiku** | Fast, cheap, sufficient for simple tasks |
| Status checks, validation | **haiku** | Quick confirmation doesn't need heavy models |
| Code implementation | **sonnet** | Balanced capability and speed |
| Documentation writing | **sonnet** | Good quality without overthinking |
| Testing & debugging | **sonnet** | Reliable for systematic work |
| Architecture design | **opus** | Deep reasoning for complex decisions |
| PRD creation | **opus** | Comprehensive planning needs depth |
| Research synthesis | **opus** | Cross-domain connections require depth |

### Agent Type to Model Mapping

| Agent Type | Recommended Model | Notes |
|------------|-------------------|-------|
| codebase-locator | haiku | Quick lookups |
| thoughts-locator | haiku | Simple searches |
| Explore | haiku | Fast exploration |
| codebase-analyzer | sonnet | Moderate analysis |
| engineer | sonnet | Implementation work |
| designer | sonnet | Design decisions |
| architect | sonnet (or opus for complex PRDs) | Planning depth varies |
| spotcheck | sonnet | Verification needs thoroughness |

### When to Upgrade/Downgrade

**Upgrade to opus when:**
- Task involves architectural decisions
- Multiple valid approaches need evaluation
- Deep cross-domain analysis required
- Time pressure is low

**Downgrade to haiku when:**
- Simple file/pattern lookup
- Quick status check
- Validation only (yes/no answer)
- Time pressure is high

### Implementation

The model router is available at:
```typescript
import { selectModelForAgent, selectModelForTaskType } from './hooks/lib/model-router';
```

---

**Related Documentation:**
- delegation-guide.md - Overview and quick reference
- delegation-decomposition.md - Task Decomposition Patterns
- delegation-spotcheck.md - Spotcheck Pattern (MANDATORY)
- delegation-advanced.md - Background Tasks, Agent Resume, Interactive Queries
