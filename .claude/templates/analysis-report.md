# Analysis Report Template

**Template for comprehensive analysis and investigation reports**

Use this structure when conducting deep analysis of code, systems, or problems.

---

## Report Structure

```markdown
# [Analysis Title]

**Date:** YYYY-MM-DD
**Analyst:** [Your role - Qara, Intern, Engineer]
**Type:** [Code Review | System Analysis | Problem Investigation | Performance Analysis]
**Status:** [In Progress | Complete | Blocked]

---

## Executive Summary

[2-3 sentence overview of what was analyzed and key findings]

**Critical Findings:** [Most important discoveries]
**Recommendation:** [Primary recommendation]

---

## Scope

### What Was Analyzed
- [Component/file/system 1]
- [Component/file/system 2]
- [Component/file/system 3]

### What Was NOT Analyzed
- [Out of scope item 1]
- [Out of scope item 2]

### Analysis Constraints
- Time limitation: [if applicable]
- Access limitation: [if applicable]
- Knowledge limitation: [if applicable]

---

## Findings

### Finding 1: [Title]
**Severity:** [Critical | High | Medium | Low]
**Category:** [Bug | Performance | Security | Design | Documentation]

**Description:**
[Detailed explanation of what was found]

**Impact:**
[What are the consequences?]

**Evidence:**
```[language]
[Code snippet or data showing the issue]
```

**Recommendation:**
[What should be done about it?]

---

### Finding 2: [Title]
[Repeat structure for each finding]

---

## Metrics & Data

### Quantitative Analysis
- Metric 1: [value] ([interpretation])
- Metric 2: [value] ([interpretation])
- Metric 3: [value] ([interpretation])

### Comparison
| Aspect | Before | After | Change |
|--------|--------|-------|--------|
| [Metric 1] | X | Y | +Z% |
| [Metric 2] | X | Y | -Z% |

---

## Root Cause Analysis

### Primary Cause
[What is the fundamental reason for the issue?]

### Contributing Factors
1. [Factor 1 and its influence]
2. [Factor 2 and its influence]
3. [Factor 3 and its influence]

### Timeline
- [Date/Event 1]: [What happened]
- [Date/Event 2]: [What happened]
- [Date/Event 3]: [What happened]

---

## Recommendations

### Immediate Actions (Critical)
1. **[Action 1]** - [Why and impact]
2. **[Action 2]** - [Why and impact]

### Short-term Actions (1-2 weeks)
1. **[Action 1]** - [Why and impact]
2. **[Action 2]** - [Why and impact]

### Long-term Actions (1+ months)
1. **[Action 1]** - [Why and impact]
2. **[Action 2]** - [Why and impact]

### Optional Enhancements
1. **[Enhancement 1]** - [Why and impact]
2. **[Enhancement 2]** - [Why and impact]

---

## Implementation Plan

### Priority 1: Critical Fixes
- [ ] [Specific task 1]
- [ ] [Specific task 2]

### Priority 2: Important Improvements
- [ ] [Specific task 1]
- [ ] [Specific task 2]

### Priority 3: Nice to Have
- [ ] [Specific task 1]
- [ ] [Specific task 2]

---

## Risk Assessment

### Risks of Taking Action
- **Risk 1:** [Description and mitigation]
- **Risk 2:** [Description and mitigation]

### Risks of NOT Taking Action
- **Risk 1:** [Description and severity]
- **Risk 2:** [Description and severity]

---

## Appendices

### Appendix A: Detailed Data
[Tables, charts, extended analysis]

### Appendix B: Code Samples
```[language]
[Relevant code samples]
```

### Appendix C: References
- [Document 1]
- [Document 2]
- [External resource]

---

## Sign-off

**Analyst:** [Name/Role]
**Reviewed By:** [Name/Role] (if applicable)
**Date:** YYYY-MM-DD
**Next Review:** YYYY-MM-DD (if applicable)
```

---

## Example: Redundancy Analysis

```markdown
# CORE Skill Redundancy Analysis

**Date:** 2025-11-30
**Analyst:** Qara System
**Type:** System Analysis
**Status:** Complete

---

## Executive Summary

CORE skill documentation contains 6,595 lines of redundant content (41% waste) across ~16,095 total lines. Same concepts explained 3-5 times in different files, causing token waste and slower comprehension.

**Critical Findings:** CLI-First concept repeated in 9 files, Agent delegation in 4 files
**Recommendation:** Consolidate to single-source-of-truth structure with progressive disclosure

---

## Scope

### What Was Analyzed
- All CORE skill .md files
- Cross-references and content overlap
- Token usage in typical task scenarios
- Runtime performance impact

### What Was NOT Analyzed
- Other skills (research, writing, etc.)
- Hook system code
- Command implementations

---

## Findings

### Finding 1: CLI-First Architecture Redundancy
**Severity:** High
**Category:** Documentation - Redundancy

**Description:**
CLI-First concept explained in 9 different files with ~1,788 total lines and ~988 lines redundant (55% waste). Core principle repeated 3 times, implementation scattered across files.

**Impact:**
When building CLI tool, system loads ~1,358 lines with 400 lines redundant (28% waste). Slower comprehension, conflicting guidance, wasted tokens.

**Evidence:**
- CONSTITUTION.md: 200 lines (principle)
- cli-first-architecture.md: 1,133 lines (complete guide)
- MY_DEFINITIONS.md: 25 lines (definition)
- 6 other files: scattered references

**Recommendation:**
Consolidate to 2 files: CONSTITUTION.md (principles), cli-first-guide.md (patterns + examples)

[... continue with other findings ...]
```

---

## Related Documentation

- **CONSTITUTION.md** - Analytical thinking principles
- **COMPREHENSIVE_REFACTOR_PLAN_v1.md** - Example of analysis-driven planning
- **response-format.md** - For packaging analysis as response
