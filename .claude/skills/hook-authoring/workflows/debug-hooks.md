# Debug Hooks Workflow

Step-by-step procedure for diagnosing hook problems.

## Step 1: Identify the Symptom

| Symptom | Likely Cause | Jump To |
|---------|-------------|---------|
| "hook error" in Claude | Missing `chmod +x` or `exit(1)` | Step 2 |
| Hook doesn't run | Not registered in settings.json | Step 3 |
| Hook blocks Claude | `exit(1)` or bad JSON output | Step 4 |
| Hook output missing | Wrong stdout/stderr usage | Step 5 |
| Hook times out | Slow operation or stdin hang | Step 6 |

## Step 2: Check File Permissions

```bash
ls -la ${PAI_DIR}/hooks/<hook-name>.ts
# Must show: -rwxrwxr-x (executable)

# Fix:
chmod +x ${PAI_DIR}/hooks/<hook-name>.ts
```

Also verify shebang:
```bash
head -1 ${PAI_DIR}/hooks/<hook-name>.ts
# Must be: #!/usr/bin/env bun
```

## Step 3: Check Registration

```bash
cat ${PAI_DIR}/.claude/settings.json | jq '.hooks'
```

Verify:
- Event name matches (case-sensitive: `SessionStart`, not `sessionstart`)
- Path is correct and absolute
- Matcher is present (even if empty `{}`)

## Step 4: Test Hook Manually

```bash
# Simulate hook input
echo '{"session_id":"test-123","transcript_path":"/tmp/test"}' | \
  bun ${PAI_DIR}/hooks/<hook-name>.ts
```

Check:
- Exit code: `echo $?` (must be 0)
- Output: Valid JSON on stdout
- Errors: Check stderr output

## Step 5: Check Output Format

**Correct:** JSON to `console.log()` (stdout)
```typescript
console.log(JSON.stringify({ continue: true }));
```

**Wrong:** Mixing stdout/stderr
```typescript
// DON'T: console.log debug messages (pollutes stdout JSON)
console.log("debugging...");  // BAD - breaks JSON output

// DO: use console.error for debug
console.error("debugging...");  // OK - goes to stderr
```

## Step 6: Check for Timeouts

Default timeout in settings.json:
- `500` ms for most hooks
- `2000` ms for PostToolUse/Notification

If hook needs more time, increase timeout in settings.json.

Common timeout causes:
- Network calls without timeout
- `Bun.stdin.stream()` (hangs!) - use `readFileSync(0, 'utf-8')` instead
- Large file operations

## Step 7: Check Hook Logs

```bash
# JSONL audit trail (if post-tool-use logging active)
tail -20 ${PAI_DIR}/state/events/*.jsonl

# Session-specific state
ls ${PAI_DIR}/state/sessions/
```

## Quick Checklist

- [ ] File has `#!/usr/bin/env bun` shebang
- [ ] File is executable (`chmod +x`)
- [ ] Uses `readFileSync(0, 'utf-8')` for stdin
- [ ] Never calls `process.exit(1)`
- [ ] Outputs valid JSON to stdout
- [ ] Debug messages go to `console.error` (stderr)
- [ ] Registered in settings.json with correct event name
- [ ] Timeout is sufficient (500ms default, 2000ms for PostToolUse)
- [ ] No imported module calls `process.exit(1)`
