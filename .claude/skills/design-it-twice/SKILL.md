---
name: design-it-twice
context: same
description: |
  Generate multiple radically different designs for a module, API, data model, or
  architecture using parallel sub-agents. Each agent works under a different constraint
  to force genuine variety. Presents, compares, and synthesizes the best approach.
  USE WHEN: JM says "design it twice", "explore alternatives", "compare approaches",
  "what are my options", "interface design", or wants to avoid committing to the first idea.
---

## Workflow Routing (SYSTEM PROMPT)

This is a single-workflow skill. No routing needed — activate directly.
Can also be invoked by the `architect` agent during system design.

## When to Activate This Skill

1. **Core:** "design it twice", "design this interface"
2. **Action verbs:** "compare designs", "explore options", "generate alternatives"
3. **Modifiers:** "radical alternatives", "really different approaches", "divergent designs"
4. **Prepositions:** "design options for this module", "alternatives to this approach"
5. **Synonyms:** "what are my options", "multiple designs", "parallel exploration"
6. **Use case:** API design, data model selection, architecture decisions, interface shape
7. **Result-oriented:** "find the best interface", "which approach is deepest", "optimal shape"
8. **Method-specific:** "deep module analysis", "constraint-driven design"

## Philosophy

From John Ousterhout's "A Philosophy of Software Design": your first idea is unlikely to be the best. Generate multiple radically different designs, then compare. The value is in the **contrast**, not any single design.

**Deep module principle:** A small interface hiding significant complexity is good. A large interface with thin implementation is bad.

## Methodology

### 1. Gather Requirements

Before designing, understand:

- What problem does this solve? (module, API, data model, architecture)
- Who are the consumers? (other modules, external users, tests, teams)
- What are the core operations?
- Any constraints? (performance, compatibility, existing patterns)
- What should be hidden vs exposed?

If the codebase has relevant context, **read it** — don't ask JM what the code already says.

### 2. Generate Designs — Parallel Agents

Spawn **3+ `architect-low` agents** simultaneously via the Agent tool. Each must produce a **radically different** approach. Use `architect` (opus) only when the design feeds a multi-service PRD or cross-system boundaries — for scoped module/API/data-model design, `architect-low` (sonnet) is sufficient.

Assign divergent constraints:

| Agent | Constraint |
|-------|-----------|
| 1 | Minimize surface area — aim for 1-3 entry points max |
| 2 | Maximize flexibility — support many use cases and extension |
| 3 | Optimize for the most common case — make the 80% path trivial |
| 4+ | Apply a specific paradigm (event-driven, ports-and-adapters, CQRS, etc.) |

Each agent outputs:
1. **Interface shape** — signatures, types, methods, schemas, or architectural boundaries
2. **Usage example** — how consumers actually use it
3. **What it hides** — complexity kept internal
4. **Trade-offs** — what you gain and what you pay

### 3. Present Designs

Show each design **sequentially** so JM can absorb one approach before seeing the next. Don't dump all at once.

For each: interface shape, usage example, what it hides.

### 4. Compare

After all designs are presented, compare across:

| Lens | What to evaluate |
|------|-----------------|
| **Simplicity** | Fewer entry points, simpler params = easier to use correctly |
| **Depth** | Small interface hiding significant complexity (deep) vs large interface with thin implementation (shallow) |
| **Generality** | Can handle future use cases without changes? But beware over-generalization |
| **Implementation efficiency** | Does the shape allow efficient internals? Or force awkward implementation? |
| **Correct use vs misuse** | How easy is it to use correctly? How hard to use incorrectly? |
| **Reversibility** | One-way door or easily changed later? |

Discuss trade-offs in **prose**, not tables. Highlight where designs diverge most.

### 5. Synthesize

Often the best design combines insights from multiple options:

- "Which design best fits your primary use case?"
- "Any elements from other designs worth incorporating?"
- Propose a hybrid if the combination is clearly superior

## Anti-Patterns

- **Similar designs** — If sub-agents produce similar output, the constraints weren't divergent enough. Rerun with sharper constraints.
- **Skipping comparison** — The value is in contrast. Never present designs without comparing.
- **Implementing** — This skill is about **shape**, not implementation. Don't write code.
- **Effort-based evaluation** — Don't rank by implementation difficulty. Rank by design quality.

## Attribution

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) `design-an-interface` skill.
