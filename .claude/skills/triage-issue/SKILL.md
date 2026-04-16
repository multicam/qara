---
name: triage-issue
context: fork
effort: low
description: |
  Investigate bugs, identify root causes, create GitHub issues with TDD fix plans. Single or batch mode.
  USE WHEN: "triage this bug", "investigate issue", "file a bug", "batch triage".
---

## Workflow Routing

| Trigger | Action |
|---------|--------|
| "triage", "investigate", "root cause" | Run full process (single mode) |
| "file an issue", "create bug report" | Skip to Phase 4-5 |
| "pile of issues", "batch triage", "QA session" | Batch mode — loop process per issue with dep tracking |

Triggers: triage / investigate / diagnose / debug / troubleshoot / file issues / root cause / bug sweep.

## Process

### Phase 1: Problem Capture

Minimal questioning — get the what, not the why. Batch mode: one problem at a time, no upfront gathering.

### Phase 2: Reproduce + Explore

**Reproduce first:**
- Run relevant tests (`bun test` with targeted pattern)
- Execute reported command/workflow
- Consistent or intermittent?
- Document reproduction steps and actual output

If reproduction fails, the question shifts from "why does X happen" to "under what conditions".

**Then explore** (codebase-analyzer or direct):
- Source files related to the behavior
- Existing tests (passing + failing)
- Git history in affected area
- Error handling paths

### Phase 3: Root Cause

Classify:
- **Regression** — worked before, broken by a specific change
- **Missing feature** — never implemented
- **Design flaw** — works as coded but design is wrong

Present with evidence (file:line, git blame, test output).

### Phase 3.5: Scope Assessment

**Break down into multiple issues when:**
- Root cause reveals independent problems
- Fix spans multiple modules doable in parallel
- Multiple distinct TDD cycles produce cleaner, independently-mergeable PRs

**Keep as single issue when:**
- One root cause, one fix area, one TDD cycle
- Symptoms are cascading effects of a single defect

**When breaking down:**
1. List sub-issues with working titles
2. Identify blocking relationships (B's test depends on A's fix)
3. Order filing: blockers first
4. Run Phase 4-5 for each in dependency order

**Explicit batch mode** ("I have a pile"): skip scope assessment, go straight to per-issue loop. Track cross-refs as issues accumulate.

**Out-of-scope KB check** (wontfix candidates): before classifying an enhancement as wontfix, check `.out-of-scope/` at project root for a matching concept file. If found, reference it when closing. If confirmed new wontfix, create record in Phase 5.

### Phase 4: TDD Fix Plan

Ordered RED-GREEN cycles with minimal changes per cycle.

**Principles:**
- **Durable tests:** describe modules, behaviors, contracts — not implementation details
- **Observable outcomes:** test API responses, UI state, user-visible effects — not internal state
- **Vertical slices:** each cycle = one slice against public interfaces
- **Minimal steps:** smallest possible change per cycle

### Phase 4.5: Agent Brief (Optional)

For agent-suitable issues (clear scope, testable criteria, no ambiguous design). Describe interfaces and behaviors, not file paths, so it survives refactoring.

```md
## Agent Brief

**Category:** bug / enhancement
**Summary:** one-line description

**Current behavior:**
[broken behavior / status quo]

**Desired behavior:**
[specific about edge cases]

**Key interfaces:**
- `TypeName` — what changes and why
- `functionName()` — current return vs expected

**Acceptance criteria:**
- [ ] Testable criterion 1
- [ ] Testable criterion 2

**Out of scope:**
- What should NOT be changed
```

Include as collapsible section in issue body.

### Phase 5: Issue Creation

`gh issue create` with:

```md
## Problem Statement
[Developer's perspective]

## Root Cause
[What's broken and why — file:line refs, git blame evidence]

## Fix Plan (TDD)
1. RED: [test] → GREEN: [minimal fix]
2. RED: [test] → GREEN: [minimal fix]

## Blocked By
<!-- Batch/breakdown mode only. Omit for standalone single issues. -->
- #<number> — [brief reason]
Or: None — can start immediately

## Acceptance Criteria
- [ ] All new tests pass
- [ ] No regressions
- [ ] [Specific behavioral criteria]

## Out of Scope
[What this fix does NOT address]
```

**Wontfix out-of-scope record** (enhancements):
Create `.out-of-scope/<concept>.md` at project root — one file per concept (kebab-case), not per issue. Include reasoning, project scope / technical constraints, prior issue numbers. If file exists, append issue number to "Prior requests." Close issue with `wontfix` label linking the reasoning.

**Batch mode filing rules:**
- File in dependency order (blockers first) so numbers can be referenced
- Print URL + blocking summary after each
- After batch complete, print summary table:

| # | Title | Blocked by | URL |
|---|-------|------------|-----|

Proceed directly to creation — don't ask for review unless diagnosis is uncertain.

### Phase 6: Session Continuation (Batch Only)

Ask: **"Next issue, or are we done?"**

- Another bug → loop to Phase 1
- Done → final session summary: total filed, dependency graph, all URLs
