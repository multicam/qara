# PAI Commands & Agents Update Plan v2
## Enhanced with HumanLayer Patterns & 12-Factor Agents Principles

**Created:** 2026-01-10
**Status:** Research Complete - Ready for Implementation
**Version:** 2.0 (Amended based on deep research)
**Research Sources:**
- Perplexity: HumanLayer architecture analysis (24+ parallel searches)
- Gemini: Multi-perspective agent architectures (LangChain, CrewAI, AutoGen, Academic)
- Claude: Claude Code agent patterns and best practices

---

## Executive Summary

This amended plan incorporates learnings from deep research into HumanLayer's architecture, the 12-Factor Agents methodology, and industry best practices. The original plan focused on Claude Code feature adoption; this version adds architectural patterns that will make PAI more robust, scalable, and aligned with production-grade agent systems.

**Key Additions from Research:**
1. **12-Factor Agents Compliance** - Structured methodology for reliable LLM applications
2. **Human-in-the-Loop Patterns** - Approval workflows for high-stakes operations
3. **Context Engineering** - Systematic approach to context management
4. **Stateless Reducer Pattern** - Agents as pure functions for testability
5. **Event-Driven State Management** - Resumable, long-running workflows
6. **Centralized Observability** - Production-grade monitoring

---

## Part 0: 12-Factor Agents Compliance Assessment

### Current PAI vs 12-Factor Agents

| Factor | Principle | PAI Current | Gap | Priority |
|--------|-----------|-------------|-----|----------|
| 1 | Natural Language to Tool Calls | ✅ Native Claude Code | None | - |
| 2 | Own Your Prompts | ✅ CLAUDE.md, skills, agents | None | - |
| 3 | Own Your Context Window | ⚠️ Partial | Need progressive disclosure | High |
| 4 | Tools Are Structured Outputs | ✅ MCP + hooks | None | - |
| 5 | Unify Execution State | ⚠️ Scattered | Consolidate to thoughts/ | Medium |
| 6 | Launch/Pause/Resume | ⚠️ Basic | Add /resume, checkpoints | High |
| 7 | Contact Humans with Tool Calls | ❌ Missing | Add approval workflows | **Critical** |
| 8 | Own Your Control Flow | ✅ Skills + commands | None | - |
| 9 | Compact Errors into Context | ⚠️ Implicit | Add error summarization | Low |
| 10 | Small, Focused Agents | ✅ Agent specialization | None | - |
| 11 | Trigger from Anywhere | ⚠️ CLI only | Consider API triggers | Future |
| 12 | Stateless Reducer | ⚠️ Partial | Improve state externalization | Medium |

**Compliance Score:** 7.5/12 (62.5%) → Target: 10/12 (83%)

---

## Part 1: Critical Additions (Factor 7 - Contact Humans)

### 1.1 Human Approval Workflows

**Gap Identified:** PAI has no structured way for agents to request human approval for high-stakes operations.

**HumanLayer Pattern:**
```
Agent → @require_approval() → hld daemon → Slack/Email → Human → Resume/Cancel
```

**PAI Implementation:**

**File:** `.claude/skills/CORE/approval-patterns.md` (NEW)

```markdown
# Human Approval Patterns for PAI

## When to Request Approval

### High-Stakes Operations (ALWAYS require approval):
- `git push --force` to any branch
- `rm -rf` on any directory
- Production deployments
- API key rotation
- Database migrations
- Public repository operations

### Advisory Operations (request input, proceed if no response):
- Architecture decisions
- Dependency major version upgrades
- Performance optimization strategies

## Implementation Pattern

Use AskUserQuestion tool for blocking approval:
```typescript
await AskUserQuestion({
  questions: [{
    question: "Approve this destructive operation?",
    header: "Approval",
    options: [
      { label: "Approve", description: "Execute the operation" },
      { label: "Deny", description: "Cancel and explain why" }
    ],
    multiSelect: false
  }]
});
```

## Hook Integration

Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "/path/to/approval-check.sh"
        }]
      }
    ]
  }
}
```
```

**Reasoning:** HumanLayer's core insight is that Gen 3 agents need agent-initiated human contact. Without this, PAI agents can make irreversible mistakes. The AskUserQuestion tool provides a native Claude Code mechanism for this.

---

### 1.2 Security-Sensitive Operation Detection

**File:** `hooks/pre-tool-use-security.sh` (NEW)

```bash
#!/bin/bash
# Pre-tool-use security hook for PAI

