/**
 * ZAI LLM utility for hooks
 * Uses GLM-4.7 model optimized for coding/agentic experiences
 *
 * API Endpoints:
 * - General: https://api.z.ai/api/paas/v4
 * - Coding: https://api.z.ai/api/coding/paas/v4
 *
 * Authentication: JWT token generated from API key format {id}.{secret}
 */

import jwt from 'jsonwebtoken';

// API endpoints
const ZAI_GENERAL_API = 'https://api.z.ai/api/paas/v4/chat/completions';
const ZAI_CODING_API = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

/**
 * Available ZAI models with their characteristics
 *
 * GLM-4.7 Family (Dec 2025):
 * - glm-4.7: Flagship, 355B/32B MoE, 200K context, best for agentic coding
 * - glm-4.7-flashx: Mid-tier, lightweight, high-speed, affordable
 * - glm-4.7-flash: Free tier, general-purpose applications
 *
 * GLM-4 Foundation:
 * - glm-4-32b-0414-128k: Cost-effective ($0.1/M tokens), 128K context, Q&A/research
 * - glm-4.6v: Vision model for multimodal tasks
 */
export const ZAI_MODELS = {
  // GLM-4.7 Family - Coding/Agentic optimized
  GLM_4_7: 'glm-4.7', // Flagship: best coding benchmarks, thinking modes
  GLM_4_7_FLASHX: 'glm-4.7-flashx', // Mid-tier: speed + affordability
  GLM_4_7_FLASH: 'glm-4.7-flash', // Free: general-purpose

  // GLM-4 Foundation
  GLM_4_32B: 'glm-4-32b-0414-128k', // Research: $0.1/M tokens, Q&A, analysis
  GLM_4_6V: 'glm-4.6v', // Vision: multimodal tasks
} as const;

export type ZaiModel = (typeof ZAI_MODELS)[keyof typeof ZAI_MODELS];

/**
 * Model characteristics for selection
 */
export const ZAI_MODEL_INFO = {
  'glm-4.7': {
    contextWindow: 200000,
    maxOutput: 128000,
    strengths: ['agentic-coding', 'multi-step-reasoning', 'tool-invocation', 'thinking-modes'],
    costTier: 'premium', // $3/mo Coding Plan
    recommended: ['code-implementation', 'debugging', 'refactoring', 'architecture'],
  },
  'glm-4.7-flashx': {
    contextWindow: 200000,
    maxOutput: 128000,
    strengths: ['fast-coding', 'cost-effective', 'benchmarks'],
    costTier: 'mid',
    recommended: ['rapid-prototyping', 'code-snippets', 'algorithm-implementation'],
  },
  'glm-4.7-flash': {
    contextWindow: 200000,
    maxOutput: 128000,
    strengths: ['general-purpose', 'chinese-writing', 'translation', 'long-text'],
    costTier: 'free',
    recommended: ['general-qa', 'translation', 'summarization'],
  },
  'glm-4-32b-0414-128k': {
    contextWindow: 128000,
    maxOutput: 16000,
    strengths: ['qa-services', 'information-extraction', 'financial-analysis', 'research'],
    costTier: 'budget', // $0.1/M tokens
    recommended: ['research', 'qa', 'analysis', 'data-extraction', 'trend-detection'],
  },
  'glm-4.6v': {
    contextWindow: 8000,
    maxOutput: 4000,
    strengths: ['vision', 'image-analysis', 'multimodal'],
    costTier: 'mid',
    recommended: ['image-analysis', 'multimodal-tasks'],
  },
} as const;

// Token cache to avoid regenerating JWT on every request
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Generate JWT token from ZAI API key
 * API key format: {id}.{secret}
 */
