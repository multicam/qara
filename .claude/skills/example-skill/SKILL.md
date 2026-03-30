---
name: example-skill
context: fork
description: |
  Example skill demonstrating the Skills-as-Containers pattern with workflows,
  assets, and natural language routing. This is a teaching tool showing the
  complete PAI architecture.

  USE WHEN user says 'show me an example', 'demonstrate the pattern',
  'how do skills work', 'example skill'
---

# Example Skill

**Purpose:** This skill exists to demonstrate the Skills-as-Containers pattern introduced in PAI. Use it as a template for creating your own skills.

## Architecture Overview

Skills in PAI are organized as self-contained containers with:

### Core Components
- **SKILL.md** - Core skill definition with routing logic (you're reading it now!)
- **workflows/** - Specific task workflows for discrete operations
- **assets/** - Templates, references, and helper files

### Progressive Disclosure
1. **Metadata** (always loaded) - Name, description, triggers
2. **Instructions** (loaded when triggered) - This SKILL.md content
3. **Resources** (loaded as needed) - Individual workflow and asset files

## Skill Directory Layout

A typical skill follows this structure:

```
skill-name/
├── SKILL.md           # Core definition (always loaded when triggered)
├── workflows/         # Task-specific workflows (loaded on demand)
│   ├── workflow-a.md
│   └── workflow-b.md
├── references/        # Supporting documentation
│   └── guide.md
└── assets/            # Templates, examples
    └── template.md
```

## Routing Flow

```
User Intent → Skill Activation (via description: USE WHEN) → Workflow Selection → Execution
```

## Creating Your Own Skill

See `system-create-skill` skill for the full creation workflow, best practices, and file structure conventions.
