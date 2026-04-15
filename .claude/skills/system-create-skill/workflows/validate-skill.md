# Validate Skill Workflow

Audit an existing skill for compliance with canonical PAI architectural standards.

**When to use:** "validate skill", "check skill compliance", "audit skill structure" — or before deploying/after updating a skill.

**Prerequisites:** Target skill exists in `${PAI_DIR}/skills/` and access to `skill-structure.md`.

---

## Step 1: Run Automated Validator

```bash
bun run ${PAI_DIR}/skills/system-create-skill/scripts/validate-skill.ts <skill-dir>
```

Parse the JSON output on stdout. If exit code is non-zero, report the `violations` array. Each violation has `rule`, `severity` (`error` or `warning`), and `detail`.

Automated checks cover: name format + reserved words, description length caps, combined description + when_to_use cap, SKILL.md body line count, Workflow Routing placement, orphan files, route count vs workflow count, and activation trigger coverage. Exit 0 = no errors (warnings allowed). Exit 1 = errors found. Exit 2 = internal error.

Continue to the prose checks below for judgment-based compliance categories the script does not cover (CORE duplication, archetype match, agent compatibility).

---

## Step 2: Read Canonical Architecture

```
${PAI_DIR}/skills/CORE/skill-structure.md
${PAI_DIR}/skills/system-create-skill/references/quality-checklist.md
```

Extract: 3 archetypes, mandatory requirements, routing rules, naming conventions, quality checklist.

---

## Step 3: Identify Target Skill

If user specifies name: `${PAI_DIR}/skills/[skill-name]/`.
If user says "validate this skill": check current directory for SKILL.md.

```bash
test -f ${PAI_DIR}/skills/[skill-name]/SKILL.md && echo "✅ Skill found"
```

---

## Step 4: Structural Validation [Score: X/10]

```bash
tree ${PAI_DIR}/skills/[skill-name]/
find ${PAI_DIR}/skills/[skill-name]/workflows/ -name "*.md" -type f | wc -l
```

| Workflows | Expected Archetype | Required |
|-----------|-------------------|----------|
| 0-3 | Minimal | SKILL.md + workflows/ |
| 3-15 | Standard | + optional documentation/, references/ |
| 15+ | Complex | + documentation/, optional METHODOLOGY.md |

Checks:
- Structure matches workflow count (not over/under-engineered)
- SKILL.md uppercase, workflows kebab-case

---

## Step 5: Routing Validation [Score: X/10]

**YAML frontmatter:**
- [ ] `name:` and `description:` present
- [ ] Description includes USE WHEN triggers (5-10 variations)

**Workflow Routing section:**
- [ ] Present and FIRST (immediately after YAML) — NOT buried mid/end

**Coverage:**
```bash
grep -c "When user requests" ${PAI_DIR}/skills/[skill-name]/SKILL.md
find ${PAI_DIR}/skills/[skill-name]/workflows/ -name "*.md" -type f | wc -l
```

- Route count = file count (no orphans, no dead routes)
- Each route has 3-5 example phrases
- File paths absolute (`${PAI_DIR}/skills/...`)
- EXECUTE description provided

---

## Step 6: Activation Triggers Validation [Score: X/10]

Check "When to Activate This Skill" covers 8 categories:

1. **Core skill name** — name variations, abbreviations
2. **Action verbs** — "do/run/perform/conduct [skill]"
3. **Modifiers** — "basic/quick/comprehensive/deep [skill]"
4. **Prepositions** — "[skill] on/for/about [target]"
5. **Synonyms** — industry jargon, casual vs formal
6. **Use-case oriented** — why someone would use this
7. **Result-oriented** — "find/discover/get [thing]"
8. **Tool/method specific** — specialized scenarios

Target: ≥5/8 categories. Includes casual phrasing and natural variations.

---

## Step 7: Documentation Validation [Score: X/10]

```bash
find ${PAI_DIR}/skills/[skill-name]/ -name "*.md" -type f
```

For each file (excluding SKILL.md):
- Referenced in SKILL.md main body
- Purpose explained
- When-to-use guidance present

Flag orphan files (unreferenced) and broken links (references to non-existent files).

---

## Step 8: Integration & Quality Validation [Score: X/10 each]

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

## Step 9: Generate Validation Report

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

**Validation complete when:** all 6 categories scored, issues categorized, compliance status determined, report generated.

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

- `create-skill.md` — create new compliant skill
- `canonicalize-skill.md` — fix non-compliant existing skill
- `update-skill.md` — update skill while maintaining compliance

**One source of truth:** `${PAI_DIR}/skills/CORE/skill-structure.md`
