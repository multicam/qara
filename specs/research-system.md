# Research System

## Overview

Multi-source parallel research using available researcher agents. Auto-selects based on API key availability.

## Agent Selection Priority

1. **Perplexity** (if `PERPLEXITY_API_KEY` exists) -- Best citations, current events
2. **Claude WebSearch** (always available, FREE) -- Built-in, no API key needed
3. **Gemini** (if `GOOGLE_API_KEY` exists) -- Multi-perspective decomposition

Research agents are orchestrated by the research skill via CC's Task tool.

## Three Research Modes

| Mode | Agents/Type | Timeout | Use Case |
|------|-------------|---------|----------|
| Quick | 1 | 2 min | Simple questions, fast answers |
| Standard | 3 | 3 min | Default, comprehensive coverage |
| Extensive | 8 | 10 min | Deep research, multi-perspective |

## Workflows

| Workflow | Purpose |
|----------|---------|
| `conduct.md` | Main multi-source parallel research |
| `claude-research.ts` | Claude WebSearch (free, no keys) |
| `perplexity-research.ts` | Perplexity API research |
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

## Slash Command

| Command | Behavior |
|---------|----------|
| `/research [query]` | Auto-selects best agent based on available API keys |

Provider can be specified in natural language (e.g., "use perplexity for this research").
