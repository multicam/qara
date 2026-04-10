---
name: research
context: fork
model: sonnet
effort: high
description: |
  Web research, content extraction, and deep analysis. Multi-source parallel search
  with extended thinking.
  USE WHEN: "research X", "extract wisdom from", "analyze this content", "find info about".
---

# Research Skill

## API Keys (optional, in `~/.env`)

| Feature | Key | Source |
|---------|-----|--------|
| Perplexity | `PERPLEXITY_API_KEY` | https://perplexity.ai/settings/api |
| Gemini | `GOOGLE_API_KEY` | https://aistudio.google.com/app/apikey |

Works without keys via built-in WebSearch/WebFetch and `claude-researcher`.

---

## Workflow Routing

| Trigger | Read | Action |
|---------|------|--------|
| "community pulse on X", "what people are saying" | `workflows/community-pulse.md` | Multi-platform sentiment (Reddit, HN, X, YouTube, Web) |
| "research X", "investigate Y" | `workflows/conduct.md` | Parallel multi-agent research |
| "use claude for research" | `workflows/claude-research.ts` | WebSearch with query decomposition |
| WebSearch fails / "use gemini" | — | Launch `gemini-researcher` via Task |
| "use perplexity" | `workflows/perplexity-research.ts` | Perplexity API (needs key) |
| "interview prep for X" | `workflows/interview-research.md` | Interview question generation |
| "can't access content", CAPTCHA | `workflows/retrieve.md` | WebFetch retrieval |
| YouTube URL given | `workflows/youtube-extraction.md` | YouTube extraction |
| "scrape this site" | `workflows/web-scraping.md` | Web scraping |
| "enhance this draft" | `workflows/enhance.md` | Content improvement |
| "extract knowledge from" | `workflows/extract-knowledge.md` | Knowledge synthesis |

---

## Research Modes

| Mode | Trigger | Agents/type | Timeout |
|------|---------|------------|---------|
| Quick | "quick research" | 1 | 2 min |
| Standard | default | 3 | 3 min |
| Extensive | "extensive research" | 8 | 10 min |

### Researcher Agents

- `claude-researcher` — primary, uses WebSearch/WebFetch
- `gemini-researcher` — fallback when WebSearch fails (needs `GOOGLE_API_KEY`)
- ~~`perplexity-researcher`~~ removed; gemini covers fallback

---

## Core Principles

1. Parallel execution — launch all agents in one message
2. Hard timeouts — proceed with partial results, don't wait
3. Simplest first — WebFetch/WebSearch before paid services
4. Document which layers ran and why

---

## File Organization

```
# Working scratchpad
${PAI_DIR}/scratchpad/YYYY-MM-DD-HHMMSS_research-[topic]/
  raw-outputs/  synthesis-notes.md  draft-report.md

# Permanent history
${PAI_DIR}/history/research/YYYY-MM/YYYY-MM-DD_[topic]/
  README.md  research-report.md  metadata.json
```

---

## WebSearch vs WebFetch

| Need | Tool |
|------|------|
| Search the web | WebSearch |
| Retrieve specific URL content | WebFetch |

Query tips: include the year ("React 19 features 2026"), be specific, use `allowed_domains` for trusted sources, always cite in output.
