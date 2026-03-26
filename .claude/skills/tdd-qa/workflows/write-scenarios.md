# Workflow: Write Scenarios

Translate requirements into Given/When/Then scenario specs. Produces files in `specs/`.

## Steps

### 1. Understand the Feature [AGENTIC]

Read the requirements source (JM's description, a PRD, a GitHub issue, or existing code).
If the feature is complex, invoke `codebase-analyzer` agent to understand existing code paths.

Identify:
- What does this feature do? (one sentence)
- Who uses it? (user, API consumer, system)
- What are the happy path, edge cases, and error conditions?

### 2. Draft Scenarios [AGENTIC]

Write scenarios following the format in `references/scenario-format.md`.

**Rules:**
- Start with the happy path (Priority: critical)
- Add edge cases (Priority: important)
- Add nice-to-haves last (Priority: nice-to-have)
- Maximum 7 scenarios per feature — if you need more, split into sub-features
- Each "Then" must be observable and assertable — no internal state

**Quality check per scenario:**
- [ ] Given describes a precondition, not an action
- [ ] When describes exactly one action
- [ ] Then describes an observable outcome
- [ ] Priority is assigned
- [ ] No implementation details leaked into the spec

### 3. Write Spec File [DETERMINISTIC]

Create `specs/{feature-name}.md` using the template from `references/scenario-format.md`.

File naming: kebab-case, matching the feature name. Examples:
- `specs/user-auth.md`
- `specs/api-rate-limiting.md`
- `specs/checkout-flow.md`

### 4. Review with JM [AGENTIC]

Present the scenarios to JM for review. Ask specifically:
- "Are these the right scenarios?"
- "Any edge cases I missed?"
- "Are the priorities correct?"

Adjust based on feedback. Do not proceed to tdd-cycle until JM confirms.

### 5. Summary [DETERMINISTIC]

```
Scenarios written: specs/{feature-name}.md
  Critical:  {n} scenarios
  Important: {n} scenarios
  Nice-to-have: {n} scenarios

Next: "run TDD on {feature-name}" to execute the cycle.
```
