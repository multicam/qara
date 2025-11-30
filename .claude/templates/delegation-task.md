# Delegation Task Template

**Template for packaging tasks when delegating to intern agents**

Use this structure to ensure interns have complete context and clear objectives.

---

## Task Package Structure

```markdown
## TASK: [Clear, specific task title]

### OBJECTIVE
[1-2 sentences describing what needs to be accomplished and why]

### CONTEXT
**Project:** [What is this for?]
**Current State:** [What exists now?]
**Desired State:** [What should exist after task completion?]
**Constraints:** [Any limitations or requirements]

### INSTRUCTIONS
1. [Step 1 - specific action]
2. [Step 2 - specific action]
3. [Step 3 - specific action]
...

### FILES TO MODIFY/CREATE
- **File 1:** `path/to/file1.ts` - [what to do with it]
- **File 2:** `path/to/file2.md` - [what to do with it]

### ACCEPTANCE CRITERIA
- [ ] [Specific outcome 1]
- [ ] [Specific outcome 2]
- [ ] [Specific outcome 3]

### DEPENDENCIES
- Must be done after: [other task/prerequisite]
- Must be done before: [dependent task]
- Related tasks: [parallel tasks]

### TESTING REQUIREMENTS
- [ ] [How to verify this works]
- [ ] [Test cases to run]

### REFERENCE MATERIALS
- [Link to relevant documentation]
- [Example code/pattern to follow]
```

---

## Example: File Update Task

```markdown
## TASK: Update broken references in stack-preferences.md

### OBJECTIVE
Fix references to obsolete filenames (TESTING.md → testing-guide.md) to ensure documentation integrity.

### CONTEXT
**Project:** Phase II Refactor - Critical Fixes
**Current State:** stack-preferences.md references TESTING.md and playwright-config.md (both deleted)
**Desired State:** All references point to testing-guide.md (consolidated file)
**Constraints:** Preserve all existing content, only update references

### INSTRUCTIONS
1. Read stack-preferences.md
2. Find all references to TESTING.md
3. Replace with testing-guide.md
4. Find reference to playwright-config.md
5. Update or remove (check if consolidated into testing-guide.md)
6. Verify no other broken references

### FILES TO MODIFY/CREATE
- **stack-preferences.md:** `.claude/skills/CORE/stack-preferences.md` - Update file references only

### ACCEPTANCE CRITERIA
- [ ] No references to TESTING.md remain
- [ ] All references point to testing-guide.md
- [ ] Reference to playwright-config.md resolved
- [ ] File content otherwise unchanged
- [ ] Grep search confirms no broken references

### DEPENDENCIES
- Must be done after: testing-guide.md exists (already complete)
- Part of: Phase II broken reference fixes

### TESTING REQUIREMENTS
- [ ] Grep search for `TESTING.md` returns no matches in this file
- [ ] Read modified file to verify changes are correct

### REFERENCE MATERIALS
- See REFACTOR_PART_I_SUMMARY.md for consolidation mapping
- testing-guide.md is the correct target file
```

---

## Best Practices

### DO:
- ✅ Provide complete context - interns should never need to ask questions
- ✅ Be specific about file paths - use absolute paths or clear relative paths
- ✅ Include acceptance criteria - make success measurable
- ✅ Reference existing patterns - show examples of what you want
- ✅ List all files that need changes - no surprises

### DON'T:
- ❌ Assume shared context - package everything the intern needs
- ❌ Use vague instructions like "fix the issues" - be specific
- ❌ Forget testing requirements - interns should verify their work
- ❌ Skip acceptance criteria - how will they know when done?
- ❌ Omit dependencies - parallel tasks need coordination info

---

## Spotcheck Preparation

When launching parallel interns, always prepare for spotcheck:

1. **Track all tasks** - Maintain list of what each intern is doing
2. **Define verification** - How will spotcheck verify each task?
3. **Set quality gates** - What must be true for task to pass?
4. **Plan rollback** - How to undo if spotcheck fails?

### Spotcheck Intern Task Template

```markdown
## TASK: Spotcheck parallel intern work

### OBJECTIVE
Verify all parallel intern tasks completed correctly and meet quality standards.

### TASKS TO VERIFY
1. [Intern 1] - [Task summary] - [Expected outcome]
2. [Intern 2] - [Task summary] - [Expected outcome]
3. [Intern 3] - [Task summary] - [Expected outcome]

### VERIFICATION STEPS
For each task:
- [ ] Read modified files
- [ ] Verify changes match instructions
- [ ] Check for unintended side effects
- [ ] Confirm quality standards met
- [ ] Test if testing was required

### PASS CRITERIA
- All tasks completed as specified
- No errors or unintended changes
- Quality standards maintained
- All files in working state

### FAIL CRITERIA
- Any task incomplete
- Errors or bugs introduced
- Quality degraded
- Files broken or malformed

### REPORT FORMAT
[List each task as PASS/FAIL with brief explanation]
```

---

## Parallel Launch Pattern

```typescript
// Launch multiple interns in single message - multiple Task tool calls
await Promise.all([
  agent.task({ instructions: taskPackage1 }),
  agent.task({ instructions: taskPackage2 }),
  agent.task({ instructions: taskPackage3 }),
  // ... as many as needed
]);

// Then immediately launch spotcheck
await agent.task({ instructions: spotcheckPackage });
```

---

## Related Documentation

- **delegation-guide.md** - Complete delegation patterns
- **agent-guide.md** - Agent hierarchy and capabilities
- **parallel-execution.md** - Technical patterns for Promise.all
