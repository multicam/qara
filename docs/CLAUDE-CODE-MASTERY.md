# Claude Code Mastery: A Practical Cookbook

**Source Analysis**: "My Experience with Claude Code 2.0" by Sankalp
**Date**: 2026-01-14
**Status**: Active reference for Qara optimization

---

## Executive Summary

This document analyzes Sankalp's extensive guide to Claude Code 2.0, critiques its approaches against Qara's architecture, and extracts actionable patterns. The article demonstrates deep understanding of context engineering, sub-agent delegation, and production workflows that align strongly with Qara's 12-factor agent principles.

**Key Alignment**: The article's emphasis on context window management, systematic exploration phases, and strategic sub-agent usage directly validates Qara's existing architecture while revealing optimization opportunities.

---

## Article Analysis & Critique

### Strengths

**1. Context Engineering Focus**
- **Insight**: "Effective context window utility may only be 50-60% of stated capacity"
- **Validation**: Matches our UFC (Upfront Front Context) principles in Factor 3
- **Qara Status**: Implemented via progressive disclosure patterns

**2. Sub-Agent Strategy**
- **Insight**: Emphasizes sub-agents should read full files for cross-context attention
- **Quote**: "It's important that the model goes through each relevant file itself so ingested context can attend to each other"
- **Validation**: Aligns with our delegation-guide.md "Full Context" principle
- **Qara Status**: Fully adopted in parallel agent patterns

**3. Iterative Refinement Philosophy**
- **Insight**: Draft first version, compare against mental model, refine with sharper prompts
- **Validation**: Supports our checkpoint-driven iteration loops
- **Qara Status**: Codified in checkpoint-protocol.md

**4. Multi-Model Strategy**
- **Insight**: Use Claude for implementation, GPT for independent code review
- **Gap**: Qara currently uses single-model approach
- **Opportunity**: Add cross-model validation skill

### Weaknesses & Missing Pieces

**1. No Explicit 12-Factor Mapping**
- Article focuses on tactics without architectural framework
- Misses opportunity to connect patterns to principles
- **Qara Advantage**: We have explicit 12-factor compliance tracking

**2. Context Compaction Strategy Underspecified**
- Mentions "recurring system reminders" but no implementation details
- No discussion of PreCompact hooks
- **Qara Advantage**: We have PreCompact hook with memory compaction

**3. Limited Delegation Patterns**
- Focuses on sub-agents but doesn't detail parallel execution patterns
- No mention of spotcheck agent pattern
- **Qara Advantage**: Complete delegation-guide.md with spotcheck enforcement

**4. Hooks Integration Not Explored**
- Article written before CC 2.1.0 hook maturity
- Misses automation opportunities via lifecycle hooks
- **Qara Advantage**: Full hook coverage (8 events, 15 scripts)

**5. No State Management Discussion**
- Doesn't address session state persistence
- No mention of resumable tasks or background execution
- **Qara Advantage**: Factor 5 compliance with state/ directory

---

## Cookbook: Patterns Extracted & Enhanced

### Pattern 1: Systematic Exploration Phase

**Article Pattern**:
> "Ask clarifying questions, understand requirements, create ASCII diagrams"

**Qara Enhancement**:

```markdown
## Pre-Implementation Exploration Checklist

1. **Requirements Clarification**
   - Use AskUserQuestion for ambiguous requirements
   - Document assumptions in working/session-context.md
   - Create decision log for architecture choices

2. **Codebase Discovery**
   - Launch parallel explore agents (3-5 agents)
   - Focus areas: architecture, patterns, dependencies, tests, config
   - Spotcheck agent synthesizes findings

3. **Visual Architecture**
   - Generate mermaid diagrams (NOT ASCII - better rendering)
   - Document in docs/ with hyperlinks to code
   - Validate with codebase-pattern-finder agent

4. **Risk Analysis**
   - Identify breaking change risks
   - Plan checkpoint strategy
   - Define rollback triggers
```

**Qara Implementation**:
```bash
# Launch parallel exploration
task({ agent: "codebase-locator", task: "Find all authentication files" })
task({ agent: "codebase-pattern-finder", task: "Identify state management patterns" })
task({ agent: "codebase-analyzer", task: "Document test coverage" })

# Spotcheck synthesis
task({ agent: "agent", task: "SPOTCHECK: Synthesize exploration findings" })
```

---

### Pattern 2: Context Window Reclamation

