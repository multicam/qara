---
name: thoughts-consolidate
context: fork
model: sonnet
description: |
  Consolidate and clean up thoughts/ files. Takes a list of file paths,
  verifies against current codebase, and produces a single clean document.
  Single file = cleanup only. Multiple files = merge + cleanup.
  USE WHEN: "consolidate thoughts", "clean up thoughts", "merge thoughts files",
  "clean this thoughts file", "consolidate these".
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests thoughts consolidation or cleanup:**
Examples: "consolidate these thoughts files", "clean up thoughts", "merge these thoughts", "clean this thoughts file"
-> **READ:** ${PAI_DIR}/skills/thoughts-consolidate/workflows/consolidate.md
-> **EXECUTE:** Consolidate/cleanup thoughts files with codebase verification

---

## When to Activate This Skill

- User provides a list of thoughts/ file paths to consolidate
- User wants to clean up a single thoughts/ file
- User wants to merge related thoughts/ documents into one
- User says "consolidate", "cleanup", "merge" in context of thoughts/ files
