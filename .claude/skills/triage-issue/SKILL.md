---
name: triage-issue
context: fork
effort: low
description: |
  Investigate reported problems, identify root causes, and create GitHub issues
  with TDD-based fix plans. Supports single bugs and batch sessions with
  blocking relationships and dependency ordering. Pairs with codebase-analyzer
  and engineer agents.
  Adapted from mattpocock/skills (upstream commits 1325b14 triage-issue + 6a87ed0 qa + 651eab0 github-triage cherry-picks).
  USE WHEN: "triage this bug", "investigate issue", "file a bug", "root cause analysis",
  "what's causing this", "create issue for this bug", "batch triage", "QA session",
  "I have a pile of issues"
---

## Workflow Routing (SYSTEM PROMPT)

**When user reports a bug or wants investigation:**
Examples: "triage this", "investigate this bug", "what's causing X", "root cause"
-> **EXECUTE:** Run the full process below (single mode)

**When user wants a GitHub issue from a known bug:**
Examples: "file an issue for this", "create a bug report", "write up this bug"
-> **EXECUTE:** Skip to Phase 4-5 (TDD plan + issue creation)

**When user has multiple bugs or wants a QA session:**
Examples: "I have a pile of issues", "batch triage", "QA session", "several bugs to file", "triage these bugs"
-> **EXECUTE:** Enter batch mode — loop the process per issue with dependency tracking between issues

## When to Activate This Skill

1. **Core Skill Name** - "triage", "bug investigation", "issue triage", "batch triage", "QA session"
2. **Action Verbs** - "investigate", "triage", "diagnose", "root cause", "file issues", "batch investigate"
3. **Modifiers** - "quick triage", "deep investigation", "full root cause analysis", "batch triage session"
4. **Prepositions** - "triage this error", "investigate in module X", "triage these errors", "issues in this module"
5. **Synonyms** - "debug", "troubleshoot", "figure out why", "what broke", "bug sweep", "issue dump"
6. **Use Case** - Bug reports, error investigation, regression hunting, multiple related bugs, QA session with blocking relationships
7. **Result-Oriented** - "find the cause", "fix plan", "actionable issue", "batch of issues with dependencies", "ordered issue set"
8. **Tool/Method Specific** - "TDD fix plan", "red-green cycles", "git bisect", "blocking relationships", "dependency-ordered issues"

## Process

### Phase 1: Problem Capture

Gather a brief issue description. Minimal questioning — get the what, not the why. JM states the problem, you investigate.

In batch mode: capture one problem at a time. Don't try to gather all issues upfront.

### Phase 2: Reproduce + Explore

**Reproduce first.** Before exploring code, attempt to reproduce the reported behavior:
- Run relevant tests (`bun test` with targeted file/pattern)
- Execute the reported command/workflow
- Check if the error is consistent or intermittent
- Document reproduction steps and actual output

