# Delegation & Parallel Execution Patterns

**Purpose**: Master guide for delegating work to agent teams, parallel execution patterns, spotcheck protocols, and escalation workflows.

---

## 🎯 Trigger Phrases

Invoke delegation when Jean-Marc says:
- "use parallel interns"
- "have the interns"
- "delegate to interns"
- "parallelize this"
- "split this work across agents"
- "use multiple agents for this"

---

## 🚀 Core Principle

**WHENEVER A TASK CAN BE PARALLELIZED, USE MULTIPLE INTERN AGENTS!**

The intern agent is your high-agency genius generalist - perfect for parallel execution.

---

## ✅ When to Delegate

### Good Candidates for Parallelization
- ✅ **Updating multiple files simultaneously**
  - Example: Update 5 documentation files with new naming convention
  - Pattern: 1 intern per file + 1 spotcheck intern
  
- ✅ **Researching multiple topics at once**
  - Example: Research 3 different libraries for feature comparison
  - Pattern: 1 intern per topic + 1 synthesis intern
  
- ✅ **Testing multiple approaches in parallel**
  - Example: Try 3 different algorithms to solve problem
  - Pattern: 1 intern per approach + 1 comparison intern
  
- ✅ **Processing lists/batches**
  - Example: Analyze 10 code files for security issues
  - Pattern: 1 intern per file (or per batch of 2-3) + 1 spotcheck
  
- ✅ **Independent subtasks**
  - Example: Create components A, B, C for a feature
  - Pattern: 1 intern per component + 1 integration intern

### Poor Candidates for Parallelization
- ❌ **Sequential dependencies**
  - Example: "Build feature A, then use A to build B, then test B"
  - Why: Each step depends on previous completion
  
- ❌ **Single-file edits**
  - Example: "Update line 42 in config.ts"
  - Why: No parallelization benefit, overhead not worth it
  
- ❌ **Tasks requiring human judgment**
  - Example: "Decide which architecture to use"
  - Why: Need single coherent decision, not multiple opinions
  
- ❌ **Quick one-liners**
  - Example: "What's the syntax for async/await?"
  - Why: Answer faster than launching agents

---

## 👥 Agent Types

### Intern Agent (PRIMARY)

**Personality**: High-agency genius generalist
**Strengths**:
- Full context understanding
- Parallel execution master
- Self-sufficient problem solver
- Can complete entire features independently

**Use Cases**:
- File updates
- Feature implementation
- Research tasks
- Test writing
- Documentation creation
- Code refactoring
- Spotcheck reviews

**Limitations**:
- Can invoke engineers when stuck on technical problems
- Shouldn't make major architectural decisions alone

---

### Engineer Agent (SPECIALIZED)

**Personality**: Technical expert, methodical
**Strengths**:
- Complex technical problem solving
- Code review and optimization
- Security analysis
- Integration challenges

**Use Cases**:
- Technical decisions requiring deep expertise
- Performance optimization
- Security reviews
- Complex debugging
- Architectural implementation details

**Invocation**:
- Interns CAN invoke engineers when stuck
- Engineers work sequentially, not parallel
- Engineers provide recommendations, user decides

**Limitations**:
- Can escalate to principal engineer for architecture
- Not for simple tasks (use interns instead)

---

### Principal Engineer Agent (RARE)

**Personality**: Strategic architect, system thinker
**Strengths**:
- System-wide architectural decisions
- Long-term technical strategy
- Cross-system implications
- Technical debt prioritization

**Use Cases**:
- Major architectural decisions
- System refactoring strategy
- Technology stack choices
- Scalability planning

**Invocation**:
- Only for significant architectural decisions
- Provides strategic recommendations
- Final decision always with Jean-Marc

---

### Spotcheck Intern (MANDATORY PATTERN)

**Special Role**: Critical reviewer, quality-focused
**Purpose**: Validate parallel work for consistency

**When Required**:
- After ANY parallel intern work
- After ANY batch processing
- After ANY multi-file updates

**What Spotcheck Verifies**:
- All tasks completed successfully
- Consistency across parallel work
- No conflicting changes
- Quality standards met
- Requirements fulfilled

**Never Skip Spotcheck**: This is a MANDATORY pattern, not optional.

---

## 🚀 Launch Patterns

### Pattern 1: Standard Parallel Execution

**Scenario**: Update 5 files with same change

```typescript
// SINGLE message with MULTIPLE Task tool calls
await Promise.all([
  task({ 
    agent: "intern", 
    task: "Update navigation.ts: Add new route for settings page..." 
  }),
  task({ 
    agent: "intern", 
    task: "Update routes.ts: Register /settings route..." 
  }),
  task({ 
    agent: "intern", 
    task: "Update types.ts: Add SettingsPage interface..." 
  }),
  task({ 
    agent: "intern", 
    task: "Update tests.ts: Add test for settings route..." 
  }),
  task({ 
    agent: "intern", 
    task: "Update docs.md: Document settings feature..." 
  }),
]);

// Then MANDATORY spotcheck
task({ 
  agent: "intern", 
  task: "SPOTCHECK: Review all 5 updates for consistency, verify settings feature is complete..." 
});
```