**Article Pattern**:
> "Todo/plan files rewritten to keep objectives in recent attention span"

**Qara Enhancement**:

```markdown
## PreCompact Hook Strategy

The PreCompact hook (CC 2.1+) runs before context compaction. Use it to:

1. **Preserve Critical State**
   - Rewrite working/current-task.md with refreshed objectives
   - Update working/session-context.md with key decisions
   - Consolidate error patterns to working/known-issues.md

2. **Prune Redundant Content**
   - Remove duplicate tool outputs
   - Summarize repeated error messages
   - Compress verbose logs to key insights

3. **Inject Recurring Reminders**
   - System: "Remember: Factor 3 - Own Your Context Window"
   - Project: "Stack preference: TypeScript > Python"
   - Session: "Current focus: Authentication refactor"
```

**Qara Implementation** (already exists):
```typescript
// .claude/hooks/pre-compact-context.ts
export default async function preCompact(event: PreCompactEvent) {
  // Refresh working context
  await refreshSessionContext();

  // Compact error log
  await compactErrorLog();

  // Inject reminders
  return {
    injections: [
      { role: "system", content: await loadCriticalContext() }
    ]
  };
}
```

---

### Pattern 3: UltraThink for Complex Decisions

**Article Pattern**:
> "Use /ultrathink for complex decisions before execution"

**Qara Enhancement**:

```markdown
## When to Use UltraThink (Extended Thinking)

**Triggers**:
- Architecture decisions with >3 viable options
- Complex algorithm selection
- Trade-off analysis (performance vs maintainability)
- Debugging non-obvious issues

**Pattern**:
1. Frame problem clearly with constraints
2. Request /ultrathink explicitly
3. Wait for extended reasoning
4. Document decision rationale in thoughts/decisions/
5. Proceed with implementation

**Example**:
"Use /ultrathink to analyze state management options:
- Zustand vs Redux Toolkit vs Jotai
- Constraints: <500KB bundle, TypeScript support, DevTools
- Context: React 18, Next.js 14, team of 3 devs
- Success criteria: Easy onboarding, minimal boilerplate"
```

**Qara Integration**:
- Already used in story-explanation skill for narrative framing
- Could add to architect agent as default behavior
- Consider: Pre-refactor UltraThink checkpoint

---

### Pattern 4: Parallel Agent Launch with Full Context

**Article Pattern**:
> "It's important that the model goes through each relevant file itself so ingested context can attend to each other"

**Qara Enhancement**:

```markdown
## Full Context Parallel Pattern

**Anti-Pattern** (Lossy):
```typescript
// DON'T: Summarize context before delegating
const summary = "User.ts has 5 methods, Post.ts has 3 methods...";
task({ agent: "agent", task: `Based on this summary: ${summary}...` });
```

**Correct Pattern** (Full Context):
```typescript
// DO: Let agents read files directly
task({
  agent: "agent",
  task: "Read /path/to/User.ts and /path/to/Post.ts. Analyze authentication flow. Files share token validation logic - ensure consistency."
});
```

**Why**: LLM attention mechanisms work better when full context is present. Cross-file relationships (imports, shared types, patterns) become visible only when raw content attends to each other.

**Qara Validation**: delegation-guide.md explicitly requires "Every agent gets complete picture"
```

---

### Pattern 5: Multi-Model Validation

**Article Pattern**:
> "Use GPT-5.2 Codex for independent code review and bug detection"

**Qara Gap & Solution**:

**Current State**: Qara uses single-model approach (Sonnet 4.5 1M)

**Proposed Skill**: `multi-model-review`

```markdown
---
name: multi-model-review
context: fork
description: |
  Cross-model validation using complementary LLM strengths.
  Claude for implementation, GPT for independent review,
  Gemini for multi-perspective analysis.
---

## Use Cases

1. **Code Review**
   - Implement with Claude
   - Review with GPT for independent bug detection
   - Compare findings

2. **Architecture Decisions**
   - Get 3 perspectives: Claude, GPT, Gemini
   - Synthesis agent compares approaches
   - Jean-Marc makes final call

3. **Documentation Quality**
   - Claude drafts docs
   - GPT validates clarity
   - Gemini checks for gaps

## Implementation

Requires MCP servers for GPT/Gemini or research skill integration.
```

**Effort**: Medium (requires multi-model MCP setup)
**Priority**: Low (Sonnet 4.5 1M sufficient for current needs)

---

