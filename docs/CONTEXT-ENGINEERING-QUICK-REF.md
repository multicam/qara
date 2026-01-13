# Context Engineering Quick Reference

**Source**: Sankalp's Claude Code 2.0 Guide + Qara Architecture
**For**: Immediate session use
**Date**: 2026-01-14

---

## The Golden Rules

1. **Effective Context = 50-60% of stated capacity**
   - Sonnet 4.5 1M: Effective budget ~500k-600k tokens
   - Start compaction at 60% usage
   - Plan new session at 80% usage

2. **Full Context > Summaries**
   - Let agents read files directly
   - Cross-file relationships require attention
   - Don't pre-digest, let the model see raw content

3. **Always Spotcheck Parallel Work**
   - No exceptions
   - Catches 90% of consistency issues
   - One spotcheck agent per batch

4. **Checkpoint Before Risk**
   - High-risk operations: git reset, rm -rf, migrations
   - Every 5 minutes during complex refactors
   - Before trying experimental approaches

---

## Session Workflow

### Phase 1: Exploration (Read-Only)

```
Purpose: Understand before acting
Duration: 5-15 minutes
Output: Architecture understanding, decision log

Pattern:
1. Ask clarifying questions (use AskUserQuestion)
2. Launch parallel explore agents (3-5 agents)
   - codebase-locator: Find relevant files
   - codebase-pattern-finder: Identify patterns
   - codebase-analyzer: Document architecture
3. Spotcheck: Synthesize findings
4. Create mermaid diagram (NOT ASCII)
5. Document assumptions in working/session-context.md
```

**Trigger Words**:
- "I need to understand..."
- "Before we start..."
- "Explore the codebase..."

---

### Phase 2: Planning (Think First)

```
Purpose: Design approach before execution
Duration: 10-30 minutes
Output: thoughts/plans/[date]-[topic].md

Pattern:
1. Enter plan mode: /plan
2. Use /ultrathink for complex decisions
3. Document approach in plans/
4. Identify checkpoints and rollback triggers
5. Define success criteria
6. Exit plan mode: /code
```

**Trigger Words**:
- "Let's plan this out"
- "Complex refactor"
- "Multiple approaches possible"

---

### Phase 3: Execution (Iterate Safely)

```
Purpose: Implement with safety nets
Duration: Varies
Output: Working code

Pattern:
1. Create checkpoint: "Checkpoint before [operation]"
2. Implement incrementally
3. Test after each major change
4. If failing after 3 iterations:
   - STOP
   - /rewind to iteration 0
   - Try fundamentally different approach
5. Max iterations: 5 (prevent infinite loops)
```

**Safety Triggers**:
- Same error 3+ times → /rewind
- Tests were passing, now fail → /rewind
- "Undo" attempts making worse → /rewind

---

### Phase 4: Review (Validate Quality)

```
Purpose: Ensure quality and consistency
Duration: 5-10 minutes
Output: Confidence in changes

Pattern:
1. Run full test suite
2. Check for regressions
3. Review git diff
4. Validate against success criteria
5. Update documentation if needed
```

---

## Parallel Agent Patterns

### Pattern 1: File-Based (Simple)

```typescript
// Update 5 files in parallel
task({ agent: "agent", task: "Update file1.ts..." });
task({ agent: "agent", task: "Update file2.ts..." });
task({ agent: "agent", task: "Update file3.ts..." });
task({ agent: "agent", task: "Update file4.ts..." });
task({ agent: "agent", task: "Update file5.ts..." });

// MANDATORY spotcheck
task({ agent: "agent", task: "SPOTCHECK: Verify consistency across 5 files" });
```

---

### Pattern 2: Research & Synthesis

```typescript
// Research phase (parallel)
task({ agent: "agent", task: "Research option A..." });
task({ agent: "agent", task: "Research option B..." });
task({ agent: "agent", task: "Research option C..." });

// Synthesis phase (single)
task({ agent: "agent", task: "SYNTHESIS: Compare findings, create decision matrix" });
```

