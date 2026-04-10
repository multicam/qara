# tdd-qa Setup Guide

Set up the tdd-qa testing framework in any project (Bun or Vitest stacks).

## Quick Start

### 1. Create specs/ directory

```bash
mkdir -p specs
```

Add `specs/README.md` — see `scenario-format.md` in this references directory for the template.

### 2. Configure JUnit XML reporter

The backtest loop needs structured output.

**Vitest** (tgds-schoolyard, tgds-office):
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    reporters: ['default', 'junit'],
    outputFile: { junit: '.test-current.xml' },
  },
});
```

Or CLI: `pnpm test -- --reporter=junit --outputFile=.test-current.xml`

**Bun** (Qara, Hermes):
```bash
bun test --reporter=junit --reporter-outfile=.test-current.xml
```

### 3. Configure lcov coverage

**Vitest:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: '.coverage',
    },
  },
});
```

**Bun:**
```bash
bun test --coverage --coverage-reporter=lcov --coverage-dir=.coverage
```

### 4. Update .gitignore

```
# tdd-qa baselines (machine-local)
.test-baseline.xml
.test-current.xml
.coverage-baseline/
.coverage-current/
.coverage/
traces/
.stryker-tmp/

# E2E drafts
tests/e2e/*.draft.spec.ts
```

### 5. Add package.json scripts

```json
{
  "scripts": {
    "test:junit": "vitest run --reporter=junit --outputFile=.test-current.xml",
    "test:coverage": "vitest run --coverage",
    "test:backtest": "bun run $PAI_DIR/skills/tdd-qa/tools/test-report.ts compare --baseline .test-baseline.xml --current .test-current.xml"
  }
}
```

---

## Project-Specific Setup

### tgds-schoolyard (SvelteKit + Vitest)

**Stack:** SvelteKit 2, Vite 5, pnpm, Vitest 4.1, TailwindCSS, Carbon
**Dev server:** `pnpm dev` (port 5500)
**Existing tests:** 62 files in `tests/`

```bash
cd <project-root>
mkdir -p specs

# Update vitest.config.js: reporters: ['default', 'junit'] + outputFile config
# Add scripts to package.json (test:junit, test:backtest)

echo -e '\n# tdd-qa baselines\n.test-baseline.xml\n.test-current.xml\n.coverage-baseline/\n.coverage-current/\ntraces/' >> .gitignore

pnpm test:junit
cp .test-current.xml .test-baseline.xml

# Optional: Bombadil
curl -L -o ~/.local/bin/bombadil https://github.com/antithesishq/bombadil/releases/download/v0.3.2/bombadil-x86_64-linux
chmod +x ~/.local/bin/bombadil
pnpm add -D @antithesishq/bombadil
```

**Scenario ideas:**
- `specs/student-enrolment.md` — enrolment flow, payment, course access
- `specs/forum-posting.md` — create thread, reply, moderation
- `specs/course-navigation.md` — lesson progression, completion tracking
- `specs/governance.md` — role-based access, admin actions

**Bombadil properties:**
- "Loading spinners always resolve within 5s"
- "Error banners always disappear after dismissal"
- "Navigation never leads to a blank page"
- "Form submission never loses user input on error"

---

### tgds-office (Next.js + Vitest)

**Stack:** Next.js 15.5, React 18, pnpm workspace, Vitest 4.1, Blueprint.js
**Dev server:** `make dev` (port 6300)
**Existing tests:** 14 files in `tests/`
**Architecture:** YAML-driven page definitions (`app.definitions.yaml`)

```bash
cd <project-root>
mkdir -p specs

# Update vitest.config.ts at root for junit reporter
# Add scripts to root package.json

echo -e '\n# tdd-qa baselines\n.test-baseline.xml\n.test-current.xml\n.coverage-baseline/\n.coverage-current/\ntraces/' >> .gitignore

pnpm test:junit
cp .test-current.xml .test-baseline.xml
```

**Scenario ideas:**
- `specs/student-management.md` — CRUD, search, filtering
- `specs/yaml-page-rendering.md` — YAML definitions produce correct pages
- `specs/crm-operations.md` — account management, status transitions
- `specs/static-export.md` — build produces valid static output

**Bombadil properties:**
- "YAML-defined pages always render without console errors"
- "Table pagination never loses selected rows"
- "Form validation errors always display before submission"
- "Navigation breadcrumbs always reflect current location"

---

## TDD Enforcement Hook (PAI repos)

Blocks source file edits during RED phase of a TDD cycle. Automatic — the tdd-cycle workflow activates/deactivates it.

**Requirements:**
- `hooks/lib/tdd-state.ts` — state management library
- `hooks/pre-tool-use-tdd.ts` — PreToolUse hook for Write/Edit
- settings.json entries for Write and Edit matchers

