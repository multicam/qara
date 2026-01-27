/**
 * Tests for ZAI LLM client
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import {
  promptLLM,
  promptLLMStream,
  isConfigured,
  isCodingQuery,
  clearTokenCache,
  ZAI_MODELS,
  ZAI_MODEL_INFO,
} from './zai';

// Store original fetch
const originalFetch = globalThis.fetch;

describe('ZAI LLM Client', () => {
  beforeEach(() => {
    // Ensure API key is set for tests (format: {id}.{secret})
    process.env.ZAI_API_KEY = 'test-id.test-secret';
    clearTokenCache();
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  });

  describe('ZAI_MODELS', () => {
    it('should export GLM-4.7 family models', () => {
      expect(ZAI_MODELS.GLM_4_7).toBe('glm-4.7');
      expect(ZAI_MODELS.GLM_4_7_FLASHX).toBe('glm-4.7-flashx');
      expect(ZAI_MODELS.GLM_4_7_FLASH).toBe('glm-4.7-flash');
    });

    it('should export GLM-4 foundation models', () => {
      expect(ZAI_MODELS.GLM_4_32B).toBe('glm-4-32b-0414-128k');
      expect(ZAI_MODELS.GLM_4_6V).toBe('glm-4.6v');
    });
  });

  describe('ZAI_MODEL_INFO', () => {
    it('should have info for all GLM-4.7 family models', () => {
      expect(ZAI_MODEL_INFO['glm-4.7'].contextWindow).toBe(200000);
      expect(ZAI_MODEL_INFO['glm-4.7'].maxOutput).toBe(128000);
      expect(ZAI_MODEL_INFO['glm-4.7'].costTier).toBe('premium');

      expect(ZAI_MODEL_INFO['glm-4.7-flashx'].costTier).toBe('mid');
      expect(ZAI_MODEL_INFO['glm-4.7-flash'].costTier).toBe('free');
    });

    it('should have info for GLM-4-32B research model', () => {
      expect(ZAI_MODEL_INFO['glm-4-32b-0414-128k'].contextWindow).toBe(128000);
      expect(ZAI_MODEL_INFO['glm-4-32b-0414-128k'].maxOutput).toBe(16000);
      expect(ZAI_MODEL_INFO['glm-4-32b-0414-128k'].costTier).toBe('budget');
      expect(ZAI_MODEL_INFO['glm-4-32b-0414-128k'].strengths).toContain('research');
    });

    it('should list recommended use cases for each model', () => {
      expect(ZAI_MODEL_INFO['glm-4.7'].recommended).toContain('code-implementation');
      expect(ZAI_MODEL_INFO['glm-4.7-flashx'].recommended).toContain('rapid-prototyping');
      expect(ZAI_MODEL_INFO['glm-4-32b-0414-128k'].recommended).toContain('research');
    });
  });

  describe('isConfigured', () => {
    it('should return true when ZAI_API_KEY is set', () => {
      process.env.ZAI_API_KEY = 'test-id.test-secret';
      expect(isConfigured()).toBe(true);
    });

    it('should return false when ZAI_API_KEY is not set', () => {
      delete process.env.ZAI_API_KEY;
      expect(isConfigured()).toBe(false);
      // Restore for other tests
      process.env.ZAI_API_KEY = 'test-id.test-secret';
    });
  });

  describe('isCodingQuery', () => {
    it('should detect code-related queries', () => {
      expect(isCodingQuery('Write a function to sort an array')).toBe(true);
      expect(isCodingQuery('implement binary search algorithm')).toBe(true);
      expect(isCodingQuery('debug this typescript error')).toBe(true);
      expect(isCodingQuery('fix the runtime error in my code')).toBe(true);
      expect(isCodingQuery('refactor the class to use composition')).toBe(true);
    });

    it('should detect language-specific queries', () => {
      expect(isCodingQuery('TypeScript best practices')).toBe(true);
      expect(isCodingQuery('JavaScript async patterns')).toBe(true);
      expect(isCodingQuery('Python data structures')).toBe(true);
      expect(isCodingQuery('Rust memory management')).toBe(true);
      expect(isCodingQuery('Go concurrency patterns')).toBe(true);
    });

    it('should return false for non-coding queries', () => {
      expect(isCodingQuery('What is the weather today?')).toBe(false);
      expect(isCodingQuery('Tell me about quantum physics')).toBe(false);
      expect(isCodingQuery('Best restaurants in Paris')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isCodingQuery('TYPESCRIPT FUNCTION')).toBe(true);
      expect(isCodingQuery('TypeScript Function')).toBe(true);
      expect(isCodingQuery('typescript function')).toBe(true);
    });
  });

  describe('promptLLM', () => {
    it('should send a prompt and return response', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'mocked response' } }],
            }),
            { status: 200 }
          )
        )
      );

      const result = await promptLLM('test prompt');
      expect(result).toBe('mocked response');
    });

    it('should use coding endpoint by default', async () => {
      let calledUrl = '';
      globalThis.fetch = mock((url: string) => {
        calledUrl = url;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'response' } }],
            }),
            { status: 200 }
          )
        );
      });

      await promptLLM('test prompt');
      expect(calledUrl).toContain('/coding/');
    });

    it('should use general endpoint when specified', async () => {
      let calledUrl = '';
      globalThis.fetch = mock((url: string) => {
        calledUrl = url;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'response' } }],
            }),
            { status: 200 }
          )
        );
      });

      await promptLLM('test prompt', ZAI_MODELS.GLM_4_7, 150, false);
      expect(calledUrl).not.toContain('/coding/');
      expect(calledUrl).toContain('/paas/');
    });

    it('should include JWT token in Authorization header', async () => {
      let authHeader = '';
      globalThis.fetch = mock((url: string, options: RequestInit) => {
        authHeader = (options.headers as Record<string, string>)['Authorization'] || '';
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'response' } }],
            }),
            { status: 200 }
          )
        );
      });

      await promptLLM('test prompt');
      expect(authHeader).toStartWith('Bearer ');
      // JWT format: header.payload.signature
      const token = authHeader.replace('Bearer ', '');
      expect(token.split('.').length).toBe(3);
    });

    it('should return null on error', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'API error' }), { status: 500 })
        )
      );

      const result = await promptLLM('test prompt');
      expect(result).toBeNull();
    });

    it('should return null when response has no content', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ choices: [{ message: { content: null } }] }),
            { status: 200 }
          )
        )
      );

      const result = await promptLLM('test prompt');
      expect(result).toBeNull();
    });

    it('should send correct request body', async () => {
      let requestBody: any = null;
      globalThis.fetch = mock((url: string, options: RequestInit) => {
        requestBody = JSON.parse(options.body as string);
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'response' } }],
            }),
            { status: 200 }
          )
        );
      });

      await promptLLM('test prompt', ZAI_MODELS.GLM_4_7, 500);
      expect(requestBody.model).toBe('glm-4.7');
      expect(requestBody.max_tokens).toBe(500);
      expect(requestBody.messages).toEqual([{ role: 'user', content: 'test prompt' }]);
    });
  });

  describe('promptLLMStream', () => {
    it('should stream response chunks', async () => {
      // Create a mock stream response
      const encoder = new TextEncoder();
      const streamData = [
        'data: {"choices":[{"delta":{"content":"chunk1"}}]}\n',
        'data: {"choices":[{"delta":{"content":"chunk2"}}]}\n',
        'data: {"choices":[{"delta":{"content":"chunk3"}}]}\n',
        'data: [DONE]\n',
      ];

      const stream = new ReadableStream({
        start(controller) {
          streamData.forEach((data) => {
            controller.enqueue(encoder.encode(data));
          });
          controller.close();
        },
      });

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(stream, { status: 200 }))
      );

      const chunks: string[] = [];
      const result = await promptLLMStream('test prompt', (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks).toEqual(['chunk1', 'chunk2', 'chunk3']);
      expect(result).toBe('chunk1chunk2chunk3');
    });

    it('should return null on error', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Stream error' }), { status: 500 })
        )
      );

      const chunks: string[] = [];
      const result = await promptLLMStream('test prompt', (chunk) => chunks.push(chunk));
      expect(result).toBeNull();
      expect(chunks).toEqual([]);
    });
  });

  describe('clearTokenCache', () => {
    it('should allow generating new token after clear', async () => {
      let callCount = 0;
      globalThis.fetch = mock(() => {
        callCount++;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'response' } }],
            }),
            { status: 200 }
          )
        );
      });

      await promptLLM('test1');
      await promptLLM('test2');
      // Token should be cached, both calls use same token

      clearTokenCache();
      await promptLLM('test3');
      // After clearing, new token generated

      expect(callCount).toBe(3);
    });
  });
});
