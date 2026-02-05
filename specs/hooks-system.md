# Hooks System

## Overview

Event-driven TypeScript hooks executed by Bun at Claude Code lifecycle points. Configured in `settings.json`. All hooks follow fail-open design -- errors never block Claude.

## Active Hooks

| Hook | Event | Matcher | Timeout | Script |
|------|-------|---------|---------|--------|
| Session Start | SessionStart | `*` | 3000ms | `session-start.ts` |
| Security Check | PreToolUse | `Bash` | 1000ms | `pre-tool-use-security.ts` |
| Tab Update | UserPromptSubmit | (all) | 500ms | `update-tab-titles.ts` |
| Completion | Stop | (all) | 2000ms | `stop-hook.ts` |

## Hook Details

### session-start.ts
1. Skips subagent sessions (checks `CLAUDE_PROJECT_DIR` and `CLAUDE_AGENT_TYPE`)
2. Debounces with 2s lockfile in tmpdir
3. Reads `CORE/SKILL.md` and outputs as `<system-reminder>` to stdout
4. Analyzes context (package.json, cwd) to suggest relevant skills
5. Sets terminal tab to "{DA} Ready"

### pre-tool-use-security.ts
1. Reads tool input JSON from stdin
2. Checks against always-blocked patterns (rm -rf /, dd to /dev/sda, mkfs)
3. Checks against dangerous patterns (76 total) in categories:
   - Filesystem destruction, git force operations, database destruction
   - System security, remote code execution, credential exposure, production ops
4. Checks checkpoint age for high-risk operations (>5 min warning)
5. Generates additional context hints (CC 2.1.9 feature)
6. Returns `{ continue: bool, additionalContext?: string, reason?: string }`
7. Logs to `MEMORY_DIR/security-checks.jsonl`

### update-tab-titles.ts
1. Reads prompt from stdin JSON
2. Generates 4-word title from prompt
3. Sets tab to "{recycling emoji} {DA}: {title}"

### stop-hook.ts
1. Reads transcript from path in stdin JSON
2. Extracts COMPLETED line with priority system:
   - Priority 1: Custom COMPLETED (`CUSTOM COMPLETED:`, <=8 words)
   - Priority 2: Regular COMPLETED (`COMPLETED:`)
   - Priority 3: Agent's custom COMPLETED
   - Priority 4: Agent's regular COMPLETED
3. Generates intelligent response (handles generic "completed successfully")
4. Compacts errors from transcript to JSONL summary
5. Sets final tab title
6. Suggests `/rewind` if >=3 similar errors detected

## Shared Libraries (hooks/lib/)

| Library | Purpose |
|---------|---------|
| `pai-paths.ts` | Path resolution, PAI_DIR/SKILLS_DIR/STATE_DIR/etc, .env loading, validation |
| `stdin-utils.ts` | Read stdin with timeout, parse HookInput JSON |
| `tab-titles.ts` | Generate titles from prompts, set terminal tab (Ghostty/Kitty/xterm) |
| `transcript-utils.ts` | Parse transcripts, find task results, extract completions |
| `datetime-utils.ts` | Sydney/AEDT timezone timestamps, ISO format, date parts |
| `jsonl-utils.ts` | Atomic JSONL append, directory creation, string truncation |
| `checkpoint-utils.ts` | Checkpoint event logging, error thresholds, iteration loop detection |

## Event Log Files

| Log | Location | Written By |
|-----|----------|------------|
| Skill suggestions | `STATE_DIR/skill-suggestions.jsonl` | session-start.ts |
| Security checks | `MEMORY_DIR/security-checks.jsonl` | pre-tool-use-security.ts |
| Checkpoint events | `STATE_DIR/checkpoint-events.jsonl` | checkpoint-utils.ts |
| Error summaries | `STATE_DIR/errors/YYYY-MM-DD_errors.jsonl` | stop-hook.ts |

## Hook I/O Contract

**Input (stdin):**
```typescript
interface HookInput {
  session_id: string;
  prompt?: string;           // UserPromptSubmit
  transcript_path?: string;  // Stop
  tool_name?: string;        // PreToolUse
  tool_input?: any;          // PreToolUse
}
```

**Output (stdout):**
- SessionStart: Text/XML injected into context
- PreToolUse: `{ continue: boolean, additionalContext?: string, reason?: string }`
- UserPromptSubmit: Text injected into context
- Stop: Text/XML injected into context