TOOL_NAME="$1"
TOOL_INPUT="$2"

# Patterns that require approval
DANGEROUS_PATTERNS=(
    "rm -rf"
    "git push.*--force"
    "DROP DATABASE"
    "DELETE FROM.*WHERE"
    "chmod 777"
    "curl.*|.*sh"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    if echo "$TOOL_INPUT" | grep -qE "$pattern"; then
        echo "SECURITY: Detected dangerous pattern '$pattern'"
        echo "REQUIRE_APPROVAL"
        exit 0
    fi
done

echo "APPROVED"
exit 0
```

**Reasoning:** HumanLayer uses decorator patterns (`@require_approval`) at the tool layer. Since Claude Code doesn't support decorators, we use hooks to achieve the same effect.

---

## Part 2: Context Engineering Improvements (Factor 3)

### 2.1 Progressive Context Disclosure

**Current Problem:** Skills and agents load all context upfront, wasting tokens.

**HumanLayer Pattern:**
- Context files under 500 lines each
- Progressive disclosure (load only what's needed)
- UFC (Universal File Convention) hierarchy

**PAI Implementation:**

**Update:** `.claude/skills/CORE/Readme.md`

Add just-in-time loading pattern:
```markdown
## Documentation Index

**Read these files when needed (just-in-time loading):**

| Topic | File | Triggers |
|-------|------|----------|
| Architecture & philosophy | `CONSTITUTION.md` | "Qara architecture", principles |
| CLI-First patterns | `cli-first-guide.md` | "build CLI tool", API integration |
| ...
```

**Reasoning:** The 12-Factor Agents emphasize that context window is precious. Every token matters. Loading documentation only when triggered by specific user requests dramatically reduces baseline context usage.

---

### 2.2 Context Compaction Hook

**File:** `.claude/hooks/pre-compact.sh` (NEW)

```bash
#!/bin/bash
# Pre-compact hook - preserve critical context

# Output critical context that should survive compaction
cat << 'EOF'
## Session Context (Preserved)
- Current task: [from TodoWrite state]
- Key decisions made: [summary]
- Files modified: [list]
EOF
```

**Reasoning:** Claude Agent SDK has automatic context compaction. This hook ensures critical session state survives compaction events.

---

## Part 3: State Management Improvements (Factors 5, 6, 12)

### 3.1 Unified State in thoughts/

**Current Problem:** State scattered across multiple locations (working/, wip/, scratchpad/).

**HumanLayer Pattern:**
- SQLite persistence for execution state
- Unified state + business state
- Stateless reducer design

**PAI Implementation:**

**Standard State Locations:**
```
thoughts/
├── plans/           # Implementation plans (active work)
├── shared/          # Shared knowledge across sessions
├── research/        # Research results
├── handoffs/        # Session transfer documents
├── memory/          # Long-term persistence
│   ├── recent-work.md      # Last session summary
│   ├── tool-usage.jsonl    # Audit trail
│   └── decisions.jsonl     # Key decisions log
└── coordination/    # Multi-agent coordination
    └── planning.md  # Shared planning document
```

**Reasoning:** HumanLayer uses SQLite for state persistence. PAI uses filesystem (simpler, more debuggable). Standardizing on thoughts/ hierarchy enables consistent state management.

---

### 3.2 Session Resume Enhancement

**Update:** `.claude/commands/create_handoff.md`

Add resume capability documentation:
```markdown
## Handoff Document Format

```yaml
session_name: "feature-xyz-implementation"
created: "2026-01-10T12:00:00Z"
agent_id: "abc123"  # For /resume
status: "in_progress"

## Current State
- Task: [description]
- Phase: [current phase]
- Blockers: [if any]

## Resume Instructions
1. Run: `/resume feature-xyz-implementation`
2. Or: `claude --resume abc123`
3. Context will be fully restored

## Files Modified
- path/to/file.ts (lines 10-50)
- ...

## Next Steps
1. [specific next action]
2. [following action]
```
```

**Reasoning:** HumanLayer's hld daemon enables launch/pause/resume through session state persistence. Claude Code has native resume via agent_id. Documenting this in handoffs makes session transfer seamless.

---

## Part 4: Model Routing Strategy (Enhanced)

### 4.1 Economic Analysis

From research:
| Model | Cost (input/output per MTok) | Best For |
|-------|------------------------------|----------|
| Haiku 4.5 | $1/$5 | High-throughput workers, exploration, verification |
| Sonnet 4.5 | $3/$15 | Balanced orchestration, standard tasks |
| Opus 4.5 | 66% cheaper than predecessor | Deep thinking, architecture, complex reasoning |

**Optimal Pattern:** Sonnet orchestrates Haiku workers = **2-2.5x cost reduction** with 85-95% quality retention

### 4.2 Updated Model Assignments

**Commands:**
| Command | Current | Recommended | Reasoning |
|---------|---------|-------------|-----------|
| /create_plan | opus | opus | Complex architecture requires deep thinking |
| /implement_plan | (none) | sonnet | Balanced implementation needs |
| /validate_plan | (none) | haiku | Verification is high-throughput |
| /research | sonnet | sonnet | Synthesis requires reasoning |
| /research_codebase | (none) | haiku | Exploration is high-volume |
| /create_handoff | (none) | haiku | Formatting is straightforward |

**Agents:**
| Agent | Current | Recommended | Reasoning |
|-------|---------|-------------|-----------|
| codebase-locator | sonnet | haiku | Search is high-throughput |
| codebase-analyzer | sonnet | sonnet | Analysis needs reasoning |
| thoughts-locator | sonnet | haiku | Search is high-throughput |
| thoughts-analyzer | sonnet | sonnet | Analysis needs reasoning |
| architect | sonnet | opus | Architecture requires deep thinking |
| engineer | sonnet | sonnet | Implementation is balanced |
| researcher | sonnet | sonnet | Synthesis needs reasoning |

**Reasoning:** HumanLayer research shows 2-2.5x cost reduction with strategic model routing. The key insight is that "planner" tasks need expensive models, but "worker" tasks can use cheaper models.

---

## Part 5: Multi-Agent Coordination Patterns

### 5.1 Hub-and-Spoke Pattern

**HumanLayer Pattern:**
```
Main Agent (Orchestrator)
    ↓
    → Sub-Agent 1 (Specialist)
    → Sub-Agent 2 (Specialist)
    → Sub-Agent 3 (Specialist)
    ↓
Main Agent synthesizes results
```

**PAI Implementation:**
- Main agent uses TodoWrite to track parallel work
- Sub-agents have isolated contexts (no pollution)
- Results return to main agent for synthesis
- No recursive sub-agents (single-level hierarchy)

**Key Files to Update:**
- All researcher agents: Add guidance on isolation
- All commands: Add parallel execution patterns

### 5.2 Document-Based Coordination

**HumanLayer Pattern:** Shared planning document for multi-agent coordination

**PAI Implementation:**
```
thoughts/coordination/
├── planning.md       # Shared plan and status
├── frontend.md       # Frontend agent context
├── backend.md        # Backend agent context
└── results.md        # Aggregated results
```

**Reasoning:** HumanLayer found that simple document-based coordination (like high-performing human teams) works better than complex orchestration frameworks for most use cases.

---

## Part 6: Observability Enhancement

### 6.1 Agent Lifecycle Tracking

**Add to `.claude/settings.json`:**
```json
{
  "hooks": {
    "SubagentStart": [{
      "type": "command",
      "command": "echo \"$(date) AGENT_START $AGENT_ID $AGENT_TYPE\" >> ~/.qara/logs/agents.log"
    }],
    "SubagentStop": [{
      "type": "command",
      "command": "echo \"$(date) AGENT_STOP $AGENT_ID\" >> ~/.qara/logs/agents.log"
    }]
  }
}
```

**Reasoning:** HumanLayer emphasizes observability as "table stakes" - 89% of production organizations have implemented it. Without tracking agent lifecycle, debugging multi-agent workflows is impossible.

### 6.2 Tool Usage Audit Trail

**File:** `hooks/post-tool-use-audit.sh` (NEW)

```bash
#!/bin/bash
# Audit trail for tool usage

TOOL_NAME="$1"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "{\"timestamp\":\"$TIMESTAMP\",\"tool\":\"$TOOL_NAME\",\"session\":\"$SESSION_ID\"}" >> \
    /home/jean-marc/qara/thoughts/memory/tool-usage.jsonl
```

**Reasoning:** 12-Factor Agents Factor 5 emphasizes unified state. Having a single audit trail for all tool usage enables debugging, compliance, and cost analysis.

---

## Part 7: Amended Implementation Priority

### Phase 1: Critical (Do First)
1. **[NEW]** Add approval workflow patterns (Factor 7)
2. **[NEW]** Create security hook for dangerous operations
3. **[UPDATED]** Add model routing to ALL commands and agents
4. **[ORIGINAL]** Update /research_codebase to use Explore agent
5. **[ORIGINAL]** Add `skills:` frontmatter to research agents

### Phase 2: High Priority
6. **[NEW]** Implement unified state in thoughts/ hierarchy
7. **[NEW]** Add session handoff with resume capability
8. **[NEW]** Add SubagentStart/SubagentStop hooks for observability
9. **[ORIGINAL]** Soft-deprecate codebase-locator in favor of Explore
10. **[ORIGINAL]** Add LSP tool usage to codebase-analyzer

### Phase 3: Enhancement
11. **[NEW]** Add pre-compact hook for context preservation
12. **[NEW]** Add tool usage audit trail
13. **[ORIGINAL]** Add image dimension metadata to design agents
14. **[ORIGINAL]** Add thoroughness parameters to Explore calls

### Phase 4: Future (After Core Complete)
15. **[NEW]** Consider HumanLayer integration for external approvals
16. **[NEW]** Add API triggers for remote agent invocation (Factor 11)
17. **[NEW]** Implement full stateless reducer pattern for all agents

---

## Part 8: Critique of Original Plan

### What the Original Plan Got Right

1. **Feature Adoption Focus** - Correctly identified key CC 2.0-2.1.2 improvements
2. **Explore Agent Adoption** - Excellent insight on native codebase exploration
3. **Model Routing** - Recognized cost optimization opportunity
4. **Background Execution** - Important for parallel workflows
5. **Skill Auto-Loading** - Reduces manual skill invocation

### What the Original Plan Missed

1. **Human-in-the-Loop (Critical)**
   - No mention of approval workflows
   - No security hooks for dangerous operations
   - PAI can currently make irreversible mistakes without human consent
   - **Fix:** Add Factor 7 compliance

2. **State Management**
   - Scattered state across directories
   - No unified audit trail
   - Session resume poorly documented
   - **Fix:** Consolidate to thoughts/ hierarchy

3. **Context Engineering**
   - All context loaded upfront
   - No progressive disclosure
   - Potential token waste
   - **Fix:** Just-in-time loading patterns

4. **Observability**
   - No agent lifecycle tracking
   - No tool usage audit
   - Debugging multi-agent workflows is blind
   - **Fix:** Add hooks for SubagentStart/SubagentStop

5. **Multi-Agent Patterns**
   - No coordination patterns defined
   - No document-based coordination
   - Sub-agent isolation not emphasized
   - **Fix:** Add hub-and-spoke pattern documentation

### Philosophical Gaps

1. **12-Factor Agents Methodology**
   - Original plan was feature-focused, not principle-focused
   - Missing systematic approach to agent architecture
   - **Fix:** Use 12-Factor as compliance checklist

2. **HumanLayer's Context Engineering**
   - "Everything is context engineering" - core insight missed
   - Quality inputs → quality outputs principle not applied
   - **Fix:** Apply context engineering throughout

3. **Stateless Reducer Pattern**
   - Agents not designed as pure functions
   - State not fully externalized
   - Testing and composition harder
   - **Fix:** Move toward stateless design

---

## Part 9: Reasoning Documentation

### Why Approval Workflows are Critical (Factor 7)

**Observation:** HumanLayer's entire product thesis is that Gen 3 agents need agent-initiated human contact. PAI currently has NO mechanism for this.

**Risk:** An agent could execute `rm -rf /`, `git push --force`, or expose API keys without human consent.

**Evidence:**
- METR study (2025) shows experienced developers 19% slower on complex AI tasks
- Primary cause: Agents make mistakes that humans need to catch
- Solution: Build approval checkpoints into the workflow

**Implementation:** Use AskUserQuestion for blocking approval + PreToolUse hook for detection.

---

### Why Model Routing Matters Economically

**Observation:** Research shows 2-2.5x cost reduction with strategic routing.

**Pattern:**
- Orchestration/planning = expensive models (Opus for architecture, Sonnet for coordination)
- Execution/verification = cheap models (Haiku for search, exploration, formatting)

**Evidence:**
- incident.io: 4-5 parallel Haiku agents for exploration
- Doctolib: 40% faster shipping with model routing
- Claude research: 90.2% performance improvement with multi-agent systems

**Implementation:** Systematically assign models based on task type, not agent type.

---

### Why Context Engineering is Foundational

**Observation:** HumanLayer coined "context engineering" (April 2025) as distinct from prompt engineering.

**Insight:**
- Prompt engineering = crafting individual prompts
- Context engineering = managing what information reaches the LLM across entire workflows

**Application:**
- Progressive disclosure reduces token waste
- Sub-agent isolation prevents context pollution
- Handoff documents preserve critical context across sessions

**Evidence:**
- CLAUDE.md files, sub-agent specialization, worktree isolation all stem from this principle
- "Quality inputs → quality outputs" is the fundamental insight

---

### Why Unified State Matters (Factors 5, 12)

**Observation:** PAI state is scattered across working/, wip/, scratchpad/, thoughts/.

**Problem:**
- Hard to debug agent workflows
- Session resume requires manual context gathering
- No audit trail for compliance

**HumanLayer Pattern:**
- Single SQLite database for all state
- Unified execution + business state
- Stateless reducer design (agents as pure functions)

**PAI Implementation:**
- Filesystem-based (simpler, more debuggable than SQLite)
- thoughts/ hierarchy as single source of truth
- JSONL audit trails for tool usage and decisions

---

## Part 10: Updated Summary Statistics

| Category | Original Items | Added Items | Total |
|----------|----------------|-------------|-------|
| Commands | 10 | 3 | 13 |
| Agents | 14 | 2 | 16 |
| Settings/Hooks | 4 | 6 | 10 |
| New Patterns | 0 | 5 | 5 |
| **Total** | **28** | **16** | **44** |

**Key Themes (Updated):**
1. **Human-in-the-Loop** - Approval workflows for high-stakes operations
2. **12-Factor Compliance** - Systematic agent architecture methodology
3. **Context Engineering** - Progressive disclosure, isolation, compaction
4. **Model Routing** - Cost optimization with strategic model selection
5. **Unified State** - thoughts/ hierarchy as single source of truth
6. **Observability** - Agent lifecycle tracking and audit trails

---

## Next Steps

1. Review and approve this amended plan
2. Execute Phase 1 (Critical) first with parallel agents
3. Create approval workflow skill as first deliverable
4. Update model routing across all commands and agents
5. Add observability hooks to settings.json
6. Test each change with explicit verification

---

## Research Artifacts

Full research reports available at:
- `scratchpad/2026-01-10-092439_research-humanlayer/comprehensive-research-report.md` (10,000+ words)
- `thoughts/research/claude-code-agent-architecture-2026.md` (Gemini perspective synthesis)

---

**Document Version:** 2.0
**Research Depth:** Extensive (3 parallel research agents, 40+ sources)
**Confidence Level:** High (85%) - Core patterns validated across multiple authoritative sources
