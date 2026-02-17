---
name: hook-test
context: fork
description: |
  Test all PAI hooks end-to-end and auto-correct common issues.
  Runs each hook with mock stdin, validates exit codes, output format, and settings sync.
  Fixes: wrong stdin pattern, missing error handling, settings desync, broken imports.
  USE WHEN: "test hooks", "hook health check", "fix hooks", "hooks broken"
---

## Workflow Routing (SYSTEM PROMPT)

**When user says "test hooks", "hook health check", "check hooks", "hooks status":**
-> **READ:** `${PAI_DIR}/skills/hook-test/workflows/test-and-fix.md`
-> **EXECUTE:** Run full hook test suite with auto-correct

**When user says "fix hooks", "hooks broken", "hook errors":**
-> **READ:** `${PAI_DIR}/skills/hook-test/workflows/test-and-fix.md`
-> **EXECUTE:** Run diagnostics and auto-correct

---

## What This Skill Does

1. **Validates hook files exist** and match settings.json config
2. **Runs each hook** with mock stdin, checking exit codes (must be 0)
3. **Validates output format** (PreToolUse must output hookSpecificOutput JSON)
4. **Checks stdin pattern** (must use `readFileSync(0, 'utf-8')`, NOT streaming)
5. **Checks settings sync** between settings.json and settings-minimal.json
6. **Auto-corrects** common issues when `--fix` is passed

## Quick Usage

```bash
# Test all hooks
claude "/hook-test"

# Test and auto-fix
claude "/hook-test fix"
```
