---
name: refactor-plan
context: fork
description: |
  Systematic refactoring planning through interviews, codebase exploration,
  and tiny incremental commits. Produces a GitHub issue with full commit plan.
  Adapted from mattpocock/skills request-refactor-plan (upstream commit 1325b14, 2026-03-18).
  USE WHEN: "plan a refactor", "refactoring strategy", "how to restructure",
  "break this refactor into steps", "incremental refactor", "safe refactoring plan"
---

## Workflow Routing (SYSTEM PROMPT)

**When user wants to plan a refactoring:**
Examples: "plan this refactor", "how should I restructure X", "refactoring strategy"
-> **EXECUTE:** Run the full 8-step process below

**When user has a known refactor and wants a commit plan:**
Examples: "break this refactor into commits", "commit plan for this change"
-> **EXECUTE:** Skip to step 5 (define scope) after brief verification

## When to Activate This Skill

1. **Core Skill Name** - "refactor plan", "refactoring strategy", "restructure plan"
2. **Action Verbs** - "plan refactor", "restructure", "reorganize", "decompose"
3. **Modifiers** - "safe refactor", "incremental refactor", "systematic restructuring"
4. **Prepositions** - "refactor plan for module X", "restructure around Y"
5. **Synonyms** - "technical debt plan", "code reorganization", "migration strategy"
6. **Use Case** - Large refactors that need to stay safe and incremental
7. **Result-Oriented** - "tiny commits", "always-green refactor", "zero-downtime migration"
8. **Tool/Method Specific** - "commit plan", "incremental steps", "Mikado method"

## Process

### Step 1: Gather Requirements

Ask JM for a comprehensive description of:
- What needs to change and why
- What solutions they've considered
- What constraints exist (backwards compatibility, performance, etc.)

### Step 2: Verify Assumptions

Explore the repository to confirm JM's assessment. Use codebase-analyzer or direct exploration to understand:
- Current state of the code
- Dependencies and coupling
- Test coverage in the affected area

### Step 3: Explore Alternatives

Discuss whether other approaches have been considered. Present additional options if the codebase suggests them. Don't push — just surface.

### Step 4: Detailed Interview

Conduct a thorough conversation about implementation specifics:
- Edge cases and error handling
- Migration path for existing data/state
- Impact on downstream consumers

### Step 5: Define Scope

Precisely determine what will and won't change. Document:
- **In scope**: exact modules, interfaces, behaviors changing
- **Out of scope**: what this refactor deliberately leaves alone
- **Dependencies**: what must change together vs. what can be deferred

### Step 6: Assess Testing

Review existing test coverage in the affected area:
- Which tests exist and what they cover
- Gaps that need tests BEFORE refactoring begins
- Testing strategy for the refactor itself

### Step 7: Create Commit Plan

READ: `${PAI_DIR}/skills/CORE/workflows/plan-template.md` for plan structure
READ: `${PAI_DIR}/skills/CORE/workflows/plan-common-patterns.md` for common patterns

Break the implementation into minimal commits. Apply the principle:

> "Make each refactoring step as small as possible, so that you can always see the program working."

Each commit should:
- Be independently valid (tests pass, no broken state)
- Do exactly one thing
- Be describable in a single sentence

### Step 8: File GitHub Issue

Create a GitHub issue via `gh issue create` with this structure:

```md
## Problem Statement
[Developer's perspective on why this refactor is needed]

## Solution
[Proposed approach in 2-3 sentences]

## Commit Plan
1. [Tiny step — plain English description]
2. [Tiny step — plain English description]
...

## Decision Document
- **Modules affected**: ...
- **Interfaces changing**: ...
- **Architectural choices**: ...
- **Schema/API changes**: ...

## Testing Strategy
- **Existing coverage**: ...
- **New tests needed before refactoring**: ...
- **Verification approach**: ...

## Out of Scope
[What this refactor deliberately does NOT touch]
```
