---
name: cross-provider
description: Cross-provider synthesis — get independent perspectives from Claude (subagent) and Gemma 4 (local ollama) on the same question, then synthesize agreements and divergences.
context: same
triggers:
  - "cross-provider"
  - "compare models"
  - "ask both models"
  - "gemma perspective"
  - "second opinion"
---

## Cross-Provider Synthesis

Get independent perspectives from multiple models on the same question, then synthesize.

### Current Providers

| Provider | Model | Access | Cost |
|----------|-------|--------|------|
| Claude | Opus/Sonnet (subagent) | API | Per-token |
| Gemma 4 | gemma4 via Ollama | Local (localhost:11434) | $0 |

### Workflow

1. **Frame the question** — extract the core question from JM's prompt
2. **Dispatch to Claude** — spawn a researcher/engineer subagent with the question
3. **Dispatch to Gemma 4** — call `mcp__ollama-local__ollama_chat` with the same question
4. **Synthesize** — compare both responses:
   - Agreements (high confidence)
   - Divergences (investigate further)
   - Unique insights from each
5. **Store artifact** — save to `thoughts/shared/artifacts/cross-provider-{slug}-{timestamp}.md`

### When to Use

- Hard design decisions where a second perspective helps
- Fact-checking claims before acting on them
- Exploring alternatives when stuck on an approach
- Validating architectural decisions

### Model Tracking

Track model evolution in `references/model-candidates.md`. Evaluate new models on:
- Cost (API vs local)
- Latency (response time)
- Quality (accuracy on domain tasks)
- Availability (always-on vs rate-limited)

Current candidates to watch: Gemma 4 (local), Llama 4 (local), Claude Haiku (cheap API).
