# PAI Architecture

## The Three Primitives

### 1. Skills — Domain Containers

Modular capabilities in `.claude/skills/`. Each skill packages domain expertise, workflows, and assets with progressive disclosure (metadata → instructions → resources).

```
skills/content-creation/
├── SKILL.md          # Core definition + routing
├── workflows/        # Task-specific workflows
│   ├── write.md
│   └── publish.md
└── assets/           # Templates, examples, scripts
```

**YAML frontmatter** triggers auto-loading:
```yaml
---
name: content-creation
description: |
  USE WHEN user says 'write post', 'publish content'
---
```

### 2. Workflows — Task Steps Within Skills

Standalone markdown files in `workflows/`. Callable directly or auto-selected by natural language. Like exported functions from a skill module.

### 3. Agents — Parallel Orchestrators

Specialized AI workers configured in `.claude/agents/`. They invoke skills/workflows — they don't duplicate domain knowledge.

**Pattern:** Agents → Skills → Workflows

## Routing

Two-level natural language routing (automatic):
1. **Intent → Skill**: "I need to create content" → content-creation skill loads
2. **Task → Workflow**: "write a post" → `workflows/write.md`

## Progressive Disclosure

| Tier | What loads | When | Size |
|------|-----------|------|------|
| Metadata | YAML frontmatter | Always (routing) | ~100 tokens |
| Instructions | Full SKILL.md | When triggered | ~2000 tokens |
| Resources | Individual assets | When referenced | ~500-2000 each |

## Key Patterns

**Parallel agents + spotcheck:**
```
Launch N agents (each with full context)
→ All complete simultaneously
→ 1 spotcheck agent verifies consistency
```

**Skills-as-Containers** (v1.2.0): Group related workflows by domain instead of flat command lists. Natural grouping improves discoverability and shared context.

**Decision tree:**
- Multiple related tasks in a domain? → Create a skill
- Discrete repeatable task? → Create a workflow
- Need parallel execution? → Use agents invoking skills
- One-off instruction? → Use a prompt

## Current System

- 15 skills, 7 custom agents, 6 hooks
- CORE skill auto-loads at session start
- See CORE SKILL.md Documentation Index for reference files
