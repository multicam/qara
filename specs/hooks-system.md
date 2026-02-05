# Hooks System

## Overview

Event-driven TypeScript hooks executed by Bun at Claude Code lifecycle points. Configured in `settings.json`. All hooks follow fail-open design -- errors never block Claude.

## Active Hooks

| Hook | Event | Matcher | Timeout | Script |
|------|-------|---------|---------|--------|
| Session Start | SessionStart | `*` | 3000ms | `session-start.ts` |
| Tab Update | UserPromptSubmit | (all) | 500ms | `update-tab-titles.ts` |
| Completion | Stop | (all) | 2000ms | `stop-hook.ts` |

## Hook Details

### session-start.ts
1. Skips subagent sessions (checks `CLAUDE_PROJECT_DIR` and `CLAUDE_AGENT_TYPE`)
2. Debounces with 2s lockfile in tmpdir
3. Reads `CORE/SKILL.md` and outputs as `<system-reminder>` to stdout
4. Sets terminal tab to "{DA} Ready"

### update-tab-titles.ts
1. Reads prompt from stdin JSON
2. Generates 4-word title from prompt
3. Sets tab title with processing indicator

### stop-hook.ts
1. Reads transcript path from stdin JSON
2. Finds last user query in transcript
3. Generates tab title from query
4. Sets final tab title

## Shared Libraries (hooks/lib/)

| Library | Purpose |
|---------|---------|
| `pai-paths.ts` | Path resolution, SKILLS_DIR/STATE_DIR, .env loading, validation |
| `stdin-utils.ts` | Read stdin with timeout, parse HookInput JSON |
| `tab-titles.ts` | Generate titles from prompts, set terminal tab (Ghostty/Kitty/xterm) |

## Hook I/O Contract

**Input (stdin):**
```typescript
interface HookInput {
  session_id: string;
  prompt?: string;           // UserPromptSubmit
  transcript_path?: string;  // Stop
}
```

**Output (stdout):**
- SessionStart: Text/XML injected into context
- UserPromptSubmit: Text injected into context
- Stop: (none -- tab title set via escape sequences to stderr)
