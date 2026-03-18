---
name: triage-issue
context: fork
description: |
  Investigate reported problems, identify root causes, and create GitHub issues
  with TDD-based fix plans. Pairs with codebase-analyzer and engineer agents.
  Adapted from mattpocock/skills (upstream commit 1325b14, 2026-03-18).
  USE WHEN: "triage this bug", "investigate issue", "file a bug", "root cause analysis",
  "what's causing this", "create issue for this bug"
---

## Workflow Routing (SYSTEM PROMPT)

**When user reports a bug or wants investigation:**
Examples: "triage this", "investigate this bug", "what's causing X", "root cause"
-> **EXECUTE:** Run the full 5-phase process below

**When user wants a GitHub issue from a known bug:**
Examples: "file an issue for this", "create a bug report", "write up this bug"
-> **EXECUTE:** Skip to phase 4-5 (TDD plan + issue creation)

## When to Activate This Skill

1. **Core Skill Name** - "triage", "bug investigation", "issue triage"
2. **Action Verbs** - "investigate", "triage", "diagnose", "root cause"
3. **Modifiers** - "quick triage", "deep investigation", "full root cause analysis"
4. **Prepositions** - "triage this error", "investigate in module X"
5. **Synonyms** - "debug", "troubleshoot", "figure out why", "what broke"
6. **Use Case** - Bug reports, error investigation, regression hunting
7. **Result-Oriented** - "find the cause", "fix plan", "actionable issue"
8. **Tool/Method Specific** - "TDD fix plan", "red-green cycles", "git bisect"

## Process

### Phase 1: Problem Capture

Gather a brief issue description. Minimal questioning — get the what, not the why. JM states the problem, you investigate.

### Phase 2: Code Exploration

Use the codebase-analyzer agent or direct exploration to investigate:
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

### Phase 4: TDD Fix Plan

Create ordered RED-GREEN test cycles with minimal code changes per cycle:

**Principles:**
- **Durable tests**: Describe modules, behaviors, and contracts — not implementation details
- **Observable outcomes**: Test API responses, UI state, user-visible effects — not internal state
- **Vertical slices**: Each test-code cycle is one vertical slice against public interfaces
- **Minimal steps**: Smallest possible change per cycle

### Phase 5: Issue Creation

Create a GitHub issue via `gh issue create` with this structure:

```md
## Problem Statement
[Developer's perspective on the issue]

## Root Cause
[What's actually broken and why]

## Fix Plan (TDD)
1. RED: [test description] → GREEN: [minimal fix]
2. RED: [test description] → GREEN: [minimal fix]
...

## Acceptance Criteria
- [ ] All new tests pass
- [ ] No regressions in existing tests
- [ ] [Specific behavioral criteria]

## Out of Scope
[What this fix deliberately does NOT address]
```

Proceed directly to issue creation — don't ask JM for review unless the diagnosis is uncertain.
