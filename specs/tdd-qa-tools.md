# Feature: TDD-QA Tools

## Context
Deterministic tools that support the TDD workflow: test-report.ts (JUnit/lcov parsing, comparison, affected test selection) and e2e-freeze.ts (draft-to-frozen spec promotion).

## Scenarios

### Scenario: Freeze a draft E2E spec
- **Given** a file `tests/e2e/login.draft.spec.ts` exists
- **When** `e2e-freeze.ts` is run with that file path
- **Then** file is renamed to `tests/e2e/login.spec.ts`
- **And** output shows "FROZEN: login.draft.spec.ts -> login.spec.ts"
- **Priority:** critical

### Scenario: Freeze skips when target already exists
- **Given** both `login.draft.spec.ts` and `login.spec.ts` exist
- **When** `e2e-freeze.ts` is run with the draft file
- **Then** output shows "SKIP: target already exists"
- **And** neither file is modified
- **Priority:** critical

### Scenario: Freeze rejects non-draft files
- **Given** a file `login.spec.ts` (not a .draft.spec.ts)
- **When** `e2e-freeze.ts` is run with that file
- **Then** output shows "SKIP: not a .draft.spec.ts file"
- **Priority:** important

### Scenario: Freeze handles nonexistent files
- **Given** the path `tests/e2e/nonexistent.draft.spec.ts` does not exist
- **When** `e2e-freeze.ts` is run with that path
- **Then** output shows "SKIP: file does not exist"
- **Priority:** important

### Scenario: Freeze batch via glob
- **Given** 3 `.draft.spec.ts` files exist in `tests/e2e/`
- **When** `e2e-freeze.ts` is run with a glob pattern `tests/e2e/*.draft.spec.ts`
- **Then** all 3 are frozen
- **And** summary shows "Done: 3 frozen, 0 skipped"
- **Priority:** important

### Scenario: Find affected tests for a source file
- **Given** `src/auth.ts` has co-located `src/auth.test.ts` and `src/auth.integration.test.ts`
- **When** `test-report affected --files src/auth.ts` is run
- **Then** output contains both test file paths
- **And** exit code is 0
- **Priority:** critical

### Scenario: Affected reports unmapped files
- **Given** `src/utils.ts` has no co-located test file
- **When** `test-report affected --files src/utils.ts` is run
- **Then** output contains "unmapped: src/utils.ts"
- **And** exit code is 1 (no tests found)
- **Priority:** important

### Scenario: Test baseline comparison detects regressions
- **Given** a baseline XML where `test-login` passes
- **And** a current XML where `test-login` fails
- **When** `test-report compare` is run
- **Then** output shows "REGRESSIONS" with the test name
- **And** exit code is 1
- **Priority:** critical

## Out of Scope
- Testing bun test runner itself
- JUnit XML schema compliance (parser is lenient by design)

## Acceptance Criteria
- [ ] All critical scenarios pass
- [ ] e2e-freeze.ts has co-located .test.ts with >90% logic coverage
- [ ] No regressions in existing test-report tests
