# Skill Creation Examples

Worked examples of the skill creation/validation process for each archetype.

---

## Example 1: Minimal Skill

**User:** "Create a skill for generating API documentation"

1. Read `skill-structure.md`
2. Archetype: Minimal (single workflow)
3. Structure:
   ```
   api-docs/
   ├── SKILL.md
   └── workflows/
       └── generate-docs.md
   ```
4. SKILL.md: YAML with USE WHEN triggers, Workflow Routing FIRST, 8-category activation section
5. Validate against quality checklist
6. Test: "generate API docs for my service"

---

## Example 2: Standard Skill

**User:** "Create a skill for database operations — migrations, backups, queries, optimization"

1. Archetype: Standard (4 workflows)
2. Structure:
   ```
   database/
   ├── SKILL.md
   └── workflows/
       ├── run-migration.md
       ├── backup-database.md
       ├── optimize-queries.md
       └── execute-query.md
   ```
3. Route each workflow semantically in SKILL.md
4. Comprehensive triggers covering all 4 workflows
5. Validate, register, test each activation

---

## Example 3: Validating Existing Skill

**User:** "Validate the research skill for compliance"

1. Read `skill-structure.md` + `${PAI_DIR}/skills/research/SKILL.md`
2. Run validation checks:
   - Workflow Routing section present and FIRST
   - All workflows explicitly routed (route count = file count)
   - Activation triggers comprehensive (≥5/8 categories)
   - All files referenced from main body
   - Archetype structure matches workflow count
3. Report status: COMPLIANT / NON-COMPLIANT / NEEDS IMPROVEMENT

---

## Example 4: Complex Skill

**User:** "Create a skill for code review — security, performance, style, architecture analysis"

1. Archetype: Complex (20+ workflows, 4 categories)
2. Structure:
   ```
   code-review/
   ├── SKILL.md
   ├── CONSTITUTION.md
   ├── METHODOLOGY.md
   ├── documentation/
   ├── workflows/
   │   ├── security/
   │   ├── performance/
   │   ├── style/
   │   └── architecture/
   └── references/
   ```
3. Categorized routing in SKILL.md
4. CONSTITUTION for review philosophy, METHODOLOGY for multi-stage process
5. Validate all workflow categories

---

## Example 5: Adding Workflow to Existing Skill

**User:** "Add a 'compare models' workflow to the research skill"

1. Read `skill-structure.md` + target SKILL.md
2. Create `workflows/compare-models.md`
3. Update SKILL.md: add routing entry, activation triggers, main body description
4. Validate updated structure
5. Test: "compare Claude vs GPT"

---

## Example 6: Canonicalizing Non-Compliant Skill

**User:** "Canonicalize the legacy-report skill"

1. Audit current structure against canonical template
2. Identify violations (e.g. missing Workflow Routing, orphaned workflows, incomplete triggers)
3. Rebuild SKILL.md: add Workflow Routing FIRST, route all workflows, expand activation triggers
4. Preserve existing workflow file content
5. Validate and report compliance

---

## Archetype Selection Logic

- **Minimal:** 1-3 workflows, single responsibility, simple activation
- **Standard:** 3-15 workflows, multiple related capabilities, clear semantic routing
- **Complex:** 15+ workflows, categorized, multi-stage, needs philosophy/methodology

## Validation Checklist (apply to every create/update)

1. Workflow Routing section present and FIRST
2. All workflow files explicitly routed
3. All secondary files linked from main body
4. Activation triggers comprehensive (8-category pattern)
5. Examples provided
6. Naming conventions followed

## Activation Testing

Test each created skill with:
- Direct trigger phrases from description
- Variations and synonyms
- Context-based activation
- Related requests that should NOT activate

**api-docs example:**
- ✅ "generate API docs", "create API documentation", "document my API"
- ❌ "write documentation", "explain API", "API tutorial"
