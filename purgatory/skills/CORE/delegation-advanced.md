# Delegation: Advanced Patterns

**Extracted from:** delegation-guide.md

This document covers advanced delegation patterns including background tasks, agent resume, and interactive queries.

---

## Background Tasks

### When to Use Background Execution

Use `run_in_background: true` for:
- Long-running research while continuing other work
- Build/test processes that don't block coding
- Multiple independent investigations

### Pattern: Background Research

```typescript
// Launch research in background
const researchTask = task({
  subagent_type: "researcher",
  prompt: "Deep research on [topic]...",
  run_in_background: true  // Returns immediately with output_file
});

// Continue with other work...
// Read results when needed:
read(researchTask.output_file);
```

### Pattern: Parallel Background Tasks

```typescript
// Launch multiple background tasks
const tasks = [
  task({ ..., run_in_background: true }),
  task({ ..., run_in_background: true }),
  task({ ..., run_in_background: true })
];

// Do other work while they run...

// Check results later
for (const t of tasks) {
  const result = read(t.output_file);
  // Process result
}
```

### Output File Location

Background tasks write to output files. Use `Read` tool or `tail` to check progress:
```bash
tail -f [output_file_path]
```

---

## Agent Resume

### When to Resume

Resume agents when:
- Previous agent produced partial results
- Need to continue a long conversation with context
- Building on previous agent's discoveries

### Pattern: Resume for Follow-up

```typescript
// Initial agent run
const result = task({
  subagent_type: "researcher",
  prompt: "Research authentication libraries",
  description: "Auth research"
});
// result includes agent_id

// Later, resume for follow-up
task({
  subagent_type: "researcher",
  prompt: "Based on your findings, now compare JWT vs session tokens",
  resume: result.agent_id  // Continues with full previous context
});
```

### Pattern: Error Recovery Resume

```typescript
// Agent hit an error or timeout
const result = task({ ... });  // Partial completion

// Resume to continue
task({
  prompt: "Continue from where you left off. Complete the remaining items.",
  resume: result.agent_id
});
```

### Agent ID Storage

Store active agent IDs in `.claude/context/working/agent-state.json` for session recovery:
```json
{
  "active_agents": [
    {"id": "agent-123", "task": "description", "started": "timestamp"}
  ]
}
```

---

## Interactive Queries (AskUserQuestion)

### When to Ask

Use AskUserQuestion when:
- Multiple valid approaches exist
- User preference matters
- Destructive operation needs confirmation
- Requirements are ambiguous

### When NOT to Ask

Skip AskUserQuestion when:
- Reasonable default exists
- Choice has minimal impact
- User already specified preference
- You can make informed decision

### Pattern: Approach Selection

```typescript
AskUserQuestion({
  questions: [{
    question: "Which state management approach should we use?",
    header: "State Mgmt",
    options: [
      { label: "Zustand (Recommended)", description: "Simple, minimal boilerplate" },
      { label: "Redux Toolkit", description: "Full-featured, good DevTools" },
      { label: "Jotai", description: "Atomic, fine-grained updates" }
    ],
    multiSelect: false
  }]
})
```

### Pattern: Feature Selection

```typescript
AskUserQuestion({
  questions: [{
    question: "Which features should we include?",
    header: "Features",
    options: [
      { label: "Authentication", description: "User login/logout" },
      { label: "Authorization", description: "Role-based access" },
      { label: "Audit Logging", description: "Track all actions" },
      { label: "Rate Limiting", description: "Prevent abuse" }
    ],
    multiSelect: true  // Allow multiple selections
  }]
})
```

### Pattern: Confirmation Before Destructive Action

```typescript
AskUserQuestion({
  questions: [{
    question: "This will delete all test data. Proceed?",
    header: "Confirm",
    options: [
      { label: "Yes, delete", description: "Remove all test data permanently" },
      { label: "No, cancel", description: "Keep existing data" }
    ],
    multiSelect: false
  }]
})
```

---

## Swarm Coordination Patterns

For advanced multi-agent patterns (Map-Reduce, Voting, Specialist Router), see:
- **swarm-patterns.md** - Detailed swarm coordination patterns with diagrams

---

**Related Documentation:**
- delegation-guide.md - Overview and quick reference
- delegation-decomposition.md - Task Decomposition Patterns
- delegation-spotcheck.md - Spotcheck Pattern (MANDATORY)
- delegation-launch.md - Launch Patterns
