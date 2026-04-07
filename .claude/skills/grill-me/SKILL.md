---
name: grill-me
context: same
description: |
  Stress-test a plan, design, or proposal through relentless systematic questioning.
  Treats the design as a dependency graph — resolves interconnected decisions sequentially,
  not as a flat checklist. Explores the codebase to answer questions instead of guessing.
  USE WHEN: JM says "grill me", "stress-test this", "poke holes", "challenge this",
  "what am I missing", "devil's advocate", or wants intensive feedback on a plan.
---

## Workflow Routing (SYSTEM PROMPT)

This is a single-workflow skill. No routing needed — activate directly.

## When to Activate This Skill

1. **Core:** "grill me", "grill this plan"
2. **Action verbs:** "stress-test", "challenge", "critique", "interrogate"
3. **Modifiers:** "really grill me", "be brutal", "don't hold back"
4. **Prepositions:** "grill me on this design", "challenge this approach"
5. **Synonyms:** "poke holes", "devil's advocate", "red team this"
6. **Use case:** Pre-implementation validation, architecture review, PRD sanity check
7. **Result-oriented:** "what am I missing", "find the gaps", "where will this break"
8. **Method-specific:** "dependency analysis", "assumption audit"

## Methodology

### 1. Understand the Terrain

- Read the plan/design/proposal in full
- If it references code, **explore the codebase** — don't ask JM questions the code can answer
- Identify the major decision points and their dependencies

### 2. Build the Decision Tree

Treat the design as a **directed graph of decisions**, not a flat list. Each decision may depend on others:
- Which decisions are load-bearing? (downstream choices collapse if this one changes)
- Which are independent? (can be resolved in any order)
- Which are under-specified? (JM hasn't thought about this yet)

### 3. Walk the Branches

For each branch of the decision tree:
- Start with the **most load-bearing** decision first
- Resolve its dependencies before moving to downstream choices
- Ask **one question at a time** — don't dump a list of 10 questions
- Push back on assumptions: "You said X — but the codebase shows Y"
- When a question could be answered by reading code, **read the code first**

### 4. Probe Patterns

Use these lenses to find gaps:

| Lens | Question |
|------|----------|
| **Edge cases** | What happens at the boundaries? Zero, one, many, overflow? |
| **Failure modes** | What breaks first? What's the blast radius? |
| **Dependencies** | What external systems/APIs/teams does this assume? |
| **Scale** | Does this hold at 10x? 100x? |
| **Reversibility** | Can you undo this decision later, or is it a one-way door? |
| **Maintenance** | Who maintains this in 6 months? What knowledge is required? |
| **Alternatives** | Why this approach and not [specific alternative]? |
| **Scope creep** | What's explicitly out of scope? Is the boundary clear? |

### 5. Reach Common Ground

The goal is **shared understanding**, not winning an argument:
- When JM gives a satisfying answer, acknowledge it and move on
- When you're wrong, say so immediately
- Track resolved vs open questions
- End with a summary: decisions made, open items, and any risks JM explicitly accepted

### 6. Readiness Verdict

After all branches are resolved and a plan file exists:
1. Read the plan file that was being grilled
2. Apply the plan-readiness assessment: **READ** `.claude/skills/CORE/workflows/plan-readiness-assessment.md`
3. Present the verdict to JM
4. If **READY**: recommend executor via AskUserQuestion (options based on routing recommendation)
5. If **NEEDS WORK**: list specific gaps. Ask JM if they want to address now or defer.
6. If **UNDERCOOKED**: recommend escalating to `/create_plan` for deeper research.

Skip this step if: the grill target was not an implementation plan (e.g., a design concept, architecture discussion, or PRD-level review).

## Rules

- **One question at a time.** Let JM think and respond before the next probe.
- **No softballing.** If something looks fragile, say so directly.
- **Codebase over conjecture.** If you can check, check.
- **Respect JM's expertise.** Push back, but don't lecture on domains where JM clearly has deeper knowledge. Ask "why" instead.
- **Know when to stop.** When all branches are resolved and JM is satisfied, wrap up cleanly. Don't manufacture concerns.

## Attribution

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) `grill-me` skill.