**Key Points**:
- Single message, multiple parallel tasks
- Each intern gets full context
- Spotcheck at the end (mandatory)

---

### Pattern 2: Research & Synthesis

**Scenario**: Compare 3 libraries for feature

```typescript
// Research phase (parallel)
await Promise.all([
  task({ 
    agent: "intern", 
    task: "Research Library A: Features, pros/cons, examples..." 
  }),
  task({ 
    agent: "intern", 
    task: "Research Library B: Features, pros/cons, examples..." 
  }),
  task({ 
    agent: "intern", 
    task: "Research Library C: Features, pros/cons, examples..." 
  }),
]);

// Synthesis phase (single agent)
task({ 
  agent: "intern", 
  task: "SYNTHESIS: Compare findings from 3 library research tasks, create decision matrix..." 
});
```

---

### Pattern 3: Intern with Engineer Escalation

**Scenario**: Intern encounters complex technical problem

```typescript
// Intern attempts task
task({ 
  agent: "intern", 
  task: "Implement OAuth flow for API..." 
});

// Intern realizes they need technical expertise
task({ 
  agent: "engineer", 
  task: "ESCALATED from intern: OAuth security best practices for [context]..." 
});

// Engineer provides guidance, intern continues
task({ 
  agent: "intern", 
  task: "Continue OAuth implementation with engineer recommendations..." 
});
```

---

### Pattern 4: Batch Processing with Grouped Spotchecks

**Scenario**: Process 20 files (batch into groups of 5)

```typescript
// Batch 1 (files 1-5)
await Promise.all([...5 intern tasks...]);
task({ agent: "intern", task: "SPOTCHECK batch 1..." });

// Batch 2 (files 6-10)
await Promise.all([...5 intern tasks...]);
task({ agent: "intern", task: "SPOTCHECK batch 2..." });

// ... continue for remaining batches

// Final spotcheck
task({ 
  agent: "intern", 
  task: "FINAL SPOTCHECK: Verify all 20 files processed consistently..." 
});
```

---

## 📋 Context Requirements

### What Each Intern Needs

**FULL CONTEXT** for every intern:
1. **Task description** - What to do, in detail
2. **File paths** - Exact locations of files to modify
3. **Success criteria** - How to know when done
4. **Examples** - Show expected format/pattern
5. **Constraints** - What NOT to do
6. **Related context** - Background information

**Bad (Vague)**:
```
"Update the navigation files"
```

**Good (Detailed)**:
```
"Update /home/jean-marc/qara/src/components/navigation.tsx:
- Add new menu item for Settings page
- Use existing MenuItem component pattern (lines 42-55)
- Link to /settings route
- Icon: SettingsIcon from lucide-react
- Position: after Profile, before Logout
Success: Settings menu item appears between Profile and Logout with correct icon"
```

---

## ✅ Spotcheck Pattern (MANDATORY)

### Why Spotcheck is Critical
- Parallel interns work independently
- No inter-intern communication
- Need verification of consistency
- Catch conflicting changes early

### What Spotcheck Reviews

**Completeness**:
- [ ] All parallel tasks completed?
- [ ] All files updated as expected?
- [ ] Nothing missed?

**Consistency**:
- [ ] Naming consistent across files?
- [ ] Patterns followed uniformly?
- [ ] No conflicting implementations?

**Quality**:
- [ ] Code style consistent?
- [ ] Tests passing?
- [ ] Documentation updated?

**Requirements**:
- [ ] Original requirements met?
- [ ] Success criteria achieved?
- [ ] Edge cases handled?

### Spotcheck Task Template
```
task({ 
  agent: "intern", 
  task: "SPOTCHECK: Review work from previous [N] interns.
  
  Verify:
  1. All tasks completed successfully
  2. Consistency across [files/components/features]
  3. No conflicting changes
  4. [Specific requirement 1]
  5. [Specific requirement 2]
  
  Report any issues found and recommend fixes."
});
```

---

## 🚫 Delegation Anti-Patterns

### ❌ Don't: Launch 1 intern for trivial task
```typescript
// Bad
task({ agent: "intern", task: "Add semicolon to line 42" });

// Good: Just do it yourself
```

### ❌ Don't: Forget spotcheck after parallel work
```typescript
// Bad
await Promise.all([...10 tasks...]);
// Done! (NO - you forgot spotcheck)

// Good
await Promise.all([...10 tasks...]);
task({ agent: "intern", task: "SPOTCHECK..." });
```

