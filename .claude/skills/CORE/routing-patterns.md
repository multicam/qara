# Routing Patterns

**The 4-level routing hierarchy and routing patterns for Qara skills**

This document explains how user requests are routed from initial input to final workflow execution through four hierarchical levels. Understanding these patterns is critical for building skills that route effectively.

**See also:**
- [skill-structure.md](./skill-structure.md) - Mandatory structure requirements and canonical template
- [skill-archetypes.md](./skill-archetypes.md) - Directory structure patterns for Minimal, Standard, and Complex skills

---

## Overview

Qara's routing system operates through four hierarchical levels, each with increasing specificity:

1. **System Prompt** → Initial skill activation
2. **Skill Activation** → Confirming skill should handle request
3. **Internal Context** → Routing within skill to specific capabilities
4. **Workflow Invocation** → Executing specific procedures

---

## Documentation Structure

This guide is split into focused sections for easier navigation:

### The 4-Level Routing Hierarchy

**[routing-level1-system.md](./routing-level1-system.md)** - Level 1: System Prompt Routing
- Natural language pattern matching in skill descriptions
- The 8-category routing pattern
- Anti-patterns to avoid
- Testing your Level 1 routing

**[routing-level2-activation.md](./routing-level2-activation.md)** - Level 2: Skill Activation
- Detailed activation conditions in SKILL.md
- Comprehensive template structure
- Quality checklist for activation triggers
- Real-world examples

**[routing-level3-context.md](./routing-level3-context.md)** - Level 3: Internal Context Routing
- Routing to specific context within skill
- Keyword-based and state-based routing
- Section headers and decision trees

**[routing-level4-workflow.md](./routing-level4-workflow.md)** - Level 4: Workflow Invocation
- Specific procedures and executable workflows
- Workflow organization by category
- Best practices for workflow references

### Routing Pattern Types

**[routing-pattern-types.md](./routing-pattern-types.md)** - The 4 Routing Pattern Types
- Pattern 1: Semantic Routing
- Pattern 2: State-Based Routing
- Pattern 3: Agent-Delegated Routing
- Pattern 4: Cross-Skill Delegation (CRITICAL)

---

## The 4-Level Routing Hierarchy (Summary)

### Level 1: System Prompt Routing

**Where:** Claude Code's system prompt
**What:** Skill descriptions that trigger activation
**How:** Natural language pattern matching

User says "do research on AI trends" → Matches "do research" trigger → Activates `research` skill

### Level 2: Skill Activation

**Where:** SKILL.md "When to Activate This Skill" section
**What:** Detailed conditions for loading full skill context
**How:** Conditional logic based on request characteristics

Request matches Level 1 trigger → Skill loads SKILL.md → Checks activation conditions → Full skill context becomes available

### Level 3: Internal Context Routing

**Where:** Within SKILL.md content sections
**What:** Routing to specific context, methods, or capabilities within the skill
**How:** Section headers, keyword triggers, state-based logic

Request identifies specific capability → Routes to relevant section → Loads that specific context

### Level 4: Workflow Invocation

**Where:** SKILL.md references to workflow files
**What:** Specific procedures, tools, or executable workflows
**How:** Direct file reads, script execution, or step-by-step instructions

Level 3 identifies workflow → Reads workflow file → Executes steps

---

## Routing Pattern Selection

```
What determines workflow choice?
├─ Need specialized skill → CROSS-SKILL DELEGATION (PATTERN 4)
│  └─ Delegate to specialized skill via Skill tool
│
├─ Specific keywords → SEMANTIC ROUTING (PATTERN 1)
│  └─ List modes/techniques with "when to use"
│
├─ Task state/phase → STATE-BASED ROUTING (PATTERN 2)
│  └─ Define phases and state transitions
│
└─ Complex context → AGENT-DELEGATED ROUTING (PATTERN 3)
   └─ List capabilities, trust agent to choose
```

---

## Key Principles

1. **Progressive Specificity** - Each level narrows down to more specific behavior
2. **Semantic Understanding** - Use natural language patterns, not rigid keywords
3. **Explicit Routing** - Make routing decisions deterministic and clear
4. **Delegation When Needed** - Route to specialized skills when they provide better outcomes

---

**Related Documentation:**
- skill-structure.md - Mandatory structure requirements and canonical template
- skill-archetypes.md - Directory structure patterns for skills
