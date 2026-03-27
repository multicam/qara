---
name: diderot
context: fork
description: |
  Knowledge retrieval from JM's Obsidian vault (Diderot). Searches 4,000+ notes
  across all vault folders using keyword and semantic vector search, then
  synthesizes answers grounded in vault content with source citations.
  USE WHEN: "ask diderot", "diderot search", "check my notes", "what do I know about",
  "vault search", "in my knowledge base", "find notes about", "what have I saved about"
---

## Workflow Routing (SYSTEM PROMPT)

**When user asks diderot a knowledge question:**
Examples: "ask diderot about color theory", "what does diderot say about design systems", "check diderot for typography notes"
-> **EXECUTE:** Full retrieval workflow (search + read + synthesize)

**When user wants a quick vault search (list matches only):**
Examples: "diderot search for AI agents", "find notes about trading", "grep vault for responsive design"
-> **EXECUTE:** Search-only mode — return matching note paths and titles without synthesis

**When user wants deep synthesis across many notes:**
Examples: "deep diderot search on web accessibility", "comprehensive vault review of design education", "synthesize everything I know about AI"
-> **EXECUTE:** Extended retrieval — read more notes, produce longer synthesis

## When to Activate This Skill

1. **Core Skill Name** - "diderot", "ask diderot", "diderot says"
2. **Action Verbs** - "search diderot", "query diderot", "look up in diderot", "search my vault"
3. **Modifiers** - "quick diderot search", "deep diderot search", "comprehensive vault lookup"
4. **Prepositions** - "in my vault", "in my notes", "from my knowledge base", "in diderot"
5. **Synonyms** - "check my notes", "vault search", "knowledge base search", "obsidian search"
6. **Use Case** - "what do I know about X", "what have I saved about X", "have I captured anything on X"
7. **Result-Oriented** - "find notes about X", "what notes mention X", "show me vault notes on X"
8. **Tool/Method Specific** - "semantic search vault", "grep vault for X", "vector search diderot"

## Retrieval Process

### Phase 1: Search (Parallel)

Run these searches in parallel against `/home/jean-marc/diderot/`:

**A. Keyword Search**
- Extract key terms from the query
- Grep `*.md` files across ALL vault folders
- Also search filenames via Glob `**/*{term}*.md`
- Exclude: `.git/`, `.zvec/`, `node_modules/`, `__pycache__/`

**B. Semantic Search**
- Run: `cd /home/jean-marc/diderot && uv run diderot --format json search "<query>" --topk 10`
- Uses the zvec vector index for embedding-based similarity
- If the command fails (e.g., ollama not running), fall back to keyword-only mode gracefully

**C. Tag Search**
- Grep frontmatter `tags:` lines for query-relevant terms
- Pattern: search YAML frontmatter blocks for keyword matches

Deduplicate results across all three strategies.

### Phase 2: Read (Top Matches)

From the combined results:

| Mode | Notes to read |
|------|---------------|
| Standard | Top 5 |
| Deep | Top 10 |
| Quick | Skip — return paths and titles only |

For each note, read with the Read tool:
- First ~80 lines (frontmatter + My Notes + Summary sections)
- Extract: title, tags, summary, key insight from My Notes
- Prioritize notes with high `leverage` and `signal` in `signal_vs_noise` frontmatter fields

### Phase 3: Synthesize

Compose a response grounded in the retrieved notes:

1. **Answer the question** using information from the notes
2. **Highlight connections** between notes when they reinforce or contrast each other
3. **Quote directly** when a note makes a specific, well-stated point
4. **Flag gaps** — if the vault doesn't cover an aspect of the query, say so explicitly
5. **Cite sources** at the end

### Response Format

```
[Synthesized answer grounded in vault notes]

---
**Sources** (open in Obsidian):
- `knowledge/design/a_design_turn.md` — "A Design Turn"
- `knowledge/typography/variable-fonts.md` — "Variable Fonts Guide"
- `wip/TGDS/design-education.md` — TGDS project notes
```

## Vault Structure

```
/home/jean-marc/diderot/
├── knowledge/       # 3,868+ curated notes (22+ subdomains)
├── ideas/           # Business ideas, concepts
├── wip/             # Active projects (TGDS, Ralph, Diderot, etc.)
├── production/      # Shipped work
├── Clippings/       # Raw captures
├── _inbox/          # Unprocessed items
├── archived/        # Retired content
├── thoughts/        # Planning docs
├── Stock/           # Stock assets
└── @Visuals/        # Visual references
```

## Note Structure

Notes follow this template:
- **Frontmatter**: title, tags, domain, status, signal_vs_noise, leverage, relevance
- **My Notes**: JM's personal annotations (highest value — prioritize these)
- **Summary**: AI-generated summary
- **Analysis**: Deep analysis with hype_check, leverage assessment
- **Full Content**: Original article text (read only if Summary is insufficient)

## Rules

1. **Read-only** — NEVER create, modify, or delete vault notes
2. **Search ALL folders** — not just knowledge/. Ideas, wip, and Clippings often have relevant content
3. **Cite everything** — every claim must trace back to a specific note path
4. **Graceful degradation** — if semantic search fails, keyword search alone is sufficient
5. **Respect signal_vs_noise** — prefer notes marked `signal` over `noise`
6. **Respect leverage** — prefer `high` leverage notes when multiple matches exist
7. **My Notes first** — JM's annotations are more valuable than AI-generated summaries
