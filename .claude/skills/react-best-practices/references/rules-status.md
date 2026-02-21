# React Best Practices — Rules Status Tracker

**Codebase**: TGDS Office — Next.js 15, React 18, JavaScript (no TypeScript, no React 19, no RSC)
**Last Updated**: Round 16 (Feb 2026)

**Status Legend**:
- `APPLIED` — Has been applied to the codebase in a previous round
- `NOT_APPLICABLE` — Does not apply to this codebase (see reason)
- `PENDING` — Not yet checked or applied; candidate for future rounds

---

## Guide 1: Vercel React Best Practices (57 rules)

Source: https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices

### APPLIED Rules

| Rule ID | Description | Round Applied |
|---------|-------------|---------------|
| `js-index-maps` | Use Maps/objects for O(1) lookups instead of Array.find in render | Round 1 |
| `rendering-conditional-render` | Use && or ternary instead of if/else for JSX conditionals | Round 1 |
| `js-combine-iterations` | Combine multiple .filter/.map chains into single passes | Round 1 |
| `rerender-memo-with-default-value` | Provide default values to avoid undefined memo dependencies | Round 2 |
| `rerender-lazy-state-init` | Use initializer functions in useState for expensive defaults | Round 2 |
| `js-set-map-lookups` | Use Set for membership checks, Map for key-value lookups | Round 2 |
| `rerender-derived-state-no-effect` | Compute derived state during render, not in useEffect + setState | Round 2 |
| `async-parallel` | Use Promise.all for independent async operations | Round 3 |
| `rerender-dependencies` | Minimize useEffect dependency arrays; stabilize with useCallback/useMemo | Round 3 |
| `js-min-max-loop` | Use Math.max/Math.min with spread or reduce instead of manual loops | Round 3 |
| `js-early-exit` | Early return to avoid deep nesting | Round 3 |
| `js-cache-storage` | Cache results of expensive operations using module-level variables | Round 4 |
| `rerender-use-ref-transient-values` | Use useRef for values that don't need to trigger re-renders | Round 4 |
| `rerender-functional-setstate` | Use functional form of setState when new state depends on old state | Round 4 |
| `advanced-init-once` | Initialize expensive resources once (module-level or lazy ref) | Round 4 |
| `js-hoist-regexp` | Hoist RegExp patterns to module level (not inside render/callbacks) | Round 5 |
| `rendering-hoist-jsx` | Hoist static JSX outside component to avoid recreation on every render | Round 5 |
| `js-cache-property-access` | Cache repeated object property access in loops (`const td = i.transactionData`) | Round 9 |
| `rerender-defer-reads` | Convert state only used in callbacks (never in JSX) to refs | Round 9 |
| `bundle-dynamic-imports` | `next/dynamic` for heavy components not needed on initial paint | Round 10 |
| `js-tosorted-immutable` | Use `.toSorted()` / `.toReversed()` instead of mutating `.sort()` | Round 11 |
| `rerender-transitions` | `startTransition` for non-urgent filter/search state updates | Round 15 |
| `js-cache-function-results` | Module-level Map cache for dayjs format/fromNow calls in per-row renderers | Round 15 |
| `bundle-conditional` | Dynamic import for draft-js (TextEdit + TQuill): ~2.8 MB only loaded when editor mounts | Round 16 |
| Data fetching ignore flag | preview.js async fetch in effect missing ignore flag | Round 16 |

---

### NOT_APPLICABLE Rules

| Rule ID | Reason |
|---------|--------|
| `server-*` (all server rules) | RSC/SSR only — this codebase uses static export (Pages Router) |
| `async-suspense-boundaries` | React Suspense for data is RSC pattern only |
| `rendering-activity` | React 19 `<Activity>` component — not in React 18 |
| `bundle-barrel-imports` | Would require large codebase restructuring; deferred indefinitely |
| `advanced-event-handler-refs` | All `addEventListener` handlers only call stable `setState` dispatchers — no stale closure risk |
| `client-localstorage-schema` | Architectural scope — no localStorage schema currently in use |
| `rendering-hydration-no-flicker` | Static export — no SSR hydration phase exists |

---

### PENDING Rules (Not Yet Applied)

#### Rendering / Re-render Optimization

