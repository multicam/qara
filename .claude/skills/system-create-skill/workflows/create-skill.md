# Create Skill Workflow

**Purpose:** Create a brand new PAI skill following canonical architectural standards

**When to Use:**
- User says "create skill", "create a skill", "new skill", "build skill", "make skill"
- User wants to add new capability domain to PAI
- User requests "skill for [purpose]"

**Prerequisites:**
- Access to skill-structure.md
- Understanding of skill purpose and requirements

---

## Workflow Steps

### Step 1: Read Canonical Architecture

**REQUIRED FIRST STEP:**
```bash
${PAI_DIR}/skills/CORE/skill-structure.md
```

Extract: 3 archetypes, SKILL.md template, mandatory requirements, workflow routing rules, naming conventions, 8-category activation pattern, quality checklist.

---

### Step 2: Define Skill Requirements

Ask user to clarify:

1. **What does this skill do?** (Core capability, problem solved, domain)
2. **When should it activate?** (Trigger phrases, synonyms, variations)
3. **What workflows does it need?** (Count, types, sequential vs independent)
4. **What integrations?** (Agents, external services, tools)
5. **Skill name?** (kebab-case format)

---

### Step 3: Choose Archetype

Based on workflow count and complexity:

| Archetype | Workflows | Structure | Example |
|-----------|-----------|-----------|---------|
| **Minimal** | 0-3 | SKILL.md + workflows/ OR assets/ | be-creative, social-xpost |
| **Standard** | 3-15 | + optional documentation/, references/ | research, blogging |
| **Complex** | 15+ | Full directory tree + METHODOLOGY.md | development, CORE |

Additional factors: state management or embedded apps → bump up one level.

---

### Step 4: Create Directory Structure

Create directories matching chosen archetype:

```bash
# Minimal
mkdir -p ${PAI_DIR}/skills/[skill-name]/workflows

# Standard
mkdir -p ${PAI_DIR}/skills/[skill-name]/{workflows,documentation}

# Complex
mkdir -p ${PAI_DIR}/skills/[skill-name]/{workflows,documentation,references,state,tools,testing}
```

---

### Step 5: Create SKILL.md

**Use the canonical template from skill-structure.md.** Critical elements:

1. YAML frontmatter with name and comprehensive description (5-10 USE WHEN triggers)
2. Workflow Routing section FIRST (after YAML)
3. Every workflow explicitly routed with examples
4. 8-category activation pattern in "When to Activate"
5. Clear capability descriptions
6. Workflow overview linking all files
7. Concrete examples

---

### Step 6: Create Workflow Files

For each workflow, use standard template from skill-structure.md:
- Purpose, When to Use, Prerequisites
- Numbered workflow steps with actions and expected outcomes
- Outputs section
- Related workflows

---

### Step 7: Validate Skill Structure

Run structural validation:

```bash
test -f ${PAI_DIR}/skills/[skill-name]/SKILL.md && echo "✅ SKILL.md present"
test -d ${PAI_DIR}/skills/[skill-name]/workflows && echo "✅ workflows/ present"
find ${PAI_DIR}/skills/[skill-name]/workflows/ -name "*.md" | wc -l
```

**Checklist:**
- [ ] YAML frontmatter present
- [ ] Workflow Routing section present and FIRST
- [ ] All workflows routed
- [ ] 8-category activation pattern used
- [ ] All workflow files exist and linked
- [ ] Directory structure matches archetype
- [ ] Naming conventions followed (SKILL.md uppercase, workflows kebab-case)

---

### Step 8: Test Skill Activation

1. Start fresh conversation
2. Try primary trigger: "do [skill-name] for [target]"
3. Try casual trigger: "quick [skill-name]"
4. Try result-oriented: "[problem that skill solves]"

Verify: Skill loads SKILL.md → routes to correct workflow → executes steps.

---

## Success Criteria

- ✅ Archetype chosen and implemented
- ✅ SKILL.md written using canonical template
- ✅ Workflow Routing section present and FIRST
- ✅ ALL workflows routed explicitly
- ✅ 8-category activation pattern used
- ✅ All workflow files created and linked
- ✅ Tested with natural language triggers
- ✅ Validated against quality checklist

---

## Critical Rules

1. **ALWAYS read skill-structure.md FIRST**
2. **Workflow Routing section MUST be FIRST**
3. **Every workflow MUST be routed**
4. **8-category activation pattern is NOT optional**
5. **Test activation before declaring complete**

**One Source of Truth:** `${PAI_DIR}/skills/CORE/skill-structure.md`

---

## Related Workflows

- **validate-skill.md** - Validate created skill for compliance
- **canonicalize-skill.md** - Fix non-compliant existing skill
- **update-skill.md** - Add workflows or extend existing skill
