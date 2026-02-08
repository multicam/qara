# Validate Skill Workflow

**Purpose:** Audit existing skill for compliance with canonical PAI architectural standards

**When to Use:**
- User says "validate skill", "check skill compliance", "audit skill structure"
- Before deploying a skill to production
- After creating or updating a skill

**Prerequisites:**
- Target skill exists in ${PAI_DIR}/skills/
- Access to skill-structure.md

---

## Workflow Steps

### Step 1: Read Canonical Architecture

**REQUIRED FIRST STEP:**
```bash
${PAI_DIR}/skills/CORE/skill-structure.md
```

Extract: 3 archetypes, mandatory requirements, routing rules, naming conventions, quality checklist.

---

### Step 2: Identify Target Skill

If user specifies name: `${PAI_DIR}/skills/[skill-name]/`
If user says "validate this skill": check current directory for SKILL.md.

```bash
test -f ${PAI_DIR}/skills/[skill-name]/SKILL.md && echo "✅ Skill found"
```

---

### Step 3: Structural Validation [Score: X/10]

```bash
tree ${PAI_DIR}/skills/[skill-name]/
find ${PAI_DIR}/skills/[skill-name]/workflows/ -name "*.md" -type f | wc -l
```

**Check archetype compliance:**

| Workflows | Expected Archetype | Required |
|-----------|-------------------|----------|
| 0-3 | Minimal | SKILL.md + workflows/ |
| 3-15 | Standard | + optional documentation/, references/ |
| 15+ | Complex | + documentation/, optional METHODOLOGY.md |

- Does structure match workflow count?
- Is skill over/under-engineered?
- SKILL.md uppercase? Workflows kebab-case?

---

### Step 4: Routing Validation [Score: X/10]

Read SKILL.md and check:

**YAML frontmatter:**
- [ ] `name:` and `description:` present
- [ ] Description includes USE WHEN triggers (5-10 variations)

**Workflow Routing section:**
- [ ] Present and FIRST (immediately after YAML)
- [ ] NOT buried in middle/end

**Coverage:**
```bash
grep -c "When user requests" ${PAI_DIR}/skills/[skill-name]/SKILL.md
find ${PAI_DIR}/skills/[skill-name]/workflows/ -name "*.md" -type f | wc -l
```

- Route count = file count? (no orphans, no dead routes)
- Each route has 3-5 example phrases?
- File paths are absolute (`${PAI_DIR}/skills/...`)?
- EXECUTE description provided?

---

### Step 5: Activation Triggers Validation [Score: X/10]

Check "When to Activate This Skill" section covers 8 categories:

1. **Core Skill Name** — name variations, abbreviations
2. **Action Verbs** — "do/run/perform/conduct [skill]"
3. **Modifiers** — "basic/quick/comprehensive/deep [skill]"
4. **Prepositions** — "[skill] on/for/about [target]"
5. **Synonyms** — industry jargon, casual vs formal
6. **Use Case Oriented** — why someone would use this
7. **Result-Oriented** — "find/discover/get [thing]"
8. **Tool/Method Specific** — specialized scenarios

Target: ≥5/8 categories. Includes casual phrasing, natural variations.

---

### Step 6: Documentation Validation [Score: X/10]

```bash
find ${PAI_DIR}/skills/[skill-name]/ -name "*.md" -type f
```

For each file (excluding SKILL.md):
- Referenced in SKILL.md main body?
- Purpose explained?
- When-to-use guidance?

Check for orphan files (unreferenced) and broken links (references to non-existent files).

---

### Step 7: Integration & Quality Validation [Score: X/10 each]

**Integration:**
- No duplication of CORE context
- References CORE instead of copying
- Compatible with agent workflows

**Quality:**
- Progressive disclosure (SKILL.md = hub, workflows = detail)
- Naming conventions (SKILL.md uppercase, workflows kebab-case)
- Template compliance
- Examples present

---

### Step 8: Generate Validation Report

Compile results into report:

```markdown
# Skill Validation Report: [skill-name]

**Overall Score:** [X/70] ([percentage]%)
**Archetype:** [Minimal/Standard/Complex]
**Status:** [COMPLIANT / NON-COMPLIANT / NEEDS IMPROVEMENT]

## Results Summary
| Category | Score | Status |
|----------|-------|--------|
| Structural | X/10 | ✅/❌ |
| Routing | X/10 | ✅/❌ |
| Activation | X/10 | ✅/❌ |
| Documentation | X/10 | ✅/❌ |
| Integration | X/10 | ✅/❌ |
| Quality | X/10 | ✅/❌ |

## Issues
### Critical (Must Fix)
### Major (Should Fix)
### Minor (Nice to Fix)

## Recommendations
[Actions to achieve/maintain compliance]
```

---

## Success Criteria

**Validation complete when:**
- All 6 categories checked with scores
- Issues identified and categorized
- Compliance status determined
- Report generated

**COMPLIANT when:** Score ≥ 60/70, no critical issues, Workflow Routing present and FIRST, all workflows routed.

---

## Common Validation Failures

| Failure | Impact | Fix |
|---------|--------|-----|
| Missing Workflow Routing | CRITICAL | Add section FIRST, route all workflows |
| Orphan workflows | CRITICAL | Add routing for each orphan |
| Routing not FIRST | MAJOR | Move to first position |
| Incomplete triggers | MAJOR | Expand to 8 categories |
| Vague examples | MAJOR | Use real user phrasings |
| Unlinked files | MINOR | Link from SKILL.md |
| Wrong archetype | MINOR | Refactor to match workflow count |

---

## Related Workflows

- **create-skill.md** - Create new compliant skill
- **canonicalize-skill.md** - Fix non-compliant existing skill
- **update-skill.md** - Update skill while maintaining compliance

**One Source of Truth:** `${PAI_DIR}/skills/CORE/skill-structure.md`
