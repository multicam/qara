# Thoughts Consolidation & Cleanup Workflow

**Purpose:** Take one or more thoughts/ files and produce a single clean, current, verified document.

## Input

- **Required:** List of file paths (thoughts/ files)
- **Optional:** `name` argument — used as the output filename slug. If not provided, generate a descriptive kebab-case name from the content.

## Output

- **File:** `[YYYY-MM-DD]-[name].md` in the same directory as the input files
- **Originals:** Deleted after successful consolidation

---

## Step 0: Read All Input Files

Read every file in the provided list. Build a mental model of:
- What topics are covered
- What changes/features are discussed
- What code, files, and architecture are referenced
- Timeline of events (dates, commits, PRs)

---

## Step 1: Codebase Verification

For every piece of code, file path, function, class, or architectural element mentioned in the thoughts files:

1. **Use Glob** to check if referenced files still exist
2. **Use Grep** to verify functions, classes, patterns still exist
3. **Use Bash** with `git log --oneline --grep="keyword" -10` to find commit references and dates for implemented changes

Classify each item into:
- **EXISTS** — still in the codebase (keep with current code snippets)
- **DELETED** — no longer exists (mention only if architecturally significant)
- **MODIFIED** — exists but changed (use current version)
- **NEVER IMPLEMENTED** — discussed but never built (goes to checklist)

---

## Step 2: Triage Changes

Categorize every change/feature/decision discussed in the source files:

### Keep (Structural/Significant)
- Architectural decisions that shaped the current codebase
- Non-trivial features that were implemented
- Design patterns adopted
- Migration decisions with lasting impact

### Drop (Trivial)
Silently remove — do not mention in output:
- Typo fixes, formatting changes
- Dependency version bumps (unless breaking)
- Minor config tweaks
- One-line bug fixes with no architectural impact
- Temporary debugging steps
- Things that were discussed and immediately superseded

### Notable Deletions
Things that no longer exist but were once a significant part of the architecture:
- Removed subsystems or modules
- Abandoned approaches that consumed significant effort
- Deprecated patterns replaced by current ones

---

## Step 3: Detect Conflicts

When multiple source files discuss the same topic with different approaches or contradictory decisions:

- Do NOT silently pick one
- Record both approaches
- Generate follow-up questions to resolve the conflict

---

## Step 4: Generate Output Document

### Filename
`[YYYY-MM-DD]-[name].md` where:
- Date = today's date
- Name = argument if provided, otherwise AI-generated descriptive kebab-case slug

### Document Structure

```markdown
---
date: YYYY-MM-DD
sources:
  - original-file-1.md
  - original-file-2.md
consolidated_by: Qara
---

# [Descriptive Title]

> Consolidated from N source files. Verified against current codebase on YYYY-MM-DD.

## Implemented Changes

### [Category/Feature Name]
**When:** YYYY-MM-DD | **Commit:** abc1234 | **PR:** #N (if applicable)

[Description of what was done and why]

```language
// Current code snippet from the codebase (NOT from the thoughts file)
// Include file path as comment: // src/path/to/file.ts:42
```

[Repeat for each significant implemented change]

---

## Notable Removals

> Things that were once architecturally significant but no longer exist.

- **[Removed Thing]** (removed YYYY-MM-DD, commit abc1234) — Brief explanation of what it was and why it was removed.

[Only include if there are notable removals. Omit this section entirely if none.]

---

## Conflicts

> Contradicting approaches found across source files. Needs resolution.

### [Conflict Topic]
**Approach A** (from source-file-1.md):
[Description]

**Approach B** (from source-file-2.md):
[Description]

**Follow-up questions:**
- [Question to help resolve this conflict]
- [Another question]

[Only include if conflicts exist. Omit this section entirely if none.]

---

## Not Yet Implemented

- [ ] **[Feature/Change]** — [Brief description of what needs to be done]
- [ ] **[Feature/Change]** — [Brief description]

[Each item should be actionable. Drop vague aspirations with no concrete next step.]

---

## Open Questions

Questions linked to the checklist items above:

### Re: [Checklist Item]
- [Specific question that needs answering before implementation]
- [Another question]

[Only include if there are open questions. Omit this section entirely if none.]
```

### Section Rules

- **Omit empty sections entirely** — no "None" or "N/A" sections
- **Code snippets must be from the current codebase** — use Grep/Read to pull the actual current code, never copy from the thoughts files
- **Include file:line references** in code snippets
- **Dates and commits must be verified** via git log, not assumed from thoughts files
- **Source attribution** — when content comes from a specific source file, note it

---

## Step 5: Write and Clean Up

1. **Write** the consolidated file to the same directory as the input files
2. **Delete** all original input files (this is a cleanup operation — originals are consumed)
3. **Report** to user: what was created, what was deleted, summary of sections

---

## Single File Mode

When only one file is provided, the workflow is the same but:
- No conflict detection needed (single source)
- Source attribution is implicit
- Output replaces the original (write new file, delete original)
- Focus is on: codebase verification, removing stale content, refreshing code snippets, triaging trivial vs structural

---

## Quality Checklist

Before finalizing output, verify:
- [ ] Every code snippet was pulled from the current codebase (not copied from thoughts)
- [ ] Every file path reference was verified via Glob
- [ ] Every commit/PR reference was verified via git log
- [ ] Trivial changes were dropped, not just noted as trivial
- [ ] Empty sections were omitted entirely
- [ ] Checklist items are actionable (not vague)
- [ ] Open questions are linked to specific checklist items
- [ ] Original files were deleted