### Pattern 6: Micro-Management for Critical Sections

**Article Pattern**:
> "Closely monitor changes, micro-manage as needed"

**Qara Enhancement**:

```markdown
## When to Micro-Manage

**High-Risk Operations**:
- Database migrations
- Authentication/security changes
- Git history rewrites
- Destructive file operations

**Pattern**:
1. Request step-by-step execution with checkpoints
2. Review each step before proceeding
3. Use AskUserQuestion for approval gates
4. Log each decision to working/session-log.md

**Example**:
"Migrate database schema in 5 steps with checkpoints:
1. Backup current schema (CHECKPOINT)
2. Create new tables (CHECKPOINT - ask for approval)
3. Migrate data (CHECKPOINT - verify counts)
4. Update application code (CHECKPOINT)
5. Drop old tables (FINAL APPROVAL REQUIRED)"
```

**Qara Integration**:
- PreToolUse security hook already gates dangerous operations
- Could enhance with explicit approval requirements
- Add to high-risk operation checklist

---

### Pattern 7: Skills + Hooks Synergy

**Article Pattern**:
> "Hooks reminding models about available skills creates powerful customization"

**Qara Gap & Solution**:

**Current State**: Stop hook suggests skills but no proactive reminders

**Enhancement**: `SessionStart` hook skill suggestion

```typescript
// .claude/hooks/session-start.ts
export default async function sessionStart(event: SessionStartEvent) {
  const context = await analyzeSessionContext();

  const suggestions = [];

  // Pattern matching for skill suggestions
  if (context.mentions('web scraping', 'fetch content')) {
    suggestions.push("💡 Tip: Use /brightdata for difficult URLs");
  }

  if (context.mentions('research', 'analyze content')) {
    suggestions.push("💡 Tip: Use /research for multi-source research");
  }

  if (context.mentions('UI', 'frontend', 'component')) {
    suggestions.push("💡 Tip: Use /frontend-design for polished interfaces");
  }

  return {
    injections: suggestions.length > 0 ? [{
      role: "system",
      content: `Available skills for this session:\n${suggestions.join('\n')}`
    }] : []
  };
}
```

**Effort**: Low (hook already exists, needs pattern matching)
**Priority**: Medium (improves skill discoverability)

---

### Pattern 8: Regular Update Awareness

**Article Pattern**:
> "Stay updated: Regularly try new tools and releases"

**Qara Solution**:

```markdown
## CC Version Tracking System

**Current Implementation**: cc-pai-optimiser skill

**Enhancement**: Automated version check hook

### Proposed: Monthly Version Check

```bash
# Cron job (1st of each month)
# File: .claude/hooks/monthly-version-check.sh

