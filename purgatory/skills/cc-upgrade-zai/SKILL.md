---
name: cc-upgrade-zai
context: fork
description: ZAI/Z.AI Model Integration Analysis. Analyzes GLM model routing, ZAI client configuration, and model-specific agent optimization. Use when integrating or optimizing Z.AI models in Claude Code workflows.
---

# CC-Upgrade-ZAI (v1.0.0)

Z.AI model integration analysis for Claude Code projects.

## Prerequisites

→ READ: `../cc-upgrade/references/cc-trusted-sources.md` for base CC features
→ READ: `references/zai-models.md` for ZAI model specifications

## ZAI Integration Analysis

### 1. Gather Latest ZAI Features

```bash
# Trusted ZAI sources
ZAI_SOURCES=(
  "https://z.ai/model-api"
  "https://docs.z.ai/guides/llm"
  "https://docs.z.ai/guides/llm/glm-4.7"
  "https://docs.z.ai/guides/llm/glm-4-32b-0414-128k"
)
```

### 2. ZAI Integration Components

Check these locations for ZAI integration:

| Component | Check Location | Purpose |
|-----------|----------------|---------|
| ZAI client | `hooks/lib/llm/zai.ts` | JWT auth, API calls |
| Model router | `hooks/lib/model-router.ts` | Task-based model selection |
| zai-researcher | `agents/zai-researcher.md` | GLM-4-32B research agent |
| zai-coder | `agents/zai-coder.md` | GLM-4.7 coding agent |
| CLI tool | `~/.local/bin/zai` | Command-line access |

### 3. ZAI Client Requirements

Proper ZAI client implementation:

```typescript
// Required: JWT authentication
const jwt = sign(
  { api_key: id, exp: now + 3600, timestamp: now },
  secret,
  { algorithm: 'HS256' }
);

// Required: Correct endpoint selection
const ENDPOINTS = {
  coding: 'https://codeapi.zhipuai.cn/api/coding/paas/v4/chat/completions',
  general: 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
};

// Required: Model-specific parameters
interface ZAIOptions {
  model: 'glm-4.7' | 'glm-4.7-flash' | 'glm-4.7-flashx' | 'glm-4-32b-0414-128k';
  thinking_mode?: 'interleaved' | 'retention-based';
  max_tokens?: number;
}
```

### 4. Model Router Integration

Check model router for ZAI task types:

```typescript
// Expected task routing
const ZAI_TASK_ROUTING = {
  'research': 'glm-4-32b-0414-128k',  // Cost-effective research
  'coding': 'glm-4.7',                 // Agentic coding
  'rapid-prototyping': 'glm-4.7-flashx', // Fast iteration
  'general': 'glm-4.7-flash'           // Free tier
};
```

### 5. ZAI Agent Definitions

Check for properly configured ZAI agents:

**zai-researcher.md:**
- Uses `glm-4-32b-0414-128k` or `glm-4.7-flash`
- Optimized for Q&A, information extraction
- Cost-effective at $0.1/M tokens

**zai-coder.md:**
- Uses `glm-4.7` (flagship)
- Leverages thinking modes
- SWE-bench 73.8% performance

## ZAI Model Reference

See `references/zai-models.md` for complete model specifications including:
- Model parameters and context lengths
- Pricing tiers (Coding Plan vs Pay-as-you-go)
- Thinking mode configurations
- Benchmark performance

## Analysis Checklist

### Client Implementation
- [ ] JWT authentication with {id}.{secret} format
- [ ] Correct endpoint selection (coding vs general)
- [ ] Model parameter validation
- [ ] Error handling for rate limits

### Model Router
- [ ] ZAI task types defined
- [ ] Fallback to Claude for unsupported tasks
- [ ] Cost optimization routing

### Agent Definitions
- [ ] zai-researcher with research model
- [ ] zai-coder with coding model
- [ ] Thinking mode configuration

### CLI Tool
- [ ] `zai` command available
- [ ] Model selection support
- [ ] Environment variable configuration

## Output Format

```markdown
# ZAI Integration Report

## Executive Summary
[ZAI integration status overview]

## Component Status
| Component | Status | Model(s) | Notes |
|-----------|--------|----------|-------|
| zai.ts client | ✅/❌ | glm-4.7 | JWT auth status |
| model-router.ts | ✅/❌ | Task routing | ZAI task types |
| zai-researcher | ✅/❌ | glm-4-32b | Research optimized |
| zai-coder | ✅/❌ | glm-4.7 | Thinking modes |
| CLI tool | ✅/❌ | All models | Model selection |

## Thinking Mode Analysis
| Mode | Implemented | Usage |
|------|-------------|-------|
| Interleaved | ✅/❌ | Default thinking |
| Retention-based | ✅/❌ | HTTP header control |
| Tool invocation | ✅/❌ | Function calling |

## Recommendations
1. [High Priority] ...
2. [Medium Priority] ...

## Implementation Snippets
[Ready-to-use code for improvements]
```

## Quick Commands

### Check ZAI Client
```bash
grep -r "zhipuai\|glm-4" .claude/hooks/lib/
```

### Verify ZAI Agents
```bash
ls -la .claude/agents/zai-*.md
```

### Test ZAI CLI
```bash
source ~/.claude/.env && zai --help
```
