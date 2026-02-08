# Canonicalize Skill Workflow

**Purpose:** Analyze existing skill and rebuild according to canonical PAI standards while preserving functionality

**When to Use:**
- User says "canonicalize skill", "canonicalize this skill", "canonicalize [skill-name]"
- Existing skill doesn't follow current architectural standards
- Need to refactor skill to comply with skill-structure.md

**Prerequisites:**
- Target skill exists in ${PAI_DIR}/skills/
- Access to skill-structure.md

---

## Workflow Steps

### Step 1: Identify Target Skill

If user specifies name: `${PAI_DIR}/skills/[skill-name]/`
If "canonicalize this skill": check current directory for SKILL.md.

---

### Step 2: Read Canonical Architecture

**REQUIRED:**
```bash
${PAI_DIR}/skills/CORE/skill-structure.md
```

Extract: 3 archetypes, mandatory requirements, routing rules (FIRST section), naming conventions, 8-category pattern.

---

### Step 3: Analyze Current Structure

```bash
tree ${PAI_DIR}/skills/[skill-name]/
find ${PAI_DIR}/skills/[skill-name]/workflows/ -name "*.md"
```

Read SKILL.md. Analyze: directory structure, YAML frontmatter, Workflow Routing presence/location, workflow routing status, activation triggers, naming compliance.

---

### Step 4: Identify Compliance Gaps

Run through mandatory requirements:

| Check | Status |
|-------|--------|
| Workflow Routing section present? | ✅/❌ |
| Workflow Routing is FIRST? | ✅/❌ |
| ALL workflows routed? | ✅/❌ |
| File paths absolute? | ✅/❌ |
| Route examples provided? | ✅/❌ |
| All files referenced in SKILL.md? | ✅/❌ |
| USE WHEN in YAML description? | ✅/❌ |
| 8-category activation pattern? | X/8 |
| Archetype matches workflow count? | ✅/❌ |
| SKILL.md uppercase, workflows kebab-case? | ✅/❌ |

---

### Step 5: Preserve Functionality

**Critical: Do NOT lose functionality during canonicalization.**

Extract and preserve: all workflow content, domain knowledge, integration points, examples, reference documentation, configurations.

```bash
cp -r ${PAI_DIR}/skills/[skill-name]/ \
      ${PAI_DIR}/skills/[skill-name]/.backup-$(date +%Y%m%d-%H%M%S)/
```

---

### Step 6: Determine Target Structure

Based on workflow count: 0-3 → Minimal, 3-15 → Standard, 15+ → Complex.

Plan the target directory structure matching the appropriate archetype.

---

### Step 7: Rebuild SKILL.md

Create new SKILL.md following canonical template from skill-structure.md:

1. ✅ YAML frontmatter with name + description (USE WHEN triggers)
2. ✅ Workflow Routing section FIRST — route EVERY workflow
3. ✅ "When to Activate" with 8-category pattern
4. ✅ Extended Context sections
5. ✅ All files linked in main body

---

### Step 8: Reorganize Files

- Move/rename files to match target structure
- Fix naming (kebab-case workflows, UPPERCASE root docs)
- Create/remove directories as needed for archetype

---

### Step 9: Validate

Run validate-skill workflow. All categories must pass:
- ✅ Structural (correct archetype)
- ✅ Routing (all workflows routed, FIRST)
- ✅ Activation (8-category coverage)
- ✅ Documentation (all files referenced)
- ✅ Integration (no CORE duplication)
- ✅ Quality (progressive disclosure, naming)

---

### Step 10: Generate Migration Report

```markdown
# Canonicalization Report: [skill-name]

**Original Structure:** [archetype or non-compliant]
**Target Structure:** [archetype]

## Changes Made
- [Structure changes, file moves/renames]
- [SKILL.md fixes: routing, triggers, linking]

## Functionality Preserved
✅ All [N] workflows maintained
✅ All domain knowledge preserved

## Validation: PASS/FAIL
```

---

## Success Criteria

- ✅ Follows canonical archetype structure
- ✅ Workflow Routing present and FIRST
- ✅ ALL workflows routed, ALL files referenced
- ✅ 8-category activation triggers
- ✅ Naming conventions followed
- ✅ Passes complete validation
- ✅ Functionality preserved
- ✅ Backup created

**Philosophy:** Canonicalization is about **compliance**, not creativity. Structure follows templates. Functionality is preserved. Quality is validated.

---

## Related Workflows

- **validate-skill.md** - Run after canonicalization
- **update-skill.md** - For incremental changes after
- **create-skill.md** - For new skills from scratch

**One Source of Truth:** `${PAI_DIR}/skills/CORE/skill-structure.md`
