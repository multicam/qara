# Implementation Plan Template

**Template for detailed implementation planning and phased execution**

Use this structure when planning complex implementations that require multiple steps or phases.

---

## Plan Structure

```markdown
# [Implementation Title]

**Created:** YYYY-MM-DD
**Target Completion:** YYYY-MM-DD
**Owner:** [Person/Team responsible]
**Status:** [Planning | In Progress | Blocked | Complete]

---

## Executive Summary

[2-3 sentences describing what will be implemented and why]

**Problem:** [What problem does this solve?]
**Solution:** [High-level approach]
**Impact:** [Expected benefits and outcomes]

---

## Goals & Success Criteria

### Primary Goals
1. [Goal 1 - specific and measurable]
2. [Goal 2 - specific and measurable]
3. [Goal 3 - specific and measurable]

### Success Metrics
- **Metric 1:** [How to measure] - Target: [value]
- **Metric 2:** [How to measure] - Target: [value]
- **Metric 3:** [How to measure] - Target: [value]

### Out of Scope
- [What this implementation will NOT do]
- [Deferred items for future phases]

---

## Current State Analysis

### Existing System
[Description of what exists now]

### Pain Points
1. [Problem 1 and its impact]
2. [Problem 2 and its impact]
3. [Problem 3 and its impact]

### Assets to Preserve
- [Existing component/pattern 1]
- [Existing component/pattern 2]

---

## Proposed Solution

### Architecture Overview
[High-level description of the solution]

### Key Components
1. **Component 1:** [Purpose and function]
2. **Component 2:** [Purpose and function]
3. **Component 3:** [Purpose and function]

### Technology Stack
- **Language:** [TypeScript | Rust | etc.]
- **Framework:** [if applicable]
- **Tools:** [bun, vitest, etc.]
- **Dependencies:** [List key dependencies]

### Design Decisions
| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|---------|-----------|
| [Topic 1] | [A, B, C] | [A] | [Why A is best] |
| [Topic 2] | [X, Y] | [Y] | [Why Y is best] |

---

## Implementation Phases

### Phase 1: [Title] (Week 1)
**Priority:** Critical
**Deliverable:** [What will be delivered]

**Tasks:**
- [ ] Task 1: [Description] - Owner: [Who] - Est: [hours]
- [ ] Task 2: [Description] - Owner: [Who] - Est: [hours]
- [ ] Task 3: [Description] - Owner: [Who] - Est: [hours]

**Dependencies:**
- Requires: [Prerequisite items]
- Blocks: [What depends on this]

**Success Criteria:**
- [ ] [Specific outcome 1]
- [ ] [Specific outcome 2]

---

### Phase 2: [Title] (Week 2-3)
[Repeat structure for each phase]

---

### Phase 3: [Title] (Week 4)
[Repeat structure for each phase]

---

## Detailed Task Breakdown

### Phase 1, Task 1: [Task Name]
**Description:** [Full explanation]
**Owner:** [Who]
**Estimate:** [X hours/days]
**Prerequisites:** [What must be done first]

**Steps:**
1. [Substep 1]
2. [Substep 2]
3. [Substep 3]

**Deliverables:**
- [File/component created/modified]
- [Test coverage added]
- [Documentation updated]

**Acceptance Criteria:**
- [ ] [Verification step 1]
- [ ] [Verification step 2]

---

## Testing Strategy

### Unit Tests
- **Coverage Target:** 80%+
- **Framework:** Vitest
- **Key Areas:** [List critical paths to test]

### Integration Tests
- **Scope:** [What integration points]
- **Framework:** [Tool]
- **Test Cases:** [Number and types]

### End-to-End Tests
- **Framework:** Playwright
- **Scenarios:** [List key user flows]
- **Environments:** [Where to test]

### Manual Testing
- [ ] [Manual test scenario 1]
- [ ] [Manual test scenario 2]

---

## Risk Management

### Identified Risks

#### Risk 1: [Title]
**Probability:** [High | Medium | Low]
**Impact:** [High | Medium | Low]
**Description:** [What could go wrong]
**Mitigation:** [How to prevent/minimize]
**Contingency:** [What to do if it happens]

#### Risk 2: [Title]
[Repeat structure]

### Assumptions & Dependencies
- **Assumption 1:** [What we're assuming is true]
- **Assumption 2:** [What we're assuming is true]
- **External Dependency 1:** [What outside factors affect this]

---

## Resource Requirements

### Time
- **Phase 1:** X hours/days
- **Phase 2:** Y hours/days
- **Phase 3:** Z hours/days
- **Total:** N hours/days

### People
- **Developer:** [Hours needed]
- **Reviewer:** [Hours needed]
- **Tester:** [Hours needed] (if separate)

### Infrastructure
- [Any services, APIs, or tools needed]
- [Costs associated]

---

## Migration Strategy

### Rollout Approach
- [ ] **Phased rollout** - Gradual deployment
- [ ] **Big bang** - All at once
- [ ] **Parallel run** - Old and new simultaneously

### Backward Compatibility
[How to ensure existing functionality continues]

### Rollback Plan
**Trigger:** [When to rollback]
**Steps:**
1. [Rollback step 1]
2. [Rollback step 2]

**Recovery Time:** [How long to revert]

---

## Documentation Plan

### Code Documentation
- [ ] Inline comments for complex logic
- [ ] JSDoc/TSDoc for public APIs
- [ ] README files for each major component

### User Documentation
- [ ] SKILL.md updates
- [ ] Workflow guides
- [ ] Example usage

### Technical Documentation
- [ ] Architecture diagrams
- [ ] API specifications
- [ ] Testing guide updates

---

## Success Validation

### Acceptance Tests
- [ ] [Test 1 - what to verify]
- [ ] [Test 2 - what to verify]
- [ ] [Test 3 - what to verify]

### Performance Benchmarks
- **Baseline:** [Current performance]
- **Target:** [Goal performance]
- **Measurement:** [How to measure]

### User Acceptance
- [ ] [Feedback criteria 1]
- [ ] [Feedback criteria 2]

---

## Timeline

```
Week 1    [======== Phase 1 ========]
Week 2    [======== Phase 2 ===
Week 3    ====]
Week 4    [==== Phase 3 ====]
```

**Milestones:**
- **Week 1:** Phase 1 complete
- **Week 3:** Phase 2 complete
- **Week 4:** Full implementation and testing complete

---

## Review & Sign-off

### Review Checkpoints
- [ ] **Architecture review** - Before Phase 1 starts
- [ ] **Mid-implementation review** - After Phase 1
- [ ] **Pre-deployment review** - Before final deployment
- [ ] **Post-deployment review** - 1 week after completion

### Approval
- [ ] **Technical review:** [Reviewer name/date]
- [ ] **User acceptance:** [Jean-Marc or stakeholder/date]
- [ ] **Ready for implementation:** [Date]

---

## Post-Implementation

### Monitoring
- [What to monitor after deployment]
- [How long to monitor]
- [Alert conditions]

### Maintenance Plan
- [Ongoing support requirements]
- [Update schedule]
- [Known limitations]

### Future Enhancements
- [Feature 1 for future consideration]
- [Feature 2 for future consideration]

---

## Appendices

### Appendix A: Technical Specifications
[Detailed technical specs]

### Appendix B: Code Examples
```typescript
// Example implementation pattern
```

### Appendix C: Related Documentation
- [Link to related docs]
- [Reference materials]
```

