# Claude Code Hooks

Claude Code hooks in `.claude/hooks/`. All hooks are Bun TypeScript.

## Active Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `session-start.ts` | SessionStart | Loads SKILL.md, sets tab title |
| `stop-hook.ts` | Stop | Extracts COMPLETED line, updates tab title |
| `update-tab-titles.ts` | UserPromptSubmit | Sets processing indicator |
| `pre-tool-use-security.ts` | PreToolUse:Bash | Detects dangerous patterns, blocks/approves |
| `post-tool-use.ts` | PostToolUse | Logs tool execution results for audit trail |

## Shared Utilities

Located in `.claude/hooks/lib/`:

| Utility | Purpose |
|---------|---------|
| `pai-paths.ts` | PAI_DIR, SKILLS_DIR path resolution |
| `tab-titles.ts` | generateTabTitle, setTerminalTabTitle |
| `jsonl-utils.ts` | appendJsonl for structured logging |
| `datetime-utils.ts` | getISOTimestamp, getDateString |

## Hook Events Reference

- `SessionStart` - When a new Claude Code session begins
- `Stop` - When the main agent stops (completes or errors)
- `SubagentStop` - When a subagent (Task tool) completes
- `UserPromptSubmit` - When user submits a prompt
- `PreToolUse` - Before a tool is executed
- `PostToolUse` - After a tool completes
