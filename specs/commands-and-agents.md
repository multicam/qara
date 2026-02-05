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
| `/research-perplexity` | -- | Forces Perplexity API for research |
| `/research-claude` | -- | Forces Claude WebSearch for research |
| `/research-gemini` | -- | Forces Gemini for research |
| `/research_codebase` | -- | Documents codebase with thoughts directory |
| `/web-research` | -- | Web research patterns |
| `/create_handoff` | -- | Creates handoff document for session transfer |
| `/load-dynamic-requirements` | -- | Loads dynamic requirements into context |

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

## Agent Definitions (.claude/agents/)

Agent markdown files define specialized subagents spawnable via the Task tool.

### Active Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| `codebase-analyzer` | sonnet | Implementation analysis specialist (document, don't critique) |
| `codebase-locator` | haiku | File/directory location specialist (soft-deprecated for Explore) |
| `codebase-pattern-finder` | -- | Finds similar implementations and usage patterns |
| `researcher` | sonnet | General research via research skill |
| `claude-researcher` | -- | Claude WebSearch research |
| `perplexity-researcher` | -- | Perplexity API research |
| `gemini-researcher` | -- | Gemini multi-perspective research |
| `web-search-researcher` | -- | WebSearch/WebFetch specialist |
| `engineer` | -- | Software engineering (Atlas), structured output, SOLID principles |
| `architect` | -- | System architecture specialist |
| `designer` | -- | Design specialist, "extremely anal" about amateurish design |
| `design-iterator` | -- | Iterative visual refinement |
| `design-implementation-reviewer` | -- | Verifies UI matches Figma designs |
| `thoughts-analyzer` | -- | Deep-dives on research topics in thoughts/ |
| `thoughts-locator` | -- | Finds relevant docs in thoughts/ directory |

### Agent Output Format

All agents use structured output with emoji indicators:
```
📋 SUMMARY: [One sentence]
🔍 ANALYSIS: [Key findings]
⚡ ACTIONS: [Steps taken]
✅ RESULTS: [Outcomes]
📊 STATUS: [Current state]
➡️ NEXT: [Recommended next steps]
🎯 COMPLETED: [12-word summary]
```

## Context Files (.claude/context/)

Loaded via `@include` in CLAUDE.md:

| File | Purpose |
|------|---------|
| `bun-guide.md` | Bun runtime patterns: Bun.serve(), bun:sqlite, bun test |
| `hooks-guide.md` | Active hooks reference table, shared utilities, event types |
