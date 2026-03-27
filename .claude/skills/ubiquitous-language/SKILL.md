---
name: ubiquitous-language
context: fork
description: |
  Extract and formalize domain terminology from conversation into a consistent glossary.
  DDD-inspired ubiquitous language extraction. Produces UBIQUITOUS_LANGUAGE.md.
  Adapted from mattpocock/skills (upstream commit eebfb3c, 2026-03-26).
  USE WHEN: "define terms", "glossary", "ubiquitous language", "domain terminology",
  "what do we call X", "clarify naming", "DDD", "domain model vocabulary"
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests domain term extraction or glossary creation:**
Examples: "extract terms", "build glossary", "define our language", "ubiquitous language"
-> **EXECUTE:** Run the extraction process below

**When user requests term update or re-scan:**
Examples: "update glossary", "add new terms", "re-run ubiquitous language"
-> **EXECUTE:** Run the re-running process below

## When to Activate This Skill

1. **Core Skill Name** - "ubiquitous language", "glossary", "domain dictionary"
2. **Action Verbs** - "extract terms", "define vocabulary", "formalize naming"
3. **Modifiers** - "quick glossary", "full domain model terms"
4. **Prepositions** - "terms for this domain", "language for this project"
5. **Synonyms** - "DDD terminology", "bounded context vocabulary", "naming conventions"
6. **Use Case** - Team alignment on terminology, onboarding docs, domain modeling
7. **Result-Oriented** - "consistent naming", "stop calling things different names"
8. **Tool/Method Specific** - "UBIQUITOUS_LANGUAGE.md", "term table", "alias cleanup"

## Process

1. **Scan the conversation** for domain-relevant nouns, verbs, and concepts
2. **Identify problems:**
   - Same word used for different concepts (ambiguity)
   - Different words used for the same concept (synonyms)
   - Vague or overloaded terms
3. **Propose a canonical glossary** with opinionated term choices
4. **Write to `UBIQUITOUS_LANGUAGE.md`** in the working directory using the output format below
5. **Output a summary** inline in the conversation

## Output Format

Write `UBIQUITOUS_LANGUAGE.md` with this structure:

```md
# Ubiquitous Language

## [Group Name]

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Term** | One-sentence definition of what it IS | alias1, alias2 |

## Relationships

- A **Term** belongs to exactly one **OtherTerm**
- An **Order** produces one or more **Invoices**

## Example dialogue

> **Dev:** "When a **Customer** places an **Order**, do we create the **Invoice** immediately?"
> **Domain expert:** "No — an **Invoice** is only generated once a **Fulfillment** is confirmed."

## Flagged ambiguities

- "account" was used to mean both **Customer** and **User** — recommendation: ...
```

## Rules

- **Be opinionated.** Pick the best term, list others as aliases to avoid.
- **Flag conflicts explicitly.** Ambiguous terms go in "Flagged ambiguities" with a clear recommendation.
- **Only include terms relevant for domain experts.** Skip the names of modules or classes unless they have meaning in the domain language.
- **Keep definitions tight.** One sentence. Define what it IS, not what it does.
- **Show relationships.** Bold term names, express cardinality where obvious.
- **Only domain terms.** Skip generic programming concepts unless they have domain-specific meaning.
- **Group by natural clusters** (subdomain, lifecycle, actor). One table is fine if terms are cohesive.
- **Write an example dialogue.** 3-5 exchanges between dev and domain expert showing terms used precisely.

## Re-running

When invoked again in the same conversation:

1. Read the existing `UBIQUITOUS_LANGUAGE.md`
2. Incorporate new terms from subsequent discussion
3. Update definitions if understanding has evolved
4. Mark changed entries with "(updated)" and new entries with "(new)"
5. Re-flag any new ambiguities
6. Rewrite the example dialogue to incorporate new terms

## Post-output

After writing the file, state:

> I've written/updated `UBIQUITOUS_LANGUAGE.md`. From this point forward I will use these terms consistently. If I drift from this language or you notice a term that should be added, let me know.
