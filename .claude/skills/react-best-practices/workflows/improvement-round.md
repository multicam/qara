# Improvement Round Workflow

**Purpose:** Run a systematic round of React best practices improvements on TGDS Office codebase, applying only rules that are pending (not yet applied, and applicable to this codebase).

**When to Use:**
- User says "apply react best practices", "next round", "react cleanup", "improvement round"

**Prerequisites:**
- Read `references/rules-status.md` first to know current state
- Working directory: `/media/ssdev/tgds/tgds-office`

---

## Workflow Steps

### Step 1: Read Rules Status

Read the full rules-status.md to load current state:
- Which rules are APPLIED (skip these entirely)
- Which are NOT_APPLICABLE (skip these entirely)
- Which are PENDING (these are candidates for this round)

### Step 2: Select Rules for This Round

Pick 3-5 PENDING rules based on:
- **Impact**: Rules affecting rendering performance first
- **Effort**: Prefer rules with clear mechanical patterns
- **Safety**: Avoid rules requiring large architectural changes in early rounds

Announce the selected rules to the user before starting.

### Step 3: Scan Codebase for Each Rule

For each selected rule, search the relevant packages:
- `packages/next/src/` — React components and templates
- `packages/common/` — Shared utilities and hooks

Use Grep to find pattern violations. Key paths:
- `packages/next/src/components/` — UI components
- `packages/next/src/templates/components/` — LIST, TABS, GRID, etc.
- `packages/common/marshalls/` — Data transforms
- `packages/common/utils/` — Utilities
- `packages/common/data/hooks/` — Data hooks

### Step 4: Apply Fixes

For each violation found:
1. Read the file to understand context
2. Apply the fix using Edit tool
3. Verify the fix looks correct
4. Note file path and what changed

**IMPORTANT**: Always prefer editing existing files. Never create new files unless a marshall or hook is genuinely new functionality.

### Step 5: Update Rules Status

After completing each rule:
- If fully applied across codebase: mark as `APPLIED` in rules-status.md with round number
- If partially applied (some instances remain): keep as `PENDING` with a note
- If determined inapplicable after scanning: mark as `NOT_APPLICABLE` with reason

### Step 6: Report Results

Summarize what was done:
- Rules applied (with file counts)
- Files changed
- Rules remaining for next round

---

## Outputs

- Modified source files with improvements applied
- Updated `references/rules-status.md` with new statuses
- Session summary of changes made

---

## Related Workflows

- **SKILL.md** - For status review without applying changes
- **references/rules-status.md** - The source of truth for rule status

---

## Key Rules for Application

### Safe to Apply Mechanically (Low Risk)

These rules have clear patterns that can be applied without business logic risk:

**rerender-defer-reads** — Move state reads inside callbacks when not needed for render
```javascript
// BEFORE: subscribes to state only used in event handler
const [count, setCount] = useState(0)
const handleClick = () => console.log(count) // only used here

// AFTER: use ref for values only read in callbacks
const countRef = useRef(0)
const [, forceUpdate] = useState(0)
// or: use useCallback with ref pattern
```

**js-cache-property-access** — Cache repeated object property access in hot loops
```javascript
// BEFORE:
items.forEach(item => process(item.data.nested.value))

// AFTER:
items.forEach(item => {
  const val = item.data.nested.value
  process(val)
})
```

**rerender-move-effect-to-event** — Move interaction logic from effects to event handlers
```javascript
// BEFORE:
const [submitted, setSubmitted] = useState(false)
useEffect(() => {
  if (submitted) sendData()
}, [submitted])

// AFTER:
const handleSubmit = () => sendData()
```

**advanced-event-handler-refs** — Store event handlers in refs to avoid stale closure issues
```javascript
// BEFORE:
useEffect(() => {
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [handleResize]) // changes every render

// AFTER:
const handleResizeRef = useRef(handleResize)
useLayoutEffect(() => { handleResizeRef.current = handleResize })
useEffect(() => {
  const handler = (e) => handleResizeRef.current(e)
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}, []) // stable
```

**Fix eslint-disable-next-line react-hooks/exhaustive-deps** — Each suppression is a potential stale closure bug. For each one found:
1. Read surrounding code
2. Determine if the dep is actually safe to add
3. If adding it causes infinite loop, restructure with useRef or useCallback
4. If truly safe to omit (e.g., stable function), add useCallback to stabilize it

---

## Codebase-Specific Notes

- **No TypeScript**: All fixes must be plain JavaScript
- **React 18 only**: No `use()`, no `useOptimistic`, no server actions
- **Pages Router**: No `'use client'` directives needed or wanted
- **Blueprint.js**: Component props follow Blueprint API, not HTML5
- **`useCallback` audit**: Zero `React.memo` in codebase — most `useCallback` wrappers are currently useless (see MEMORY.md note from Feb 2026)
