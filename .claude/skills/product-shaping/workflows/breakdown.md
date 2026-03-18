---
description: "Phase 4 — Break the spec into vertical slices for implementation"
---

# Phase 4: Implementation Breakdown

**Goal:** Turn the approved spec into independently-grabbable implementation slices.
**Output:** Numbered list of vertical slices, optionally created as GitHub issues.

---

## Vertical Slice Methodology

Each slice is a **thin tracer bullet** cutting through ALL integration layers end-to-end. Not a horizontal layer ("build the schema", "build the API", "build the UI") but a complete vertical path ("user can create a draft invoice" — schema + API + UI + tests for that one capability).

### Rules

- Each slice delivers a narrow but **complete path** through every layer
- A completed slice is **demoable or verifiable** on its own
- Prefer **many thin slices** over few thick ones

---

## Slice Classification: HITL vs AFK

| Type | Meaning | When to Use |
|------|---------|-------------|
| **HITL** | Human-In-The-Loop | Requires an architectural decision, design review, or JM input before/during implementation |
| **AFK** | Away-From-Keyboard | Can be implemented and merged autonomously by an agent |

**Prefer AFK over HITL.** The more slices an agent can complete independently, the faster the feature ships. Mark HITL only when the slice genuinely requires a decision that can't be derived from the spec.

---

## Process

### 1. Draft Slices

Using the approved `spec-draft.md`, break requirements into vertical slices:

For each slice, define:
- **Title** — short descriptive name
- **Type** — HITL / AFK
- **Blocked by** — which other slices must complete first (or "None")
- **Requirements covered** — which R-numbers from the spec this addresses
- **Acceptance criteria** — how to verify this slice is done

### 2. Review with JM

Present the breakdown as a numbered list. Ask:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked HITL vs AFK?

Iterate until JM approves.

### 3. Create Issues (Optional)

If JM wants GitHub issues, create them in dependency order (blockers first) using `gh issue create`:

```markdown
## Parent Spec

Link to spec or PRD issue

## What to build

End-to-end behavior description. Reference spec requirements (R0, R1...) rather than duplicating content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- #<issue-number> (or "None — can start immediately")

## Type: AFK / HITL
```

---

## Exit Criteria

- [ ] All spec requirements (R-numbers) covered by at least one slice
- [ ] Dependency order is acyclic (no circular blocks)
- [ ] JM has approved the breakdown
- [ ] Issues created if requested

## Attribution

Vertical slice methodology and HITL/AFK classification adapted from [mattpocock/skills](https://github.com/mattpocock/skills) `prd-to-issues` skill.
