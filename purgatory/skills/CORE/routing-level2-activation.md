# Routing: Level 2 - Skill Activation

**Extracted from:** routing-patterns.md

This document covers Level 2 routing: detailed activation conditions in SKILL.md that determine when full skill context should be loaded.

---

## Level 2: Skill Activation

**Where:** SKILL.md "When to Activate This Skill" section
**What:** Detailed conditions for loading full skill context
**How:** Conditional logic based on request characteristics

**Example:**
```markdown
## When to Activate This Skill

- User requests creative output or thinking
- User says "be creative", "UltraThink", "think deeply"
- Tasks involving creative writing (stories, poems, jokes)
- Idea generation or brainstorming sessions
- Requests for "diverse ideas", "different perspectives"
- Need to avoid formulaic or typical responses
```

**Routing Decision:**
- Request matches Level 1 trigger → Skill loads SKILL.md
- SKILL.md checks activation conditions
- If conditions match → Full skill context becomes available
- If conditions don't match → Skill may suggest alternative

**Best Practices:**
- List specific user request patterns
- Include task type categories (e.g., "creative writing", "code generation")
- Specify when NOT to use this skill (boundary conditions)
- Provide examples of matching vs non-matching requests

---

## Comprehensive Template Structure

Use this structure for "When to Activate This Skill" sections:

```markdown
## When to Activate This Skill

**Core Triggers - Use this skill when user says:**

### Direct [Skill Name] Requests
- "do [skill] on [target]" or "do some [skill]"
- "run [skill] on [target]" or "perform [skill]"
- "conduct [skill]" or "execute [skill]"
- "basic [skill]", "quick [skill]", "simple [skill]", "super basic [skill]"
- "comprehensive [skill]", "deep [skill]", "full [skill]", "thorough [skill]"
- "[skill] [target]" (just skill + target name)
- "[skill] lookup", "[skill] investigation", "[skill] research"

### [Category 1: Primary Use Case]
- "synonym 1 [target]", "synonym 2 [target]"
- "use case phrase 1", "use case phrase 2"
- "result-oriented phrase 1", "result-oriented phrase 2"
- "[skill] with [method/tool]"

### [Category 2: Secondary Use Case]
- Similar pattern as above
- Cover all major use cases for the skill

### [Category 3: Specific Scenarios]
- Edge cases and less common patterns
- Tool-specific triggers if applicable

### Use Case Indicators
- Describe WHY someone would use this skill
- What problems it solves
- What outcomes it enables
```

---

## Quality Checklist for Activation Triggers

Before finalizing "When to Activate This Skill" section, verify:

- [ ] **Action verbs covered** - Includes "do", "run", "perform", "conduct", "execute"
- [ ] **Modifiers covered** - Includes "basic", "quick", "simple", "comprehensive", "deep", "full"
- [ ] **Prepositions covered** - Includes "on", "for", "against", "of", "about"
- [ ] **Casual phrasing** - Includes how humans actually talk ("super basic X", "just do X")
- [ ] **Synonyms included** - All common alternative names for the skill
- [ ] **Use cases clear** - Describes WHY someone would use this skill
- [ ] **Result-oriented** - Includes "find X", "discover X", "get X" patterns
- [ ] **Tool-specific** - If applicable, includes tool/method names
- [ ] **Natural language test** - Read triggers aloud - do they sound like real requests?

---

## Real-World Example: blogging

Good example from production:
```markdown
## When to Activate This Skill

- User says "write a blog post", "create a blog post", "blog about X"
- User says "publish blog", "deploy blog", "push blog live"
- User mentions "blog post creation", "blog writing", "blogging"
- User requests "canonicalize post", "rewrite blog"
```

This is comprehensive because it covers:
- Action verbs: "write", "create", "publish", "deploy"
- Casual phrasing: "blog about X"
- Synonyms: "blog post creation", "blogging"
- Use cases: "canonicalize", "rewrite"

---

## When to Update Existing Skills

Update skills when:
- User says "why didn't you use skill X?" after a routing failure
- You catch yourself manually activating a skill instead of automatic routing
- User request clearly matches skill purpose but didn't route
- New use cases emerge for the skill

---

**Related Documentation:**
- routing-patterns.md - Overview and routing hierarchy
- routing-level1-system.md - Level 1: System Prompt Routing
- routing-level3-context.md - Level 3: Internal Context Routing
- routing-level4-workflow.md - Level 4: Workflow Invocation
- routing-pattern-types.md - The 4 routing pattern types
