# Delegation Guide

When to delegate to agents and how to use them effectively.

## Agent Selection

| Need | Agent | Model | Key trait |
|------|-------|-------|-----------|
| How does code X work? | `codebase-analyzer` | sonnet | Traces data flow, gives file:line refs |
| Design review / UI polish | `designer` | opus | Loads frontend-design skill |
| PRD / system design | `architect` | opus | Loads research skill |
| Implement from spec | `engineer` | sonnet | Code, tests, debugging |
| Review code quality | `reviewer` | opus | Security, perf, correctness |
| Mine thoughts/ docs | `thoughts-analyzer` | sonnet | Extracts decisions & insights |
| Find relevant thought | `thoughts-locator` | haiku | Fast doc discovery |
| Web research fallback | `gemini-researcher` | haiku | When WebSearch fails |

## Model Tier Strategy

- **haiku** — Fast, cheap lookups (locating files, fallback searches)
- **sonnet** — Implementation work (coding, analysis, tracing)
- **opus** — Judgment calls (design, architecture, review)

## Parallel Execution

Launch independent agents in a **single message** with multiple `Task` tool calls.

**Good parallel combos:**
- `codebase-analyzer` + `thoughts-locator` — understand code while finding related docs
- Multiple `engineer` agents on independent files (use `isolation: "worktree"`)
- `architect` for design + `gemini-researcher` for prior art

**Must be sequential:**
- `architect` → then `engineer` (need the spec first)
- `engineer` → then `reviewer` (need the code first)
- `thoughts-locator` → then `thoughts-analyzer` (need to know which doc)

## Escalation Paths

1. **Simple question** → Answer directly, no agent needed
2. **Code understanding** → `codebase-analyzer`
3. **Multi-file implementation** → `engineer` (or multiple in worktrees)
4. **Complex implementation** → `architect` first, then `engineer`(s)
5. **Quality gate** → `reviewer` after implementation
6. **Research needed** → `gemini-researcher` when WebSearch is stale

## Task Packaging

Use `templates/delegation-task.md` for complex delegations. For simple tasks, a clear prompt is enough — don't over-template.

**Minimum viable task:**
- What to do (objective)
- What files to touch
- How to verify success

## Spotcheck Pattern

After parallel agents finish, launch `reviewer` to verify all work:
1. Track what each agent was assigned
2. Define pass/fail criteria per task
3. Have reviewer check each result
4. Roll back any failures before proceeding
