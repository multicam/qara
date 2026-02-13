# Skill Creation Examples

These examples demonstrate the skill creation process for different archetypes.

---

## Example 1: Creating a Minimal Skill

**User:** "Create a skill for generating API documentation"

**System-create-skill Response:**
1. Read skill-structure.md
2. Determine archetype: Minimal (single workflow)
3. Create structure:
   ```
   api-docs/
   ├── SKILL.md
   └── workflows/
       └── generate-docs.md
   ```
4. Write SKILL.md with:
   - YAML: name, description with USE WHEN triggers
   - Workflow Routing section (FIRST)
   - When to Activate section (8-category pattern)
   - Main body with workflow description
5. Validate against quality checklist
6. Test activation: "generate API docs for my service"

---

## Example 2: Creating a Standard Skill

**User:** "Create a skill for database operations - migrations, backups, queries, optimization"

**System-create-skill Response:**
1. Read skill-structure.md
2. Determine archetype: Standard (4 workflows)
3. Create structure:
   ```
   database/
   ├── SKILL.md
   └── workflows/
       ├── run-migration.md
       ├── backup-database.md
       ├── optimize-queries.md
       └── execute-query.md
   ```
4. Write SKILL.md with semantic routing:
   - Route "run migration" → run-migration.md
   - Route "backup database" → backup-database.md
   - Route "optimize" → optimize-queries.md
   - Route "query" → execute-query.md
5. Comprehensive activation triggers covering all 4 workflows
6. Validate and register
7. Test each workflow activation

---

## Example 3: Validating Existing Skill

**User:** "Validate the research skill for compliance"

**System-create-skill Response:**
1. Read skill-structure.md
2. Read ${PAI_DIR}/skills/research/SKILL.md
3. Run validation:
   - ✅ Workflow Routing section present and FIRST
   - ✅ All 12 workflows explicitly routed
   - ✅ Activation triggers comprehensive
   - ✅ All files referenced
   - ✅ Standard archetype structure correct
4. Report: "research skill is COMPLIANT - no issues found"

---

## Example 4: Creating a Complex Skill

**User:** "Create a skill for comprehensive code review - security, performance, style, architecture analysis"

**System-create-skill Response:**
1. Read skill-structure.md
2. Determine archetype: Complex (20+ workflows across categories)
3. Create structure:
   ```
   code-review/
   ├── SKILL.md
   ├── CONSTITUTION.md
   ├── METHODOLOGY.md
   ├── documentation/
   │   ├── principles.md
   │   └── standards.md
   ├── workflows/
   │   ├── security/
   │   │   ├── check-vulnerabilities.md
   │   │   └── audit-dependencies.md
   │   ├── performance/
   │   │   ├── profile-bottlenecks.md
   │   │   └── optimize-queries.md
   │   ├── style/
   │   │   ├── format-check.md
   │   │   └── lint-fix.md
   │   └── architecture/
   │       ├── analyze-patterns.md
   │       └── suggest-refactors.md
   └── references/
       ├── security-checklist.md
       └── performance-metrics.md
   ```
4. Write comprehensive routing with categorized workflows
5. Include CONSTITUTION for review philosophy
6. Add METHODOLOGY for multi-stage review process
7. Validate and test all workflow categories

---

## Example 5: Adding Workflow to Existing Skill

**User:** "Add a 'compare models' workflow to the research skill"

**System-create-skill Response:**
1. Read skill-structure.md
2. Read ${PAI_DIR}/skills/research/SKILL.md
3. Identify existing structure (Standard archetype)
4. Create new workflow file:
   ```
   ${PAI_DIR}/skills/research/workflows/compare-models.md
   ```
5. Update SKILL.md:
   - Add routing entry in Workflow Routing section
   - Add activation triggers in When to Activate section
   - Add workflow description in main body
6. Validate updated skill structure
7. Test new workflow activation: "compare Claude vs GPT"

---

## Example 6: Canonicalizing Non-Compliant Skill

**User:** "Canonicalize the legacy-report skill"

**System-create-skill Response:**
1. Read skill-structure.md
2. Read ${PAI_DIR}/skills/legacy-report/SKILL.md
3. Audit current structure:
   - ❌ No Workflow Routing section
   - ❌ Workflows not explicitly routed
   - ❌ Missing activation triggers
   - ✅ Correct directory structure
4. Rebuild SKILL.md following canonical template:
   - Add Workflow Routing section at top
   - Route all 6 existing workflows
   - Add comprehensive 8-category activation triggers
   - Preserve existing workflow content
5. Validate rebuilt skill
6. Report: "legacy-report skill now COMPLIANT - restructured with routing"

---

## Common Patterns

### Archetype Selection Logic

**Choose Minimal when:**
- 1-3 workflows
- Single responsibility
- Simple activation patterns
- No complex dependencies

**Choose Standard when:**
- 3-15 workflows
- Multiple related capabilities
- May need documentation/ or references/
- Clear semantic routing

**Choose Complex when:**
- 15+ workflows
- Multi-stage processes
- Requires philosophy/methodology docs
- Needs categorized workflow organization
- Complex state management

### Validation Checklist Application

For every skill creation/update:
1. ✅ Workflow Routing section present and FIRST
2. ✅ All workflow files explicitly routed
3. ✅ All secondary files linked from main body
4. ✅ Activation triggers comprehensive (8-category pattern)
5. ✅ Examples provided
6. ✅ Naming conventions followed

### Testing Patterns

**Test each created skill with:**
- Direct trigger phrases from description
- Variations and synonyms
- Context-based activation
- Related but different requests (should NOT activate)

**Example for api-docs skill:**
- ✅ Should activate: "generate API docs", "create API documentation", "document my API"
- ❌ Should NOT activate: "write documentation", "explain API", "API tutorial"
