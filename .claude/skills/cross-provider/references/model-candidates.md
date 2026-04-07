# Model Candidates

Track model evolution for cross-provider synthesis. Evaluate new models as they release.

## Active Providers

| Model | Type | Cost | Latency | Quality | Notes |
|-------|------|------|---------|---------|-------|
| Claude Opus 4.6 | API | $$$ | ~3s | Excellent | Best for judgment, architecture |
| Claude Sonnet 4.6 | API | $$ | ~1.5s | Very Good | Best for implementation |
| Claude Haiku 4.5 | API | $ | ~0.5s | Good | Best for quick lookups |
| Gemma 4 (27B) | Local | $0 | ~1s | Good | Via Ollama, always available |

## Evaluation Criteria

1. **Cost** — API token cost vs local compute
2. **Latency** — Time to first token, total response time
3. **Quality** — Accuracy on Qara's domain tasks (code review, architecture, research)
4. **Availability** — Rate limits, uptime, local vs cloud dependency

## Candidates to Watch

- **Llama 4** — Meta's latest, local via Ollama
- **Mistral Large** — Strong coding, available via API
- **DeepSeek V3** — Cost-effective API option
- **Qwen 3** — Alibaba's latest, local via Ollama

## Notes

- JM mentioned "llmfit" as a potential eval tool for model-task matching — research status unknown
- Cross-provider synthesis currently uses Claude subagent + Gemma 4 ollama MCP
- Future: add provider routing based on task complexity (simple→local, complex→API)

Last updated: 2026-04-08