function generateJwtToken(apiKey: string, expSeconds: number = 3600): string {
  const parts = apiKey.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid ZAI_API_KEY format. Expected format: {id}.{secret}');
  }

  const [id, secret] = parts;
  const now = Date.now();

  const payload = {
    api_key: id,
    exp: now + expSeconds * 1000,
    timestamp: now,
  };

  const token = jwt.sign(payload, secret, {
    algorithm: 'HS256',
    header: {
      alg: 'HS256',
      sign_type: 'SIGN',
    } as jwt.JwtHeader,
  });

  return token;
}

/**
 * Get a valid JWT token, using cache if available
 */
function getAuthToken(): string {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error('ZAI_API_KEY environment variable is not set');
  }

  const now = Date.now();
  // Refresh token if it expires in less than 5 minutes
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const expSeconds = 3600; // 1 hour
  const token = generateJwtToken(apiKey, expSeconds);
  cachedToken = {
    token,
    expiresAt: now + expSeconds * 1000,
  };

  return token;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
    delta?: {
      content?: string;
    };
  }>;
}

/**
 * Make a request to ZAI API
 */
async function makeRequest(
  endpoint: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  stream: boolean = false
): Promise<Response> {
  const token = getAuthToken();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      stream,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ZAI API error (${response.status}): ${errorText}`);
  }

  return response;
}

/**
 * Send a prompt to ZAI and get a response.
 *
 * @param prompt - The prompt to send
 * @param model - The model to use (default: glm-4.7)
 * @param maxTokens - Maximum tokens in response (default: 150)
 * @param useCodingEndpoint - Use the coding-optimized endpoint (default: true for Coding Plan)
 */
export async function promptLLM(
  prompt: string,
  model: ZaiModel = ZAI_MODELS.GLM_4_7,
  maxTokens: number = 150,
  useCodingEndpoint: boolean = true
): Promise<string | null> {
  try {
    const endpoint = useCodingEndpoint ? ZAI_CODING_API : ZAI_GENERAL_API;
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

    const response = await makeRequest(endpoint, model, messages, maxTokens, false);
    const data = (await response.json()) as ChatCompletionResponse;

    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('ZAI prompt failed:', error);
    return null;
  }
}

/**
 * Send a prompt with streaming response.
 *
 * @param prompt - The prompt to send
 * @param onChunk - Callback for each chunk of text
 * @param model - The model to use (default: glm-4.7)
 * @param maxTokens - Maximum tokens in response (default: 150)
 * @param useCodingEndpoint - Use the coding-optimized endpoint (default: true for Coding Plan)
 */
export async function promptLLMStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  model: ZaiModel = ZAI_MODELS.GLM_4_7,
  maxTokens: number = 150,
  useCodingEndpoint: boolean = true
): Promise<string | null> {
  try {
    const endpoint = useCodingEndpoint ? ZAI_CODING_API : ZAI_GENERAL_API;
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

    const response = await makeRequest(endpoint, model, messages, maxTokens, true);

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim().startsWith('data:'));

      for (const line of lines) {
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch {
          // Skip invalid JSON chunks
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error('ZAI stream failed:', error);
    return null;
  }
}

/**
 * Check if ZAI API key is configured
 */
export function isConfigured(): boolean {
  return !!process.env.ZAI_API_KEY;
}

/**
 * Detect if a query is coding-related (should use coding endpoint)
 */
export function isCodingQuery(query: string): boolean {
  const codingKeywords = [
    'code',
    'function',
    'class',
    'implement',
    'debug',
    'fix',
    'refactor',
    'typescript',
    'javascript',
    'python',
    'rust',
    'go',
    'api',
    'endpoint',
    'algorithm',
    'data structure',
    'syntax',
    'compile',
    'runtime',
    'error',
    'bug',
    'test',
    'unit test',
    'integration',
  ];

  const lowerQuery = query.toLowerCase();
  return codingKeywords.some((keyword) => lowerQuery.includes(keyword));
}

/**
 * Clear the token cache (useful for testing or key rotation)
 */
export function clearTokenCache(): void {
  cachedToken = null;
}
