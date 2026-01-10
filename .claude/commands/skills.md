---
description: Skills Discovery Command
model: haiku
---

# Skills Discovery Command

Lists all available skills with their descriptions and trigger phrases.

## Usage

```
/skills [filter]
```

## Execution

**Step 1: Find All Skills**

```bash
# List all skill directories
ls -1 ${PAI_DIR}/skills/
```

**Step 2: Extract Skill Metadata**

For each skill directory, read the SKILL.md file and extract:
- `name` from YAML frontmatter
- `description` from YAML frontmatter (includes USE WHEN triggers)
- Workflow count from `workflows/` directory

**Step 3: Format Output**

Present skills in a table format:

```
## Available Skills (N total)

| Skill | Description | Workflows | Triggers |
|-------|-------------|-----------|----------|
| CORE | System foundation... | 15+ | Always loaded |
| research | Multi-source research... | 10 | "do research", "find info" |
| ... | ... | ... | ... |
```

**Step 4: Optional Filter**

If `$ARGUMENTS` is provided, filter skills by:
- Name contains filter string
- Description contains filter string
- Triggers contain filter string

## Arguments

`$ARGUMENTS` - Optional filter string to search skills

## Examples

```
/skills              # List all skills
/skills research     # Find skills related to research
/skills create       # Find skills for creating things
```

## Output Format

For each skill, show:

```
### skill-name (N workflows)
Description from YAML frontmatter

**Triggers:** "phrase 1", "phrase 2", "phrase 3"

**Workflows:**
- workflow1.md - Brief description
- workflow2.md - Brief description
```

## Quick Reference Mode

If many skills exist, first show summary table, then offer to show details:

```
Found 16 skills. Showing summary:

| # | Skill | Workflows | Key Triggers |
|---|-------|-----------|--------------|
| 1 | CORE | 15+ | Always loaded |
| 2 | research | 10 | "do research" |
...

Say "/skills [name]" for full details on a specific skill.
```
