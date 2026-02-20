# Hooks System

Event-driven TypeScript hooks executed by Bun at Claude Code lifecycle points. Configured in `settings.json`. All hooks follow fail-open design — errors never block Claude.

## Active Hooks (6)

| Hook | Event | Matcher | Timeout | Script |
|------|-------|---------|---------|--------|
| Session Start | SessionStart | `*` | 3000ms | `session-start.ts` |
| Security Gate | PreToolUse | `Bash` | 1000ms | `pre-tool-use-security.ts` |
| Tab Update | UserPromptSubmit | (all) | 500ms | `update-tab-titles.ts` |
| Tool Logging | PostToolUse | `*` | 2000ms | `post-tool-use.ts` |
| Notification | Notification | (all) | 2000ms | `notification-hook.ts` |
| Completion | Stop | (all) | 2000ms | `stop-hook.ts` |

## Hook Details

**session-start.ts** — Skips subagent sessions, debounces with 2s lockfile, reads CORE/SKILL.md into context, sets tab title.

**pre-tool-use-security.ts** — Validates Bash commands against always-blocked patterns (destructive ops). Rejects dangerous commands before CC's permission system.

**update-tab-titles.ts** — Reads prompt from stdin, generates 4-word title, sets tab with processing indicator.

**post-tool-use.ts** — Logs tool usage to JSONL for analytics.

**notification-hook.ts** — Handles CC notification events.

**stop-hook.ts** — Reads transcript, finds last user query, sets final tab title.

## Shared Libraries (hooks/lib/)

| Library | Purpose |
|---------|---------|
| `pai-paths.ts` | Path resolution, SKILLS_DIR/STATE_DIR, .env loading, ensureDir, validation |
| `tab-titles.ts` | Generate titles from prompts, set terminal tab (Ghostty/Kitty/xterm) |
| `jsonl-utils.ts` | JSONL file operations, imports ensureDir from pai-paths |
| `datetime-utils.ts` | Date/time formatting utilities |

## Hook I/O Contract

**Input (stdin):** `readFileSync(0, 'utf-8')` — always synchronous, never Bun.stdin.stream().

```typescript
interface HookInput {
  session_id: string;
  prompt?: string;           // UserPromptSubmit
  transcript_path?: string;  // Stop
  tool_name?: string;        // PreToolUse, PostToolUse
  tool_input?: object;       // PreToolUse, PostToolUse
}
```

**Output (stdout):** SessionStart/UserPromptSubmit emit text/XML into context. Stop/PostToolUse/Notification use stderr for side effects.

## Development Rules

- New hooks MUST be `chmod +x` — CC runs them via shebang, not `bun run`
- Hooks must NEVER `exit(1)` — always `exit(0)`, even on error
- pai-paths.ts must warn (console.error) on bad paths, NEVER process.exit(1)
- PostToolUse/Notification need 2000ms timeout (bun startup overhead)