---

## Example: Phase III Optimization Implementation

```markdown
# Phase III: Optimization Implementation Plan

**Created:** 2025-12-01
**Target Completion:** 2025-12-08
**Owner:** Qara AI System
**Status:** In Progress

---

## Executive Summary

Optimize Qara context management through just-in-time loading triggers, output templates, and enhanced routing.

**Problem:** Context loading could be more efficient, output formats inconsistent
**Solution:** Add structured triggers and templates for better guidance
**Impact:** Reduced token usage, more consistent outputs, better AI decision-making

---

## Goals & Success Criteria

### Primary Goals
1. Implement context loading triggers in SKILL.md
2. Create output templates for common response types
3. Verify and optimize skill routing patterns

### Success Metrics
- **Context Efficiency:** Reduced unnecessary file loading (measure via sampling)
- **Output Consistency:** Templates available for all common formats
- **Routing Clarity:** All skills have clear activation triggers

---

## Implementation Phases

### Phase 1: Context Loading Triggers (Day 1)
**Deliverable:** "When to Read Additional Context" section in SKILL.md

**Tasks:**
- [x] Add structured triggers section to CORE/SKILL.md
- [ ] Review other skill SKILL.md files for trigger opportunities

---

### Phase 2: Output Templates (Day 1-2)
**Deliverable:** Template directory with key formats

**Tasks:**
- [x] Create .claude/templates directory
- [x] Create response-format.md template
- [x] Create delegation-task.md template
- [x] Create analysis-report.md template
- [x] Create implementation-plan.md template

---

### Phase 3: Routing Verification (Day 2-3)
**Deliverable:** Verified routing patterns across all skills

**Tasks:**
- [ ] Review research skill routing (best practice)
- [ ] Audit other skills for routing completeness
- [ ] Document routing patterns
```

---

## Related Documentation

- **COMPREHENSIVE_REFACTOR_PLAN_v1.md** - Source of this planning template
- **CONSTITUTION.md** - Planning and execution principles
- **response-format.md** - For packaging plan updates
