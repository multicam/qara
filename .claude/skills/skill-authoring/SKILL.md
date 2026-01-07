---
name: skill-authoring
description: |
  PAI skill creation, structure, and routing guide. Use when creating new skills
  or modifying skill structure.

  USE WHEN: "create skill", "skill structure", "new skill", "add skill"
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests creating a new skill:**
Examples: "create a skill for X", "add a new skill", "make a skill"
-> **READ:** ${PAI_DIR}/skills/skill-authoring/workflows/create-skill.md
-> **EXECUTE:** Follow step-by-step skill creation workflow

**When user needs to validate a skill:**
Examples: "validate skill", "check skill structure", "is my skill correct"
-> **READ:** ${PAI_DIR}/skills/skill-authoring/workflows/validate-skill.md
-> **EXECUTE:** Run validation checklist

---

## Mandatory Skill Structure Rules

### Rule 1: EVERY Skill MUST Have SKILL.md

```
.claude/skills/[skill-name]/
├── SKILL.md              # REQUIRED - skill entry point
└── workflows/            # Optional - detailed workflows
    └── *.md
```

### Rule 2: SKILL.md YAML Frontmatter (REQUIRED)

```yaml
---
name: skill-name
description: |
  What this skill does. One paragraph.

  USE WHEN: "trigger phrase 1", "trigger phrase 2"
---
```

### Rule 3: Workflow Routing Goes FIRST

After YAML frontmatter, immediately add workflow routing:

```markdown
## Workflow Routing (SYSTEM PROMPT)

**When user requests [action]:**
Examples: "actual phrases", "variations"
-> **READ:** ${PAI_DIR}/skills/[skill]/workflows/[file].md
-> **EXECUTE:** What to do
```

### Rule 4: File Naming

- Skill directory: `kebab-case` (e.g., `skill-authoring`)
- SKILL.md: Exactly this name, uppercase
- Workflows: `kebab-case.md` (e.g., `create-skill.md`)

---

## Canonical SKILL.md Template

```markdown
---
name: my-skill
description: |
  Brief description of what this skill does.

  USE WHEN: "trigger 1", "trigger 2", "trigger 3"
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests [action 1]:**
Examples: "phrase 1", "phrase 2"
-> **READ:** ${PAI_DIR}/skills/my-skill/workflows/action1.md
-> **EXECUTE:** Brief description

---

## When to Activate This Skill

- Condition 1
- Condition 2

---

## Extended Context

[Additional information, examples, configuration]
```

---

## Consequences of Violating Rules

- **No SKILL.md** = Skill never loads
- **No workflow routing** = Workflows never execute
- **Wrong order** = Claude misses routing logic
- **No USE WHEN** = Skill harder to discover

---

## Quick Checklist

- [ ] SKILL.md exists in skill root
- [ ] YAML frontmatter with `name:` and `description:`
- [ ] `USE WHEN:` triggers in description
- [ ] Workflow routing section (if workflows exist)
- [ ] All workflow files routed
- [ ] kebab-case naming throughout

---

## Related

- See `system-create-skill` skill for automated skill generation
- See CORE skill for always-loaded context patterns
