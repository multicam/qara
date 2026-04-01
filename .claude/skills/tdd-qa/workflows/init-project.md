# Workflow: Init Project

> This workflow is idempotent — running it twice will not overwrite existing content. Each step checks for existing files before writing.

Bootstrap test infrastructure in any project. Run once per project.

**All nodes: DETERMINISTIC** — no LLM reasoning, just file creation.

-> **READ:** `../references/cross-project-config.md` for portable config templates
-> **READ:** `../references/setup-guide.md` for Bun/Vitest setup patterns

## Steps

### 1. Check Prerequisites [DETERMINISTIC]

Verify the project has:
- A `package.json` or `tsconfig.json` (confirms it's a TS/JS project)
- Bun installed (`bun --version`)

If missing, inform JM and stop.

### 2. Create specs/ Directory [DETERMINISTIC]

```bash
mkdir -p specs
```

Create `specs/README.md`:

```markdown
# Test Scenarios

This directory contains feature specifications in Given/When/Then format.
Each file defines scenarios for one feature.

## Format

See the tdd-qa skill's `references/scenario-format.md` for the full spec.

## Quick Example

### Scenario: [name]
- **Given** [precondition]
- **When** [action]
- **Then** [observable outcome]
- **Priority:** critical | important | nice-to-have
```

### 3. Create tests/e2e/ Directory [DETERMINISTIC]

Only if the project has a UI (check for framework indicators: `svelte`, `react`, `next`, `astro` in package.json dependencies).

```bash
mkdir -p tests/e2e
```

### 4. Configure bunfig.toml [DETERMINISTIC]

If `bunfig.toml` doesn't exist, create it. If it exists, merge the `[test]` section.

```toml
[test]
coveragePathIgnorePatterns = ["node_modules/", "purgatory/", "tests/e2e/"]
```

### 5. Update .gitignore [DETERMINISTIC]

Append if not already present:

```
# tdd-qa baselines (machine-local)
.test-baseline.xml
.test-current.xml
.coverage-baseline/
.coverage-current/
```

### 6. Report [DETERMINISTIC]

Print summary of what was created:

```
tdd-qa init complete:
  ✓ specs/           — scenario definitions (Given/When/Then)
  ✓ specs/README.md  — format reference
  ✓ tests/e2e/       — E2E test directory (if UI project)
  ✓ bunfig.toml      — test config with coverage exclusions
  ✓ .gitignore       — baseline files excluded

Next: "write scenarios for [feature]" to define your first test specs.
```

### 7. Capture Test Environment Snapshot [DETERMINISTIC]

Before the first TDD cycle, capture a snapshot of the project's test state. This eliminates 2-4 exploratory turns normally spent discovering project structure (Meta-Harness TerminalBench insight).

```bash
echo "Test Environment Snapshot ($(date -Iseconds))"
echo "Runner: $(bun --version 2>/dev/null && echo 'bun:test' || echo 'unknown')"
echo "Test files: $(find . -name '*.test.ts' -o -name '*.spec.ts' 2>/dev/null | wc -l)"
echo "Test count: $(bun test --dry-run 2>/dev/null | grep -c 'test' || echo 'unknown')"
echo "Last run: $(stat -c %Y .test-current.xml 2>/dev/null | xargs -I{} date -d @{} -Iseconds || echo 'never')"
```

Output this snapshot to the conversation so the TDD cycle starts with full project awareness — no need to explore file structure or discover the test runner.
