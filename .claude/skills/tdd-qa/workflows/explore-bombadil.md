# Workflow: Explore with Bombadil

Property-based autonomous exploration of web UIs. Finds bugs you didn't think to test for.

**Status:** Experimental (Bombadil v0.3.2). Separate quality gate from backtest loop.

## Prerequisites

- `bombadil` binary installed (`~/.local/bin/bombadil`)
- TypeScript types: `bun add -d @antithesishq/bombadil`
- A running web app (dev server or URL)
- Chrome/Chromium/Brave available for CDP

## Steps

### 1. Write Property Spec [AGENTIC]

Create `specs/{feature}.bombadil.ts` defining:
- **Extractors** — what to observe in the DOM
- **Properties** — what must always/eventually hold
- **Actions** (optional) — domain-specific actions beyond default clicks/types

```typescript
import { extract, always, eventually, now, actions } from "@antithesishq/bombadil";
export * from "@antithesishq/bombadil/defaults";  // default action generators

// Extractors: read DOM state into reactive cells
const errorBanner = extract(state =>
  state.document.body.querySelector(".error-banner")?.textContent ?? null
);

const loadingSpinner = extract(state =>
  state.document.body.querySelector(".spinner") !== null
);

// Properties: invariants that must hold under any action sequence
export const errorsResolve = always(
  now(() => errorBanner.current !== null).implies(
    eventually(() => errorBanner.current === null).within(5, "seconds")
  )
);

export const noInfiniteSpinner = always(
  now(() => loadingSpinner.current).implies(
    eventually(() => !loadingSpinner.current).within(10, "seconds")
  )
);

// Optional: domain-specific actions with weighted probability
export const submitForm = actions(() => [
  { Click: { name: "submit-btn", point: { x: 200, y: 400 } } }
]);
```

**Property writing guidelines:**
- Start with universal invariants: "errors always resolve," "loading always completes"
- Add temporal properties: "after action X, state Y eventually holds"
- Use `always()` for invariants, `eventually().within()` for liveness, `now().implies()` for conditional
- Keep extractors simple — querySelector + textContent/attribute reads
- Name specs `*.bombadil.ts` to distinguish from scenario specs

### 2. Run Exploration [DETERMINISTIC]

```bash
bombadil test http://localhost:3000 \
  --spec specs/{feature}.bombadil.ts \
  --output-path traces/ \
  --timeout 60s
```

Bombadil will:
1. Open the app in a browser via CDP
2. Extract DOM state → validate all properties
3. Execute a random action (click, type, navigate)
4. Wait for DOM mutation / navigation / timeout
5. Repeat for the duration

### 3. Analyze Violations [DETERMINISTIC]

```bash
# Count violations
jq -r 'select(.violations != [])' traces/trace.jsonl | wc -l

# Show violation details
jq -r 'select(.violations != []) | {step: .step, violations: .violations}' traces/trace.jsonl
```

**Gate:** Zero violations = PASS. Any violation = investigate.

### 4. Investigate Violations [AGENTIC]

For each violation:
- Read the action sequence that led to it (in the JSONL trace)
- Reproduce manually via devtools-mcp if needed
- Determine if it's a real bug or a spec issue (property too strict)
- If real bug → feed into triage-issue skill
- If spec issue → adjust the property

### 5. Report [DETERMINISTIC]

```
Bombadil exploration complete:
  URL: http://localhost:3000
  Duration: 60s
  Steps explored: {n}
  Properties checked: {n}
  Violations: {n}

  {violation details if any}

Gate: PASS (0 violations) / FAIL ({n} violations — investigate)
```

## Blueprint Summary

| Step | Node Type |
|------|-----------|
| Write property spec | Agentic |
| Run exploration | Deterministic |
| Analyze violations (jq) | Deterministic |
| Investigate violations | Agentic |
| Report | Deterministic |

## Relationship to Other Layers

- **Bombadil does NOT replace E2E scenarios.** E2E tests specific user journeys. Bombadil explores the space between journeys.

**When to use which:**
- **e2e-verify** — when you know the specific user journeys to test (happy paths, known edge cases)
- **Bombadil** — when you want to discover bugs *between* known journeys: unexpected action sequences, timing edge cases, state corruption from unusual navigation patterns
- **Bombadil does NOT feed into the backtest loop.** It has its own quality gate (zero violations). This is deliberate — Bombadil is experimental (v0.3.2) and its output format (JSONL) differs from the JUnit XML contract.
- **Future:** If Bombadil stabilizes and is retained, build a JSONL→JUnit XML adapter in `test-report.ts` to unify with the backtest loop.

## Sources

- [Bombadil GitHub](https://github.com/antithesishq/bombadil)
- [Bombadil Manual](https://antithesishq.github.io/bombadil/1-introduction.html)
- [Spec Language Reference](https://antithesishq.github.io/bombadil/3-specification-language.html)
- [From Quickstrom to Bombadil](https://wickstrom.tech/2026-01-28-there-and-back-again-from-quickstrom-to-bombadil.html)
- [Antithesis Platform](https://antithesis.com/) — commercial deterministic simulation (Bombadil is the free open-source entry point)
