---
name: system-create-skill
context: fork
model: sonnet
description: |
  Skill creation and validation framework ensuring compliance with PAI architectural standards.

  USE WHEN user says "create skill", "create a skill", "new skill", "build skill",
  "make skill", "skill for X", "Create-A-Skill", or any request to create new PAI skills.
---

## Workflow Routing (SYSTEM PROMPT)

Every skill creation/update request MUST follow architectural compliance validation. `${PAI_DIR}/skills/CORE/skill-structure.md` is the single source of truth — read it before any operation.

**Create skill:** "create skill", "new skill", "build skill", "skill for X"
→ READ `${PAI_DIR}/skills/CORE/skill-structure.md`
→ READ `${PAI_DIR}/skills/system-create-skill/workflows/create-skill.md`

**Validate skill:** "validate skill", "check skill compliance", "audit skill"
→ READ `${PAI_DIR}/skills/CORE/skill-structure.md`
→ READ `${PAI_DIR}/skills/system-create-skill/workflows/validate-skill.md`

**Update skill:** "update skill", "refactor skill", "add workflow to skill"
→ READ `${PAI_DIR}/skills/CORE/skill-structure.md`
→ READ `${PAI_DIR}/skills/system-create-skill/workflows/update-skill.md`

**Canonicalize skill:** "canonicalize skill", "rebuild skill to standards", "fix skill compliance"
→ READ `${PAI_DIR}/skills/CORE/skill-structure.md`
→ READ `${PAI_DIR}/skills/system-create-skill/workflows/canonicalize-skill.md`

---

## Non-Negotiable Requirements

1. **Workflow Routing section FIRST** — immediately after YAML frontmatter
2. **Every workflow must be routed** — no orphaned workflow files
3. **Every secondary file must be linked** from main SKILL.md body
4. **Follow canonical archetype** (Minimal/Standard/Complex)
5. **Progressive disclosure:** SKILL.md → workflows → documentation → references

## Quality Gates

Every created/updated skill must pass:

1. **Structural** — correct archetype, file naming, required files present
2. **Routing** — Workflow Routing FIRST, all workflows routed, 8-category activation triggers
3. **Documentation** — all files referenced, clear purpose, examples
4. **Integration** — no CORE duplication, compatible with agent workflows

---

## Archetype Selection

| Workflows | Archetype | Structure |
|-----------|-----------|-----------|
| 1-3 | Minimal | SKILL.md + workflows/ |
| 3-15 | Standard | + optional documentation/, references/ |
| 15+ | Complex | + nested workflows/, CONSTITUTION.md, METHODOLOGY.md |

See `references/archetype-templates.md` for complete structure templates.

---

## Process

1. **Define purpose** — capability, triggers, workflow count, integrations
2. **Choose archetype** — based on workflow count and complexity
3. **Read `skill-structure.md`** — latest requirements and patterns
4. **Create structure** — follow exact canonical template
5. **Validate** — run quality gates checklist
6. **Test activation** — verify natural language triggers

---

## Extended Context

**Primary reference:** `${PAI_DIR}/skills/CORE/skill-structure.md` — canonical guide, 3 archetypes, 4-level routing hierarchy, structural requirements, naming conventions.

**Workflows:**
- `workflows/create-skill.md` — full creation workflow with validation gates
- `workflows/validate-skill.md` — compliance audit
- `workflows/update-skill.md` — refactoring/extension
- `workflows/canonicalize-skill.md` — rebuild non-compliant skill

**References:**
- `references/archetype-templates.md` — complete structure templates
- `references/skill-examples.md` — worked examples
- `references/quality-checklist.md` — validation checklist

---

**Zero tolerance for:** orphaned workflows, invisible files, vague triggers, structural violations.
