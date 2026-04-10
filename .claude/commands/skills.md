---
description: Skills Discovery Command
model: haiku
---

# Skills Discovery

Lists available skills with descriptions and triggers.

## Usage

```
/skills [filter]
```

## Execution

1. **Find skills** — list directories under `${PAI_DIR}/skills/` (use Glob)
2. **Extract metadata** — read each `SKILL.md`, pull `name`, `description`, workflow count from `workflows/`
3. **Filter** — if `$ARGUMENTS` provided, match against name/description/triggers
4. **Format output** — summary table, then optionally details per skill

## Output Format

Summary table:
```
## Available Skills (N total)

| Skill | Description | Workflows | Triggers |
|-------|-------------|-----------|----------|
| CORE | System foundation... | 15+ | Always loaded |
| research | Multi-source research... | 10 | "do research", "find info" |
```

Per-skill detail (on request or when list is short):
```
### skill-name (N workflows)
[Description from frontmatter]

**Triggers:** "phrase 1", "phrase 2", "phrase 3"

**Workflows:**
- workflow1.md — brief description
- workflow2.md — brief description
```

If many skills, show summary first then offer: `Say "/skills [name]" for full details`.

## Examples

```
/skills              # all skills
/skills research     # skills matching "research"
/skills create       # skills matching "create"
```
