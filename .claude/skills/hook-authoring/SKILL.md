---
name: hook-authoring
context: fork
description: |
  Claude Code hook creation and configuration. PAI event-driven automation.
  USE WHEN: "create hook", "hook system", "modify hooks", "add hook"
---

## Workflow Routing

| Trigger | Read | Action |
|---------|------|--------|
| "create a hook for X", "add a hook" | `workflows/create-hook.md` | Hook creation |
| "hook not working", "debug hooks" | `workflows/debug-hooks.md` | Debugging checklist |

---

## Hook Events

| Event | When | Use |
|-------|------|-----|
| SessionStart | New session begins | Load context, initialize state |
| PreToolUse | Before tool executes | Security, permission, validation |
| PostToolUse | After tool executes | Logging, metrics, audit |
| UserPromptSubmit | User submits prompt | Pre-processing, context injection |
| Stop | Claude finishes response | Capture work, tab updates |
| PostToolUseFailure | Tool call fails | Error tracking, retry strategy |
| SubagentStart | Agent tool spawned | Delegation tracking |
| SubagentStop | Subagent completes | Deliverable recording |
| PreCompact | Before context compression | State checkpoint |
| ConfigChange | Settings/config change | Sync validation, drift detection |

---

## Configuration

**Location:** `${PAI_DIR}/settings.json` (symlinked from `~/.claude/settings.json`)

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": {},
      "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/my-hook.ts" }]
    }]
  }
}
```

---

## I/O Contract

**Input (stdin JSON):**
```typescript
interface HookInput {
  session_id: string;
  transcript_path: string;
  // event-specific fields
}
```

**Output (stdout):**
- Continue: `{ "continue": true }`
- Block: `{ "continue": false, "reason": "..." }`
- Inject: `{ "result": "<system-reminder>...</system-reminder>" }`
- Add context (CC 2.1.9+): `{ "decision": "continue", "additionalContext": "..." }`

**Session ID (CC 2.1.9+):** use `input.session_id` for persistent storage or `${CLAUDE_SESSION_ID}` substitution in settings.json.

```typescript
const sessionFile = `${PAI_DIR}/state/sessions/${input.session_id}.json`;
```

---

## PAI Active Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `session-start.ts` | SessionStart | Load CORE, hints, crash recovery |
| `update-tab-titles.ts` | UserPromptSubmit | Terminal tab titles |
| `keyword-router.ts` | UserPromptSubmit | Mode activation, skill injection |
| `rtk-rewrite.sh` | PreToolUse:Bash | RTK token reduction |
| `pre-tool-use-security.ts` | PreToolUse:Bash | Block dangerous Bash |
| `pre-tool-use-tdd.ts` | PreToolUse:Write,Edit,MultiEdit | TDD enforcement |
| `post-tool-use.ts` | PostToolUse | JSONL logging |
| `post-tool-failure.ts` | PostToolUseFailure | Consecutive failure tracking |
| `subagent-start.ts` | SubagentStart | Delegation logging, mode state |
| `subagent-stop.ts` | SubagentStop | Deliverable recording, mode state |
| `pre-compact.ts` | PreCompact | State checkpoint |
| `stop-hook.ts` | Stop | Mode continuation, memory injection, tab update |
| `config-change.ts` | ConfigChange | Settings sync validation |

---

## Critical Rules (Load-Bearing — From Past Incidents)

1. **NEVER `exit(1)`** — always `exit(0)`, even on error. `exit(1)` surfaces an error to the user.
2. **stdin:** use `readFileSync(0, 'utf-8')` — NEVER `Bun.stdin.stream()` or custom `readStdinWithTimeout`.
3. **`chmod +x` required** — CC runs hooks directly via shebang, not via `bun run`. Missing +x = "hook error".
4. **PAI paths:** use `getSessionId()` from `pai-paths.ts`, not inline env-var chains. `pai-paths.ts` must warn on bad paths (`console.error`), NEVER `process.exit(1)` — it crashes all importing hooks.
5. **Timeouts:** PostToolUse / Stop / SubagentStop / PreCompact need `2000ms` (bun startup). Others: `500ms`.
6. **Log errors to stderr** — `console.error`, not `console.log`. stdout is reserved for hook output JSON.
7. **Security regex:** ALWAYS_BLOCKED patterns must NOT use `$` anchor alone — use `(;|&&|\|\||$)` to cover chained commands.
8. **Session debounce:** lockfiles must include session ID to avoid cross-session interference.

---

## Template

```typescript
#!/usr/bin/env bun
// ${PAI_DIR}/hooks/my-hook.ts

import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf-8'));

// logic here

console.log(JSON.stringify({ continue: true }));
// or: console.log(JSON.stringify({ result: "<system-reminder>...</system-reminder>" }));
```

`chmod +x my-hook.ts`

---

## Related

- `post-tool-use.ts` — JSONL logging pattern
- `hook-test` skill — hook health checking
