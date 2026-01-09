# Claude Code Hooks

Claude Code hooks in `.claude/hooks/`. All hooks are Bun TypeScript.

## Active Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `session-start.ts` | SessionStart | Loads SKILL.md, sets tab title |
| `stop-hook.ts` | Stop | Extracts COMPLETED line, updates tab title |
| `subagent-stop-hook.ts` | SubagentStop | Extracts agent completion |
| `update-tab-titles.ts` | UserPromptSubmit | Sets processing indicator |
| `capture-all-events.ts` | All events | Logs to JSONL |

## Shared Utilities

Located in `.claude/hooks/lib/`:

| Utility | Purpose |
|---------|---------|
| `pai-paths.ts` | PAI_DIR, SKILLS_DIR path resolution |
| `stdin-utils.ts` | readStdinWithTimeout, HookInput interface |
| `tab-titles.ts` | generateTabTitle, setTerminalTabTitle |
| `transcript-utils.ts` | contentToText, findTaskResult, extractCompletionMessage |
| `hitl.ts` | Human-in-the-loop: askQuestion, askPermission, askChoice |
| `summarizer.ts` | Content summarization utilities |

## Hook Events Reference

- `SessionStart` - When a new Claude Code session begins
- `Stop` - When the main agent stops (completes or errors)
- `SubagentStop` - When a subagent (Task tool) completes
- `UserPromptSubmit` - When user submits a prompt
- `PreToolUse` - Before a tool is executed
- `PostToolUse` - After a tool completes
- `Notification` - System notifications
