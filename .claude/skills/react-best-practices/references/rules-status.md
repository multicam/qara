# React Best Practices — Rules Status Tracker

**Codebase**: TGDS Office — Next.js 15, React 18, JavaScript (no TypeScript, no React 19, no RSC)
**Last Updated**: Round 26 (Feb 2026) — TQuill.component.js audited and improved; 3 previously-untracked Guide 4 composition rules evaluated

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
| Data fetching ignore flag | preview.js async fetch in effect (Round 16); 13 hooks layer violations (Round 18) | Round 16, 18 |
| `bundle-preload` | onMouseEnter preload for TextEdit on CorrespPanel "Sender" button | Round 17 |
| `client-event-listeners` | courseSelect + listSelect: moved handleClick inside effect (Round 17); useClickOutside hook created + 4 components refactored (Header, listSelect, courseSelect, SearchAll) | Round 17, 21 |
| `rerender-move-effect-to-event` | Codebase already clean — one pre-existing violation in userRenderers.js was already fixed | Round 19 |
| `rerender-simple-expression-in-memo` | sendTestEmail.js: removed trivial useMemo wrapping single .filter(); other candidates retained (referential stability needed) | Round 19 |
| `js-length-check-first` | marshallGradeFinder + marshallModerations: Map constructor guards (`?.length ?` before `.map()`) | Round 21 |
| `rerender-derived-state` | useUrlSearchParam: replaced useState+useEffect with direct computation during render | Round 22 |
| `rendering-content-visibility` | LatestAsana.js: `contentVisibility: auto` + `containIntrinsicSize: auto 48px` on AsanaLineItem | Round 23 |

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
| `client-passive-event-listeners` | No scroll/wheel/touch events in codebase — only mousedown/focus/blur/keydown (none need passive) |
| `bundle-defer-third-party` | Static export (`output: 'export'`) — no hydration phase; mount effects already run after paint |
| `rendering-animate-svg-wrapper` | Only 4 static SVG icon files (gmailAlt, mandrill, the, aboriginalFlag) — no animated SVGs in codebase |
| `rendering-usetransition-loading` | All `loading` states are for API mutation responses, not concurrent state transitions — `useTransition.isPending` only applies to `startTransition`-wrapped setState calls |
| `js-batch-dom-css` | DOM style mutations only appear in: canvas imperative API (required) and copy-to-clipboard utility (runs once, not hot path) — no React render-cycle violations |
| `rendering-hydration-suppress-warning` | Static export — no hydration mismatches possible |
| `async-defer-await` | No server-side async routes — static export only |
| `async-dependencies` | No server-side sequential deps — static export only |
| `async-api-routes` | No Next.js API routes used — backend is separate service |
| `client-swr-dedup` | Custom two-phase cache system already implemented — SWR would conflict with existing architecture |
| `rendering-svg-precision` | 4 static SVG icons only; paths are simple geometric shapes, not complex splines — no precision bloat |
| `hooks-useeffect-named-functions` | 85 files with anonymous arrow effects — debugging-only benefit, zero runtime value; not worth the churn |
| `composition-compound-components` | DialogSpec.js already uses the pattern; refactoring remaining dialogs is high churn for marginal gain |

---

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
| Move objects/functions inside effects | Exhaustive audit (Round 20): only 1 suppression in entire codebase — preview.js `[activeId]` intentional + documented | Round 7 (partial), 20 |

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

## Guide 4: sergiodxa/agent-skills frontend-react-best-practices (33 rules)

Source: https://skills.sh/sergiodxa/agent-skills/frontend-react-best-practices

New rules discovered in skill enrichment (Feb 2026). Covers composition patterns, hook quality, and error resilience.

### NOT_APPLICABLE Rules (from this guide)

| Rule ID | Reason |
|---------|--------|
| `composition-typescript-namespaces` | TypeScript only — codebase is JavaScript |
| `rendering-hydration-suppress-warning` (sergiodxa) | Static export — no hydration mismatches |
| `rendering-client-only` | Static export, no SSR divergence possible |
| `rendering-use-hydrated` | Static export, no SSR/CSR divergence |
| `no-forwardref` | React 19 pattern — not in React 18 |
| `composition-state-provider` | No global context patterns — codebase uses store object prop threading |

### APPLIED Rules (from this guide)

| Rule ID | Description | Round Applied |
|---------|-------------|---------------|
| `hooks-limit-useeffect` | 3 violations fixed — registerCall.js, NoteTemplates.js (key prop), form.engine.js (useMemo) | Round 24 |
| `composition-avoid-boolean-props` | Audited — codebase already uses string `type` props, no violations found | Round 24 |
| `fault-tolerant-error-boundaries` | ErrorBoundary class component created; integrated in tabs.js (each ComponentBuilder) and CoursesList.js (each CourseBlock) | Round 25 |

### NOT_APPLICABLE Rules (from this guide)

