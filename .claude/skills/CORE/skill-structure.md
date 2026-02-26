# Skill Structure - Canonical Architecture Guide

The definitive reference for PAI skill architecture. All skills MUST comply.

## The 3 Archetypes

| Archetype | Workflows | Structure | Use When |
|-----------|-----------|-----------|----------|
| **Minimal** | 1-3 | Flat (`SKILL.md` + `workflows/`) | Single purpose, simple activation |
| **Standard** | 3-15 | Flat/Nested + optional `references/` | Multiple related workflows |
| **Complex** | 15+ | Nested categories + `documentation/`, `references/`, `tools/` | Multi-stage processes, philosophy docs |

Start Minimal, upgrade only when needed. Never over-engineer.

## The 4-Level Routing Hierarchy

1. **SKILL.md** - Entry point, workflow routing, activation triggers
2. **workflows/** - Step-by-step procedures (the "how")
3. **documentation/** - Concepts, principles (the "why")
4. **references/** - Templates, examples, lookup tables (the "what")

Progressive disclosure: SKILL.md routes to workflows, workflows reference docs, docs reference references.

## Mandatory Structural Requirements

### Every Skill MUST Have:

1. **YAML Frontmatter** with `name`, `description`, and `USE WHEN` triggers
2. **Workflow Routing (SYSTEM PROMPT)** section - IMMEDIATELY after frontmatter
3. **When to Activate This Skill** section with 8-category triggers
4. **Every workflow file routed** - No orphaned workflows
5. **Every file linked** from SKILL.md body - No invisible files

### SKILL.md Section Order:

```
1. YAML Frontmatter (name, context, description)
2. Workflow Routing (SYSTEM PROMPT)  ← MUST BE FIRST
3. When to Activate This Skill
4. Core Capabilities / Principles
5. Process / Methodology
6. Extended Context (file references)
7. Examples
```

## Routing Patterns

### Pattern 1: Semantic Routing (most common)
```markdown
**When user requests [specific intent]:**
Examples: "phrase 1", "phrase 2", "phrase 3"
-> **READ:** ${PAI_DIR}/skills/skill-name/workflows/workflow.md
-> **EXECUTE:** Brief description
```

### Pattern 2: Cross-Skill Delegation
```markdown
**When user requests [use case needing delegation]:**
-> **INVOKE SKILL:** specialized-skill-name
-> **REASON:** Why delegation is required
```

## The 8-Category Activation Pattern

Cover ALL of these for comprehensive triggers:

1. **Core Skill Name** - "OSINT", "research", "skill name"
2. **Action Verbs** - "do X", "run X", "perform X"
3. **Modifiers** - "basic X", "quick X", "comprehensive X"
4. **Prepositions** - "X on target", "X for target"
5. **Synonyms** - Industry jargon, casual vs formal
6. **Use Case** - Why would someone use this?
7. **Result-Oriented** - "find X", "discover X", "get X"
8. **Tool/Method Specific** - Specific techniques within the skill

## Naming Conventions

- **Skill directory:** `kebab-case` (e.g., `system-create-skill`)
- **Workflow files:** `kebab-case.md` (e.g., `create-skill.md`)
- **Main file:** Always `SKILL.md` (uppercase)
- **Philosophy:** `CONSTITUTION.md` (Complex archetype only)
- **Methodology:** `METHODOLOGY.md` (Complex archetype only)

## Quality Gates

Every skill must pass:

- [ ] Workflow Routing section present and FIRST
- [ ] All workflows explicitly routed with examples
- [ ] All files referenced in SKILL.md body
- [ ] Activation triggers cover 8 categories
- [ ] No duplication of CORE context
- [ ] Correct archetype for workflow count

## Detailed Templates

For complete directory structure templates per archetype:
**READ:** `${PAI_DIR}/skills/system-create-skill/references/archetype-templates.md`

For routing pattern examples and anti-patterns:
**READ:** `${PAI_DIR}/skills/system-create-skill/references/skill-patterns-reference.md`
