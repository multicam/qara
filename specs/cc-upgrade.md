# Feature: CC-Upgrade Scripts

## Context
4 untested scripts in the cc-upgrade ecosystem: analyse-external-skills (symlink scanning), cc-feature-sync (changelog parsing), skill-pulse-check (upstream monitoring), and analyse-pai (PAI-specific analysis).

## Scenarios

### analyse-external-skills.ts

### Scenario: Scan symlinked external skills
- **Given** a .claude/skills/ directory with 3 symlinked skill directories
- **When** analyse-external-skills runs
- **Then** each symlink is resolved and its SKILL.md frontmatter is parsed
- **And** report lists skill name, source path, and context type
- **Priority:** critical

### Scenario: Handle broken symlinks gracefully
- **Given** a symlinked skill directory where the target no longer exists
- **When** analyse-external-skills runs
- **Then** report shows "WARN: broken symlink" for that skill
- **And** analysis continues for remaining skills
- **Priority:** important

### Scenario: Detect lock files
- **Given** a skill directory with a `.lock` file indicating version pinning
- **When** analyse-external-skills runs
- **Then** report includes lock file version info
- **Priority:** nice-to-have

### cc-feature-sync.ts

### Scenario: Parse CC changelog for new features
- **Given** a CHANGELOG.md with 3 new features since tracked version
- **When** cc-feature-sync runs
- **Then** each new feature is listed with version and description
- **And** features are categorized by type (skill, hook, API, etc.)
- **Priority:** critical

### Scenario: Handle network failure for changelog fetch
- **Given** GitHub is unreachable (fetch fails)
- **When** cc-feature-sync runs
- **Then** error is reported gracefully (no crash)
- **And** exit code is non-zero
- **Priority:** important

### Scenario: No new features since last sync
- **Given** tracked version matches latest CHANGELOG version
- **When** cc-feature-sync runs
- **Then** output says "Up to date — no new features"
- **Priority:** important

### skill-pulse-check.ts

### Scenario: Check upstream repo for updates
- **Given** an installed skill from a GitHub repo
- **And** upstream has 5 new commits since the installed version
- **When** skill-pulse-check runs
- **Then** report shows "OUTDATED: 5 commits behind"
- **And** latest release info is included
- **Priority:** critical

### Scenario: Handle missing GitHub token
- **Given** no GITHUB_TOKEN and `gh auth token` fails
- **When** skill-pulse-check runs
- **Then** falls back to unauthenticated API (60 req/hr limit)
- **And** report includes rate limit warning
- **Priority:** important

### analyse-pai.ts

### Scenario: PAI-specific structure validation
- **Given** a PAI repo with CORE skill, hooks/, agents/, and state/
- **When** analyse-pai runs
- **Then** all PAI-specific structural checks pass
- **And** CORE skill routing is validated
- **Priority:** critical

### Scenario: Missing CORE skill detected
- **Given** a .claude/ directory without skills/CORE/SKILL.md
- **When** analyse-pai runs
- **Then** report includes "NO: CORE skill not found"
- **And** recommendation includes "Create CORE skill"
- **Priority:** critical

## Out of Scope
- Testing GitHub API rate limiting behavior (use mocks)
- Testing actual git operations on real repos
- Testing shared.ts independently (already tested)

## Acceptance Criteria
- [ ] All critical scenarios pass
- [ ] Each script has co-located .test.ts
- [ ] Pure logic tested separately from API calls
- [ ] No regressions in existing cc-upgrade tests