**`rerender-memo`** — Extract expensive computation into its own memoized component
```javascript
// VIOLATION — ExpensiveChart re-renders whenever parent re-renders:
function Dashboard({ data }) {
  return <div><ExpensiveChart data={data} /><SomethingElse /></div>
}

// FIX — memoize the expensive child:
const MemoChart = React.memo(ExpensiveChart)
function Dashboard({ data }) {
  return <div><MemoChart data={data} /><SomethingElse /></div>
}
```
Note: Zero `React.memo` currently in codebase. Apply selectively where `data` is stable.

---

**`rerender-derived-state`** — Subscribe to a derived boolean, not the raw collection
```javascript
// VIOLATION:
const [items, setItems] = useState([])
const isEmpty = items.length === 0  // computed inside render — fine
// But if isEmpty triggers effects or is passed down many levels, derive at source

// FIX — derive the boolean when setting state:
const handleClear = () => {
  setItems([])
  setIsEmpty(true)  // or: compute in parent, pass boolean prop
}
```

---

**`rerender-simple-expression-in-memo`** — Don't wrap primitive computations in useMemo
```javascript
// VIOLATION — useMemo overhead exceeds savings for trivial computation:
const label = useMemo(() => `Hello ${name}`, [name])

// FIX — compute inline:
const label = `Hello ${name}`
```
Scan for `useMemo` wrapping simple string/number operations.

---

**`rerender-move-effect-to-event`** — Move interaction logic from effects to event handlers
```javascript
// VIOLATION:
const [submitted, setSubmitted] = useState(false)
useEffect(() => {
  if (submitted) { sendForm(); setSubmitted(false) }
}, [submitted])
const handleSubmit = () => setSubmitted(true)

// FIX:
const handleSubmit = () => sendForm()
```
Search for `useEffect` blocks triggered by boolean state flags set in event handlers.

---

**`js-length-check-first`** — Check array length before expensive operations
```javascript
// VIOLATION:
const result = items.filter(x => expensiveCheck(x))

// FIX:
const result = items.length > 0 ? items.filter(x => expensiveCheck(x)) : []
```

---

#### Advanced Patterns

**`advanced-use-latest`** — useLatest pattern: always-current ref to latest callback
```javascript
// Pattern: create a useLatest hook
function useLatest(value) {
  const ref = useRef(value)
  useLayoutEffect(() => { ref.current = value })
  return ref
}

// Usage: avoids stale closure without adding to dep array
const latestOnChange = useLatest(onChange)
useEffect(() => {
  const handler = () => latestOnChange.current()
  // ...
}, []) // stable, no stale closure
```

---

**`client-event-listeners`** — Deduplicate global event listeners using a shared registry
```javascript
// VIOLATION — each component instance adds its own resize listener:
useEffect(() => {
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}, [])

// FIX — module-level singleton listener with subscriber pattern
// or use a shared hook that adds one listener total
```

---

#### Bundle Optimization

**`bundle-defer-third-party`** — Load analytics/logging scripts after initial hydration
```javascript
useEffect(() => {
  // Runs after mount — doesn't block initial paint
  import('./analytics').then(m => m.init())
}, [])
```

---

**`bundle-conditional`** — Load feature modules only when feature is activated
```javascript
const handleOpenMap = async () => {
  const { renderMap } = await import('./mapRenderer')
  renderMap(containerRef.current)
}
```

---

**`bundle-preload`** — Preload heavy modules on hover/focus to eliminate perceived latency
```javascript
const handleHover = () => {
  import('./HeavyComponent')  // starts loading, result cached by bundler
}
return <button onMouseEnter={handleHover} onClick={handleOpen}>Open</button>
```

---

#### Rendering Hints

**`rendering-content-visibility`** — Use `content-visibility: auto` CSS for long offscreen lists
```css
.list-row {
  content-visibility: auto;
  contain-intrinsic-size: 0 60px; /* estimated row height */
}
```
Note: react-virtualized (used in LIST component) already handles this — apply only to non-virtualized lists.

---

**`client-passive-event-listeners`** — Add `{ passive: true }` to scroll/touch event listeners
```javascript
window.addEventListener('scroll', handleScroll, { passive: true })
```
Improves scroll performance by telling browser handler won't call `preventDefault()`.

---

