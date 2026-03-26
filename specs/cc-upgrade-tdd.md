# Feature: CC-Upgrade TDD Compliance Audit

## Context
The cc-upgrade and cc-upgrade-pai skills audit .claude/ folders for best practices but have zero visibility into testing discipline. This feature adds recursive TDD compliance checking — the audit tools enforce the same discipline they benefit from.

## Scenarios

### Base TDD Compliance (cc-upgrade)

### Scenario: Audit finds no tests
- **Given** a .claude/ folder with hooks but no .test.ts files anywhere
- **When** cc-upgrade runs TDD compliance audit
- **Then** findings include "NO: No test files found"
- **And** recommendations include "Add co-located .test.ts files"
- **And** TDD score is 0/20
- **Priority:** critical

### Scenario: Audit finds full test coverage
- **Given** a .claude/ folder where every hook and tool has a co-located .test.ts
- **And** bunfig.toml has coverage config
- **And** specs/ directory has scenario files
- **And** .test-baseline.xml exists
- **When** cc-upgrade runs TDD compliance audit
- **Then** TDD score is 20/20
- **And** no recommendations in TDD section
- **Priority:** critical

### Scenario: Audit detects partial hook coverage
- **Given** 5 hooks exist but only 3 have co-located .test.ts
- **When** cc-upgrade runs TDD compliance audit
- **Then** findings include "OK: 3/5 hooks have co-located tests"
- **And** recommendations list the 2 untested hooks
- **Priority:** important

### Scenario: Audit detects skipped tests
- **Given** test files containing `.skip(` or `.todo(` calls
- **When** cc-upgrade runs TDD compliance audit
- **Then** findings include "WARN: {n} skipped/todo tests found"
- **Priority:** important

### Scenario: Audit detects missing test runner config
- **Given** no package.json scripts.test and no bunfig.toml [test] section
- **When** cc-upgrade runs TDD compliance audit
- **Then** findings include "--: No test runner configured"
- **And** recommendations include "Configure test runner"
- **Priority:** important

### PAI TDD Compliance (cc-upgrade-pai)

### Scenario: PAI repo with full TDD infrastructure
- **Given** a PAI repo with tdd-qa skill, enforcement hook in settings.json, tdd-state.ts, quality-gates.md, and 100+ tests
- **When** cc-upgrade-pai runs TDD compliance audit
- **Then** PAI TDD score is >35/40
- **Priority:** critical

### Scenario: PAI repo without TDD enforcement hook
- **Given** a PAI repo where settings.json has no pre-tool-use-tdd.ts matcher
- **When** cc-upgrade-pai runs TDD compliance audit
- **Then** findings include "NO: TDD enforcement hook not registered"
- **And** recommendations include adding Write/Edit matchers to settings.json
- **Priority:** critical

### Scenario: PAI repo with low test count
- **Given** a PAI repo with only 10 tests
- **When** cc-upgrade-pai runs TDD compliance audit
- **Then** findings include "WARN: only 10 tests (threshold: 50)"
- **Priority:** important

### Scenario: PAI repo without tdd-qa skill
- **Given** a PAI repo with no skills/tdd-qa/ directory
- **When** cc-upgrade-pai runs TDD compliance audit
- **Then** findings include "NO: tdd-qa skill not installed"
- **And** recommendations include installing tdd-qa skill
- **Priority:** important

## Out of Scope
- Running the target repo's tests (audit checks structure, not execution)
- Validating test quality (that's mutation testing's job)
- Checking git history for TDD commit patterns

## Acceptance Criteria
- [ ] analyzeTddCompliance() returns AnalysisResult with 20pt maxScore
- [ ] analyzeTddCompliancePAI() extends with 20pt PAI maxScore
- [ ] Running cc-upgrade on qara itself scores >35/40
- [ ] TDD section appears in cc-upgrade report output
- [ ] All analyzers have co-located tests
