---
description: Research Command (Auto-Select)
model: sonnet
---

# Research (Auto-Select)

Selects the best available research agent by API key availability.

## Priority

1. **Perplexity** (`PERPLEXITY_API_KEY`) — best citations, fast
2. **Claude WebSearch** (always available) — free, built-in
3. **Gemini** (`GOOGLE_API_KEY`) — multi-perspective fallback

## Usage

```
/research <query>
```

## Execution

1. **Check keys:** `source ${PAI_DIR}/.env 2>/dev/null || true`
2. **Select agent:**
   - `PERPLEXITY_API_KEY` set → `perplexity-researcher`
   - else → `claude-researcher`
3. **Launch via Task tool:**

```
Task(subagent_type="[selected-agent]", prompt="Research the following query comprehensively. Use your primary research tools (WebSearch, Perplexity API, etc.) to gather information from multiple sources. Synthesize findings and provide actionable insights with sources.

Query: $ARGUMENTS

Provide a comprehensive answer with:
- Key findings
- Supporting evidence/sources
- Confidence level
- Any conflicting information found")
```

4. **Present results** — summary, sources, confidence assessment.

## Examples

```
/research best practices for TypeScript error handling 2025
/research comparing Bun vs Node.js performance benchmarks
```

## Related

- `/research-claude` — force Claude WebSearch
- `/research-perplexity` — force Perplexity
- `/research-gemini` — force Gemini
