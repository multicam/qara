# Routing: Level 4 - Workflow Invocation

**Extracted from:** routing-patterns.md

This document covers Level 4 routing: specific procedures, tools, or executable workflows that implement the skill's functionality.

---

## Level 4: Workflow Invocation

**Where:** SKILL.md references to workflow files
**What:** Specific procedures, tools, or executable workflows
**How:** Direct file reads, script execution, or step-by-step instructions

**Example:**
```markdown
## Available Workflows

### Research Workflows
- **perplexity-research.md** - Use Perplexity API for web research
- **claude-research.md** - Use Claude's WebSearch for multi-query research
- **extract-alpha.md** - Extract key insights and wisdom from content

### Content Workflows
- **enhance.md** - Enhance content quality
- **retrieve.md** - Retrieve difficult-to-access content
```

**Routing Decision:**
- Request: "Do research on quantum computing using Perplexity"
- Levels 1-3 route to research skill
- Level 4 identifies "Perplexity" keyword → Routes to `perplexity-research.md`
- Qara reads workflow file and executes steps

**Best Practices:**
- Organize workflows by category in SKILL.md
- Provide clear workflow names that indicate purpose
- Include brief description of when to use each workflow
- Reference actual workflow file names for discoverability

---

**Related Documentation:**
- routing-patterns.md - Overview and routing hierarchy
- routing-level1-system.md - Level 1: System Prompt Routing
- routing-level2-activation.md - Level 2: Skill Activation
- routing-level3-context.md - Level 3: Internal Context Routing
- routing-pattern-types.md - The 4 routing pattern types
