---
description: Research Command - Perplexity API
model: sonnet
---

# Research Command - Perplexity API

Force research using Perplexity API. Requires `PERPLEXITY_API_KEY` in `${PAI_DIR}/.env`.

## Usage

```
/research-perplexity <query>
```

## When to Use

- Current events and breaking news
- When you need strong source citations
- Multi-source information synthesis
- Fact-checking and verification

## Prerequisites

```bash
# Ensure API key is configured
echo "PERPLEXITY_API_KEY=pplx-xxx" >> ${PAI_DIR}/.env
```

Get your key from: https://perplexity.ai/settings/api

## Execution

Launch the `perplexity-researcher` agent:

```
Task(subagent_type="perplexity-researcher", prompt="Research the following query using the Perplexity API.

Query: $ARGUMENTS

Research methodology:
1. Load the research skill: Skill('research')
2. Use Perplexity API for comprehensive web search
3. Gather information from multiple sources
4. Return results with citations and source URLs

Provide:
- Key findings with inline citations
- Source URLs for verification
- Confidence level for each claim
- Any conflicting information between sources")
```

## Arguments

`$ARGUMENTS` - The research query (required)

## Strengths

- **Best citations** - Returns source URLs inline
- **Current** - Excellent for recent events
- **Fast** - Optimized for quick responses

## Models

- `sonar` - Fast, general purpose (default)
- `sonar-pro` - Deeper analysis, more sources

## Related Commands

- `/research` - Auto-select best available agent
- `/research-claude` - Use Claude WebSearch (free)
- `/research-gemini` - Multi-perspective Gemini research
