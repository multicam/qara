# Configuration

## Settings Layering

| Layer | File | Git Status | Purpose |
|-------|------|------------|---------|
| Base | `settings.json` | committed | Main configuration |
| Local | `settings.local.json` | gitignored | Machine-specific overrides |
| Example | `settings.json.example` | committed | Full template with comments |
| Minimal | `settings-minimal.json` | committed | Minimal starter template |

## Environment Variables

### Core (settings.json)

| Variable | Value | Purpose |
|----------|-------|---------|
| `DA` | `Qara` | Digital assistant name |
| `PAI_DIR` | `/home/jean-marc/.claude` | PAI directory path |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | `64000` | Max output tokens |
| `API_TIMEOUT_MS` | `3000000` | 50-minute timeout |
| `PATH` | Extended | Includes Bun, Cargo, mise shims |

### API Keys (.env, gitignored)

Supported services (from .env.example):
- `ANTHROPIC_API_KEY` -- Anthropic
- `OPENAI_API_KEY` -- OpenAI
- `PERPLEXITY_API_KEY` -- Perplexity research
- `GOOGLE_API_KEY` -- Gemini research
- `REPLICATE_API_KEY` -- Replicate

## Permission System

### Allow List (15 entries)
File ops: Bash, Read, Write, Edit, MultiEdit
Search: Glob, Grep
Web: WebFetch(domain:*), WebSearch
Notebooks: NotebookRead, NotebookEdit
Planning: TodoWrite, ExitPlanMode, Task
MCP: mcp__* (wildcard)

### Deny List (11 patterns)
- `rm -rf /`, `rm -rf /*`, `rm -rf ~`
- `dd if=/dev/zero`, `mkfs.ext4`, `> /dev/sda`
- `rm -rf $HOME`, `rm -rf $PAI_DIR`
- macOS: 19 additional `diskutil` patterns (in minimal config)

### Local Overrides (settings.local.json)
- Additional MCP tool permissions
- 48 WebFetch domains for crypto/finance/AI research

## Feature Flags

| Flag | Value | Purpose |
|------|-------|---------|
| `alwaysThinkingEnabled` | true | Extended thinking mode |
| `plansDirectory` | `thoughts/shared/plans` | Plan file storage |
| `showTurnDuration` | true | Display response time |
| `max_tokens` | 8192 | Output token limit |

## Hooks Configuration

3 active hooks in settings.json:

| Event | Script | Timeout |
|-------|--------|---------|
| SessionStart | `session-start.ts` | 3000ms |
| UserPromptSubmit | `update-tab-titles.ts` | 500ms |
| Stop | `stop-hook.ts` | 2000ms |

Security is handled by CC's native permission system (allow/deny lists above), not by hooks.

## Status Line (statusline-command.sh)

Two-line display:

**Line 1 (cool blues):** Directory name | Git branch | Diff stats (+/-)
**Line 2 (warm tones):** Model | Session time | Context % | Token counts

Context window color coding:
- Green (0-60%): OK
- Yellow (60-80%): Caution
- Red (80-100%): Critical

## MCP Servers

Configured via `.mcp.json` at project root (symlinked to `~/.claude/mcp.json`). Server implementations live in `.claude/mcp-servers/` (symlinked to `~/.claude/mcp-servers/`).

| Server | Transport | Purpose |
|--------|-----------|---------|
| `ollama` | stdio (bun) | Local LLM integration via Ollama API. 6 tools: chat, analyze_code, review_diff, explain, generate, models |

Agents inherit all project-level MCP servers automatically — no per-agent config needed.

`enableAllProjectMcpServers` in settings.json controls whether `.mcp.json` servers auto-activate.

## Git Configuration

### .gitignore
- `.claude/state/` -- Runtime state
- `.claude/settings.json`, `settings.local.json` -- Local settings
- `.claude/.env` -- Secrets
- `.claude/history/` -- Session history
- `thoughts/` -- HumanLayer-managed
- `.venv` -- Python virtualenv

### Pre-commit Hook (scripts/pre-commit)
4 quality gates:
1. Skill structure validation
2. Reference integrity check (warning only)
3. `.env` file prevention
4. `settings.json` prevention
