# Research Command (Auto-Select)

Automatically selects the best available research agent based on API key availability.

## Selection Priority

1. **Perplexity** (if `PERPLEXITY_API_KEY` exists) - Best citations, fast
2. **Claude WebSearch** (always available) - Free, built-in
3. **Gemini** (if `GOOGLE_API_KEY` exists) - Multi-perspective, thorough

## Usage

```
/research <query>
```

## Execution

**Step 1: Check API Key Availability**

```bash
# Check which keys are available
source ${PAI_DIR}/.env 2>/dev/null || true
```

**Step 2: Select Agent Based on Priority**

Check in this order:
1. If `PERPLEXITY_API_KEY` is set → Use `perplexity-researcher` agent
2. Otherwise → Use `claude-researcher` agent (always available)

**Step 3: Execute Research**

Launch the selected agent with the Task tool:

```
Task(subagent_type="[selected-agent]", prompt="Research the following query comprehensively. Use your primary research tools (WebSearch, Perplexity API, etc.) to gather information from multiple sources. Synthesize findings and provide actionable insights with sources.

Query: $ARGUMENTS

Provide a comprehensive answer with:
- Key findings
- Supporting evidence/sources
- Confidence level
- Any conflicting information found")
```

**Step 4: Present Results**

Format the agent's findings clearly with:
- Summary of key points
- Sources/citations
- Confidence assessment

## Arguments

`$ARGUMENTS` - The research query (required)

## Examples

```
/research best practices for TypeScript error handling 2025
/research comparing Bun vs Node.js performance benchmarks
/research Claude Code hooks system documentation
```

## Related Commands

- `/research-claude` - Force Claude WebSearch
- `/research-perplexity` - Force Perplexity API
- `/research-gemini` - Force Gemini multi-perspective research
