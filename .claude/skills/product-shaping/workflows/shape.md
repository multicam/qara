---
description: "Phase 3 — Converge on a design through conversation and produce spec-draft.md"
---

# Phase 3: Shape

**Goal:** Converge on a design through conversation.
**Output:** `spec-draft.md` (in project folder) + validation plan.

---

## Process

This is conversational, not template-driven. The shape emerges from iterating with JM on the research.

Claude's job:

1. **Present research synthesis** as a starting point
2. **Ask pointed questions** that force design decisions: "Should this be a new API or extend the existing one?" "Do you need X or is that scope creep?"
3. **Surface competitor patterns** when relevant: "Stripe does X, Unit does Y — which fits our constraints?"
4. **Track requirements** using R-notation (R0, R1, R2...). Ground each in evidence. Challenge any that can't be grounded.
5. **Mine all docs for closed questions** — things already decided in internal or user reports. Don't re-litigate settled decisions.
6. **Track open questions** — things we need customer input or internal alignment on.

---

## When Multiple Shapes Emerge

Sometimes the conversation produces 2-3 distinct approaches. Capture them with a lightweight comparison:

|                    | Shape A: [Name] | Shape B: [Name] | Shape C: [Name] |
|--------------------|-----------------|-----------------|-----------------|
| **Key idea**       |                 |                 |                 |
| **Reuse**          |                 |                 |                 |
| **Trade-off**      |                 |                 |                 |
| **Recommendation** |                 |                 |                 |

Not required. If the conversation converges on one shape, document the decision rationale and move on.

---

## Writing the Spec

Write to `spec-draft.md` in the project folder using:
-> **READ:** `${PAI_DIR}/skills/product-shaping/references/spec-template.md`

Use **writing voice** for tone. Keep it tight — 20 lines max for context, ideally less. Readable in 2 minutes.

---

## Exit Criteria

Phase 3 is complete when:

- [ ] `spec-draft.md` written and reviewed by JM
- [ ] All requirements grounded in evidence (R-notation)
- [ ] Open questions listed with stakes
- [ ] Validation plan identifies what to build/test next to increase confidence
