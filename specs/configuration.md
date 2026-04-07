# Configuration

## Settings Layering

| Layer | File | Git Status | Purpose |
|-------|------|------------|---------|
| Base | `settings.json` | gitignored | Main configuration (symlink chain) |
| Local | `settings.local.json` | gitignored | Machine-specific overrides |

Symlinks (canonical in qara, symlinked from ~/.claude/):
- `~/.claude/settings.json` -> `qara/.claude/settings.json`
- `~/.claude/.env` -> `qara/.claude/.env`
- `~/.claude/state` -> `qara/.claude/state`
- `~/.claude/RTK.md` -> `qara/.claude/RTK.md`

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
| `effortLevel` | high |
| `enableAllProjectMcpServers` | false |
| `enabledMcpjsonServers` | brave-devtools, context7, mattermost |

## Status Line (statusline-command.sh)

**Line 1 (cool blues):** Directory | Git branch | Diff stats
**Line 2 (warm tones):** Model | Session time | Context % (green/yellow/red) | Tokens

## MCP Servers

Configured via `.claude/mcp.json`. Credentials in `.claude/.env` (gitignored).

| Server | Transport | Purpose |
|--------|-----------|---------|
| `brave-devtools` | npx | Browser automation via Chrome DevTools |
| `context7` | npx | Live library documentation (9k+ libraries) |
| `mattermost` | npx | Team chat integration |

## Git Configuration

**.gitignore highlights:** `.claude/settings.json`, `settings.local.json`, `.claude/.env`, `thoughts/`

**Pre-commit hook (scripts/pre-commit):** 4 gates -- skill structure validation, reference integrity, .env prevention, settings.json prevention.
