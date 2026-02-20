# Configuration

## Settings Layering

| Layer | File | Git Status | Purpose |
|-------|------|------------|---------|
| Base | `settings.json` | gitignored | Main configuration (symlink chain) |
| Local | `settings.local.json` | gitignored | Machine-specific overrides |

Symlink chain: `~/.claude/settings.json` → `settings-minimal.json` → `settings.json` (all one file).

## Environment Variables (settings.json)

| Variable | Value | Purpose |
|----------|-------|---------|
| `DA` | `Qara` | Digital assistant name |
| `PAI_DIR` | `${HOME}/.claude` | PAI directory path |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | `64000` | Max output tokens |
| `API_TIMEOUT_MS` | `3000000` | 50-minute timeout |
| `PATH` | Extended | Includes Bun, Cargo, mise shims |

## Permission System

**Allow list (16):** Bash, Read, Write, Edit, MultiEdit, Glob, Grep, WebFetch(domain:*), WebSearch, NotebookRead, NotebookEdit, TodoWrite, ExitPlanMode, Task, Skill, mcp__*

**Deny list (13):** rm -rf (/,/*,~,$HOME,$PAI_HOME,$PAI_DIR), sudo rm -rf (/,/*), fork bomb, dd/mkfs/> to /dev/sda

## Feature Flags

| Flag | Value |
|------|-------|
| `alwaysThinkingEnabled` | true |
| `plansDirectory` | `thoughts/shared/plans` |
| `showTurnDuration` | true |
| `effortLevel` | medium |
| `enableAllProjectMcpServers` | false |
| `enabledMcpjsonServers` | brave-devtools |

## Status Line (statusline-command.sh)

**Line 1 (cool blues):** Directory | Git branch | Diff stats
**Line 2 (warm tones):** Model | Session time | Context % (green/yellow/red) | Tokens

## MCP Servers

Configured via `.mcp.json` at project root. Server implementations in `.claude/mcp-servers/`.

| Server | Transport | Purpose |
|--------|-----------|---------|
| `ollama` | stdio (bun) | Local LLM integration via Ollama API |

## Git Configuration

**.gitignore highlights:** `.claude/state/`, `.claude/settings.json`, `settings.local.json`, `.claude/.env`, `thoughts/`

**Pre-commit hook (scripts/pre-commit):** 4 gates — skill structure validation, reference integrity, .env prevention, settings.json prevention.