---

### Pattern 3: Batch Processing (Large)

```typescript
// For 20 files: batch into groups of 5

// Batch 1
[...5 parallel agents...]
task({ agent: "agent", task: "SPOTCHECK batch 1" });

// Batch 2
[...5 parallel agents...]
task({ agent: "agent", task: "SPOTCHECK batch 2" });

// Continue...

// Final spotcheck
task({ agent: "agent", task: "FINAL SPOTCHECK: All batches consistent" });
```

---

## Context Management

### When to Compact

**Green Zone (0-60%)**:
- ✅ Continue normally
- Load context freely
- Use full exploration

**Yellow Zone (60-80%)**:
- ⚠️  Be selective with new context
- Use references/ for large docs
- Consider PreCompact soon

**Red Zone (80-100%)**:
- 🚨 Compact immediately or new session
- Only critical context
- Prepare for session handoff

---

### PreCompact Hook Actions

**Automatic** (already implemented):
1. Refresh working/current-task.md
2. Update working/session-context.md
3. Consolidate working/known-issues.md
4. Prune duplicate tool outputs
5. Inject recurring reminders

**Manual Trigger**:
```
"Compact context and preserve [specific details]"
```

---

### Context Preservation Priority

**Always Preserve**:
1. Current task objectives
2. Key architectural decisions
3. Known issues and workarounds
4. Success criteria
5. Session-specific constraints

**Can Summarize**:
1. Tool outputs (keep conclusions)
2. Exploration findings (keep insights)
3. Error messages (keep patterns)
4. Repeated information (keep once)

**Can Discard**:
1. Successful operations (no longer relevant)
2. Resolved errors
3. Superseded approaches
4. Temporary debugging output

---

## UltraThink Decision Framework

### When to Use /ultrathink

**Architecture Decisions**:
- Multiple viable options (>3)
- Long-term implications
- Trade-offs unclear

**Complex Algorithms**:
- Performance critical
- Multiple constraints
- Non-obvious solution

**Debugging**:
- Non-obvious root cause
- Multiple interacting factors
- Need systematic analysis

**NOT for**:
- Syntax questions (just do it)
- Simple choices (make reasonable default)
- Time-sensitive quick fixes

---

### UltraThink Template

```
Use /ultrathink to analyze [PROBLEM]:

Options:
- Option A: [description]
- Option B: [description]
- Option C: [description]

Constraints:
- [constraint 1]
- [constraint 2]
- [constraint 3]

Context:
- [relevant context]

Success Criteria:
- [what good looks like]
```

---

## Error Handling

### Error Loop Detection

**Signs You're in a Loop**:
1. Same error 3+ times
2. Different fixes, same result
3. "Almost working" for >30 minutes
4. Making changes blindly

**Action**:
```
STOP → /rewind → Different approach
```

---

### Error Pattern Recognition

**Common Patterns** (to be logged):

```jsonl
{"error": "ENOENT", "solution": "Check path exists", "frequency": 12}
{"error": "TS2339", "solution": "Add to interface", "frequency": 8}
{"error": "git merge conflict", "solution": "Use file boundaries", "frequency": 3}
```

**Coming Soon**: Automatic error pattern suggestions

---

## Checkpoint Strategy

### When to Checkpoint

**Always**:
- Before high-risk operations
- Before experimental changes
- After successful milestone
- Every 5-10 minutes during complex refactor

**High-Risk Operations**:
- `git reset --hard`
- `rm -rf`
- `DROP TABLE`
- `ALTER TABLE`
- `git push --force`
- Database migrations
- Multi-file refactors

---

### Checkpoint Commands

```bash
# Interactive (recommended)
/rewind

# Specific steps back
/rewind 1
/rewind 3

# Before operation
"Create checkpoint before [operation]"
```

---

