# Qara Maintenance Guide

**Ongoing Maintenance Procedures for Context Management System**

**Created:** 2025-12-01
**Last Updated:** 2026-01-10
**Status:** Active
**Purpose:** Ensure long-term quality and prevent redundancy regression

---

## Table of Contents

1. [Overview](#overview)
2. [Automated Quality Checks](#automated-quality-checks)
3. [Daily/Weekly Tasks](#dailyweekly-tasks)
4. [Monthly Tasks](#monthly-tasks)
5. [Quarterly Reviews](#quarterly-reviews)
6. [When Adding Content](#when-adding-content)
7. [Structure Standards](#structure-standards)
8. [Reference Integrity Checks](#reference-integrity-checks)
9. [Usage Analytics](#usage-analytics)
10. [Emergency Procedures](#emergency-procedures)

---

## Overview

### Purpose

This guide establishes ongoing maintenance procedures to:
- Prevent redundancy from creeping back
- Maintain reference integrity
- Ensure consistent structure across skills
- Keep documentation organized and current

### Maintenance Philosophy

**Continuous improvement through:**
- Regular reviews (not reactive fixes)
- Preventive measures (not emergency repairs)
- Quality standards (not ad-hoc decisions)
- Usage-driven optimization (not speculation)

---

## Automated Quality Checks

PAI includes automated validation scripts in `scripts/` to maintain code quality and prevent common issues.

### Pre-commit Hook

Install the pre-commit hook for automatic validation on every commit:

```bash
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**What it checks:**
- Skill structure validation (SKILL.md files have required frontmatter)
- Reference integrity (workflow routing references point to existing files)
- Blocked files (.env files and settings.json not committed)

The hook runs automatically before each commit completes. If checks fail, the commit is blocked until issues are resolved.

### Manual Validation Scripts

Run these scripts manually to check the codebase:

#### Validate Skills Structure

```bash
bash scripts/validate-skills.sh
```

**What it checks:**
- All skill directories have SKILL.md files
- SKILL.md files have proper YAML frontmatter (---)
- SKILL.md files include required `name:` and `description:` fields
- Workflows directories are not empty

**When to run:**
- After creating or modifying skills
- Before major commits
- During quarterly reviews

#### Check References

```bash
bash scripts/check-references.sh
```

**What it checks:**
- All workflow routing references (→ READ: patterns) point to existing files
- References are resolved in expected locations (current directory, workflows/, CORE skill)

**When to run:**
- After moving or renaming workflow files
- Before major commits
- When troubleshooting routing issues

Add `--verbose` flag to see all checked references:

```bash
bash scripts/check-references.sh --verbose
```

#### Check File Sizes

```bash
bash scripts/check-file-sizes.sh
```

**What it checks:**
- Reports files exceeding recommended line counts (default: 400 lines)
- Provides size distribution analysis (small, medium, large, oversized)

**When to run:**
- Monthly maintenance checks
- When files seem to be growing too large
- During quarterly reviews

Customize warning threshold:

```bash
bash scripts/check-file-sizes.sh --warn-at=500
```

### Integrating Automated Checks

**Recommended workflow:**

1. **Install pre-commit hook** for automatic validation
2. **Run manual scripts monthly** as part of maintenance routine
3. **Run all scripts before major refactoring** to establish baseline
4. **Include script output in quarterly reviews** to track trends

**Note:** The automated scripts complement but do not replace the manual maintenance procedures outlined in this guide. Many quality aspects (redundancy, content accuracy, usage patterns) still require human review.

---

## Daily/Weekly Tasks

### As You Work

**When modifying any .md file:**
- [ ] Check for broken references before committing (automated by pre-commit hook)
- [ ] Verify cross-references still valid
- [ ] Update routing map if routing changed
- [ ] Maintain consistent formatting

**When creating new content:**
- [ ] Follow structure standards (see below)
- [ ] Add routing immediately
- [ ] Update appropriate indexes
- [ ] Document in ROUTING_MAP.md

**Note:** If you have installed the pre-commit hook (recommended), skill structure validation and reference integrity checks run automatically on commit. The manual commands below are still useful for spot checks during development.

**Quick checks:**
```bash
# Before committing changes to CORE skill
grep -r "\.md" .claude/skills/CORE/ --include="*.md" | grep -v "^Binary" | wc -l

# Verify no broken references to deleted files (or use automated script)
bash scripts/check-references.sh
```

---

## Monthly Tasks

### Reference Integrity Check

**Run monthly (1st of each month):**

Use the automated reference checking script:

```bash
# Check for broken references
bash scripts/check-references.sh

# Optionally use verbose mode to see all checked references
bash scripts/check-references.sh --verbose
```

**Legacy manual check (if needed):**

```bash
# Navigate to qara root
cd ~/qara  # or wherever your qara installation is

# Check file counts
echo "=== File counts ==="
echo "CORE .md files: $(find .claude/skills/CORE -name "*.md" -type f | wc -l)"
echo "Templates: $(find .claude/templates -name "*.md" -type f 2>/dev/null | wc -l)"
echo "Workflow files: $(find .claude/skills/CORE/workflows -name "*.md" -type f | wc -l)"
```

**Expected counts (as of 2025-12-01):**
- CORE .md files: 28
- Templates: 4
- Workflow files: 7

**If counts don't match:**
- Investigate what changed
- Update ROUTING_MAP.md if needed
- Document in appropriate summary

---

### File Size Check

**Run monthly (1st of each month):**

Use the automated file size checking script:

```bash
# Check for oversized files
bash scripts/check-file-sizes.sh

# Or customize warning threshold (default: 400 lines)
bash scripts/check-file-sizes.sh --warn-at=500
```

The script provides a size distribution report and flags files exceeding recommended line counts.

---

### Redundancy Spot Check

**Monthly redundancy check:**

```bash
# Check for repeated content patterns
echo "=== Checking for potential redundancy ==="

# Look for files with similar names (potential duplicates)
find .claude/skills/CORE -name "*.md" -type f | \
  sed 's/-guide\.md//' | \
  sed 's/-examples\.md//' | \
  sort | uniq -d

# Check for long files using automated script
bash scripts/check-file-sizes.sh
```

**Action if redundancy found:**
- Review files for duplicate content
- Consider consolidation if >30% overlap
- Follow Part I methodology for elimination

---

## Quarterly Reviews

### Q1, Q2, Q3, Q4 (First week of Jan, Apr, Jul, Oct)

**1. Content Audit**

Review all CORE skill files:

- [ ] **File size check:** Any files >800 lines?
  - If yes: Consider splitting into focused files
  - Target: Most files 200-500 lines

- [ ] **Redundancy check:** Any concepts explained multiple times?
  - If yes: Consolidate to single source of truth
  - Reference Part I methodology

- [ ] **Relevance check:** All files still needed?
  - If no: Archive unused files
  - Update ROUTING_MAP.md

- [ ] **Accuracy check:** All information current?
  - Update outdated content
  - Remove deprecated patterns

**2. Structure Audit**

- [ ] **Routing completeness:** All workflows routed in SKILL.md?
- [ ] **Trigger clarity:** All context loading triggers clear?
- [ ] **Cross-references:** All links valid?
- [ ] **Template relevance:** Templates still useful?

**3. Usage Analysis**

Track which files are being loaded:

```bash
# Check git log for which files are modified most
git log --since="3 months ago" --name-only --pretty=format: .claude/skills/CORE/ | \
  grep "\.md$" | sort | uniq -c | sort -rn | head -20

# Frequently modified = actively used
# Never modified = potentially unused or stable
```

**Decision criteria:**
- **High usage (>10 modifications/quarter):** Keep and optimize
- **Medium usage (3-10 modifications/quarter):** Keep as-is
- **Low usage (1-2 modifications/quarter):** Review for consolidation
- **No usage (0 modifications/quarter):** Consider archiving if >6 months

**4. Routing Map Update**

- [ ] Review ROUTING_MAP.md for accuracy
- [ ] Add any new workflows discovered
- [ ] Remove deprecated routes
- [ ] Update examples if triggers changed

**5. Documentation Review**

- [ ] Update MIGRATION.md if major changes
- [ ] Review summary reports for accuracy
- [ ] Check that refactor documentation still relevant

---

## When Adding Content

### Adding a New Workflow File

**Checklist when creating new workflow:**

1. **Create the workflow file**
   ```bash
   # Create in appropriate skill's workflows/ directory
   touch .claude/skills/[skill-name]/workflows/new-workflow.md
   ```

2. **Add routing to SKILL.md**
   ```markdown
   **When user requests [action]:**
   Examples: "[example 1]", "[example 2]", "[example 3]"
   → **READ:** ${PAI_DIR}/skills/[skill-name]/workflows/new-workflow.md
   → **EXECUTE:** [What this workflow does]
   ```

3. **Update ROUTING_MAP.md**
   - Add to appropriate skill section
   - Include trigger examples
   - Document primary action

4. **Add context loading trigger (if CORE)**
   - Update "When to Read Additional Context" section
   - Define clear activation criteria

5. **Test the routing**
   ```bash
   # Try natural language trigger
   # Verify workflow loads correctly
   ```

---

### Adding a New Guide File

**Checklist when creating new guide/reference:**

1. **Verify it's truly needed**
   - [ ] Can't this content fit in existing file?
   - [ ] Is this creating redundancy?
   - [ ] Will this be used frequently enough?

2. **Create focused file**
   ```bash
   # Target: 200-500 lines
   # Single topic, one abstraction level
   touch .claude/skills/CORE/new-guide.md
   ```

3. **Add to documentation index**
   ```markdown
   # In SKILL.md Documentation Index
   - `new-guide.md` - [Description] | Triggers: "[trigger 1]", "[trigger 2]"
   ```

4. **Add context loading trigger**
   ```markdown
   # In "When to Read Additional Context" section
   **[Topic]** → READ `new-guide.md` when:
   - [Scenario 1]
   - [Scenario 2]
   - [Scenario 3]
   ```

5. **Update ROUTING_MAP.md**
   - Add to Context Loading Triggers section
   - Document when to use

6. **Cross-reference from related files**
   - Add "Related Documentation" section
   - Link from similar guides

---

### Adding a New Skill

**Checklist when creating new skill:**

1. **Use example-skill as template**
   ```bash
   cp -r .claude/skills/example-skill .claude/skills/new-skill-name
   ```

2. **Create SKILL.md with required sections**
   - [ ] YAML frontmatter with clear description
   - [ ] Workflow Routing section (REQUIRED)
   - [ ] Documentation index (if multiple files)
   - [ ] Context loading triggers (if complex)

3. **Create workflows/ subdirectory**
   ```bash
   mkdir -p .claude/skills/new-skill-name/workflows/
   ```

4. **Add routing for each workflow**
   - Clear trigger examples
   - Specific actions described
   - READ and EXECUTE instructions

5. **Update ROUTING_MAP.md**
   - Add to "User Intent → Skill Activation" table
   - Create skill section with all workflows
   - Document activation triggers

6. **Test activation**
   - Try trigger phrases
   - Verify routing works
   - Check workflow execution

---

## Structure Standards

### SKILL.md Structure (REQUIRED)

Every SKILL.md must have:

```yaml
---
name: skill-name
description: |
  Clear description of what this skill does.
  USE WHEN user says '[trigger 1]', '[trigger 2]', '[trigger 3]'
---

## Workflow Routing

**When user requests [action]:**
Examples: "[example 1]", "[example 2]"
→ **READ:** ${PAI_DIR}/skills/skill-name/workflows/workflow.md
→ **EXECUTE:** [Description of what happens]

[Repeat for all workflows]

---

## Documentation Index (if multiple reference files)

- `guide-file.md` - Description | Triggers: "trigger 1", "trigger 2"

---

## When to Read Additional Context (if complex skill)

**[Topic]** → READ `file.md` when:
- [Scenario 1]
- [Scenario 2]
```

### Guide File Structure (RECOMMENDED)

```markdown
# [Topic] Guide

**Purpose:** [One sentence]

---

## Table of Contents

[If >300 lines]

---

## [Section 1]

### [Subsection]

[Content]

---

## Related Documentation

- **file1.md** - Description
- **file2.md** - Description
```

### File Size Guidelines

| File Type | Target Size | Max Size | Action if Exceeded |
|-----------|------------|----------|-------------------|
| SKILL.md (CORE) | 300-500 lines | 800 lines | Split into reference files |
| SKILL.md (others) | 200-400 lines | 600 lines | Split into workflows |
| Guide files | 200-500 lines | 800 lines | Split into guide + examples |
| Workflow files | 100-300 lines | 500 lines | Split into sub-workflows |
| Template files | 200-400 lines | 600 lines | Create specialized templates |

---

## Reference Integrity Checks

### Before Committing Changes

**Always run these checks:**

```bash
# 1. Check for broken references in modified files
git diff --name-only | grep "\.md$" | while read file; do
  echo "Checking $file..."
  grep -H "\.md" "$file" 2>/dev/null | grep -v "^\s*#" || true
done

# 2. Verify no obsolete file references
git diff --name-only | grep "\.md$" | xargs grep -l \
  "cli-first-architecture\|agent-protocols\|delegation-patterns\|TESTING\.md\|playwright-config" \
  2>/dev/null && echo "⚠️  Found obsolete file references!" || echo "✅ No obsolete references"

# 3. Check that referenced files exist
# (Manual verification of links in changed files)
```

### After Major Changes

**Run comprehensive verification:**

```bash
# Full reference integrity check
find .claude/skills/CORE -name "*.md" -exec grep -l "\.md" {} \; | \
  while read file; do
    echo "Checking references in: $file"
    grep -o "[a-z-]\+\.md" "$file" | sort -u | while read ref; do
      if [ ! -f ".claude/skills/CORE/$ref" ] && \
         [ ! -f ".claude/skills/CORE/workflows/$ref" ] && \
         [ ! -f ".claude/templates/$ref" ]; then
        echo "  ⚠️  Potential broken reference: $ref"
      fi
    done
  done
```

---

## Usage Analytics

### Tracking What's Being Used

**Manual tracking methods:**

1. **Git activity analysis**
   ```bash
   # Files modified in last 3 months
   git log --since="3 months ago" --name-only --pretty=format: \
     .claude/skills/CORE/ | grep "\.md$" | sort | uniq -c | sort -rn
   ```

2. **Reference counting**
   ```bash
   # How many times each guide is referenced
   for file in .claude/skills/CORE/*.md; do
     basename=$( basename "$file" )
     count=$(grep -r "$basename" .claude/skills/CORE/ | wc -l)
     echo "$count references: $basename"
   done | sort -rn
   ```

3. **Size tracking**
   ```bash
   # Track file size changes over time
   git log --follow --oneline -- .claude/skills/CORE/SKILL.md | \
     head -5 | awk '{print $1}' | while read commit; do
       size=$(git show $commit:.claude/skills/CORE/SKILL.md | wc -l)
       echo "$commit: $size lines"
     done
   ```

### Decision Making Based on Usage

**High usage files (>10 refs, >5 modifications/quarter):**
- Keep and maintain carefully
- Consider expanding if frequently referenced
- Ensure quality is high

**Medium usage files (3-10 refs, 2-5 modifications/quarter):**
- Keep as-is
- Review quarterly
- Optimize if opportunities arise

**Low usage files (<3 refs, 0-1 modifications/quarter):**
- Review for consolidation
- Consider merging into related files
- Archive if truly unused >6 months

---

## Emergency Procedures

### If References Break

**Immediate action:**

1. **Identify broken references**
   ```bash
   grep -r "\.md" .claude/skills/CORE/ --include="*.md" > all-refs.txt
   # Review all-refs.txt for references to non-existent files
   ```

2. **Fix references**
   - Update to correct filename
   - Or remove if no longer needed
   - Or restore file if mistakenly deleted

3. **Verify fix**
   ```bash
   # Re-run reference check
   # Should return zero broken references
   ```

4. **Document what happened**
   - Add note to MIGRATION.md
   - Update ROUTING_MAP.md if routes changed

---

### If Redundancy Returns

**Detection:**
- Quarterly review finds duplicate content
- Same concept explained in multiple places
- File sizes growing beyond guidelines

**Action plan:**

1. **Analyze redundancy**
   - Which files have overlap?
   - What percentage is duplicated?
   - Which is authoritative source?

2. **Plan consolidation**
   - Follow Part I methodology
   - Create consolidation plan
   - Identify obsolete files

3. **Execute consolidation**
   - Extract unique content
   - Create/update consolidated file
   - Update all references
   - Remove obsolete files

4. **Verify and document**
   - Check reference integrity
   - Update ROUTING_MAP.md
   - Add to MIGRATION.md

---

### If Structure Degrades

**Signs of degradation:**
- Workflow routing missing from SKILL.md
- Context loading triggers unclear
- Files in wrong locations
- Cross-references broken

**Recovery procedure:**

1. **Audit current structure**
   ```bash
   # Check all SKILL.md files have routing
   find .claude/skills -name "SKILL.md" -exec echo {} \; -exec grep -c "Workflow Routing" {} \;
   ```

2. **Fix structure issues**
   - Add missing routing sections
   - Move files to correct locations
   - Add missing triggers
   - Fix cross-references

3. **Update standards**
   - Review this guide
   - Update examples
   - Clarify requirements

4. **Prevent recurrence**
   - Add checks to review cycle
   - Update templates
   - Document lessons learned

---

## Checklists

### New Workflow Checklist

- [ ] Created workflow file in workflows/ subdirectory
- [ ] Added routing to skill's SKILL.md
- [ ] Updated ROUTING_MAP.md
- [ ] Added trigger examples (minimum 2)
- [ ] Tested natural language activation
- [ ] Cross-referenced from related workflows
- [ ] Committed changes with descriptive message

### New Guide File Checklist

- [ ] Verified need (can't fit in existing file)
- [ ] File size within guidelines (200-500 lines target)
- [ ] Added to SKILL.md documentation index
- [ ] Added context loading trigger
- [ ] Updated ROUTING_MAP.md
- [ ] Cross-referenced from related guides
- [ ] Included "Related Documentation" section
- [ ] Tested loading and usage

### Monthly Maintenance Checklist

- [ ] Run automated validation scripts (check-references.sh, check-file-sizes.sh, validate-skills.sh)
- [ ] Check file counts against baselines
- [ ] Run redundancy spot check
- [ ] Review large files flagged by check-file-sizes.sh
- [ ] Update ROUTING_MAP.md if needed
- [ ] Document any issues found

### Quarterly Review Checklist

- [ ] Content audit (size, redundancy, relevance, accuracy)
- [ ] Structure audit (routing, triggers, cross-refs, templates)
- [ ] Usage analysis (track modifications)
- [ ] Routing map update
- [ ] Documentation review
- [ ] Create quarterly report (if significant findings)

---

## Related Documentation

- **COMPREHENSIVE_REFACTOR_PLAN_v1.md** - Original refactor methodology
- **REFACTOR_PART_I_SUMMARY.md** - Redundancy elimination approach
- **ROUTING_MAP.md** - Current routing reference
- **docs/MIGRATION.md** - Historical changes
- **Structure standards:** Follow example-skill pattern

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-01 | Initial maintenance guide created |
| 1.1 | 2026-01-10 | Added Automated Quality Checks section documenting validation scripts and pre-commit hook |

---

**Maintenance Responsibility:** All Qara contributors  
**Review Frequency:** Quarterly (Jan, Apr, Jul, Oct)  
**Update Trigger:** When maintenance procedures change  
**Status:** Active
