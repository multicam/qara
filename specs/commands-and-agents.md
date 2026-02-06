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
  -> Spawn parallel: thoughts-locator + Explore + codebase-analyzer
  -> Present findings, get feedback
  -> Write plan to thoughts/shared/plans/YYYY-MM-DD-ENG-XXXX-description.md

/implement_plan [plan-path]
  -> Read plan, check existing checkmarks [x]
  -> Execute phases, verify between each
  -> Mark items as completed

/validate_plan [plan-path]
  -> Compare implementation against plan criteria
  -> Report gaps
```

## Custom Agents (.claude/agents/)

Five custom agent definitions extend CC's built-in subagent types. Used via `Task` tool with `subagent_type` parameter.

### Codebase Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| `codebase-analyzer` | sonnet | Traces data flow, finds patterns, explains how components work |

### Thoughts Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| `thoughts-analyzer` | sonnet | Extracts decisions, insights, and actionable info from thoughts/ docs |
| `thoughts-locator` | haiku | Discovers relevant documents in thoughts/ directory |

### Specialist Agents

| Agent | Model | Skills | Purpose |
|-------|-------|--------|---------|
| `designer` | sonnet | frontend-design | Design review, UX/UI, typography, visual polish |
| `architect` | sonnet | research | PRD creation, system design, technical specifications |

### CC Built-in Agents (no custom definition needed)

- `Explore` — fast codebase exploration with thoroughness levels
- `Plan` — implementation planning
- `Bash` — command execution
- `general-purpose` — multi-step tasks
- `claude-code-guide` — CC documentation questions

## Context Files (.claude/context/)

Loaded via `@include` in CLAUDE.md:

| File | Purpose |
|------|---------|
| `bun-guide.md` | Bun runtime patterns: Bun.serve(), bun:sqlite, bun test |
| `hooks-guide.md` | Active hooks reference table, shared utilities, event types |
