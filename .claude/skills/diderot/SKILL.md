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
Examples: "ask diderot about color theory", "what does diderot say about design systems"
-> **EXECUTE:** Full retrieval workflow (discover + search + advise)

**When user wants a quick vault search (list matches only):**
Examples: "diderot search for AI agents", "find notes about trading"
-> **EXECUTE:** Search-only mode — return matching note paths and titles without synthesis

**When user wants deep synthesis across many notes:**
Examples: "deep diderot search on web accessibility", "synthesize everything I know about AI"
-> **EXECUTE:** Extended retrieval — search with higher topk, use `advise --pattern synthesis`

**When user wants a recommendation or challenge:**
Examples: "diderot, what should I read next about design?", "challenge my thinking on X using my notes"
-> **EXECUTE:** Use `advise --pattern recommendation` or `advise --pattern challenge`

**When user wants a digest of recent vault activity:**
Examples: "diderot digest", "what's new in my vault", "weekly digest"
-> **EXECUTE:** Run `diderot digest show --period weekly`

## When to Activate This Skill

1. **Core Skill Name** - "diderot", "ask diderot", "diderot says"
2. **Action Verbs** - "search diderot", "query diderot", "look up in diderot", "search my vault"
3. **Modifiers** - "quick diderot search", "deep diderot search", "comprehensive vault lookup"
4. **Prepositions** - "in my vault", "in my notes", "from my knowledge base", "in diderot"
5. **Synonyms** - "check my notes", "vault search", "knowledge base search", "obsidian search"
6. **Use Case** - "what do I know about X", "what have I saved about X", "have I captured anything on X"
7. **Result-Oriented** - "find notes about X", "what notes mention X", "show me vault notes on X"
8. **Tool/Method Specific** - "semantic search vault", "grep vault for X", "vector search diderot"

## Phase 0: Discover (runs once per activation)

The diderot CLI and vault schema evolve independently of this skill. **Always discover the current interface before acting.**

### 0a. CLI Discovery

```bash
cd /home/jean-marc/diderot && uv run diderot --help
```

Note available subcommands. Key ones to use:
- `search` — semantic + keyword retrieval
- `advise` — synthesis, recommendation, challenge, discovery, review patterns
- `digest` — periodic vault summaries
- `status` — vault health

If new subcommands appear that weren't expected, mention them to JM.

### 0b. Frontmatter Schema Discovery

Read one recent note to discover the current frontmatter fields:

```bash
# Find a recently modified analyzed note
fd -e md -t f --changed-within 7d . /home/jean-marc/diderot/knowledge/ | head -1
```

Read the first ~30 lines. Note all frontmatter fields — the schema may have evolved since this skill was last updated. Use discovered fields to make better retrieval decisions (e.g., filter by `leverage: high`, prefer `signal_vs_noise: signal`, use `relevance` to match project context).

**Only hardcoded principle:** JM's annotations (`My Notes` section) are more valuable than AI-generated summaries. Everything else, reason from what you discover.

## Phase 1: Search

Run searches in parallel against `/home/jean-marc/diderot/`:

**A. Semantic Search (primary)**
```bash
cd /home/jean-marc/diderot && uv run diderot --format json search "<query>" --topk 10
```

Use flags discovered in Phase 0 (e.g., `--tag`, `--status`, `--type`, `--include-content`) when the query context makes them relevant.

**B. Keyword Search (parallel, catches what vectors miss)**
- Grep `*.md` files across ALL vault folders for key terms
- Also search filenames via Glob `**/*{term}*.md`
- Exclude: `.git/`, `.zvec/`, `node_modules/`, `__pycache__/`

**C. Tag Search (parallel)**
- Grep frontmatter `tags:` lines for query-relevant terms

Deduplicate results across all three strategies.

## Phase 2: Read (Top Matches)

From the combined results:

| Mode | Notes to read |
|------|---------------|
| Standard | Top 5 |
| Deep | Top 10 |
| Quick | Skip — return paths and titles only |

For each note, read with the Read tool:
- First ~80 lines (frontmatter + My Notes + Summary sections)
- Use the frontmatter schema discovered in Phase 0 to prioritize: `leverage`, `signal_vs_noise`, `relevance`, `maturity`, and any new fields
- **My Notes first** — JM's annotations are more valuable than AI-generated content

## Phase 3: Synthesize (delegate to diderot advise)

For standard and deep queries, use the native `advise` subcommand:

```bash
cd /home/jean-marc/diderot && uv run diderot advise "<query>"
```

Available patterns (use `--pattern` when the intent is clear):
- `synthesis` — combine insights across notes (default for "what do I know about X")
- `recommendation` — suggest what to read/explore next
- `challenge` — push back on assumptions using vault evidence
- `discovery` — find unexpected connections
- `review` — evaluate a body of notes on a topic

Add `--persist` when JM explicitly asks to save the synthesis back to the vault.

**After advise returns:** Supplement with your own observations from the notes you read in Phase 2 — the CLI synthesis may miss connections you noticed. Cite specific note paths.

### Response Format

```
[Synthesis from advise + your supplementary observations]

---
**Sources** (open in Obsidian):
- `knowledge/design/a_design_turn.md` — "A Design Turn"
- `knowledge/typography/variable-fonts.md` — "Variable Fonts Guide"
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

## Rules

1. **Read-only** — NEVER create, modify, or delete vault notes (unless `--persist` explicitly requested)
2. **Search ALL folders** — not just knowledge/. Ideas, wip, and Clippings often have relevant content
3. **Cite everything** — every claim must trace back to a specific note path
4. **Graceful degradation** — if semantic search fails (ollama down), keyword search alone is sufficient
5. **Discover before assuming** — run Phase 0 on every activation. The CLI evolves.
6. **My Notes first** — JM's annotations are more valuable than AI-generated summaries
7. **Use native tools** — delegate synthesis to `diderot advise` rather than reimplementing