### ❌ Don't: Give vague instructions
```typescript
// Bad
task({ agent: "intern", task: "Make it better" });

// Good
task({ 
  agent: "intern", 
  task: "Refactor authentication.ts: Extract token validation to separate function, add error handling for expired tokens, update tests..." 
});
```

### ❌ Don't: Skip context sharing
```typescript
// Bad
task({ agent: "intern", task: "Update the config" });

// Good
task({ 
  agent: "intern", 
  task: "Update config.ts at /home/jean-marc/qara/config.ts: Add DATABASE_URL environment variable to config object (line 23), follow existing pattern for API_KEY..." 
});
```

### ❌ Don't: Artificially limit parallel agents
```typescript
// Bad
"I'll only use 3 interns because I don't want to overwhelm the system"

// Good
"I need to update 10 files, so I'll launch 10 interns + 1 spotcheck"
```

**There is NO artificial limit on parallel interns.** Launch as many as the task requires.

---

## 📊 Scalability Guidelines

### Small Tasks (1-3 files)
- **Pattern**: 1 intern per file + spotcheck
- **Total**: 2-4 agents
- **Example**: Update 3 config files

### Medium Tasks (4-10 files)
- **Pattern**: 1 intern per file + spotcheck
- **Total**: 5-11 agents
- **Example**: Add new feature across multiple components

### Large Tasks (11-50 files)
- **Pattern**: Batch into groups of 5-10, spotcheck per batch + final spotcheck
- **Total**: N+2 to N+5 agents (depending on batching)
- **Example**: Global refactoring across codebase

### Very Large Tasks (50+ files)
- **Pattern**: Hierarchical delegation
  - Group into logical units
  - 1 intern per unit + unit spotcheck
  - 1 final synthesis + overall spotcheck
- **Total**: Varies by complexity
- **Example**: Migrate entire codebase to new framework

---

## 🔄 Escalation Workflows

### Intern → Engineer

**When to Escalate**:
- Technical problem beyond intern's expertise
- Security-sensitive implementation
- Performance optimization needed
- Complex integration challenges

**Escalation Template**:
```typescript
task({ 
  agent: "engineer", 
  task: "ESCALATED from intern: [Problem description]
  
  Context: [What intern tried]
  Challenge: [Specific technical issue]
  Question: [What expertise is needed]
  
  Background: [Full context of the feature/task]"
});
```

### Engineer → Principal

**When to Escalate**:
- Architectural decision needed
- Cross-system implications
- Long-term strategy question
- Major refactoring approach

**Escalation Template**:
```typescript
task({ 
  agent: "principal", 
  task: "ARCHITECTURAL DECISION NEEDED: [Decision description]
  
  Context: [Current state]
  Options considered: [Option A, B, C with pros/cons]
  Implications: [Long-term impact]
  Recommendation: [Engineer's recommendation]
  
  Question: [Specific architectural guidance needed]"
});
```

### Agent → Jean-Marc

**When to Escalate**:
- Conflicting requirements
- Major decision points
- Unexpected blockers
- Need human judgment

**Escalation Format**:
```
Jean-Marc, I need your input on: [Decision]

Options:
A) [Option A details, pros/cons]
B) [Option B details, pros/cons]

My recommendation: [A/B] because [reasoning]

Please decide: [A/B/other]
```

---

## 💡 Best Practices

### ✅ Do

**Launch Aggressively**:
- Use parallel interns liberally
- No artificial limits
- Better to have spotcheck catch duplicates than miss work

**Provide Full Context**:
- Every intern gets complete picture
- Include file paths, examples, success criteria
- Better too much context than too little

**Always Spotcheck**:
- After ANY parallel work
- No exceptions
- This catches 90% of consistency issues

**Escalate Appropriately**:
- Interns to engineers for technical expertise
- Engineers to principals for architecture
- Agents to Jean-Marc for decisions

**Document Outcomes**:
- Spotcheck reports issues found
- Engineers explain recommendations
- Clear handoffs between agents

---

## 🔗 Related Documentation
- See `agent-personalities.md` for agent voice characteristics
- See `agent-protocols.md` for communication protocols
- See `CONSTITUTION.md` for agent architecture
- See `SKILL.md` lines 272-290 for quick reference

---

## 📝 Quick Reference

```bash
# Pattern: N parallel tasks + 1 spotcheck
Interns: Launch as many as needed (no limit)
Context: FULL for each intern
Spotcheck: ALWAYS after parallel work

# Decision tree
Simple task → Do it yourself
Multi-file task → Parallel interns + spotcheck
Technical problem → Intern → Engineer
Architectural decision → Engineer → Principal
Need human judgment → Agent → Jean-Marc

# Remember
- No artificial limits on parallel agents
- Full context for every intern
- Never skip spotcheck
- Escalate when appropriate
```

---

**Core Mantra**: When in doubt, parallelize. Spotcheck everything. Escalate appropriately.
