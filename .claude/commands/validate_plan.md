---
description: Validate implementation against plan, verify success criteria, identify issues
model: sonnet
---

# Validate Plan

Validate that an implementation plan was correctly executed.

## Setup

1. **Determine context** — existing conversation (review session work) or fresh (discover via git + codebase).
2. **Locate the plan** — use provided path, else search recent commits or ask user.
3. **Gather evidence:**
   ```bash
   git log --oneline -n 20
   git diff HEAD~N..HEAD
   cd $(git rev-parse --show-toplevel) && bun run test
   ```

## Validation Process

### Step 1: Context Discovery

Read the plan fully. Identify all files that should have changed, all success criteria, key functionality to verify.

Spawn parallel research tasks:
```
Task 1 - Verify database changes: migration N added, schema matches plan
Task 2 - Verify code changes: all modified files, planned vs actual
Task 3 - Verify test coverage: tests added/modified, test command results
```

### Step 2: Systematic Validation

For each phase:
1. **Check completion** — plan checkmarks vs actual code
2. **Run automated verification** — each command from "Automated Verification" section, document pass/fail, investigate failures
3. **Assess manual criteria** — list what needs manual testing, provide clear steps
4. **Think about edge cases** — error handling, missing validations, regressions

### Step 3: Validation Report

```markdown
## Validation Report: [Plan Name]

### Implementation Status
✓ Phase 1: [Name] - Fully implemented
✓ Phase 2: [Name] - Fully implemented
⚠️ Phase 3: [Name] - Partially implemented (see issues)

### Automated Verification Results
✓ Build passes: `bun run build`
✓ Tests pass: `bun run test`
✗ Linting issues: linter check (3 warnings)

### Code Review Findings

#### Matches Plan:
- [item]

#### Deviations from Plan:
- [file:line] — [description]

#### Potential Issues:
- [issue and impact]

### Manual Testing Required:
1. UI functionality:
   - [ ] Verify [feature]
2. Integration:
   - [ ] Confirm works with [component]

### Recommendations:
- [recommendation]
```

## Working with Existing Context

If you implemented this session: review conversation history, check todo list, focus validation on session work, be honest about shortcuts.

## Checklist

- [ ] All phases marked complete are actually done
- [ ] Automated tests pass
- [ ] Code follows existing patterns
- [ ] No regressions introduced
- [ ] Error handling is robust
- [ ] Documentation updated if needed
- [ ] Manual test steps are clear

## Post-Mortem: Plan vs Reality

Record what the plan got wrong. Append to validation report:

```markdown
### Plan Deviations Log

| Category | Detail |
|----------|--------|
| Underscoped phases | [Phase N needed splitting because...] |
| Missing phases | [Had to add X because plan didn't account for...] |
| Wrong file paths | [Plan said X, actual was Y] |
| Vague criteria | ["works correctly" → should have been "returns 200 on GET /api/..."] |
| Unnecessary work | [Phase N was not needed because...] |
```

IF 3+ deviations in a single category: flag it as a pattern. This log stays in the report for future `/create_plan` sessions (thoughts-analyzer will find it).

## Relationship to Other Commands

Workflow:
1. `cruise: implement {plan-file}` (or `turbo:` for 3+ independent phases)
2. Commit changes
3. `/validate_plan`
4. `gh pr create`

Validation works best after commits — it analyzes git history to understand what was implemented.