**Phases:**
- **RED:** only test files (`.test.ts`, `.spec.ts`) editable
- **GREEN:** source files allowed
- **REFACTOR:** both allowed
- **No active cycle:** transparent (everything allowed)

State is session-scoped with 2h TTL. Stale state from crashed sessions is cleaned up on next session start.

---

## Targeted Test Selection

```bash
bun $PAI_DIR/skills/tdd-qa/tools/test-report.ts affected --files src/auth.ts,src/utils.ts
```

Co-location heuristic: `foo.ts` → looks for `foo.test.ts` and `foo.integration.test.ts` in the same directory. Faster than full suite during TDD inner loops.

---

## Mutation Testing (Advisory)

StrykerJS validates test effectiveness by mutating source and checking if tests catch changes.

```bash
bun add -d @stryker-mutator/core @stryker-mutator/typescript-checker
```

```json
// stryker.config.json
{
  "testRunner": "command",
  "commandRunner": { "command": "bun test" },
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "reporters": ["clear-text"],
  "tempDirName": ".stryker-tmp"
}
```

Adjust `commandRunner.command` for your runner (e.g., `vitest run`). Advisory only — reports mutation score, does not block merges. Threshold: >70%.

---

## E2E Browser Testing

| Tool | Use case | Size |
|------|----------|------|
| `playwright-core` | Direct browser automation (screenshots, capture) | ~5MB |
| `@playwright/test` | Full E2E test runner with fixtures and reporters | ~400MB + browsers |

**Recommendation:** Start with `playwright-core` for design verification. Only install `@playwright/test` for CI-runnable E2E suites.

```bash
bun add -d playwright-core
bun add -d @playwright/test
```

The `e2e-verify` workflow auto-drafts `.draft.spec.ts` files. Freeze for CI:

```bash
bun $PAI_DIR/skills/tdd-qa/tools/e2e-freeze.ts tests/e2e/*.draft.spec.ts
```

---

## Workflow Usage After Setup

**New feature:**
```
"write scenarios for student-enrolment"  → creates specs/student-enrolment.md
"run TDD on student-enrolment"           → RED→GREEN→VERIFY loop
"backtest"                                → compares against baseline
```

**After refactoring:**
```
"backtest"           → checks for regressions
"run the pyramid"    → static→unit→integration→e2e
```

**Chaos exploration:**
```
"explore with bombadil"  → autonomous UI property testing
```

Bombadil needs a running dev server:
- Schoolyard: `pnpm dev` → `bombadil test http://localhost:5500`
- Office: `make dev` → `bombadil test http://localhost:6300`

---

## Vitest vs Bun Compatibility Matrix

| Feature | Bun test | Vitest | Notes |
|---------|----------|--------|-------|
| JUnit XML output | `--reporter=junit` | `--reporter=junit` | Both supported |
| lcov coverage | `--coverage-reporter=lcov` | `--coverage.reporter=lcov` | Slightly different flags |
| Watch mode | `--watch` | Default | Vitest watches by default |
| File pattern | `*.test.ts` | `*.test.ts` | Same |
| E2E pattern | `*.spec.ts` | `*.spec.ts` | Same |
| test-report.ts | Works with both | Works with both | Parses JUnit XML, runner-agnostic |
| Backtest loop | Full support | Full support | JUnit XML is the common contract |

`test-report.ts` is agnostic to the test runner — the data contract is the format.

---

## Bombadil Installation

**Linux (x86_64):**
```bash
curl -L -o ~/.local/bin/bombadil \
  https://github.com/antithesishq/bombadil/releases/download/v0.3.2/bombadil-x86_64-linux
chmod +x ~/.local/bin/bombadil
```

**macOS (ARM64):**
```bash
curl -L -o ~/.local/bin/bombadil \
  https://github.com/antithesishq/bombadil/releases/download/v0.3.2/bombadil-aarch64-darwin
chmod +x ~/.local/bin/bombadil
```

**TypeScript types (per project):**
```bash
pnpm add -D @antithesishq/bombadil
# or
bun add -d @antithesishq/bombadil
```

Verify: `bombadil --version`

---

## Checklist: Ready to Use

**Core (required):**
- [ ] `specs/` directory with README.md
- [ ] JUnit XML reporter configured
- [ ] lcov coverage configured
- [ ] `.gitignore` updated (baselines, traces, `.stryker-tmp/`)
- [ ] Test scripts in package.json
- [ ] Initial baseline captured (`.test-baseline.xml`)

**Recommended:**
- [ ] First scenario spec in `specs/`
- [ ] `stryker.config.json` (advisory mutation testing)
- [ ] Coverage threshold set

**Optional:**
- [ ] Bombadil installed (UI exploration)
- [ ] `playwright-core` installed (design verification)
- [ ] TDD enforcement hook configured (PAI repos only)
