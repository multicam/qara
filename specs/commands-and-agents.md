# Commands, Agents, and Delegation

## Slash Commands (.claude/commands/)

Files in this directory become available as `/command-name`. They use `$ARGUMENTS` to capture user input.

| Command | Model | Purpose |
|---------|-------|---------|
| `/research` | auto | Auto-selects best research agent based on available API keys |
| `/create_plan` | opus | Interactive planning with parallel research agents |
| `/validate_plan` | — | Validates implementation against plan |
| `/spotcheck` | — | Verify agent output quality |
| `/skills` | haiku | Lists all available skills with metadata |
| `/capture-learning` | — | Captures problem-solving narratives |
| `/research_codebase` | — | Documents codebase with thoughts directory |
| `/create_handoff` | — | Creates handoff document for session transfer |
| `/load-dynamic-requirements` | — | Loads dynamic requirements into context |
| `/Readme` | — | Shows custom slash command documentation |

## Custom Agents (.claude/agents/) — 15 agents (10 base + 5 tiered)

Used via `Task` tool with `subagent_type` parameter.

### Base Agents (10)

| Agent | Model | Purpose |
|-------|-------|---------|
| `architect` | opus | PRD creation, system design, technical specs (loads research skill) |
| `claude-researcher` | haiku | Primary web research via WebSearch/WebFetch |
| `codebase-analyzer` | sonnet | Traces data flow, finds patterns, explains implementation |
| `critic` | **sonnet** | Pre-implementation plan review, risk/gap analysis. Opus escalation on 3rd retry. |
| `designer` | opus | Design review, UX/UI, typography (loads frontend-design skill) |
| `engineer` | sonnet | Code implementation, debugging, optimization, testing |
| `gemini-researcher` | haiku | Fallback when WebSearch fails — uses Gemini CLI |
| `reviewer` | opus | Code review for correctness, security, performance |
| `thoughts-analyzer` | sonnet | Discovers + analyzes thoughts/ docs for insights and decisions |
| `verifier` | **sonnet** | Post-implementation acceptance verification, quality gates. Opus escalation on 3rd retry. |

### Tiered Variants (5)

| Agent | Base | Model | Purpose |
|-------|------|-------|---------|
| `architect-low` | architect | sonnet | Quick specs, feature summaries, lightweight scaffolding |
| `codebase-analyzer-low` | codebase-analyzer | haiku | Quick file lookups, simple pattern searches |
| `engineer-high` | engineer | opus | Complex architecture, cross-cutting changes |
| `engineer-low` | engineer | haiku | Simple fixes, renames, trivial edits |
| `reviewer-low` | reviewer | sonnet | Quick pass/fail for small diffs (<50 lines) |

Agents with `memory: project`: architect, critic, reviewer, verifier.

CC built-in agents (no custom definition): `Explore`, `Plan`, `general-purpose`, `claude-code-guide`, `statusline-setup`.

## Delegation Patterns

Delegation uses CC's Task tool. Custom agents extend built-in types with specialized prompts, tool access, and skills. CORE SKILL.md includes the agent roster.

**Good for parallel agents:** Multiple file updates, multi-topic research, batch processing, independent subtasks.

**Bad for parallel agents:** Sequential dependencies, single-file edits, tasks needing human judgment.

### Model Routing

| Task Type | Model |
|-----------|-------|
| Architecture, PRD creation, design review, code review | opus |
| Plan critique, acceptance verification, implementation, trace analysis | sonnet |
| File location, simple search, trivial edits, web research | haiku |

**Critic + verifier escalation (2026-04-11):** `critic` and `verifier` default to sonnet. If the caller retries twice and both return `revise`/`FAIL`, the third call MUST include `model: opus` override via the Task tool. This gives sonnet first-pass coverage at 5× lower cost while preserving opus judgment when sonnet struggles. See `.claude/context/delegation-guide.md` for escalation rules.

## Context Files (.claude/context/)

| File | Purpose |
|------|---------|
| `routing-cheatsheet.md` | All activation patterns: keywords, skills, commands, agents, hooks |
| `delegation-guide.md` | Agent selection matrix, model tiers, escalation paths |
| `hooks-guide.md` | Active hooks reference, shared utilities, event types |
| `bun-guide.md` | Bun runtime patterns: Bun.serve(), bun:sqlite, bun test |
