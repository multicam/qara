---
name: prd-to-plan
context: fork
description: |
  Break a PRD into a phased implementation plan using vertical slices (tracer bullets).
  Output is a Markdown plan file. Companion to product-shaping.
  Adapted from mattpocock/skills (upstream commit 1325b14, 2026-03-18).
  USE WHEN: "break this PRD down", "implementation plan", "plan from PRD",
  "tracer bullet", "vertical slices", "phase this", "plan the build"
---

## Workflow Routing (SYSTEM PROMPT)

**When user has a PRD and wants an implementation plan:**
Examples: "plan from this PRD", "break this into phases", "implementation plan", "tracer bullets"
-> **EXECUTE:** Run the full process below

**When user wants to refine an existing plan:**
Examples: "adjust the phases", "split phase 3", "merge these phases"
-> **EXECUTE:** Re-run from step 4 (draft vertical slices)

## When to Activate This Skill

1. **Core Skill Name** - "prd-to-plan", "implementation plan", "build plan"
2. **Action Verbs** - "break down", "plan", "phase", "slice"
3. **Modifiers** - "detailed plan", "quick breakdown", "phased approach"
4. **Prepositions** - "plan from this PRD", "phases for this feature"
5. **Synonyms** - "tracer bullet", "vertical slices", "incremental delivery", "roadmap"
6. **Use Case** - Turning specs into actionable dev work
7. **Result-Oriented** - "demoable increments", "shippable phases", "buildable plan"
8. **Tool/Method Specific** - "acceptance criteria", "phase breakdown", "architectural decisions"

## Process

### 1. Confirm the PRD is in context

The PRD should already be in the conversation. If it isn't, ask JM to paste it or point to the file.

### 2. Explore the codebase

If you haven't already explored the codebase, do so to understand current architecture, existing patterns, and integration layers.

### 3. Identify durable architectural decisions

Before slicing, identify high-level decisions unlikely to change throughout implementation:

- Route structures / URL patterns
- Database schema shape
- Key data models
- Authentication / authorization approach
- Third-party service boundaries

These go in the plan header so every phase can reference them.

### 4. Draft vertical slices

Break the PRD into **tracer bullet** phases. Each phase is a thin vertical slice cutting through ALL integration layers end-to-end — NOT a horizontal slice of one layer.

**Slice rules:**
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
- Do NOT include specific file names, function names, or implementation details likely to change
- DO include durable decisions: route paths, schema shapes, data model names

### 5. Quiz JM

Present the proposed breakdown as a numbered list. For each phase show:

- **Title**: short descriptive name
- **User stories covered**: which user stories from the PRD this addresses

Ask:
- Does the granularity feel right? (too coarse / too fine)
- Should any phases be merged or split further?

Iterate until JM approves the breakdown.

### 6. Write the plan file

READ: `${PAI_DIR}/skills/CORE/workflows/plan-template.md` for standard plan structure
READ: `${PAI_DIR}/skills/CORE/workflows/plan-common-patterns.md` for common patterns

Create `./plans/` if it doesn't exist. Write as Markdown named after the feature (e.g., `./plans/user-onboarding.md`).

## Plan Template

```md
# Plan: <Feature Name>

> Source PRD: <brief identifier or link>

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: ...
- **Schema**: ...
- **Key models**: ...

---

## Phase 1: <Title>

**User stories**: <list from PRD>

### What to build

Concise description of this vertical slice. Describe end-to-end behavior, not layer-by-layer implementation.

### Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Phase 2: <Title>

<!-- Repeat for each phase -->
```
