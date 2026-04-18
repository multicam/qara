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

### Length & Schema Caps (Anthropic open standard + PAI enforcement)

Enforced by `.claude/skills/system-create-skill/scripts/validate-skill.ts` (run as Step 1 of `workflows/validate-skill.md`):

| Rule | Cap | Source |
|------|-----|--------|
| `name` | ≤ 64 chars, kebab-case, no "anthropic"/"claude" | agentskills.io open standard + platform.claude.com |
| `description` | ≤ 1,024 chars | Anthropic Agent Skills spec (hard limit) |
| `description` + `when_to_use` (combined) | ≤ 1,536 chars | Claude Code listing cap |
| SKILL.md body | ≤ 500 lines | Anthropic best practice (authoring guide) |
| Reference file ToC threshold | Any file >100 lines gets a ToC | Anthropic best practice |

**Naming convention:** gerund form preferred (`processing-pdfs`, `analyzing-spreadsheets`) — noun phrases acceptable but gerunds favored. Avoid vague names (`helper`, `utils`).

Run the validator before committing skill changes: `bun run .claude/skills/system-create-skill/scripts/validate-skill.ts <skill-dir>`. Exit 0 = pass, 1 = violations, 2 = internal error. JSON output to stdout, human summary to stderr.

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

### Cross-Skill References (path resolution rule)

Inside a SKILL.md, same-skill paths (`workflows/X.md`, `references/X.md`) resolve relative to the skill's own directory. **Cross-skill references** — paths like `impeccable/reference/typography.md` — do **not** resolve the way they read: from `review/SKILL.md`, the scanner tries `review/impeccable/reference/typography.md`, not the sibling skill.

Two valid forms:

1. **Relative to source file:** `` `../impeccable/reference/typography.md` ``
2. **Absolute via PAI_DIR:** `` `${PAI_DIR}/skills/impeccable/reference/typography.md` ``

Bare `other-skill/...` refs are flagged by `validateCrossSkillRefs` (warning: `cross-skill-ref-unprefixed`) and surface as advisory broken refs in `context-graph orphans`. Upstream documentation tables (e.g. `grill-me/SKILL.md` as an external source) are short-form (2 segments) and pass the heuristic.

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