#!/bin/bash
CURRENT_VERSION=$(claude --version | grep -oP '\d+\.\d+\.\d+')
LATEST_VERSION=$(curl -s https://api.github.com/repos/anthropics/claude-code/releases/latest | jq -r .tag_name)

if [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
  echo "⚠️  Claude Code update available: $CURRENT_VERSION → $LATEST_VERSION"
  echo "Run: /cc-pai-optimiser to audit new features"
fi
```

**Trigger**:
- Cron (monthly)
- SessionStart (if >30 days since last check)
- Manual: `claude code version check`
```

**Effort**: Low (script exists, needs automation)
**Priority**: Low (manual checks sufficient)

---

## Qara-Specific Optimizations

### Optimization 1: Context Attention Budget

**Insight from Article**: Effective context ~50-60% of stated capacity

**Qara Analysis**:
```
Sonnet 4.5 1M Context: 1,000,000 tokens
Effective Budget: 500,000-600,000 tokens
Current Allocation:
- System prompt: ~5,000 tokens
- CORE skill: ~2,000 tokens
- Average session: ~50,000 tokens
- Buffer: 443,000 tokens (88% remaining)

Status: ✅ Healthy headroom
```

**Monitoring**: Add to statusline-command.sh

```bash
# Show context usage percentage
CURRENT_TOKENS=$(context_usage)
BUDGET=600000
PERCENT=$((CURRENT_TOKENS * 100 / BUDGET))

if [ $PERCENT -gt 80 ]; then
  echo "⚠️  Context: ${PERCENT}% - Consider compaction"
elif [ $PERCENT -gt 60 ]; then
  echo "ℹ️  Context: ${PERCENT}%"
else
  echo "✅ Context: ${PERCENT}%"
fi
```

---

### Optimization 2: Exploration Sub-Agent Defaults

**Insight from Article**: Exploration is critical first phase

**Qara Enhancement**: Add exploration template to CORE skill

```markdown
## Quick Exploration Pattern

When starting unfamiliar codebase work:

```bash
# Auto-explore command
claude explore-codebase

# Expands to:
task({ agent: "codebase-locator", task: "Locate key files for [topic]" })
task({ agent: "codebase-pattern-finder", task: "Identify patterns in [topic]" })
task({ agent: "codebase-analyzer", task: "Analyze architecture of [topic]" })
task({ agent: "agent", task: "SPOTCHECK: Synthesize exploration findings" })
```

**Triggers**:
- "I need to understand..."
- "Before we start..."
- "Explore the codebase..."
```

**Implementation**: Add to `commands/explore-codebase.md`

---

### Optimization 3: Error Pattern Learning

**Insight from Article**: Iterative fixes teach you something

**Qara Gap**: No persistent error pattern database

**Proposed**: `state/error-patterns.jsonl`

```jsonl
{"error": "ENOENT", "pattern": "Missing file", "solution": "Check path exists first", "frequency": 12}
{"error": "TS2339", "pattern": "Property not found", "solution": "Add to interface", "frequency": 8}
{"error": "git merge conflict", "pattern": "Parallel agents touched same file", "solution": "Use file ownership boundaries", "frequency": 3}
```

**Hook Integration**: `PostToolUse` logs errors

```typescript
// .claude/hooks/post-tool-use-audit.ts
if (result.error) {
  await logErrorPattern({
    error: result.error.type,
    context: result.tool,
    timestamp: Date.now()
  });

  // Suggest known solutions
  const knownPattern = await lookupErrorPattern(result.error.type);
  if (knownPattern) {
    console.log(`💡 Known issue. Try: ${knownPattern.solution}`);
  }
}
```

**Effort**: Medium (requires error taxonomy)
**Priority**: High (reduces iteration cycles)

---

### Optimization 4: Checkpoint Trigger Hints

**Insight from Article**: Checkpoints critical for safety

**Qara Enhancement**: PreToolUse hook suggests checkpoints

```typescript
// .claude/hooks/pre-tool-use-security.ts
const HIGH_RISK_OPERATIONS = [
  'git reset --hard',
  'rm -rf',
  'DROP TABLE',
  'ALTER TABLE',
  'git push --force'
];

if (HIGH_RISK_OPERATIONS.some(op => command.includes(op))) {
  const recentCheckpoint = await getLastCheckpointAge();

  if (recentCheckpoint > 300) { // 5 minutes
    console.log('💡 Suggestion: Create checkpoint before this operation');
    console.log('   Say: "Create a checkpoint before proceeding"');
  }
}
```

**Effort**: Low (hook exists, add checkpoint awareness)
**Priority**: High (safety improvement)

---

### Optimization 5: Plan Mode Integration

**Article Gap**: No mention of /plan mode

**Qara Opportunity**: Formalize planning phase

```markdown
## When to Use Plan Mode

**Triggers**:
- Multi-file refactoring (>5 files)
- New feature with unclear scope
- Complex architecture decision
- "Let's plan this out first"

**Pattern**:
1. Enter plan mode: `/plan`
2. Explore & document (read-only)
3. Create detailed plan in thoughts/plans/
4. Review plan with Jean-Marc
5. Exit plan mode: `/code`
6. Execute plan with checkpoints

**Integration**:
- Plan mode outputs to thoughts/plans/[date]-[topic].md
- implement_plan command reads from plans/
- validate_plan command checks success criteria
```

**Status**: Commands exist (create_plan, implement_plan, validate_plan)
**Enhancement**: Add to CORE skill workflow routing

---

## Implementation Roadmap

### High Priority (Immediate)

1. **Error Pattern Learning** (Optimization 3)
   - Effort: Medium
   - Impact: High - Reduces iteration cycles
   - Action: Add error-patterns.jsonl + PostToolUse logging

2. **Checkpoint Hints** (Optimization 4)
   - Effort: Low
   - Impact: High - Safety improvement
   - Action: Enhance PreToolUse hook

3. **Context Budget Monitoring** (Optimization 1)
   - Effort: Low
   - Impact: Medium - Prevents context degradation
   - Action: Add to statusline-command.sh

### Medium Priority (This Month)

4. **Exploration Template** (Optimization 2)
   - Effort: Low
   - Impact: Medium - Faster onboarding
   - Action: Add explore-codebase command

5. **Skill Suggestion Hook** (Pattern 7)
   - Effort: Medium
   - Impact: Medium - Better skill discovery
   - Action: Enhance SessionStart hook

6. **Plan Mode Formalization** (Optimization 5)
   - Effort: Low
   - Impact: Medium - Better structure
   - Action: Update CORE skill workflow routing

### Low Priority (Future)

7. **Multi-Model Review** (Pattern 5)
   - Effort: High
   - Impact: Low - Diminishing returns
   - Requires: Multi-model MCP setup

8. **Automated Version Check** (Pattern 8)
   - Effort: Low
   - Impact: Low - Manual sufficient
   - Nice-to-have: Cron automation

---

## Critique Summary

### What the Article Got Right

1. **Context Engineering is Critical** - Validated by our Factor 3
2. **Sub-Agents Need Full Context** - Matches our delegation patterns
3. **Iteration Requires Safety** - Checkpoints are essential
4. **Multi-Phase Workflow** - Explore → Plan → Execute → Review
5. **Continuous Learning** - Build intuition through practice

### What the Article Missed

1. **12-Factor Framework** - No architectural principles
2. **Hook-Based Automation** - Written pre-CC 2.1 maturity
3. **State Management** - No session persistence discussion
4. **Spotcheck Pattern** - Parallel work needs verification
5. **Formal Planning** - No mention of /plan mode

### Qara's Competitive Advantages

1. **Explicit Architecture** - 12-factor compliance tracking
2. **Comprehensive Hooks** - 8 events, 15 scripts
3. **Delegation Framework** - Complete with spotcheck enforcement
4. **State Persistence** - Factor 5 compliance
5. **Progressive Disclosure** - UFC hierarchy

---

## Validation Against 12-Factor Agents

| Factor | Article Coverage | Qara Status | Gap Analysis |
|--------|-----------------|-------------|--------------|
| 1. Natural Language → Tools | Implicit | ✅ Full | No gap |
| 2. Own Your Prompts | Partial (mentions skills) | ✅ Full | No gap |
| 3. Own Context Window | **Strong** (50-60% insight) | ✅ Full | Add monitoring (Opt 1) |
| 4. Structured Outputs | Not covered | ✅ Full | No gap |
| 5. Unify State | Not covered | ✅ Full | Add error patterns (Opt 3) |
| 6. Launch/Pause/Resume | Partial (checkpoints) | ✅ Full | Add hints (Opt 4) |
| 7. Contact Humans | Partial (micro-manage) | ✅ Full | No gap |
| 8. Own Control Flow | Not covered | ✅ Full | Formalize plan mode (Opt 5) |
| 9. Compact Errors | Not covered | ✅ Full | No gap |
| 10. Small Focused Agents | **Strong** (sub-agents) | ✅ Full | Add exploration (Opt 2) |
| 11. Trigger Anywhere | Not covered | ✅ Full | No gap |
| 12. Stateless Reducer | Not covered | ✅ Full | No gap |

**Score**: Article covers 4/12 factors strongly, Qara implements 12/12 fully.

---

## Key Takeaways

### For Jean-Marc

1. **Validation**: Article confirms Qara's architecture is sound
2. **Quick Wins**: 3 low-effort, high-impact optimizations ready
3. **Learning**: Error pattern database will reduce frustration
4. **Safety**: Checkpoint hints will catch risky operations

### For Future Sessions

1. Always use exploration phase for unfamiliar code
2. Monitor context budget when approaching 60%
3. Trust the spotcheck pattern - it catches consistency issues
4. Use plan mode for complex refactors

### For Qara Evolution

1. Qara is ahead of community best practices (validated by article)
2. Hook-based automation is our competitive advantage
3. Focus on DX improvements: monitoring, hints, templates
4. Multi-model validation is low priority (Sonnet sufficient)

---

## References

- **Source Article**: https://sankalp.bearblog.dev/my-experience-with-claude-code-20-and-how-to-get-better-at-using-coding-agents/
- **12-Factor Agents**: https://github.com/humanlayer/12-factor-agents
- **Qara Documentation**: /home/jean-marc/.claude/skills/CORE/
- **CC Changelog**: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md

---

**Document Status**: Active reference
**Last Updated**: 2026-01-14
**Next Review**: After CC 2.2.0 release
