---
description: Custom Slash Commands
---

# Qara Command Index

Custom slash commands for the Qara (Personal AI Infrastructure) project.

## Available Commands

| Command | Model | Description |
|---------|-------|-------------|
| `/research` | sonnet | Auto-selects the best available research agent (Perplexity > Claude WebSearch). Accepts a query as argument. |
| `/research_codebase` | opus | Document the codebase as-is with historical context from `thoughts/`. Spawns parallel sub-agents to map architecture and explain how components interact. |
| `/create_plan` | opus | Create a detailed implementation plan through interactive research and iteration. Reads tickets, spawns research agents, produces a plan file in `thoughts/shared/plans/`. |
| `/implement_plan` | sonnet | Execute an approved plan from `thoughts/shared/plans/`. Implements phase by phase with verification, pauses for manual sign-off between phases. |
| `/validate_plan` | haiku | Validate that an implementation plan was correctly executed. Checks automated criteria, produces a validation report, lists manual testing steps. |
| `/create_handoff` | haiku | Write a handoff document to `thoughts/shared/handoffs/` so another agent or session can resume work cleanly. |
| `/spotcheck` | — | After parallel agent dispatches, cross-check agent outputs for contradictions, hallucinations, and completeness. |
| `/skills` | haiku | List all available PAI skills with descriptions and trigger phrases. Accepts an optional filter argument. |

## How Slash Commands Work

Files in this directory become `/command-name` in Claude Code. The file content is the prompt that runs when you invoke the command. Use `$ARGUMENTS` to capture text after the command name.

## Adding a Command

1. Create a `command-name.md` file here
2. Add a `description` and optionally a `model` in YAML frontmatter
3. Write the prompt body — use `$ARGUMENTS` where user input should be substituted
4. The command is immediately available as `/command-name`
