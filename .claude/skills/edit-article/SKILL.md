---
name: edit-article
context: same
description: |
  Structural editing for articles, docs, and specs. Reorders sections, tightens prose, strips AI patterns.
  USE WHEN: "edit this article", "tighten this", "restructure this doc".
---

## Workflow Routing (SYSTEM PROMPT)

This is a single-workflow skill. No routing needed — activate directly.

## When to Activate This Skill

1. **Core:** "edit this article", "edit this doc"
2. **Action verbs:** "restructure", "tighten", "revise", "improve", "rewrite"
3. **Modifiers:** "deep edit", "structural edit", "full rewrite"
4. **Prepositions:** "edit this for clarity", "restructure for flow"
5. **Synonyms:** "clean up this doc", "make this tighter", "fix the structure"
6. **Use case:** Article drafts, technical specs, documentation, READMEs, blog posts
7. **Result-oriented:** "make this clearer", "improve the flow", "fix the ordering"
8. **Method-specific:** "DAG analysis", "information dependency mapping"

## Phase 1: Structure

### Map the Information DAG

1. Divide the content into sections based on headings
2. For each section, identify the **main claim** it makes
3. Map **information dependencies** — which sections depend on concepts introduced in other sections
4. Check: does the current ordering respect these dependencies?
5. If not, propose a reordering

### Confirm with JM

Present:
- The sections as you've identified them
- Any dependency violations (section B uses concept X, but X is introduced in section D)
- Proposed reordering if needed

**Do not proceed to Phase 2 without JM's confirmation on structure.**

## Phase 2: Prose

For each section, rewrite to improve clarity, coherence, and flow.

### Constraints

- **Max 240 characters per paragraph** — forces concision, prevents walls of text
- **Max 125 characters when quoting source material** — pull the essential quote, not the whole paragraph
- Use **quotation marks** for exact source language; paraphrase everything else
- Cut filler: "it should be noted that", "it is important to", "in order to"
- Prefer active voice, concrete nouns, specific verbs

### Section-by-section

Work through each section in order. For each:
1. Rewrite for clarity
2. Enforce paragraph character limits
3. Ensure transitions connect to the previous and next section
4. Preserve JM's voice and intent — tighten, don't replace

## Phase 3: Humaniser Pass

After structure and prose are finalized, run a final pass to strip AI writing patterns.

### High-Frequency AI Tells

| Category | Patterns to catch |
|----------|------------------|
| **Inflated importance** | "serves as", "testament to", "pivotal role", "reflects broader", "setting the stage" |
| **Promotional** | "boasts", "vibrant", "profound", "showcasing", "renowned", "breathtaking" |
| **AI vocabulary** | "additionally", "crucial", "delve", "enhance", "fostering", "intricate", "landscape" (abstract), "underscore" |
| **Superficial analysis** | -ing endings: "highlighting...", "ensuring...", "reflecting...", "contributing..." |
| **Negative parallelisms** | "It's not just X, it's Y" / "Not only X but Y" |
| **Em dash overuse** | Multiple em dashes where commas or periods would work |
| **Rule of three** | "seamless, intuitive, and powerful" — if all three are vague, cut to one specific word |
| **Vague attribution** | "experts argue", "industry reports", "some critics" — name the source or cut it |

### Process

1. Scan the Phase 2 output for patterns above
2. Replace each with natural, specific language
3. Read the result aloud (mentally) — does it sound like a person wrote it?
4. Present the final version

For the complete 24-pattern catalog: **READ:** `${PAI_DIR}/skills/humaniser/references/ai-patterns-catalog.md`

## Output

Present the edited content with a brief changelog:
- Structural changes made (reordering, merging, splitting sections)
- Key prose changes (what was cut, what was clarified)
- AI patterns removed (count and categories)

## Attribution

Structure methodology adapted from [mattpocock/skills](https://github.com/mattpocock/skills) `edit-article` skill. Humaniser pass based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing).
