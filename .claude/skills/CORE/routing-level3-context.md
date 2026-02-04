# Routing: Level 3 - Internal Context Routing

**Extracted from:** routing-patterns.md

This document covers Level 3 routing: routing to specific context, methods, or capabilities within a loaded skill.

---

## Level 3: Internal Context Routing

**Where:** Within SKILL.md content sections
**What:** Routing to specific context, methods, or capabilities within the skill
**How:** Section headers, keyword triggers, state-based logic

**Example (Keyword-based):**
```markdown
## Core Technique: UltraThink

**Purpose:** Enable deep, extended thinking...

## Usage Modes

### Mode 1: Standard UltraThink
**When to use:** Most creative tasks requiring depth and quality

### Mode 2: Maximum Creativity UltraThink
**When to use:** Need maximum creative diversity and unconventional thinking
```

**Example (State-based):**
```markdown
## Workflows by Development Phase

### Phase 1: Specification
- Use `sdd-specify.md` when creating feature specs
- Use `sdd-constitution.md` for constitutional principles

### Phase 2: Implementation
- Use `sdd-implement.md` for TDD execution
- Use `sdd-plan.md` for breaking down tasks
```

**Routing Decision:**
- Request: "I need maximum creativity for this story"
- Skill reads SKILL.md, identifies "maximum creativity" keyword
- Routes to "Mode 2: Maximum Creativity UltraThink" section
- Loads that specific context and methodology

**Best Practices:**
- Use clear section headers that map to request language
- Provide "When to use" guidance for each major section
- Include decision trees for complex routing logic
- Reference specific workflows by name with links

---

**Related Documentation:**
- routing-patterns.md - Overview and routing hierarchy
- routing-level1-system.md - Level 1: System Prompt Routing
- routing-level2-activation.md - Level 2: Skill Activation
- routing-level4-workflow.md - Level 4: Workflow Invocation
- routing-pattern-types.md - The 4 routing pattern types
