---
description: Research Command - Claude WebSearch
model: sonnet
---

# Research Command - Claude WebSearch

Force research using Claude's built-in WebSearch capabilities. Free, no API key required.

## Usage

```
/research-claude <query>
```

## When to Use

- Default research when no API keys configured
- Quick searches that don't need deep multi-source analysis
- When you want to use Claude's native search capabilities

## Execution

Launch the `claude-researcher` agent:

```
Task(subagent_type="claude-researcher", prompt="Research the following query using Claude's built-in WebSearch and WebFetch tools.

Query: $ARGUMENTS

Research methodology:
1. Use WebSearch for current information and relevant sources
2. Use WebFetch to retrieve and analyze specific URLs found
3. Decompose complex queries into multiple focused searches
4. Verify facts across multiple sources
5. Synthesize findings into clear, actionable insights

Provide:
- Key findings with source attribution
- Confidence level for each major claim
- Any conflicting information found
- Actionable recommendations if applicable")
```

## Arguments

`$ARGUMENTS` - The research query (required)

## Strengths

- **Free** - No API key required
- **Fast** - Direct integration with Claude
- **Reliable** - Always available

## Limitations

- Less comprehensive than Perplexity for current events
- Single perspective (vs Gemini's multi-perspective)

## Related Commands

- `/research` - Auto-select best available agent
- `/research-perplexity` - Use Perplexity API
- `/research-gemini` - Multi-perspective Gemini research
