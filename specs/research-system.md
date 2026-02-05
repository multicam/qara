# Research System

## Overview

Multi-source parallel research using available researcher agents. Auto-selects based on API key availability.

## Agent Selection Priority

1. **Perplexity** (if `PERPLEXITY_API_KEY` exists) -- Best citations, current events
2. **Claude WebSearch** (always available, FREE) -- Built-in, no API key needed
3. **Gemini** (if `GOOGLE_API_KEY` exists) -- Multi-perspective decomposition

## Three Research Modes

| Mode | Agents/Type | Timeout | Use Case |
|------|-------------|---------|----------|
| Quick | 1 | 2 min | Simple questions, fast answers |
| Standard | 3 | 3 min | Default, comprehensive coverage |
| Extensive | 8 | 10 min | Deep research, 24 parallel agents |

### Extensive Mode Detail (24 agents)

```
Step 0: UltraThink generates creative research angles
Step 1: Decompose into 8 focused sub-questions per researcher type
Step 2: Launch 24 agents (8 perplexity + 8 claude + 8 gemini)
Step 3: Collect results with 10-minute timeout
Step 4: Synthesize into comprehensive report
Step 5: Report in mandatory response format
```

## Workflows

| Workflow | Purpose |
|----------|---------|
| `conduct.md` | Main multi-source parallel research |
| `claude-research.md` | Claude WebSearch (free, no keys) |
| `perplexity-research.md` | Perplexity API research |
| `interview-research.md` | Interview preparation |
| `retrieve.md` | Content retrieval via WebFetch |
| `youtube-extraction.md` | YouTube content extraction |
| `web-scraping.md` | Web scraping techniques |
| `enhance.md` | Content enhancement |
| `extract-knowledge.md` | Knowledge extraction and synthesis |

## File Organization

```
Working:    scratchpad/YYYY-MM-DD-HHMMSS_research-[topic]/
Permanent:  history/research/YYYY-MM/YYYY-MM-DD_[topic]/
```

## Slash Commands

| Command | Behavior |
|---------|----------|
| `/research [query]` | Auto-selects best agent |
| `/research-perplexity [query]` | Forces Perplexity |
| `/research-claude [query]` | Forces Claude WebSearch |
| `/research-gemini [query]` | Forces Gemini |

## Agent Instance IDs

For observability, agents get sequential IDs:
- `[perplexity-researcher-1]`, `[perplexity-researcher-2]`, ...
- `[claude-researcher-1]`, `[claude-researcher-2]`, ...
- Enables distinguishing parallel agents in logs
