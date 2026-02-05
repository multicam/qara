# Z.AI/ZAI Model Reference (Updated 2026-01)

## Model Overview

### GLM-4.7 Family (Dec 2025)

#### glm-4.7 (Flagship)
- **Release:** 2025-12-22
- **Parameters:** 355B total / 32B activated (MoE)
- **Context:** 200,000 tokens
- **Max Output:** 128,000 tokens
- **Pricing:** Coding Plan ($3/mo)
- **Benchmarks:**
  - SWE-bench: 73.8%
  - LiveCodeBench: 84.9%
  - TerminalBench: 41%
- **Features:** thinking-modes, interleaved, retention-based, tool-invocation
- **Best For:** Agentic coding, complex implementations

#### glm-4.7-flash (Free Tier)
- **Release:** 2026-01-19
- **Parameters:** ~30B total / ~3B activated (MoE)
- **Context:** 200,000 tokens
- **Max Output:** 128,000 tokens
- **Pricing:** Free (Coding Plan)
- **Best For:** General-purpose, Chinese writing, translation, long-text

#### glm-4.7-flashx (Mid-tier)
- **Release:** 2025-12-22
- **Parameters:** ~30B (MoE, lightweight)
- **Context:** 200,000 tokens
- **Max Output:** 128,000 tokens
- **Pricing:** Pay-as-you-go
- **Best For:** Rapid prototyping, fast iteration

### GLM-4 Foundation

#### glm-4-32b-0414-128k (Research)
- **Release:** 2025-04-14
- **Parameters:** 32B
- **Context:** 128,000 tokens
- **Max Output:** 16,000 tokens
- **Pricing:** $0.1/M tokens (pay-as-you-go)
- **Features:** Web search, function calling
- **Best For:** Q&A services, information extraction, financial analysis, research

#### glm-4.6v (Vision)
- **Release:** 2025
- **Parameters:** Unknown
- **Context:** 8,000 tokens
- **Max Output:** 4,000 tokens
- **Pricing:** Pay-as-you-go
- **Features:** Multimodal (vision)
- **Best For:** Image analysis, visual tasks

## Thinking Modes

GLM-4.7 supports multiple thinking modes:

### Interleaved (Default)
```
Description: Thinking blocks between content blocks
Usage: Automatic, no special configuration needed
Output: <thinking>...</thinking> tags in response
```

### Retention-Based
```
Description: Control thinking visibility via HTTP header
Usage: x-zhipu-retain-thinking: true|false
Output: Thinking retained or stripped from response
```

### Round-Level
```
Description: Per-turn thinking aggregation for multi-turn conversations
Usage: Thinking summarized at conversation boundaries
Output: Aggregated insights per conversation round
```

### Tool Invocation
```
Description: Thinking during tool/function calling
Usage: Model reasons about which tools to call
Output: Tool selection rationale in thinking blocks
```

## API Configuration

### Endpoints

```typescript
const ENDPOINTS = {
  // For GLM-4.7 coding models
  coding: 'https://codeapi.zhipuai.cn/api/coding/paas/v4/chat/completions',

  // For all other models
  general: 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
};
```

### Authentication

ZAI uses JWT authentication with `{id}.{secret}` format:

```typescript
import { sign } from 'jsonwebtoken';

function createJWT(apiKey: string): string {
  const [id, secret] = apiKey.split('.');
  const now = Math.floor(Date.now() / 1000);

  return sign(
    { api_key: id, exp: now + 3600, timestamp: now },
    secret,
    { algorithm: 'HS256' }
  );
}
```

### Request Format

```typescript
interface ZAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: Array<ToolDefinition>;
}
```

## Task Routing Recommendations

```typescript
const ZAI_TASK_ROUTING = {
  // Complex coding tasks → flagship model
  'agentic-coding': 'glm-4.7',
  'implementation': 'glm-4.7',

  // Research tasks → cost-effective model
  'research': 'glm-4-32b-0414-128k',
  'information-extraction': 'glm-4-32b-0414-128k',
  'qa-service': 'glm-4-32b-0414-128k',

  // Fast iteration → mid-tier
  'rapid-prototyping': 'glm-4.7-flashx',
  'quick-edits': 'glm-4.7-flashx',

  // General tasks → free tier
  'general': 'glm-4.7-flash',
  'translation': 'glm-4.7-flash',
  'summarization': 'glm-4.7-flash',

  // Visual tasks → vision model
  'image-analysis': 'glm-4.6v',
};
```

## Pricing Summary

| Model | Type | Price |
|-------|------|-------|
| glm-4.7 | Coding Plan | $3/month |
| glm-4.7-flash | Coding Plan | Free |
| glm-4.7-flashx | Pay-as-you-go | Variable |
| glm-4-32b-0414-128k | Pay-as-you-go | $0.1/M tokens |
| glm-4.6v | Pay-as-you-go | Variable |

## Version History

- **2026-01-19:** glm-4.7-flash added to free tier
- **2025-12-22:** GLM-4.7 family released (glm-4.7, glm-4.7-flashx)
- **2025-04-14:** glm-4-32b-0414-128k released
- **2024-01:** JWT authentication introduced