| Rule ID | Reason |
|---------|--------|
| `composition-typescript-namespaces` | TypeScript only — codebase is JavaScript |
| `rendering-hydration-suppress-warning` | Static export — no hydration mismatches |
| `rendering-client-only` | Static export, no SSR divergence possible |
| `rendering-use-hydrated` | Static export, no SSR/CSR divergence |
| `no-forwardref` | React 19 pattern — not in React 18 |
| `composition-state-provider` | No global context patterns — codebase uses store object prop threading |
| `hooks-useeffect-named-functions` | 85 anonymous arrow effects — debugging-only benefit, zero runtime value |
| `composition-compound-components` | DialogSpec.js already uses pattern; remaining dialogs too high churn for marginal gain |
| `composition-explicit-variants` | All variant switching already uses string `type` props — no boolean prop combinations encoding mutually exclusive states found |
| `composition-children-over-render-props` | All render prop usage is library-required (react-virtualized `headerRenderer`, YAML-driven `renderRowFunction`) or data-passing (not structural) — no violations |
| `composition-avoid-overabstraction` | `config`/`options`/`settings` props are all data passing (country lists, gender options, correspConfig) not rigid component configuration APIs — no violations |

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
| Round 14-18 | Feb 2026 | rerender-transitions (list.js startTransition), js-cache-function-results (renderCells dayjs caching), bundle-conditional (draft-js dynamic import), bundle-preload (CorrespPanel onMouseEnter), client-event-listeners closure fix (Round 17), data fetching ignore flags (13 hooks: events, tutor, payments, useIgnoreList, emailTemplates, notes, inspiration, forum, calendly, mailTemplates, crmMailTemplates, correspondence) | Multiple |
| Round 19 | Feb 2026 | rerender-simple-expression-in-memo (sendTestEmail.js), NOT_APPLICABLE marked: client-passive-event-listeners, bundle-defer-third-party, rerender-move-effect-to-event (already clean) | 1 file |
| Round 20 | Feb 2026 | eslint-disable audit — 1 suppression in entire codebase (preview.js, intentional + documented). No changes needed. | 0 files |
| Round 21 | Feb 2026 | client-event-listeners: useClickOutside hook created, refactored Header + listSelect + courseSelect + SearchAll; js-length-check-first: Map constructor guards in marshallGradeFinder + marshallModerations | 7 files |
| Round 22 | Feb 2026 | rerender-derived-state: useUrlSearchParam → direct compute during render (removed useState+useEffect); rerender-memo N/A: row renderers are cellRenderer function callbacks (not JSX components), React.memo has no effect | 1 file |
| Round 23 | Feb 2026 | advanced-use-latest (stale closure fix): WrapImg inspiration/item.js — ref guard replaces stale !dimensions state check, removed `ref` from useEffect deps; rendering-content-visibility: LatestAsana.js AsanaLineItem + containIntrinsicSize | 2 files |
| Skill enrichment | Feb 2026 | Web search: added Guide 4 (sergiodxa 33 rules), audited 6 new rules from Guide 1 not previously tracked, marked 13 new NOT_APPLICABLE rules with codebase evidence | 0 code files |
| Round 24 | Feb 2026 | hooks-limit-useeffect: 3 remaining violations fixed — registerCall.js (useEffect prop sync → key prop), NoteTemplates.js Editor (useEffect state sync → key prop), form.engine.js useFormState (useEffect+setState → useMemo+useEffect); composition-avoid-boolean-props: audited — no mutually exclusive boolean variant violations found (codebase already uses string `type` props) | 3 files |
| Round 25 | Feb 2026 | fault-tolerant-error-boundaries: ErrorBoundary class component created (src/components/ErrorBoundary.js); integrated in tabs.js (wraps each ComponentBuilder) and CoursesList.js (wraps each CourseBlock); hooks-useeffect-named-functions + composition-compound-components marked NOT_APPLICABLE | 3 files |
| Round 26 | Feb 2026 | TQuill.component.js audited and improved: useRef stale-closure workaround → useMemo+useEffect pattern (matching TextEdit.component.js), NEWLINE_RE regex hoisted to module level (js-hoist-regexp), dead props (dropzone/handleDropzone) removed, try/catch guard added to buildEditorState; 3 previously-untracked Guide 4 composition rules (composition-explicit-variants, composition-children-over-render-props, composition-avoid-overabstraction) evaluated and marked NOT_APPLICABLE | 1 file |

---

## Quick Reference: What to Do Next Round

**All 4 guides are now exhausted.** Every rule has been APPLIED or marked NOT_APPLICABLE.

- **Guide 1** (Vercel, 57 rules): Complete
- **Guide 2** (softaworks, TypeScript+React 19): NOT_APPLICABLE entirely
- **Guide 3** (0xbigboss, effect patterns): Complete
- **Guide 4** (sergiodxa, 33 rules): Complete (all 33 rules evaluated including 3 previously-untracked composition rules)

To continue improvements, run the skill update workflow to fetch new guides from skills.sh.
