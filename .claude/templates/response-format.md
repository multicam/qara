# Response Format Template

**MANDATORY FORMAT FOR ALL RESPONSES - NO EXCEPTIONS**

This is the canonical response format that MUST be used for every single response in the Qara system.

---

## The Format

```
📋 SUMMARY: [One sentence - what this response is about]
🔍 ANALYSIS: [Key findings, insights, or observations]
⚡ ACTIONS: [Steps taken or tools used]
✅ RESULTS: [Outcomes, what was accomplished]
📊 STATUS: [Current state of the task/system]
📁 CAPTURE: [Required - context worth preserving for this session]
➡️ NEXT: [Recommended next steps or options]
📖 STORY EXPLANATION: [8 lines - narrative summary of what happened]
🎯 COMPLETED: [12 words max - final status summary - REQUIRED]
```

---

## Usage Rules

### When to Use
- **EVERY single response** - no exceptions
- Greetings and casual conversation
- Simple yes/no answers
- Quick acknowledgments
- Status updates
- Error reports
- Complex task completions
- Follow-up clarifications

### Required Components
1. **📋 SUMMARY** - One sentence overview
2. **📁 CAPTURE** - Session context preservation (never skip)
3. **📖 STORY EXPLANATION** - Exactly 8 lines narrative
4. **🎯 COMPLETED** - Maximum 12 words final status

### Optional Components
- **🔍 ANALYSIS** - Use when analysis was performed
- **⚡ ACTIONS** - Use when actions were taken
- **✅ RESULTS** - Use when there are tangible outcomes
- **📊 STATUS** - Use when status tracking matters
- **➡️ NEXT** - Use when next steps are relevant

---

## Examples

### Simple Acknowledgment

```
📋 SUMMARY: Acknowledged request to review documentation.
📁 CAPTURE: Jean-Marc requested review of new documentation structure.
📖 STORY EXPLANATION: Jean-Marc asked me to review the documentation changes. I confirmed receipt of the request and will proceed with the review. The documentation appears to be in the CORE skill directory. I'll analyze the structure and content organization. This is a straightforward review task. No blocking issues identified. Ready to proceed with detailed analysis. Will report findings after completion.
🎯 COMPLETED: Request acknowledged, review task queued and ready to begin.
```

### Complex Task Completion

```
📋 SUMMARY: Completed Phase II refactor - all broken references fixed.
🔍 ANALYSIS: Found 11 broken references across 8 files (mcp-strategy.md, TESTING.md, playwright-config.md).
⚡ ACTIONS: Updated references in SKILL.md, CONSTITUTION.md, and 6 other core files using multi-edit tool.
✅ RESULTS: Zero broken references remaining, 100% reference integrity achieved, all files verified.
📊 STATUS: Phase II complete, system stable, ready for Phase III optimization.
📁 CAPTURE: Phase II (Critical Fixes) complete. Fixed 11 broken file references. All documentation now points to existing consolidated files (mcp-guide.md, testing-guide.md). Created REFACTOR_PHASE_II_SUMMARY.md. Updated COMPREHENSIVE_REFACTOR_PLAN_v1.md status.
➡️ NEXT: Proceed to Phase III (Optimization Implementation) or await further instructions.
📖 STORY EXPLANATION: Phase II began with broken references after Part I consolidation. I systematically searched for all obsolete filename patterns. Found references to renamed files (mcp-strategy, TESTING, playwright-config). Updated each reference across 8 files using the correct new filenames. Verified completeness with regex search showing zero matches. Created comprehensive summary document. System now has perfect reference integrity.
🎯 COMPLETED: Phase II complete - zero broken references, system stable and verified.
```

---

## Quality Checklist

Before sending any response, verify:
- [ ] Response format followed (📋 SUMMARY through 🎯 COMPLETED)
- [ ] All required sections present (SUMMARY, CAPTURE, STORY, COMPLETED)
- [ ] Optional sections used appropriately (only when relevant)
- [ ] Session context captured in 📁 CAPTURE
- [ ] Story explanation is exactly 8 lines
- [ ] Completed status is 12 words or fewer

---

## Why This Matters

1. **Session History** - The 📁 CAPTURE ensures learning preservation
2. **Consistency** - Every response follows same pattern
3. **Accessibility** - Format makes responses scannable and structured
4. **Constitutional Compliance** - This is a core Qara principle
5. **Structured Output** - Makes responses easier to parse and reference

---

## Related Documentation

- **SKILL.md** - Response format requirement (lines 1-78)
- **CONSTITUTION.md** - Foundational principles
- **response-format-examples.md** - Extended examples and edge cases (if exists)
