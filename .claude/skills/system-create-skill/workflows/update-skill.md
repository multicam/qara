# Update Skill Workflow

**Purpose:** Update existing skill with new workflows, documentation, or features while maintaining compliance

**When to Use:**
- User says "update skill", "add workflow to skill", "extend skill"
- Need to add new workflow, documentation, or features
- Need to refactor workflow organization (flat → nested)

**Prerequisites:**
- Target skill exists and is functional
- Access to skill-structure.md

---

## Workflow Steps

### Step 1: Read Canonical Architecture

**REQUIRED:**
```bash
${PAI_DIR}/skills/CORE/skill-structure.md
```

Extract: archetype requirements, routing rules, file organization, naming conventions.

---

### Step 2: Identify Update Scope

**Ask user what needs updating:**

| Type | Key Questions |
|------|-------------|
| **Add Workflow** | What does it do? What triggers it? Where does it fit? |
| **Reorganize** | Current org (flat/nested)? Target org? Why? |
| **Add Documentation** | What docs? Where (documentation/, references/)? |
| **Add Features** | State management? Tools? Agent integration? |
| **Fix Compliance** | What issues from validate-skill? |

---

### Step 3: Assess Current State

Read current SKILL.md and analyze:
- Current archetype (Minimal/Standard/Complex)
- Workflow count and directory structure
- Routing patterns

**Check for archetype upgrade triggers:**
- Adding workflows to Minimal (3+ total) → Standard?
- Adding many to Standard (15+ total) → Complex?
- Adding state management → bump up?

---

### Step 4: Create Backup

```bash
cp -r ${PAI_DIR}/skills/[skill-name]/ \
      ${PAI_DIR}/skills/[skill-name]/.backup-$(date +%Y%m%d-%H%M%S)/
```

---

### Step 5: Implement Changes

**Add New Workflow:**
1. Create `workflows/[new-workflow].md` using standard template
2. Add routing in SKILL.md Workflow Routing section (with 3-5 example phrases)
3. Add triggers to "When to Activate" section
4. Add to Workflow Overview

**Reorganize Workflows (Flat → Nested):**
1. Create category directories under `workflows/`
2. Move workflows to categories
3. Update ALL routing paths in SKILL.md
4. Update Workflow Overview

**Add Documentation:**
1. Create `documentation/` or `references/` dir if needed
2. Create doc file
3. Link from SKILL.md Extended Context section

**Add Features:**
- State: `mkdir state/`, add `.gitignore` for state files
- Tools: `mkdir tools/`, create tool scripts
- Testing: `mkdir testing/`, create test files
- Document all in SKILL.md

**Fix Compliance:**
- Use issues from validate-skill report
- Fix each issue, verify no new issues introduced

---

### Step 6: Update Archetype (If Needed)

**Minimal → Standard:** Add documentation/, references/ directories
**Standard → Complex:** Add full tree + optional METHODOLOGY.md

Update SKILL.md to reflect new complexity level.

---

### Step 7: Validate Changes

Run validate-skill workflow. Check:
- ✅ Structural (archetype correct)
- ✅ Routing (new workflows routed)
- ✅ Activation triggers (expanded if needed)
- ✅ Documentation (new files linked)
- ✅ Integration (no regressions)

---

### Step 8: Test

Test new workflow activations with natural language triggers.
Test existing workflows to ensure no regressions.
Verify reorganized paths work if applicable.

---

## Success Criteria

- ✅ Changes implemented as specified
- ✅ SKILL.md updated (routing, triggers, documentation)
- ✅ All new files linked from SKILL.md
- ✅ Archetype updated if needed
- ✅ Validation passed
- ✅ Tested (new + existing workflows)
- ✅ Backup created

---

## Quick Patterns

**Adding single workflow:** Create file → add routing → add triggers → validate. (~10 min)
**Reorganizing flat→nested:** Create dirs → move files → update paths → test. (~20 min)
**Archetype upgrade:** Add directories → move docs → update SKILL.md as hub. (~30 min)

**Safety:** ALWAYS backup, validate after changes, test existing functionality.

---

## Related Workflows

- **create-skill.md** - Create new skill from scratch
- **validate-skill.md** - Validate updated skill compliance
- **canonicalize-skill.md** - Major refactoring for compliance

**One Source of Truth:** `${PAI_DIR}/skills/CORE/skill-structure.md`
