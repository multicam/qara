# Delegation: Spotcheck Pattern (MANDATORY)

**Extracted from:** delegation-guide.md

This document explains the mandatory spotcheck pattern that MUST be used after any parallel agent work.

---

## Spotcheck Pattern (MANDATORY)

### Why Spotcheck is Critical

- Parallel agents work independently
- No inter-agent communication
- Need verification of consistency
- Catch conflicting changes early

### When Spotcheck is Required

**After ANY parallel agent work** - no exceptions:
- Multi-file updates
- Batch processing
- Parallel research
- Independent subtasks

### What Spotcheck Reviews

**Completeness**:
- [ ] All parallel tasks completed?
- [ ] All files updated as expected?
- [ ] Nothing missed?

**Consistency**:
- [ ] Naming consistent across files?
- [ ] Patterns followed uniformly?
- [ ] No conflicting implementations?

**Quality**:
- [ ] Code style consistent?
- [ ] Tests passing?
- [ ] Documentation updated?

**Requirements**:
- [ ] Original requirements met?
- [ ] Success criteria achieved?
- [ ] Edge cases handled?

### Spotcheck Task Template

```
task({
  agent: "agent",
  task: "SPOTCHECK: Review work from previous [N] agents.

  Verify:
  1. All tasks completed successfully
  2. Consistency across [files/components/features]
  3. No conflicting changes
  4. [Specific requirement 1]
  5. [Specific requirement 2]

  Report any issues found and recommend fixes."
});
```

---

**Related Documentation:**
- delegation-guide.md - Overview and quick reference
- delegation-decomposition.md - Task Decomposition Patterns
- delegation-launch.md - Launch Patterns
- delegation-advanced.md - Background Tasks, Agent Resume, Interactive Queries
