---
name: hook-authoring
context: fork
description: |
  Claude Code hook creation and configuration. PAI event-driven automation.

  USE WHEN: "create hook", "hook system", "modify hooks", "add hook"
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests creating a new hook:**
Examples: "create a hook for X", "add a hook", "make a SessionStart hook"
-> **READ:** ${PAI_DIR}/skills/hook-authoring/workflows/create-hook.md
-> **EXECUTE:** Follow hook creation workflow

**When user needs to debug hooks:**
Examples: "hook not working", "debug hooks", "hook troubleshooting"
-> **READ:** ${PAI_DIR}/skills/hook-authoring/workflows/debug-hooks.md
-> **EXECUTE:** Run debugging checklist

---

## Claude Code Hook Events

### SessionStart
**When:** New Claude Code session begins
**Use Cases:** Load context, initialize state, capture metadata

### PreToolUse
**When:** Before a tool executes
**Use Cases:** Security checks, permission enforcement, input validation

### PostToolUse
**When:** After a tool executes
**Use Cases:** Logging, metrics, audit trail

### UserPromptSubmit
**When:** User submits a prompt
**Use Cases:** Pre-processing, context injection, tab updates

### Stop
**When:** Claude completes a response (not user)
**Use Cases:** Extract completion info, update tab titles, capture work

### PostToolUseFailure
**When:** A tool call fails
**Use Cases:** Error tracking, consecutive failure escalation, retry strategy

### SubagentStart
**When:** A subagent (Agent tool) is spawned
**Use Cases:** Delegation tracking, mode state updates

### SubagentStop
**When:** A subagent completes
**Use Cases:** Deliverable recording, mode state updates, result capture

### PreCompact
**When:** Before CC compresses the context window
**Use Cases:** State checkpoint, working memory snapshot

### ConfigChange
**When:** Settings or config files change
**Use Cases:** Sync validation, drift detection

---

## Hook Configuration

**Location:** `${PAI_DIR}/settings.json` (symlinked from `~/.claude/settings.json`)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": {},
        "hooks": [
          {
            "type": "command",
            "command": "${PAI_DIR}/hooks/my-hook.ts"
          }
        ]
      }
    ]
  }
}
```

---

## Hook Input/Output

### Input (stdin JSON)
```typescript
interface HookInput {
  session_id: string;
  transcript_path: string;
  // Event-specific fields...
}
```

### Output (stdout)
- **Continue:** `{ "continue": true }`
- **Block:** `{ "continue": false, "reason": "..." }`
- **Inject content:** `{ "result": "<system-reminder>...</system-reminder>" }`
- **Add context (CC 2.1.9+):** `{ "decision": "continue", "additionalContext": "..." }`

### Session ID Tracking (CC 2.1.9+)

Hooks receive `session_id` in input JSON. For persistent storage:

```typescript
// Use session_id from hook input
const sessionFile = `${PAI_DIR}/state/sessions/${input.session_id}.json`;

// Or use ${CLAUDE_SESSION_ID} substitution in settings.json:
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command", 
        "command": "${PAI_DIR}/hooks/init-session.ts --session ${CLAUDE_SESSION_ID}"
      }]
    }]
  }
}
```

---

## PAI Active Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `session-start.ts` | SessionStart | Load CORE skill, hints, crash recovery |
| `update-tab-titles.ts` | UserPromptSubmit | Set terminal tab titles |
| `keyword-router.ts` | UserPromptSubmit | Mode activation, skill injection |
| `rtk-rewrite.sh` | PreToolUse:Bash | RTK token reduction |
| `pre-tool-use-security.ts` | PreToolUse:Bash | Block dangerous Bash commands |
| `pre-tool-use-tdd.ts` | PreToolUse:Write,Edit,MultiEdit | TDD discipline enforcement |
| `post-tool-use.ts` | PostToolUse | JSONL tool usage logging |
| `post-tool-failure.ts` | PostToolUseFailure | Consecutive failure tracking |
| `subagent-start.ts` | SubagentStart | Delegation logging, mode state |
| `subagent-stop.ts` | SubagentStop | Deliverable recording, mode state |
| `pre-compact.ts` | PreCompact | State checkpoint before compression |
| `stop-hook.ts` | Stop | Mode continuation, memory injection, tab update |
| `config-change.ts` | ConfigChange | Settings sync validation |

---

## Hook Best Practices

1. **NEVER exit(1)** — Always `exit(0)`, even on error. Exit(1) = CC shows error to user
2. **readFileSync(0, 'utf-8')** for stdin — NEVER Bun.stdin.stream()
3. **chmod +x** — CC runs hooks directly via shebang, not via `bun run`
4. **Use getSessionId()** from pai-paths.ts — not inline env var chains
5. **Timeout-aware** — PostToolUse/Stop/SubagentStop/PreCompact need 2000ms, others 500ms
6. **Log errors to stderr** — console.error, not console.log (stdout is for hook output)

---

## Quick Hook Template

```typescript
#!/usr/bin/env bun
// ${PAI_DIR}/hooks/my-hook.ts

import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf-8'));

// Your logic here

// Output (choose one):
console.log(JSON.stringify({ continue: true }));
// console.log(JSON.stringify({ result: "<system-reminder>...</system-reminder>" }));
```

Make executable: `chmod +x my-hook.ts`

---

## Related

- See `post-tool-use.ts` for JSONL logging pattern
- See `hook-test` skill for hook health checking
