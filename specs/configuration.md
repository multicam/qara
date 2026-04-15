# Configuration

## Settings Layering

| Layer | File | Git Status | Purpose |
|-------|------|------------|---------|
| Base | `settings.json` | gitignored | Main configuration (symlink chain) |
| Local | `settings.local.json` | gitignored | Machine-specific overrides |

Symlinks (canonical in qara, symlinked from ~/.claude/):
- `~/.claude/settings.json` -> `qara/.claude/settings.json`
- `~/.claude/CLAUDE.md` -> `qara/.claude/CLAUDE.md`
- `~/.claude/.env` -> `qara/.claude/.env` (root cause of repeated regression fixed 2026-04-15 — see DECISIONS.md + MEMORY.md)
- `~/.claude/state` -> `qara/.claude/state`
- `~/.claude/RTK.md` -> `qara/.claude/RTK.md`
- `~/.claude/context` -> `qara/.claude/context`

**Not symlinked** (intentional / cruft):
- `~/.claude.json` — CC's user-scope monolithic config, stores per-project state + global MCP servers. Cannot be symlinked (contains data for all projects).
- `qara/.claude/mcp.json` — archived 2026-04-15 to `purgatory/mcp-config-pre-migration-2026-04-15/` (CC never read it; canonical MCP config moved to project-root `.mcp.json`).

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
| `enabledMcpjsonServers` | brave-devtools, context7, ollama-local, jcodemunch (4 — mirrors `.mcp.json`; `mattermost` is global-scope so not whitelisted here) |

## Status Line (statusline-command.sh)

**Line 1 (cool blues):** Directory | Git branch | Diff stats
**Line 2 (warm tones):** Model | Session time | Context % (green/yellow/red) | Tokens

## MCP Servers

**Project-scope config:** `qara/.mcp.json` at repo root (the location CC actually reads). Whitelisted via `enabledMcpjsonServers` in `settings.json`.
**Global-scope config:** `~/.claude.json` top-level `mcpServers` block (for servers used across all projects).
**Credentials:** `.claude/.env` (gitignored; symlinked from `~/.claude/.env`).

| Server | Scope | Transport | Purpose |
|--------|-------|-----------|---------|
| `brave-devtools` | project `.mcp.json` | npx `chrome-devtools-mcp-for-brave@0.4.2` | Browser automation via Brave/Chrome DevTools |
| `context7` | project `.mcp.json` | npx `@upstash/context7-mcp@2.1.7` | Live library documentation (9k+ libraries) |
| `ollama-local` | project `.mcp.json` | bun `.claude/mcp-servers/ollama-local/index.ts` | Local Gemma 4 (chat, summarize, classify, review, analyze_image) |
| `jcodemunch` | project `.mcp.json` | `uv tool run jcodemunch-mcp` | Token-efficient tree-sitter symbol retrieval (Python policy exception; `tool_profile=standard`, local-only BM25; non-commercial license + TGDS-eval authorization) |
| `mattermost` | global `~/.claude.json` | npx `@dakatan/mcp-mattermost@0.0.5` | Team chat integration (usable across all projects) |

**Adding a new MCP server** requires editing BOTH:
1. `qara/.mcp.json` — server command + args + env
2. `qara/.claude/settings.json` → `enabledMcpjsonServers` allowlist
CC re-reads `.mcp.json` live on save; no restart needed.

## Git Configuration

**.gitignore highlights:** `.claude/settings.json`, `settings.local.json`, `.claude/.env`, `thoughts/`

**Pre-commit hook (scripts/pre-commit):** 4 gates -- skill structure validation, reference integrity, .env prevention, settings.json prevention.
