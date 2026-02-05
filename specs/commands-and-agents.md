# Commands and Agents

## Slash Commands (.claude/commands/)

Files in this directory become available as `/command-name`. They use `$ARGUMENTS` to capture user input.

### Active Commands

| Command | Model | Purpose |
|---------|-------|---------|
| `/research` | auto | Auto-selects best research agent based on available API keys |
| `/create_plan` | opus | Interactive planning with parallel research agents, writes to thoughts/ |
| `/implement_plan` | sonnet | Executes plans with phased verification |
| `/validate_plan` | -- | Validates implementation against plan |
| `/skills` | haiku | Lists all available skills with metadata |
| `/capture-learning` | -- | Captures problem-solving narratives to context/learnings/ |
| `/research_codebase` | -- | Documents codebase with thoughts directory |
| `/create_handoff` | -- | Creates handoff document for session transfer |
| `/load-dynamic-requirements` | -- | Loads dynamic requirements into context |
| `/Readme` | -- | Shows custom slash command documentation |

### Planning Workflow

```
/create_plan [ticket-path]
  -> Read ticket fully
  -> Spawn parallel: thoughts-locator + codebase-locator + codebase-analyzer
  -> Present findings, get feedback
  -> Write plan to thoughts/shared/plans/YYYY-MM-DD-ENG-XXXX-description.md
  -> Sync via humanlayer thoughts sync

/implement_plan [plan-path]
  -> Read plan, check existing checkmarks [x]
  -> Execute phases, verify between each
  -> Mark items as completed

/validate_plan [plan-path]
  -> Compare implementation against plan criteria
  -> Report gaps
```

## Agents

All agent types are CC built-ins via the Task tool's `subagent_type` parameter. No custom agent definitions are maintained -- CC ships them all natively:

- `codebase-analyzer`, `codebase-locator`, `codebase-pattern-finder`
- `researcher`, `claude-researcher`, `perplexity-researcher`, `gemini-researcher`, `web-search-researcher`
- `engineer`, `architect`, `designer`, `design-iterator`, `design-implementation-reviewer`
- `thoughts-analyzer`, `thoughts-locator`
- `Explore`, `Plan`

## Context Files (.claude/context/)

Loaded via `@include` in CLAUDE.md:

| File | Purpose |
|------|---------|
| `bun-guide.md` | Bun runtime patterns: Bun.serve(), bun:sqlite, bun test |
| `hooks-guide.md` | Active hooks reference table, shared utilities, event types |
