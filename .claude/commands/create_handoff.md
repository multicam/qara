---
description: Create handoff document for transferring work to another session
model: haiku
---

# Create Handoff

Write a handoff document to transfer work to another session. Thorough but concise — compact context without losing key details.

## Resume Capability (12-Factor Agents - Factor 6)

Handoff frontmatter supports session resume:
```yaml
agent_id: "abc123"  # From Task tool response
resume_command: "claude --resume abc123"
```

Resume options:
1. `claude --resume <agent_id>`
2. Paste handoff contents into new session as initial context
3. `Task(resume: "<agent_id>")`

## Process

### 1. Filepath
`thoughts/shared/handoffs/ENG-XXXX/YYYY-MM-DD_HH-MM-SS_ENG-ZZZZ_description.md`
- `ENG-XXXX` = ticket number (use `general` if none)
- `HH-MM-SS` = 24-hour time
- `description` = kebab-case

### 2. Template

```markdown
---
date: [ISO date with timezone]
researcher: [name]
git_commit: [hash]
branch: [name]
repository: [name]
topic: "[Feature/Task Name] Implementation Strategy"
tags: [implementation, strategy, relevant-components]
status: complete
last_updated: [YYYY-MM-DD]
last_updated_by: [name]
type: implementation_strategy
---

# Handoff: ENG-XXXX {concise description}

## Task(s)
{tasks worked on + status (completed/WIP/planned). If implementing a plan, call out current phase. Reference the plan/research docs from session start.}

## Critical References
{2-3 most important specs/architectural decisions/design docs. Leave blank if none.}

## Recent changes
{recent code changes in file:line syntax}

## Learnings
{patterns, bug root causes, anything the next agent should know. Include file paths.}

## Artifacts
{exhaustive list of artifacts produced/updated as filepaths or file:line references}

## Action Items & Next Steps
{list for next agent based on task statuses}

## Other Notes
{references, codebase locations, anything not fitting above}
```

### 3. Approve

Respond with (do NOT include the XML tags):

<template_response>
Handoff created and synced! To resume from this handoff in a new session, open a new Claude Code session and reference the handoff document:

```
thoughts/shared/handoffs/[ticket]/[handoff-filename].md
```

Or resume directly via agent ID: `claude --resume <agent_id>`
</template_response>

## Guidelines

- **More information, not less** — this is the minimum; add more if needed
- **Be thorough and precise** — top-level objectives AND lower-level details
- **Avoid large code snippets** — prefer `/path/to/file.ext:line` references (e.g., `packages/dashboard/src/app/dashboard/page.tsx:12-24`). Include snippets only when they pertain to an error being debugged.