### Checkpoint Limitations

**✅ Checkpoints RESTORE**:
- All file changes
- Conversation context
- Working directory state

**❌ Checkpoints DO NOT restore**:
- Database state
- External API calls
- Git remote state (already pushed)
- Running processes
- Environment variables

---

## Quick Wins

### Micro-Management Pattern

For high-risk operations:

```
"Do this in 5 steps with checkpoints:

1. [Step 1] (CHECKPOINT)
2. [Step 2] (CHECKPOINT - ask for approval)
3. [Step 3] (CHECKPOINT - verify result)
4. [Step 4] (CHECKPOINT)
5. [Step 5] (FINAL APPROVAL REQUIRED)
```

---

### Full Context Anti-Pattern

```typescript
// ❌ DON'T: Lossy summarization
const summary = "File has 5 methods...";
task({ agent: "agent", task: `Use this summary: ${summary}` });

// ✅ DO: Let agent read directly
task({
  agent: "agent",
  task: "Read /path/to/file.ts. Analyze authentication flow."
});
```

---

### Spotcheck Template

```typescript
task({
  agent: "agent",
  task: `SPOTCHECK: Review work from previous N agents.

Verify:
1. All tasks completed successfully
2. Consistency across [files/components/features]
3. No conflicting changes
4. [Specific requirement 1]
5. [Specific requirement 2]

Report any issues found and recommend fixes.`
});
```

---

## Emergency Procedures

### Context Explosion

**Symptoms**: Responses getting vague, missing obvious details
**Action**:
```
1. Check context usage: /context
2. If >80%: Compact or new session
3. Preserve state: Update working/ files
4. Handoff doc: Use create_handoff command
```

---

### Stuck in Error Loop

**Symptoms**: Same error 3+ times, frustration rising
**Action**:
```
1. STOP immediately
2. /rewind to last working state
3. Analyze: What's different about failing approach?
4. Try fundamentally different approach
5. If still failing after 2 approaches: Escalate to Jean-Marc
```

---

### Parallel Agent Conflicts

**Symptoms**: Agents modified same file, merge conflicts
**Action**:
```
1. /rewind to before agent launch
2. Re-decompose with explicit file ownership:
   - Agent A: files matching src/api/**
   - Agent B: files matching src/ui/**
3. Add non-overlapping constraints
4. Re-launch with boundaries
```

---

## Skill Quick Reference

### Research & Content

```bash
/research          # Multi-source parallel research
/fabric            # 242+ specialized prompts
/brightdata        # Scrape difficult URLs
```

---

### Development

```bash
/frontend-design   # Polished UI components
/system-create-cli # Generate TypeScript CLIs
```

---

### Architecture

```bash
/cc-pai-optimiser  # Audit Qara against CC features
```

---

### Session Management

```bash
/rewind           # Checkpoint navigation
/plan             # Enter planning mode
/code             # Exit planning mode
/context          # Show context usage
```

---

## Daily Checklist

### Session Start

- [ ] Clear objective defined?
- [ ] High-risk operations identified?
- [ ] Checkpoint strategy planned?
- [ ] Success criteria documented?

---

### During Session

- [ ] Context <60%?
- [ ] Checkpoints created for risky operations?
- [ ] Error patterns noted?
- [ ] Parallel work spotchecked?

---

### Session End

- [ ] Tests passing?
- [ ] Git status clean?
- [ ] Documentation updated?
- [ ] Key decisions logged?

---

## Remember

1. **Explore before acting** - 5 minutes of exploration saves 30 minutes of fixing
2. **Plan complex work** - /plan mode for multi-file refactors
3. **Checkpoint frequently** - Confidence to experiment comes from safety
4. **Full context always** - Let attention mechanisms do their job
5. **Spotcheck everything** - Parallel work needs verification

---

**Keep This Open**: Reference during sessions for quick pattern lookup

**Last Updated**: 2026-01-14
