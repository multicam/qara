# tdd-qa Setup Guide

How to set up the tdd-qa testing framework in any project. Covers both Bun and Vitest stacks.

## Quick Start (5 minutes)

### 1. Create specs/ directory

```bash
mkdir -p specs
```

Add `specs/README.md` — see `scenario-format.md` (in this same references directory) for the template.

### 2. Configure test reporter for JUnit XML

The backtest loop needs structured output. Both Bun and Vitest support JUnit XML.

**Vitest projects** (tgds-schoolyard, tgds-office):
```bash
# Add junit reporter (already built into Vitest)
pnpm test -- --reporter=junit --outputFile=.test-current.xml

# Or add to vitest.config.ts:
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    reporters: ['default', 'junit'],
    outputFile: {
      junit: '.test-current.xml',
    },
  },
});
```

**Bun projects** (Qara, Hermes):
```bash
bun test --reporter=junit --reporter-outfile=.test-current.xml
```

### 3. Configure coverage for lcov

**Vitest:**
```bash
pnpm test -- --coverage --coverage.reporter=lcov
# Or in vitest.config.ts:
```

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

# E2E drafts
tests/e2e/*.draft.spec.ts
```

### 5. Add test scripts to package.json

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

**Path:** `<project-root>` (e.g. your local schoolyard checkout)
**Stack:** SvelteKit 2, Vite 5, pnpm, Vitest 4.1, TailwindCSS, Carbon
**Dev server:** `pnpm dev` (port 5500)
**Existing tests:** 62 files in `tests/`

**Setup steps:**

```bash
cd <project-root>

# 1. Create specs directory
mkdir -p specs

# 2. Update vitest.config.js to add junit reporter
# Add reporters: ['default', 'junit'] and outputFile config

# 3. Add scripts to package.json
# "test:junit": "vitest run --reporter=junit --outputFile=.test-current.xml"
# "test:backtest": "bun run $PAI_DIR/skills/tdd-qa/tools/test-report.ts compare --baseline .test-baseline.xml --current .test-current.xml"

# 4. Update .gitignore
echo -e '\n# tdd-qa baselines\n.test-baseline.xml\n.test-current.xml\n.coverage-baseline/\n.coverage-current/\ntraces/' >> .gitignore

# 5. Create initial baseline
pnpm test:junit
cp .test-current.xml .test-baseline.xml

# 6. (Optional) Install Bombadil for UI exploration
curl -L -o ~/.local/bin/bombadil https://github.com/antithesishq/bombadil/releases/download/v0.3.2/bombadil-x86_64-linux
chmod +x ~/.local/bin/bombadil
pnpm add -D @antithesishq/bombadil
```

**Schoolyard-specific scenario ideas:**
- `specs/student-enrolment.md` — enrolment flow, payment, course access
- `specs/forum-posting.md` — create thread, reply, moderation
- `specs/course-navigation.md` — lesson progression, completion tracking
- `specs/governance.md` — role-based access, admin actions

**Schoolyard Bombadil properties:**
- "Loading spinners always resolve within 5s"
- "Error banners always disappear after dismissal"
- "Navigation never leads to a blank page"
- "Form submission never loses user input on error"

---

### tgds-office (Next.js + Vitest)

**Path:** `<project-root>` (e.g. your local office checkout)
**Stack:** Next.js 15.5, React 18, pnpm workspace, Vitest 4.1, Blueprint.js
**Dev server:** `make dev` (port 6300)
**Existing tests:** 14 files in `tests/`
**Architecture:** YAML-driven page definitions (`app.definitions.yaml`)

**Setup steps:**

```bash
cd <project-root>

# 1. Create specs directory
mkdir -p specs

# 2. Update vitest.config.ts at root to add junit reporter

# 3. Add scripts to root package.json
# "test:junit": "vitest run --reporter=junit --outputFile=.test-current.xml"
# "test:backtest": "bun run $PAI_DIR/skills/tdd-qa/tools/test-report.ts compare --baseline .test-baseline.xml --current .test-current.xml"

# 4. Update .gitignore
echo -e '\n# tdd-qa baselines\n.test-baseline.xml\n.test-current.xml\n.coverage-baseline/\n.coverage-current/\ntraces/' >> .gitignore

# 5. Create initial baseline
pnpm test:junit
cp .test-current.xml .test-baseline.xml

# 6. (Optional) Install Bombadil
# Same as schoolyard
```

**Office-specific scenario ideas:**
- `specs/student-management.md` — CRUD, search, filtering
- `specs/yaml-page-rendering.md` — YAML definitions produce correct pages
- `specs/crm-operations.md` — account management, status transitions
- `specs/static-export.md` — build produces valid static output

**Office Bombadil properties:**
- "YAML-defined pages always render without console errors"
- "Table pagination never loses selected rows"
- "Form validation errors always display before submission"
- "Navigation breadcrumbs always reflect current location"

---

## Workflow Usage After Setup

### Daily development (Mode 1: New feature)

```
JM: "write scenarios for student-enrolment"     → creates specs/student-enrolment.md
JM: "run TDD on student-enrolment"              → RED→GREEN→VERIFY loop
JM: "backtest"                                   → compares against baseline
```

### After refactoring (Mode 3: Confidence check)

```
JM: "backtest"                                   → checks for regressions
JM: "run the pyramid"                            → static→unit→integration→e2e
```

### Finding hidden bugs (Mode 5: Chaos exploration)

```
JM: "explore with bombadil"                      → autonomous UI property testing
```

Bombadil requires a running dev server:
- Schoolyard: `pnpm dev` → `bombadil test http://localhost:5500`
- Office: `make dev` → `bombadil test http://localhost:6300`

---

## Vitest vs Bun Compatibility Matrix

| Feature | Bun test | Vitest | Notes |
|---------|----------|--------|-------|
| JUnit XML output | `--reporter=junit` | `--reporter=junit` | Both supported |
| lcov coverage | `--coverage-reporter=lcov` | `--coverage.reporter=lcov` | Slightly different flags |
| Watch mode | `--watch` | Default behavior | Vitest watches by default |
| File pattern | `*.test.ts` | `*.test.ts` | Same convention |
| E2E pattern | `*.spec.ts` | `*.spec.ts` | Same convention |
| test-report.ts | Works with both | Works with both | Parses JUnit XML, agnostic to runner |
| Backtest loop | Full support | Full support | JUnit XML is the common contract |

**Key insight:** `test-report.ts` doesn't care which test runner produced the JUnit XML. The data contract is the format, not the tool.

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

**Verify installation:**
```bash
bombadil --version
```

---

## Checklist: Ready to Use

- [ ] `specs/` directory created with README.md
- [ ] JUnit XML reporter configured (vitest.config or bun flag)
- [ ] lcov coverage configured
- [ ] `.gitignore` updated for baselines and traces
- [ ] Test scripts added to package.json
- [ ] Initial baseline captured (`.test-baseline.xml`)
- [ ] (Optional) Bombadil installed and types added
- [ ] (Optional) First scenario spec written in `specs/`
