# Skill Archetype Templates

Directory structure and SKILL.md templates for each archetype.

---

## Constraints (all archetypes)

### Length Limits
- SKILL.md body (post-frontmatter): **≤ 500 lines** (Anthropic best practice for cross-surface portability)
- `description`: **≤ 1,024 chars** (hard spec limit; exceeding this breaks CC listing and cross-tool portability)
- `description` + `when_to_use` combined: **≤ 1,536 chars** (CC listing cap)

Use `when_to_use:` as an extension field when description alone isn't enough for trigger coverage, but keep the combined total under 1,536 chars.

### Naming
Prefer **gerund form**: `processing-pdfs`, `analyzing-spreadsheets`, `generating-reports`. Nouns are also accepted (`research`, `introspect`), but gerunds signal action intent more clearly to the routing layer. Rules: lowercase kebab-case only, ≤ 64 chars, no reserved words (`anthropic`, `claude`).

### Validation
Run `bun run scripts/validate-skill.ts <skill-dir>` to check all constraints automatically before deploying or updating a skill.

---

## Minimal Skill (1-3 workflows)

```
skill-name/
├── SKILL.md
└── workflows/ OR assets/
    └── *.md
```

### SKILL.md Template
```markdown
---
name: skill-name
description: |
  What this skill does and when to use it.

  USE WHEN: user says "trigger phrase", "another trigger", or any related request.
---

# Skill Name

Brief description of what this skill does.

## Workflow Routing (SYSTEM PROMPT)

**When user requests [action]:**
Examples: "actual user phrases", "variations", "synonyms"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/workflow1.md
→ **EXECUTE:** What to do with this workflow

---

## When to Activate This Skill

### Direct Requests
- "trigger phrase 1"
- "trigger phrase 2"
- "trigger phrase 3"

### Context Clues
- User mentions X
- User working on Y

### Examples
- ✅ "example request 1"
- ✅ "example request 2"
- ❌ "should NOT activate for this"

---

## Core Capability

[Description of what the skill does]

---

## Process

1. Step 1
2. Step 2
3. Step 3

---

## Examples

[Concrete usage examples]
```

---

## Standard Skill (3-15 workflows)

```
skill-name/
├── SKILL.md
├── workflows/
│   └── *.md (flat or nested)
└── [optional: documentation/, tools/, references/]
```

### SKILL.md Template
```markdown
---
name: skill-name
description: |
  What this skill does and when to use it.

  USE WHEN: user says "trigger phrase", "another trigger", or any related request.
---

# Skill Name

Brief description of what this skill does.

## Workflow Routing (SYSTEM PROMPT)

### Primary Workflows

**When user requests [action 1]:**
Examples: "user phrases", "variations"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/workflow1.md
→ **EXECUTE:** What to do

**When user requests [action 2]:**
Examples: "user phrases", "variations"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/workflow2.md
→ **EXECUTE:** What to do

[Route ALL workflows]

---

## When to Activate This Skill

### Direct Requests
- List trigger phrases

### Context Clues
- User mentions X
- User working on Y

### Feature-Specific Triggers
- For workflow 1: triggers
- For workflow 2: triggers

### Examples
- ✅ "example 1"
- ✅ "example 2"
- ❌ "should NOT activate"

---

## Core Capabilities

[List main capabilities]

---

## Extended Context

### Workflow Documentation
- `workflows/workflow1.md` - Description
- `workflows/workflow2.md` - Description

### Reference Documentation
- `references/reference1.md` - Description (if applicable)

---

## Examples

[Concrete usage examples for each workflow]
```

---

## Complex Skill (15+ workflows)

```
skill-name/
├── SKILL.md
├── CONSTITUTION.md (optional)
├── METHODOLOGY.md (optional)
├── documentation/
│   ├── principles.md
│   └── concepts.md
├── workflows/
│   ├── category1/
│   │   ├── workflow1.md
│   │   └── workflow2.md
│   └── category2/
│       ├── workflow3.md
│       └── workflow4.md
├── references/
│   ├── reference1.md
│   └── reference2.md
├── state/ (optional)
│   └── session-state.json
└── tools/ (optional)
    └── helper-scripts.ts
```

### SKILL.md Template
```markdown
---
name: skill-name
description: |
  What this skill does and when to use it.

  USE WHEN: user says "trigger phrase", "another trigger", or any related request.
---

# Skill Name

Brief description of what this skill does.

## Workflow Routing (SYSTEM PROMPT)

### Category 1 Workflows

**When user requests [action 1]:**
Examples: "user phrases"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/category1/workflow1.md
→ **EXECUTE:** What to do

**When user requests [action 2]:**
Examples: "user phrases"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/category1/workflow2.md
→ **EXECUTE:** What to do

### Category 2 Workflows

**When user requests [action 3]:**
Examples: "user phrases"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/category2/workflow3.md
→ **EXECUTE:** What to do

[Route ALL workflows]

---

## When to Activate This Skill

### Direct Requests
- Comprehensive trigger list

### Context Clues
- Detailed context patterns

### Category-Specific Triggers
- Category 1: triggers
- Category 2: triggers

### Workflow-Specific Triggers
- Workflow 1: triggers
- Workflow 2: triggers

### Integration Points
- Works with skill X
- Complements skill Y

### Anti-Patterns (When NOT to Activate)
- Don't use for Z (use skill-Z instead)

### Examples
- ✅ Positive examples
- ❌ Negative examples

---

## Core Principles

READ: `CONSTITUTION.md` for guiding principles

---

## Methodology

READ: `METHODOLOGY.md` for process details

---

## Core Capabilities

[Organized by category]

---

## Extended Context

### Foundational Documents
- `CONSTITUTION.md` - Philosophy
- `METHODOLOGY.md` - Process

### Workflow Documentation
- Organized by category
- Each workflow described

### Reference Documentation
- `references/reference1.md` - Description
- `references/reference2.md` - Description

### Tools & Utilities
- `tools/helper-scripts.ts` - Description

---

## File Organization

[Explain directory structure]

---

## Examples

[Comprehensive examples for each category]
```

---

## Archetype Comparison

| Aspect | Minimal | Standard | Complex |
|--------|---------|----------|---------|
| Workflows | 1-3 | 3-15 | 15+ |
| Structure | Flat | Flat/Nested | Nested |
| Routing | Simple | Semantic | Categorized |
| Activation | Basic | Comprehensive | Exhaustive |
| Documentation | Inline | Some external | Extensive external |
| Philosophy | None | Inline | CONSTITUTION.md |
| Methodology | Inline | Inline | METHODOLOGY.md |
| State | None | Optional | Often yes |
| Tools | None | Optional | Often yes |

## Selection Rules

- **Start Minimal.** Upgrade only if needed.
- **Upgrade to Standard** when multiple related workflows need organization or external references.
- **Upgrade to Complex** when workflows need categorization, multi-stage processes, or philosophy/methodology docs.
- **Never** skip Workflow Routing, leave workflows orphaned, or over-engineer triggers.
