# Routing: Level 1 - System Prompt Routing

**Extracted from:** routing-patterns.md

This document covers Level 1 routing: skill descriptions in Claude Code's system prompt that trigger initial skill activation.

---

## Level 1: System Prompt Routing

**Where:** Claude Code's system prompt
**What:** Skill descriptions that trigger activation
**How:** Natural language pattern matching

**Example:**
```markdown
research:
  description: |
    Comprehensive research, analysis, and content extraction system.
    USE WHEN user says 'do research', 'extract wisdom', 'analyze content',
    'can't get this content', or any research/analysis request.
```

**Routing Decision:**
- User says "do research on AI trends" → Matches "do research" trigger
- Qara activates `research` skill → Loads context from research/SKILL.md

**Best Practices:**
- 5-10 distinct triggers covering synonyms and variations
- Use natural language patterns (what users actually say)
- Include both explicit ("use research skill") and implicit ("analyze this") triggers
- Avoid overly broad triggers that match everything

---

## The 8-Category Routing Pattern

For comprehensive skill activation, include these pattern categories in your skill description:

**1. Core Skill Name (Noun)**
- The skill name itself and all variations
- Abbreviations if applicable
- Example: "OSINT", "open source intelligence"

**2. Action Verbs**
- "do [skill]", "run [skill]", "perform [skill]", "execute [skill]", "conduct [skill]"
- Example: "do OSINT on X", "run pentest on Y"

**3. Modifiers (Scope/Intensity)**
- "basic [skill]", "quick [skill]", "simple [skill]"
- "comprehensive [skill]", "deep [skill]", "full [skill]", "thorough [skill]"
- Example: "basic OSINT lookup", "comprehensive research"

**4. Prepositions (Target Connection)**
- "[skill] on [target]", "[skill] for [target]", "[skill] against [target]"
- "[skill] of [target]", "[skill] about [target]"
- Example: "OSINT on person X", "research about topic Z"

**5. Synonyms & Alternative Phrasings**
- Industry jargon variations
- Casual vs formal phrasings
- Example: "investigate", "look up", "background check", "find information"

**6. Use Case Oriented**
- Why would someone use this skill?
- What problem are they trying to solve?
- Example: "background check on person", "find vulnerabilities in app"

**7. Result-Oriented Phrasing**
- "find [thing]", "discover [thing]", "identify [thing]", "get [information]"
- Example: "find public information about X", "identify vulnerabilities"

**8. Tool/Method Specific (If Applicable)**
- Specific tools or techniques within the skill
- Technology names, framework-specific triggers
- Example: "fuzz with ffuf", "Perplexity research"

---

## Anti-Patterns to Avoid

❌ **Too Formulaic**
```markdown
- User says "OSINT lookup on [person]"
- User says "research [person] background"
```
**Problem:** Only matches exact phrases, misses natural variations

❌ **Too Vague**
```markdown
- Any security testing request
- When user needs intelligence
```
**Problem:** Not specific enough for pattern matching

❌ **Missing Action Verbs**
```markdown
- "OSINT on person"
- "pentest application"
```
**Problem:** Misses "do OSINT", "run pentest" patterns

❌ **No Modifiers**
```markdown
- "do OSINT"
```
**Problem:** Misses "basic OSINT", "quick OSINT", "comprehensive OSINT"

---

## Testing Your Level 1 Routing

After creating skill descriptions, test with these patterns:

**1. The "Do" Test**
- "do [skill]" should match
- "do basic [skill]" should match
- "do [skill] on [target]" should match

**2. The "Casual" Test**
- "just [skill] this"
- "quick [skill]"
- "super basic [skill]"

**3. The "Result" Test**
- "find [information using skill]"
- "get [result from skill]"
- "show me [skill output]"

**4. The "Why" Test**
- Does it cover the WHY someone uses this skill?
- Does it match use cases?

---

**Related Documentation:**
- routing-patterns.md - Overview and routing hierarchy
- routing-level2-activation.md - Level 2: Skill Activation
- routing-level3-context.md - Level 3: Internal Context Routing
- routing-level4-workflow.md - Level 4: Workflow Invocation
- routing-pattern-types.md - The 4 routing pattern types
