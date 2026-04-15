# Plan Readiness Assessment

Reusable assessment for evaluating plan quality and recommending the right executor.
Invoked by grill-me (at end of session) or standalone ("is this plan ready?", "assess this plan").

## How to Apply

Read the plan file fully, then evaluate each criterion below. Be honest — a premature "READY" wastes more time than catching gaps now.

## Assessment Criteria

### 1. Structural Completeness

Check for required sections (from plan-template.md):
- [ ] Overview (what and why)
- [ ] Current State Analysis (what exists, constraints)
- [ ] Desired End State (specification + how to verify)
- [ ] What We're NOT Doing (explicit scope boundary)
- [ ] Implementation Approach (strategy + reasoning)
- [ ] At least one Phase with changes and success criteria
- [ ] Phases use canonical `## Phase N:` heading format (cruise plan-entry regex: `^## Phase \d+:`)
- [ ] Each phase has a `#### Automated Verification:` subsection with at least one `- [ ]` bullet
- [ ] Testing Strategy

Missing sections = **NEEDS WORK**. Missing Overview or Phases = **UNDERCOOKED**. Phase-heading format or `#### Automated Verification:` subsection missing = **NEEDS WORK** (cruise plan-entry will otherwise hit `plan-structure-ambiguous` mid-execution and STOP).

### 2. Specificity

- [ ] File paths referenced (not just "update the config")
- [ ] Code examples or pseudocode for non-trivial changes
- [ ] Key discoveries reference `file:line` locations

Vague prose without file paths = **NEEDS WORK**.

### 3. Falsifiable Success Criteria

- [ ] Each phase has Automated Verification (runnable commands)
- [ ] Commands are concrete (`bun test`, `bunx tsc --noEmit`, not "verify it works")
- [ ] Manual Verification items are specific (not "test the feature")

No automated verification = **NEEDS WORK**. No success criteria at all = **UNDERCOOKED**.

### 4. No Open Questions

Scan for: `TBD`, `TODO`, `TBC`, `decide later`, `open question`, `?` in non-rhetorical context.
- Any unresolved decision = **NEEDS WORK**
- Multiple unresolved load-bearing decisions = **UNDERCOOKED**

### 5. Dependency Ordering

- [ ] Phases are numbered and sequential
- [ ] No phase references output from a later phase
- [ ] High-risk changes come before dependent changes

Circular or missing dependencies = **NEEDS WORK**.

### 6. Ground Truth Check

For each file the plan proposes to modify:
- [ ] Read the file
- [ ] Verify the plan's description of its current state matches reality
- [ ] If the plan says "this file does X" or "this function works like Y", confirm it

If any description doesn't match reality: **NEEDS WORK** — plan is built on stale or wrong assumptions about the codebase.

## Verdict Format

```
## Plan Readiness Verdict

**Status:** READY | NEEDS WORK | UNDERCOOKED
**Confidence:** HIGH | MEDIUM | LOW

### Assessment
- Structural completeness: PASS/FAIL (detail)
- Specificity: PASS/FAIL (detail)
- Falsifiable criteria: PASS/FAIL (detail)
- No open questions: PASS/FAIL (detail)
- Dependency ordering: PASS/FAIL (detail)
- Ground truth: PASS/FAIL (detail)

### Routing Recommendation (only when READY)
**Recommended executor:** cruise | turbo
**Reasoning:** [why this executor fits]

Routing logic:
- Any sequential plan → `cruise: implement {plan-file}` (plan-aware cruise: per-phase critic + TDD + quality sniff + verifier + conditional manual pause + final regression)
- 3+ independent phases → `turbo: implement {plan-file}` (parallel agent dispatch)
- If unsure: default to cruise (safest, most infrastructure)

### Gaps (only when NEEDS WORK or UNDERCOOKED)
- [Specific gap with what's missing and where to add it]
```

## Naming Check

**Enforced globally in `~/.claude/CLAUDE.md` — NEVER use CC-generated random names.**

If the plan file doesn't follow `domain--feature-vN.md` or `YYYY-MM-DD-descriptive-name.md`:
- Rename immediately (don't ask — the convention is non-negotiable)
- CC plan mode random names (e.g., `dancing-pebble.md`): rename before writing content
- Use category prefix when domain is clear: `introspection--`, `quality--`, `tdd--`, `llm--`

## Accept & Implement (when READY)

Present to JM via AskUserQuestion:
- Header: "Executor"
- Question: "Plan is ready. Which executor?"
- Options (recommended first based on routing logic above):
  1. `[Recommended]` — "[reasoning from routing logic]"
  2. `[Alternative]` — "[why this could also work]"
  3. "Manual implementation" — "No mode, work through the plan as reference"

On selection:
- cruise/turbo: Output the activation command: `cruise: implement {plan-file-path}` or `turbo: implement {plan-file-path}`
- Manual: Acknowledge, plan serves as reference material
