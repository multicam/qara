---
workflow: test-and-fix
description: Test all hooks end-to-end and auto-correct common issues
---

# Hook Test & Auto-Correct Workflow

Run this workflow to validate all PAI hooks and fix common issues.

## Step 1: Discover Hooks

Read `${PAI_DIR}/settings.json` and extract all hook configurations.
For each hook event type (SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop), find the hook command paths.

## Step 2: Validate Hook Files

For each hook command found in settings:
1. Resolve `${PAI_DIR}` in the command path
2. Check the file exists
3. Check it has execute permission (`chmod +x`) — CC runs hooks directly via shebang, NOT via `bun run`
4. Check it has a bun shebang (`#!/usr/bin/env bun`)
5. Check it has a `main()` function with try/catch

**Auto-fix:** If file is missing, report it. If not executable, run `chmod +x`. This is the #1 cause of "hook error" messages.

## Step 3: Check Stdin Pattern

For each hook file, check HOW it reads stdin:

**CORRECT pattern:**
```typescript
import { readFileSync } from 'fs';
const input = readFileSync(0, 'utf-8');
```

**BROKEN patterns (will cause timeouts/errors):**
```typescript
// BAD: Bun.stdin streaming — hangs in hook context
const reader = Bun.stdin.stream().getReader();

// BAD: Bun.stdin.text() — can hang waiting for EOF
const input = await Bun.stdin.text();
```

**Auto-fix:** Replace `readStdinWithTimeout` or `Bun.stdin.text()` calls with `readFileSync(0, 'utf-8')`. Update imports accordingly.

## Step 4: Check Error Handling

Each hook MUST:
1. Wrap `main()` in try/catch
2. Exit 0 on error (never exit 1 — that signals CC to show error)
3. NOT call `process.exit(1)` anywhere (including imported modules)
4. Catch JSON.parse errors from stdin

**Auto-fix:** Add try/catch wrapper if missing. Replace `process.exit(1)` with `process.exit(0)` in hook files (NOT in libraries — libraries should warn, not exit).

## Step 5: Run Each Hook

For each hook, spawn it with appropriate mock stdin and check:

| Hook Event | Mock Stdin | Expected Exit | Expected Output |
|---|---|---|---|
| SessionStart | `""` (empty) | 0 | system-reminder on stdout (normal) or empty (subagent) |
| PreToolUse | `{"tool_name":"Bash","tool_input":{"command":"ls"}}` | 0 | empty (allow) or hookSpecificOutput JSON |
| PostToolUse | `{"tool_name":"Read","tool_input":{},"was_error":false}` | 0 | empty |
| UserPromptSubmit | `{"session_id":"test","prompt":"hello"}` | 0 | empty (tab title goes to stderr) |
| Stop | `{"transcript_path":"/tmp/fake","stop_reason":"end_turn"}` | 0 | empty |

**Critical:** ANY non-zero exit code is a bug. Report and suggest fix.

```bash
# Test command pattern:
echo '{"tool_name":"Read","tool_input":{}}' | bun run ${PAI_DIR}/hooks/post-tool-use.ts
echo "Exit: $?"
```

## Step 6: Check Settings Sync

Compare `${PAI_DIR}/settings.json` and `${PAI_DIR}/settings-minimal.json`:
1. Same hook event types configured
2. Same hook command paths
3. Same timeout values
4. Same deny list entries

**Auto-fix:** Sync settings-minimal.json hooks section from settings.json.

## Step 7: Check Import Health

For each hook, verify its imports resolve:
1. `./lib/pai-paths` — must exist, must NOT call process.exit(1)
2. `./lib/jsonl-utils` — must exist
3. `./lib/datetime-utils` — must exist
4. `./lib/tab-titles` — must exist (if imported)

**Auto-fix:** Remove unresolvable imports.

## Step 8: Report

Output a summary table:

```
Hook Health Report
==================

| Hook | File | Stdin | Error Handling | Runtime | Status |
|------|------|-------|----------------|---------|--------|
| SessionStart | OK | OK | OK | exit 0 | PASS |
| PreToolUse | OK | OK | OK | exit 0 | PASS |
| PostToolUse | OK | FIXED | OK | exit 0 | FIXED |
| UserPromptSubmit | OK | OK | OK | exit 0 | PASS |
| Stop | OK | OK | OK | exit 0 | PASS |

Settings sync: OK
Total: 5 hooks, 4 pass, 1 fixed, 0 fail
```

## Common Issues Reference

| Symptom | Cause | Fix |
|---------|-------|-----|
| `PostToolUse hook error` in CC | File not executable (missing chmod +x) | `chmod +x` the hook file |
| `PostToolUse hook error` in CC | `readStdinWithTimeout` hangs | Use `readFileSync(0, 'utf-8')` |
| Hook crashes on import | `pai-paths.ts` calls `process.exit(1)` | Change to `console.error` warning |
| Hook timeout | Settings timeout too low (<500ms) | Set to 2000ms minimum |
| Settings desync | Edited one file, forgot the other | Sync hooks section between files |
| `ensureDir` not found | Removed from jsonl-utils | Import from pai-paths instead |
| Tab title not updating | Missing escape sequence for terminal | Check TERM env variable handling |
