# Commands, Agents, and Delegation

## Slash Commands (.claude/commands/)

Files in this directory become available as `/command-name`. They use `$ARGUMENTS` to capture user input.

| Command | Model | Purpose |
|---------|-------|---------|
| `/research` | auto | Auto-selects best research agent based on available API keys |
| `/create_plan` | opus | Interactive planning with parallel research agents |
| `/implement_plan` | sonnet | Executes plans with phased verification |
| `/validate_plan` | — | Validates implementation against plan |
| `/spotcheck` | — | Verify agent output quality |
| `/skills` | haiku | Lists all available skills with metadata |
| `/capture-learning` | — | Captures problem-solving narratives |
| `/research_codebase` | — | Documents codebase with thoughts directory |
| `/create_handoff` | — | Creates handoff document for session transfer |
| `/load-dynamic-requirements` | — | Loads dynamic requirements into context |
| `/Readme` | — | Shows custom slash command documentation |

## Custom Agents (.claude/agents/) — 8 agents

Used via `Task` tool with `subagent_type` parameter.

| Agent | Model | Purpose |
|-------|-------|---------|
| `codebase-analyzer` | sonnet | Traces data flow, finds patterns, explains implementation |
| `thoughts-analyzer` | sonnet | Extracts decisions and insights from thoughts/ docs |
| `thoughts-locator` | haiku | Discovers relevant documents in thoughts/ directory |
| `designer` | opus | Design review, UX/UI, typography (loads frontend-design skill) |
| `architect` | opus | PRD creation, system design (loads research skill) |
| `engineer` | sonnet | Code implementation, debugging, optimization, testing |
| `reviewer` | opus | Code review for correctness, security, performance |
| `gemini-researcher` | haiku | Fallback when WebSearch fails — uses Gemini CLI |

CC built-in agents (no custom definition): `Explore`, `Plan`, `Bash`, `general-purpose`, `claude-code-guide`.

## Delegation Patterns

Delegation uses CC's Task tool. Custom agents extend built-in types with specialized prompts, tool access, and skills. CORE SKILL.md includes the agent roster.

**Good for parallel agents:** Multiple file updates, multi-topic research, batch processing, independent subtasks.

**Bad for parallel agents:** Sequential dependencies, single-file edits, tasks needing human judgment.

### Model Routing

| Task Type | Model |
|-----------|-------|
| Architecture, planning, review | opus |
| Analysis, research, implementation | sonnet |
| File location, simple search, listing | haiku |

## Context Files (.claude/context/)

| File | Purpose |
|------|---------|
| `bun-guide.md` | Bun runtime patterns: Bun.serve(), bun:sqlite, bun test |
| `hooks-guide.md` | Active hooks reference, shared utilities, event types |