**`rendering-svg-precision`** — Reduce SVG coordinate decimal precision
```javascript
// VIOLATION — SVG paths with 6+ decimal places bloat DOM:
// <path d="M 10.123456 20.654321 ..." />

// FIX — round to 2 decimal places in generation step or with script
```
Low priority — only matters if SVGs have many path points.

---

## Guide 2: softaworks/react-dev (TypeScript + React 19 patterns)

Source: https://skills.sh/softaworks/agent-toolkit/react-dev

**Status: ALL RULES NOT_APPLICABLE**

Reason: This guide targets TypeScript + React 19. TGDS Office is JavaScript + React 18.

Specific inapplicable features:
- TypeScript types, generics, type annotations
- `use()` hook (React 19)
- `useOptimistic` (React 19)
- Server Actions
- `useFormState` / `useFormStatus` (React 19)
- `cache()` function (React 19 server)

---

## Guide 3: 0xbigboss/react-best-practices (Effect patterns)

Source: https://skills.sh/0xbigboss/claude-code/react-best-practices

### APPLIED Rules (from this guide)

| Pattern | Description | Round Applied |
|---------|-------------|---------------|
| Compute during render | Replace `useEffect` + `setState` for derived state with direct computation | Round 2 |
| `useMemo` for expensive computation | Replace `useState` + `useEffect` with `useMemo` | Round 2 |
| Consolidate chained effects | Replace effect-triggering-effect chains with `useMemo` + single effect | Round 3 |
| `key` prop for state reset | Use `key` prop to remount component instead of `useEffect` reset | Round 3 |
| Fully controlled components | Ensure `value || ''` pattern for controlled inputs | Round 3 |
| Data fetching ignore flag | Add `let ignore` cleanup to prevent stale async responses from updating state | Round 7 |
| Move objects/functions inside effects | Fix ESLint suppressions: inline closured functions, add proper deps | Round 7 (partial) |

---

### PENDING Rules (from this guide)

**Move objects/functions inside effects** — Fix ESLint `exhaustive-deps` suppressions where the dep is an object/function created in render scope
```javascript
// VIOLATION — options recreated every render, must be in deps, causes infinite loop:
const options = { threshold: 0.5 }  // ← created in render
useEffect(() => {
  const observer = new IntersectionObserver(cb, options)
}, [options])  // ← eslint-disable added here to "fix"

// FIX — move object inside effect:
useEffect(() => {
  const options = { threshold: 0.5 }  // ← stable, created once per effect run
  const observer = new IntersectionObserver(cb, options)
}, [])
```
Search for all `// eslint-disable-next-line react-hooks/exhaustive-deps` in codebase.

---

**Data fetching ignore flag** — Race condition protection for fetch-in-effect pattern
```javascript
// VIOLATION — no cleanup, stale responses can overwrite fresh ones:
useEffect(() => {
  fetchData(id).then(data => setData(data))
}, [id])

// FIX — ignore flag pattern:
useEffect(() => {
  let ignore = false
  fetchData(id).then(data => {
    if (!ignore) setData(data)
  })
  return () => { ignore = true }
}, [id])
```
Scan all `useEffect` blocks containing `.then(setXxx)` without cleanup function.

---

**Ref callbacks for dynamic lists** (Rule 19) — Use callback refs instead of `useRef` for lists of elements
```javascript
// VIOLATION — can't track dynamic list of refs:
const itemRefs = useRef([])
items.map((item, i) => <div ref={el => itemRefs.current[i] = el} />)

// FIX — ref callback pattern with Map:
const itemMap = useRef(new Map())
const getRef = useCallback((node, id) => {
  if (node) itemMap.current.set(id, node)
  else itemMap.current.delete(id)
}, [])
items.map(item => <div ref={node => getRef(node, item.id)} />)
```

---

**`useImperativeHandle` for controlled exposure** (Rule 20) — When parent needs to call child methods imperatively
```javascript
// Pattern: expose only specific methods, not entire DOM node
const Input = forwardRef(function Input(props, ref) {
  const inputRef = useRef(null)
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = '' }
    // Only expose what parent needs
  }))
  return <input ref={inputRef} {...props} />
})
```

---

