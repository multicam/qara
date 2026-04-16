---
name: flows
context: same
description: |
  User flow, journey, and information architecture work. Map journeys, audit IA, design navigation.
  USE WHEN: "user flow", "user journey", "information architecture", "navigation design".
version: 1.0.0
user-invocable: true
argument-hint: "[journey-map|ia-audit|flow-diff] [target]"
---

Product-scoped flow and IA work. Covers the gap between `shape` (feature-scoped UX planning) and `impeccable craft` (build). Concerns: how users move across features, how information is organized, how navigation reveals structure.

**Shape vs flows:**
- `shape` — plan one feature. Discovery interview, design brief, key states.
- `flows` — map journeys across features, audit IA, design navigation. Product-scoped.

## Workflow Routing (SYSTEM PROMPT)

Three modes. Select by argument or infer from phrasing.

- Argument `journey-map` OR phrasing "user journey / map the flow / step by step" → `## Mode: journey-map`
- Argument `ia-audit` OR phrasing "information architecture / site map / menu / nav structure" → `## Mode: ia-audit`
- Argument `flow-diff` OR phrasing "current vs proposed flow / redesign this flow" → `## Mode: flow-diff`

If the scope is a single feature ("plan this feature", "UX for this button"), redirect to `/shape` instead.

## MANDATORY PREPARATION

Design Context must be loaded (see CORE's Design Context Session Guard). Flow work produces generic output without project context — who uses this product, what jobs they do, what the brand/tone is. If not loaded, run `/impeccable teach` first.

Additionally gather before flow work:
- **Current flow** — what exists today (if anything)
- **User goals** — what are users trying to accomplish end-to-end
- **Entry points** — how users enter the product (direct link, share, onboarding, search)
- **Success criteria** — what "done" looks like for each goal

---

## Mode: journey-map

Map a user goal end-to-end as a sequence of steps, touchpoints, and decisions.

### Structure

1. **Actor** — which user type / persona (if multiple, map each separately).
2. **Trigger** — what starts the journey (need, event, notification).
3. **Steps** — ordered actions the user takes. Each step captures:
   - Action (what the user does)
   - Touchpoint (which screen/feature/channel)
   - Input (what they provide)
   - System response (what the product does)
   - Decision points (branches)
   - Emotional state (if relevant — frustrated, confident, confused)
4. **Success state** — what "done" looks like.
5. **Failure modes** — where the journey can break.

### Output

Step diagram as ASCII, or request a mermaid diagram via `visual-explainer` for complex flows.

ASCII skeleton:
```
[Trigger]
    ↓
Step 1: {action}   ← touchpoint   [decision? → branch]
    ↓
Step 2: {action}
    ↓
...
    ↓
[Success | Failure]
```

### Reference doctrine

- State machine patterns — `impeccable/reference/interaction-design.md`
- Label and microcopy — `impeccable/reference/ux-writing.md`

---

## Mode: ia-audit

Assess the product's information architecture: menu structure, entry points, findability, disclosure.

### Diagnostic

1. **Tree** — draw the current menu / nav / hierarchy.
2. **Depth** — how many clicks to reach the most-used features.
3. **Labels** — are menu labels predictable and consistent? Do they match user vocabulary?
4. **Groupings** — are sibling items conceptually related? Any orphans?
5. **Entry points** — where do new users land? Does the landing reveal structure?
6. **Progressive disclosure** — what's primary vs advanced? Is advanced reachable without clutter?
7. **Findability** — search vs browse vs recently-used. Is search a crutch for bad IA?

### Anti-patterns

- Catch-all "More" or "Settings" dumping-ground menus
- Deep hierarchies (>3 levels) for primary tasks
- Labels that match your internal model, not the user's
- Navigation that changes across sections (breaks predictability)
- Hiding critical actions behind icons without labels on first visit
- Using search as a substitute for architecture

### Output

IA tree (ASCII or mermaid). Annotate:
- ✓ known-good nodes
- ⚠ ambiguous or low-findability nodes
- ✗ anti-pattern nodes with proposed fix

---

## Mode: flow-diff

Current flow vs proposed flow, side by side, with rationale.

### Structure

For each flow:
1. Draw current journey (`journey-map` format).
2. Draw proposed journey.
3. Annotate deltas:
   - Removed steps — why removed
   - Added steps — what problem they solve
   - Reordered — rationale
   - Branching changes — which user types are affected
4. Success-state parity — does the new flow deliver the same outcome?
5. Migration path — if users are on the current flow, how do we transition?

### Output

Two-column diagram or two sequential diagrams with a "deltas" table.

---

## Hand-off

Flow work usually precedes or follows other skills:

- Before: `/shape` for feature-level UX planning (if the journey surfaces new features).
- Parallel: `/impeccable teach` to ensure Design Context covers the product-level tone.
- After: `/impeccable craft` or `design-implementation` to build the screens the journey visits.
- Review: `/review` for UX review of journey copy and emotional arc, and technical navigation concerns.
- Diagrams: For complex journeys or IA trees with 5+ nodes, use `/visual-explainer` to produce navigable HTML diagrams instead of ASCII.

## Non-goals

- **Don't build screens.** Journey maps and IA trees describe structure; implementation is downstream.
- **Don't redesign individual features.** That's `/shape` + `/impeccable craft`.
- **Don't skip the Context Gathering Protocol.** Generic journeys = generic screens = AI slop.

Doctrine source of truth for states and copy: `impeccable/reference/interaction-design.md` + `impeccable/reference/ux-writing.md`.