If reproduction fails (can't trigger the bug), note this — it changes the investigation from "why does X happen" to "under what conditions does X happen."

**Then explore** using codebase-analyzer or direct investigation:
- Source files related to the reported behavior
- Existing tests (passing and failing)
- Git history for recent changes in the affected area
- Error handling paths

### Phase 3: Root Cause Identification

Determine what's broken and why. Classify as:
- **Regression** — worked before, broke by a specific change
- **Missing feature** — expected behavior was never implemented
- **Design flaw** — works as coded but the design is wrong

Present findings to JM with evidence (file:line references, git blame, test output).

### Phase 3.5: Scope Assessment

After identifying the root cause, determine if this is a single issue or needs breakdown.

**Break down into multiple issues when:**
- The root cause reveals independent problems (e.g., "validation is wrong AND error handling is missing AND the retry logic has a race condition")
- Fix spans multiple independent modules that different engineers could tackle in parallel
- Multiple distinct TDD cycles would produce cleaner, independently-mergeable PRs

**Keep as single issue when:**
- One root cause, one fix area, one TDD cycle
- Symptoms are cascading effects of a single defect

**When breaking down:**
1. List each sub-issue with a working title
2. Identify blocking relationships (issue B's test depends on issue A's fix)
3. Order for filing: blockers first, then dependents
4. Proceed through Phase 4-5 for EACH sub-issue in dependency order

**When entering batch mode explicitly** (JM says "I have a pile"):
Skip scope assessment — go straight to per-issue loop. Track cross-references as issues accumulate.

**Out-of-scope KB check** (for wontfix candidates):
Before classifying an enhancement as wontfix, check `.out-of-scope/` at the project root for a matching concept file. If found, surface the prior reasoning to JM and reference the existing record when closing. If no match exists and JM confirms wontfix, create a new record in Phase 5.

### Phase 4: TDD Fix Plan

Create ordered RED-GREEN test cycles with minimal code changes per cycle:

**Principles:**
- **Durable tests**: Describe modules, behaviors, and contracts — not implementation details
- **Observable outcomes**: Test API responses, UI state, user-visible effects — not internal state
- **Vertical slices**: Each test-code cycle is one vertical slice against public interfaces
- **Minimal steps**: Smallest possible change per cycle

### Phase 4.5: Agent Brief (Optional)

When an issue is suited for agent work (clear scope, testable criteria, no ambiguous design decisions), generate a durable agent brief alongside the TDD plan. The brief describes *interfaces and behaviors*, not file paths or line numbers, so it survives refactoring.

```md
## Agent Brief

**Category:** bug / enhancement
**Summary:** one-line description of what needs to happen

**Current behavior:**
What happens now — the broken behavior or status quo.

**Desired behavior:**
What should happen after the fix. Be specific about edge cases.

**Key interfaces:**
- `TypeName` — what needs to change and why
- `functionName()` — current return vs expected return

**Acceptance criteria:**
- [ ] Testable criterion 1
- [ ] Testable criterion 2

**Out of scope:**
- What should NOT be changed in this fix
```

Include the agent brief as a collapsible section in the GitHub issue body when generated.

### Phase 5: Issue Creation

Create a GitHub issue via `gh issue create` with this structure:

```md
## Problem Statement
[Developer's perspective on the issue]

## Root Cause
[What's actually broken and why — file:line references, git blame evidence]

## Fix Plan (TDD)
1. RED: [test description] → GREEN: [minimal fix]
2. RED: [test description] → GREEN: [minimal fix]
...

## Blocked By
<!-- Include in batch/breakdown mode. Omit for standalone single issues. -->
- #<issue-number> — [brief reason this blocks]
Or: None — can start immediately

## Acceptance Criteria
- [ ] All new tests pass
- [ ] No regressions in existing tests
- [ ] [Specific behavioral criteria]

## Out of Scope
[What this fix deliberately does NOT address]
```

**Wontfix with out-of-scope record** (enhancements only):
When JM confirms an enhancement as wontfix, create `.out-of-scope/<concept>.md` at the project root — one file per concept (kebab-case), not per issue. Include substantive reasoning (not just "we don't want this"), references to project scope or technical constraints, and prior issue numbers. If a file already exists for the concept, append the new issue number to "Prior requests." Close the issue with a `wontfix` label and link to the reasoning.

**Batch mode filing rules:**
- File issues in dependency order (blockers first) so real issue numbers can be referenced
- After filing each issue, print the URL and blocking summary
- After all issues in the current batch are filed, print a summary table:

| # | Title | Blocked by | URL |
|---|-------|------------|-----|

Proceed directly to issue creation — don't ask JM for review unless the diagnosis is uncertain.

### Phase 6: Session Continuation (Batch Mode Only)

After filing issue(s), ask: **"Next issue, or are we done?"**

- If JM describes another bug → loop back to Phase 1
- If JM says done → print final session summary:
  - Total issues filed
  - Dependency graph (which blocks which)
  - All issue URLs
