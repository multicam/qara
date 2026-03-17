---
description: "Output template and writing guide for spec-draft.md"
---

# Spec Template

Write `spec-draft.md` in the project folder. The whole document should be readable in 2 minutes. Writing voice: lead with the punch, be declarative, kill LLM tells.

---

## Template

```markdown
# [Feature Name]

## Context

[Problem statement, why now, who it's for. <=20 lines.]

## Principles

[Non-negotiable design constraints. Each principle should be falsifiable — if you can't imagine violating it, it's not a real constraint. 3-7 items.]

## Requirements

[R-notation list. Every requirement grounded in evidence.]

## Scope

[What's in. What's explicitly out, and why.]

## Design

[The proposed solution at the "what" level. Include whichever of these are relevant:
- Happy-path flow (sequence or diagram)
- API surface / endpoints
- Data model changes
- Integration points
Leave out implementation details — no file paths, no function signatures.]

## Alternatives

[Other shapes considered, if any. Why they were rejected. Omit if only one shape emerged.]

## Open Questions

[What we still need to figure out. For each: why it matters and what would change if we got the wrong answer.]

## Closed Questions

[Decisions made during shaping, with source. Only include if decisions were non-obvious — don't list things that were never in question.]

## Validation Plan

[The one thing that would make us change our mind. What to build or test next to increase confidence.]
```

---

## Writing Guide

### Principles — good vs. bad

Bad (restated requirement):
> "The system must handle payments securely."

Good (constrains the design space):
> "All payment state lives in the gateway. We never store card data, even encrypted."

Bad (unfalsifiable):
> "The UX should be intuitive."

Good (makes a real tradeoff):
> "Favour fewer clicks over discoverability — power users are the first customer."

### Requirements — R-notation

Tag each requirement and ground it in evidence. If you can't point to evidence, it doesn't belong.

```
R0: Subcontractors submit lien waivers before draw requests close.
    Evidence: 4 deals lost in Q3 where GC couldn't produce waivers at closing (Asana #4821)

R1: Support partial waivers (conditional on payment receipt).
    Evidence: Procore and Textura both support this; 2 customer interviews confirmed need.

R2: Email notification when waiver is requested.
    Evidence: None — JM's hypothesis. Validate before committing.
```

R-numbers are stable IDs, not priority. Use them in the Design section to trace decisions back: "The two-step submission flow satisfies R0 and R1."

### Design — what to include

The Design section answers "what are we building" not "how do we build it." Pick the representations that clarify the shape:

- **Flow:** When the feature has a multi-step happy path. Use a sequence or numbered steps.
- **API surface:** When other systems or clients will integrate. List endpoints, not implementations.
- **Data model:** When the feature introduces new entities or changes relationships. A simple table or ER sketch.
- **Integration points:** When the feature touches existing systems. Name the systems and the contract.

Skip anything that doesn't reduce ambiguity. A flow diagram that restates the requirements adds nothing.

### Scope — earning the "out"

Every item in "out of scope" should pass this test: *would a reasonable person expect this to be included?* If no, don't list it. The section exists to prevent scope creep on genuinely tempting additions, not to catalogue everything the feature doesn't do.

```
In scope:
- Waiver submission and approval workflow
- PDF generation from submitted data

Out of scope (this phase):
- Bulk waiver operations (revisit after single-waiver is validated)
- Integration with external compliance databases (no customer has asked)
```

### Validation Plan — be specific

Bad:
> "We should test this with users."

Good:
> "Build a clickable prototype of the submission flow. Run it with 3 GCs from the waitlist.
>  Success = they complete the flow without asking what 'conditional waiver' means."