**Fix remaining `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions**

Each suppression is a potential stale closure or race condition. Process for each:
1. Read the surrounding code
2. Determine why the dep was omitted
3. If dep is a function: wrap it in `useCallback` to stabilize it
4. If dep is an object: move the object inside the effect
5. If dep changes too often: use a ref (useLatest pattern)
6. Only leave suppression if there's a documented, intentional reason

Current known instances (to be updated after each round):
- Search: `git grep "eslint-disable-next-line react-hooks/exhaustive-deps"` in packages/

---

## Round History

| Round | Date | Rules Applied | Files Changed |
|-------|------|---------------|---------------|
| Round 1 | Oct 2025 | js-index-maps, rendering-conditional-render, js-combine-iterations | Multiple |
| Round 2 | Oct 2025 | rerender-memo-with-default-value, rerender-lazy-state-init, js-set-map-lookups, rerender-derived-state-no-effect + useMemo/derive patterns | Multiple |
| Round 3 | Oct 2025 | async-parallel, rerender-dependencies, js-min-max-loop, js-early-exit + chained effects, key prop reset | Multiple |
| Round 4 | Oct 2025 | js-cache-storage, rerender-use-ref-transient-values, rerender-functional-setstate, advanced-init-once | Multiple |
| Round 5+ | Nov-Feb 2026 | js-hoist-regexp, rendering-hoist-jsx + architecture work (TABS, GRID, LIST, /support analysis) | Multiple |
| Round 7 | Feb 2026 | eslint-disable suppresses (8 fixed, 4 with clarifying comments), data-fetch ignore flags (6 files) | 11 files |
| Round 8 | Feb 2026 | All remaining suppresses cleared (Avatar, documents, emails/register, DocumentController, mailTemplates), ignore flags (DocumentController) | 5 files |
| Round 9 | Feb 2026 | js-cache-property-access (accountConsolidate, marshallCrm, enrolmentRegistrations), rerender-derived-state-no-effect (checkSupportDrafts localStorage→useMemo, ModerationsPage loaded→derived), rerender-defer-reads (newTable.js PublishedContent loading→ref) | 5 files |
| Round 10 | Feb 2026 | bundle-dynamic-imports (react-player→next/dynamic), dead code (useDBDrafts removed), console.log cleanup (add-thumbnail-dialog×4, preview, register), commented code removed (form.components, LatestPersonHeader, mergePerson) | 7 files |
| Round 11 | Feb 2026 | js-tosorted-immutable (emails.hook, student.hook, notes.hook, crmMailTemplates.hook), console.log cleanup (~20 files: 6 marshalls, 14 components), commented JSX removed (9 files: versioningDialog, correspondenceRenderers, common.js, LatestAsana, CourseTab, EmailContextMenu, renderRowInvoices, mergePerson×2), console.error upgrade (CreateDocument, renderFindStudent) | 23 files |
| Round 12 | Feb 2026 | Data fetching ignore flags (filter_selector, createParamLoader, addresses.hook, createSimpleLoader, users.hook, mailerTimeline), rerender-derived-state-no-effect (createPerson getFiltered→useMemo), bug fix: mailerTimeline double-find + object dep → stable string dep | 7 files |
| Round 13 | Feb 2026 | Data fetching ignore flags (student.hook×4: useStudentData, useStudentMeta, useStudentSurvey, useStudentNotes; form.components useServerData) | 2 files |

---

## Quick Reference: What to Do Next Round

Priority order for next improvement round:

1. **Fix `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions** — High impact, clear mechanical process
2. **`rerender-defer-reads`** — Reduces unnecessary re-renders for callback-only state
3. **`rerender-move-effect-to-event`** — Simplifies code, reduces effect count
4. **Data fetching ignore flag** — Fixes real race condition bugs
5. **`js-cache-property-access`** — Performance in render-heavy components
6. **`advanced-event-handler-refs`** — Fixes stale closure class of bugs
7. **`bundle-dynamic-imports`** — Bundle size improvement for heavy dialogs

Lower priority (do after above):
- `rerender-transitions` (startTransition for filters)
- `client-passive-event-listeners`
- `bundle-defer-third-party`
- `js-cache-function-results`
- ~~`js-tosorted-immutable`~~ (APPLIED Round 11)
- `rendering-content-visibility` (non-virtualized lists only)
- `advanced-use-latest` + `client-event-listeners` (together as a pattern)
- `bundle-conditional` + `bundle-preload` (together as route-based optimization)
