# Create Hook Workflow

Step-by-step procedure for creating a new Claude Code hook.

## Step 1: Determine Hook Event

Ask the user which event triggers the hook:

| Event | When | Common Use |
|-------|------|------------|
| SessionStart | New session begins | Load context, init state |
| Stop | Claude completes response | Extract info, update UI |
| UserPromptSubmit | User sends prompt | Pre-processing, context injection |
| SubagentStop | Task agent completes | Agent tracking, coordination |
| PreToolUse | Before tool execution | Security, validation |
| PostToolUse | After tool execution | Logging, audit trail |
| Notification | Alert triggered | External notifications |

## Step 2: Create the Hook File

```typescript
#!/usr/bin/env bun
// ${PAI_DIR}/hooks/<hook-name>.ts

import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf-8'));

// Hook logic here

// Output (choose appropriate response):
console.log(JSON.stringify({ continue: true }));
```

## Step 3: Critical Requirements (MUST DO)

1. **Make executable:** `chmod +x <hook-file>.ts`
2. **Stdin:** ALWAYS use `readFileSync(0, 'utf-8')` - NEVER `Bun.stdin.stream()`
3. **Error handling:** ALWAYS `exit(0)` even on errors - NEVER `exit(1)`
4. **Shebang:** Must have `#!/usr/bin/env bun` as first line
5. **Output:** Valid JSON to stdout, errors to stderr (`console.error`)

## Step 4: Register in settings.json

Add to `${PAI_DIR}/.claude/settings.json`:

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": {},
        "hooks": [
          {
            "type": "command",
            "command": "${PAI_DIR}/hooks/<hook-name>.ts",
            "timeout": 500
          }
        ]
      }
    ]
  }
}
```

**Timeout guidance:**
- Most hooks: `500` ms
- PostToolUse/Notification: `2000` ms (bun startup overhead)

## Step 5: Hook Output Schemas

### Continue (default)
```json
{ "continue": true }
```

### Block action (PreToolUse only)
```json
{
  "hookSpecificOutput": {
    "permissionDecision": "deny",
    "reason": "Blocked: explanation"
  }
}
```

### Inject context
```json
{ "result": "<system-reminder>Injected context here</system-reminder>" }
```

## Step 6: Test

1. Write tests in `.claude/tests/<hook-name>.test.ts`
2. Run: `bun run test`
3. Manual test: `echo '{"session_id":"test"}' | bun .claude/hooks/<hook-name>.ts`

## Common Patterns

### Reading from libs
```typescript
import { PAI_DIR, ensureDir } from '../hooks/lib/pai-paths.ts';
import { appendJsonl } from '../hooks/lib/jsonl-utils.ts';
```

### Session-aware hooks
```typescript
const sessionId = input.session_id;
const lockFile = `${PAI_DIR}/state/.lock-${sessionId}`;
```
