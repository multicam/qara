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

### Currently PENDING — Priority Order

After 23 rounds, Guide 1 (Vercel 57 rules) is fully exhausted. Remaining candidates come from Guide 4 (sergiodxa) and Guide 3 (0xbigboss).

---

**`hooks-limit-useeffect`** (Guide 4) — Verify no useEffect is used for data derivation or navigation. All such uses should derive during render or use useMemo.
```javascript
// VIOLATION — useEffect for state derivation:
useEffect(() => {
  setFiltered(items.filter(i => i.active))
}, [items])

// FIX — compute during render:
const filtered = useMemo(() => items.filter(i => i.active), [items])
// or directly:
const filtered = items.filter(i => i.active)
```
Scan: `packages/next/src/` and `packages/common/data/hooks/` for useEffect that calls setState with transformed data.

---

**`composition-avoid-boolean-props`** (Guide 4) — Components with multiple boolean props encoding mutually exclusive states should use explicit variant props instead.
```javascript
// VIOLATION:
<Button primary loading />
<Panel isOpen isCollapsed />

// FIX:
<Button variant="primary" state="loading" />
<Panel mode="open" />
```
Scan: Look for component JSX with 3+ boolean props. Only refactor where the booleans encode mutually exclusive visual states (not independent feature flags).

---

**`fault-tolerant-error-boundaries`** (Guide 4) — Wrap feature sections in React error boundaries to contain failures. No error boundaries currently exist in codebase.
```javascript
import { ErrorBoundary } from 'react-error-boundary'

// Wrap feature sections:
<ErrorBoundary fallback={<div className="p-4 text-red-600">Failed to load.</div>}>
  <StudentDetailsPanel />
</ErrorBoundary>
```
Priority targets: TABS template (data fetch failures), student detail pages, CRM person page. Requires installing `react-error-boundary` or writing a class-based fallback.

---

**`hooks-useeffect-named-functions`** (Guide 4) — Use named function declarations in useEffect for better DevTools stack traces.
```javascript
// BEFORE (anonymous arrow):
useEffect(() => {
  fetchStudentData(id)
}, [id])

// AFTER (named function):
useEffect(function fetchStudentOnIdChange() {
  fetchStudentData(id)
}, [id])
```
Note: 85 files have anonymous arrow effects. Zero runtime impact — only debugging value. Low priority. Apply selectively to complex effects only.

---

### Safe to Apply Mechanically (Low Risk)

These rules have clear patterns that can be applied without business logic risk:

**`rerender-defer-reads`** — Move state reads inside callbacks when not needed for render
```javascript
// BEFORE: subscribes to state only used in event handler
const [count, setCount] = useState(0)
const handleClick = () => console.log(count) // only used here

// AFTER: use ref for values only read in callbacks
const countRef = useRef(0)
const [, forceUpdate] = useState(0)
// or: use useCallback with ref pattern
```

**`js-cache-property-access`** — Cache repeated object property access in hot loops
```javascript
// BEFORE:
items.forEach(item => process(item.data.nested.value))

// AFTER:
items.forEach(item => {
  const val = item.data.nested.value
  process(val)
})
```

**`rerender-move-effect-to-event`** — Move interaction logic from effects to event handlers
```javascript
// BEFORE:
const [submitted, setSubmitted] = useState(false)
useEffect(() => {
  if (submitted) sendData()
}, [submitted])

// AFTER:
const handleSubmit = () => sendData()
```

**`advanced-event-handler-refs`** — Store event handlers in refs to avoid stale closure issues
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
- **Guide 1 exhausted**: All 57 Vercel rules have been evaluated. 32 applied, 18 N/A, 7 remaining low-priority pending
- **Guide 4 active**: sergiodxa 33-rule guide added Feb 2026 — 4 PENDING rules, 6 NOT_APPLICABLE

---

## Rule Source Reference

| Guide | Source | Rules | Status |
|-------|--------|-------|--------|
| Guide 1 | https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices | 57 rules | Fully evaluated (Round 1-23) |
| Guide 2 | https://skills.sh/softaworks/agent-toolkit/react-dev | TypeScript+React 19 | ALL NOT_APPLICABLE |
| Guide 3 | https://skills.sh/0xbigboss/claude-code/react-best-practices | Effect patterns | Mostly applied |
| Guide 4 | https://skills.sh/sergiodxa/agent-skills/frontend-react-best-practices | 33 rules | 4 PENDING, 6 N/A (added Feb 2026) |
