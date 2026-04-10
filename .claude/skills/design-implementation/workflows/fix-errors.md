# Fix Errors Workflow

Systematic error fixing with categorization and iteration tracking.

**Triggers:** "fix the errors", "fix the console errors", "the build is broken". Automatically invoked by `implement-feature` when verification fails.

## Error Categories & Fix Strategies

### P0: Console Errors (fix immediately)

| Error | Fix |
|-------|-----|
| Undefined variable | Add import or define |
| Cannot read property | Add null check or fix data flow |
| Module not found | Install package or fix import path |
| Syntax error | Fix syntax |

1. Parse error message for file:line
2. Read the file
3. Apply fix via Edit
4. Verify

### P0: TypeScript Errors (fix immediately)

```bash
bun tsc --noEmit 2>&1
```

| Error | Fix |
|-------|-----|
| Type mismatch | Fix type or add assertion |
| Missing property | Add to interface or make optional |
| Cannot find module | Add types or fix import |
| Argument type | Fix function call |

1. Parse TS error for file:line:column
2. Read surrounding context
3. Apply type fix
4. Re-run tsc

### P1: Network Errors

| Error | Fix |
|-------|-----|
| 404 Not Found | Fix asset path or create asset |
| 500 Server Error | Check API implementation |
| CORS Error | Fix server config or use proxy |
| Failed to fetch | Check URL or network |

### P1: Visual Layout Issues

| Issue | Fix |
|-------|-----|
| Wrong positioning | Fix flex/grid/position CSS |
| Missing element | Add component to JSX |
| Wrong size | Fix width/height/padding |
| Overflow/clipping | Fix overflow or container size |

### P2: Visual Style Issues

| Issue | Fix |
|-------|-----|
| Wrong color | Update Tailwind class or CSS variable |
| Wrong font | Fix font-family or font-size |
| Wrong spacing | Adjust margin/padding |
| Missing shadow/border | Add utility class |

---

## Iteration Protocol

```
MAX_ITERATIONS = 5 (from config)

FOR iteration IN 1..MAX_ITERATIONS:
  1. Read current errors from state.json
  2. Sort by priority (P0 first)
  3. Fix highest priority error
  4. Wait for HMR
  5. Re-verify
  6. Update state.json

  IF all errors fixed: BREAK → Success
  IF same error persists 2+ times: mark "stuck", try alternative OR escalate

IF iteration >= MAX_ITERATIONS:
  Generate escalation report
  Ask Jean-Marc for guidance
```

---

## Fix Templates

```typescript
// Cannot find module './Component'
import Component from './components/Component';

// Property 'foo' does not exist on type 'Bar'
interface Bar { foo?: string; }
const value = bar?.foo;

// Cannot read property 'x' of undefined
const value = data?.x ?? defaultValue;
```

```tsx
// Element not centered
<div className="flex items-center justify-center">
  {/* content */}
</div>
```

---

## Convergence / Stuck Detection

```json
{
  "errorHistory": [
    { "iteration": 1, "count": 5, "types": ["console", "ts", "visual"] },
    { "iteration": 2, "count": 3, "types": ["ts", "visual"] },
    { "iteration": 3, "count": 3, "types": ["ts", "visual"] }
  ]
}
```

**Stuck signals:** same error count 2+ iterations, same error type recurring, or new errors introduced by fix.

**Resolution:** try alternative approach → revert + different strategy → escalate.

---

## Escalation Report

Generated when max iterations reached:

```markdown
# Escalation Report

**Feature:** ${FEATURE_NAME}
**Iterations:** ${MAX_ITERATIONS} (limit reached)
**Status:** Needs manual intervention

## Remaining Errors

### Error N: [type]
- File: path:line
- Message: ...
- Attempts: N
- Approaches tried:
  1. ... → result
  2. ... → result

## Recommendations
- ...

## Artifacts
- Screenshots: history/${FEATURE_ID}/
- Error logs: history/${FEATURE_ID}/errors.log
- State: state.json

## Questions for Jean-Marc
- ...
```

---

## Quick Fix Mode

For P0 errors (console/TS), skip full verification:

1. Apply fix
2. Wait for HMR
3. Check only that specific error resolved
4. Continue to next error

Run full verification after all P0 fixed.
