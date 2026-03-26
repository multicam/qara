# Test Layers (Testing Trophy)

Adapted from Kent C. Dodds' Testing Trophy for PAI's Bun-first stack.
"The more your tests resemble the way your software is used, the more confidence they give you."

## Layers

| Layer | Tool | File Pattern | When to Run | Coverage Goal |
|-------|------|-------------|-------------|---------------|
| **Static** | `bun --check` (tsc) | `*.ts` | Always, pre-commit | 100% of source files |
| **Unit** | `bun test` | `*.test.ts` (co-located) | Pure logic, utils, transforms | 80%+ line coverage |
| **Integration** | `bun test` | `*.integration.test.ts` | Module boundaries, real code paths | Critical paths covered |
| **E2E** | Playwright / devtools-mcp | `*.spec.ts` in `tests/e2e/` | User journeys only | 3-5 scenarios per app |
| **Exploration** | Bombadil (experimental) | `*.bombadil.ts` in `specs/` | UI property invariants | Zero violations on properties |
| **Quality** | StrykerJS (future) | On demand | Validate test effectiveness | >70% mutation score |

## Most Valuable Layer: Integration

Unit tests catch logic errors in isolation. E2E tests catch broken user journeys. But **integration tests** catch the bugs that actually ship — pieces that work individually but fail together. This is where most real bugs live.

## Layer Details

### Static (bun --check)
- **What it catches:** Type errors, missing imports, interface mismatches
- **Cost:** Near-zero (seconds)
- **Node type:** Deterministic
- **Command:** `bun --check` or `tsc --noEmit`

### Unit (bun test *.test.ts)
- **What it catches:** Logic errors in pure functions, edge cases, boundary conditions
- **Cost:** Low (milliseconds per test)
- **Node type:** Deterministic
- **Pattern:** Co-locate with source — `utils.ts` has `utils.test.ts` next to it
- **Command:** `bun test path/to/file.test.ts`

### Integration (bun test *.integration.test.ts)
- **What it catches:** Module boundary failures, API contract violations, data flow errors
- **Cost:** Medium (may need setup/teardown, real dependencies)
- **Node type:** Deterministic
- **Pattern:** Test through public interfaces, not internal methods
- **Command:** `bun test path/to/file.integration.test.ts`

### E2E (Playwright / devtools-mcp)
- **What it catches:** Broken user journeys, cross-layer integration failures, rendering issues
- **Cost:** High (browser startup, network, flakiness risk)
- **Node type:** Agentic (when AI-driven via devtools-mcp) or Deterministic (frozen .spec.ts)
- **Pattern:** Only critical user journeys — 3-5 per app maximum
- **Command:** `bun playwright test` or devtools-mcp recipes

### Exploration — Bombadil (experimental)
- **What it catches:** Bugs you didn't think to write tests for — weird action sequences, timing issues, state corruption from unusual navigation
- **Cost:** Medium-high (autonomous exploration takes time, JSONL output parsing)
- **Node type:** Deterministic (binary execution) with agentic spec authoring
- **Pattern:** `*.bombadil.ts` in `specs/` — TypeScript property specs
- **Command:** `bombadil test <url> --output-path traces/`
- **Install:** Download binary from [GitHub releases](https://github.com/antithesishq/bombadil/releases), types via `bun add -d @antithesishq/bombadil`
- **Gate:** Separate from backtest loop (own quality gate: zero violations). Will unify with JUnit XML backtest loop if Bombadil is retained long-term.
- **Status:** v0.3.2, MIT license, experimental. Breaking changes expected.

### Quality — Mutation Testing (future)
- **What it catches:** Tests that pass but prove nothing (surviving mutants)
- **Cost:** Very high (runs test suite N times with code mutations)
- **Node type:** Deterministic
- **Tool:** StrykerJS (when Bun compatibility improves)

## Pyramid Execution Order

The `run-pyramid` workflow executes layers bottom-up, failing fast:

```
Static  → fail? STOP
Unit    → fail? STOP
Integration → fail? STOP
E2E     → fail? STOP (only frozen .spec.ts scenarios)
```

Each layer is a deterministic checkpoint. If it fails, don't proceed — the signal is the value.

## When NOT to Test

- Don't unit-test trivial getters/setters
- Don't E2E-test what integration tests already cover
- Don't test framework behavior (Bun, Playwright internals)
- Don't test implementation details — test behavior through public interfaces
