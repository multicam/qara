# Research Command - Gemini Multi-Perspective

Force research using Gemini's multi-perspective orchestration. Breaks queries into 3-10 variations and runs parallel sub-agents.

## Usage

```
/research-gemini <query>
```

## When to Use

- Complex topics requiring multiple angles
- Deep-dive research where thoroughness matters
- When you want comprehensive coverage over speed
- Exploring nuanced topics with conflicting viewpoints

## Prerequisites

```bash
# Ensure Gemini CLI is available
gemini --version

# Or configure API key
echo "GOOGLE_API_KEY=xxx" >> ${PAI_DIR}/.env
```

## Execution

Launch the `gemini-researcher` agent:

```
Task(subagent_type="gemini-researcher", prompt="Conduct comprehensive multi-perspective research on the following query.

Query: $ARGUMENTS

Research methodology:
1. Decompose this query into 3-7 complementary sub-queries exploring different angles
2. Launch parallel Gemini research agents (one per sub-query)
3. Collect and synthesize all findings
4. Identify patterns, consensus, and contradictions
5. Provide comprehensive synthesis with confidence levels

Sub-query decomposition should cover:
- Different aspects of the topic
- Various perspectives (technical, practical, comparative)
- Specific vs general angles
- Current state vs historical context

Provide:
- Synthesis of all research threads
- Consensus findings (what most sources agree on)
- Conflicting viewpoints with source attribution
- Confidence levels for each major claim
- Actionable recommendations")
```

## Arguments

`$ARGUMENTS` - The research query (required)

## Strengths

- **Most thorough** - Multiple perspectives in parallel
- **Conflict detection** - Identifies disagreements between sources
- **Deep analysis** - 3-10 parallel research threads

## Typical Runtime

- Simple queries: 2-3 minutes
- Complex queries: 5-10 minutes

## Example Decomposition

Query: "Best practices for TypeScript monorepo in 2025"

Sub-queries generated:
1. "TypeScript monorepo tooling comparison 2025 - Nx vs Turborepo vs pnpm workspaces"
2. "TypeScript monorepo build performance optimization techniques"
3. "Large-scale TypeScript monorepo case studies - companies using them successfully"
4. "TypeScript monorepo testing strategies - unit, integration, e2e"
5. "TypeScript monorepo dependency management and version sync"

## Related Commands

- `/research` - Auto-select best available agent
- `/research-claude` - Use Claude WebSearch (free, fast)
- `/research-perplexity` - Use Perplexity API (best citations)
