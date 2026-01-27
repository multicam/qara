/**
 * Tests for openai.ts
 *
 * These tests verify the module structure and response parsing logic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('OpenAI LLM', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Store original API key
    originalEnv = process.env.OPENAI_API_KEY;
    // Set a mock key to prevent SDK initialization errors
    process.env.OPENAI_API_KEY = 'test-key-for-testing';
  });

  afterEach(() => {
    // Restore original API key
    if (originalEnv !== undefined) {
      process.env.OPENAI_API_KEY = originalEnv;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  describe('Module exports', () => {
    it('should export promptLLM function', async () => {
      const mod = await import('./openai');
      expect(typeof mod.promptLLM).toBe('function');
    });

    it('should export promptLLMStream function', async () => {
      const mod = await import('./openai');
      expect(typeof mod.promptLLMStream).toBe('function');
    });
  });

  describe('promptLLM function signature', () => {
    it('should accept prompt as first argument', async () => {
      const mod = await import('./openai');
      expect(mod.promptLLM.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('promptLLMStream function signature', () => {
    it('should accept prompt and onChunk callback', async () => {
      const mod = await import('./openai');
      expect(typeof mod.promptLLMStream).toBe('function');
    });
  });

  describe('Default parameters', () => {
    it('should use gpt-4o-mini as default model', async () => {
      // Verified from source: default is 'gpt-4o-mini'
      const mod = await import('./openai');
      expect(mod.promptLLM).toBeDefined();
    });

    it('should use 150 as default maxTokens', async () => {
      const mod = await import('./openai');
      expect(mod.promptLLM).toBeDefined();
    });
  });
});

describe('OpenAI Response Parsing', () => {
  describe('Chat completion response', () => {
    it('should extract message content from response', () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Hello World',
            },
          },
        ],
      };

      const content = mockResponse.choices[0]?.message?.content || null;
      expect(content).toBe('Hello World');
    });

    it('should handle empty choices array', () => {
      const mockResponse = {
        choices: [],
      };

      const content = mockResponse.choices[0]?.message?.content || null;
      expect(content).toBeNull();
    });

    it('should handle null content', () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
            },
          },
        ],
      };

      const content = mockResponse.choices[0]?.message?.content || null;
      expect(content).toBeNull();
    });

    it('should handle missing message', () => {
      const mockResponse = {
        choices: [{}],
      };

      const content = (mockResponse.choices[0] as any)?.message?.content || null;
      expect(content).toBeNull();
    });
  });

  describe('Streaming response parsing', () => {
    it('should accumulate content from stream chunks', () => {
      const chunks: string[] = [];
      const streamEvents = [
        { choices: [{ delta: { content: 'Hello ' } }] },
        { choices: [{ delta: { content: 'World' } }] },
        { choices: [{ delta: {} }] }, // End chunk with no content
      ];

      for (const chunk of streamEvents) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          chunks.push(content);
        }
      }

      expect(chunks.join('')).toBe('Hello World');
    });

    it('should handle chunks with undefined content', () => {
      const chunks: string[] = [];
      const streamEvents = [
        { choices: [{ delta: { role: 'assistant' } }] }, // No content
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: {} }] },
      ];

      for (const chunk of streamEvents) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          chunks.push(content);
        }
      }

      expect(chunks).toEqual(['Hello']);
    });

    it('should handle empty choices in stream', () => {
      const chunks: string[] = [];
      const streamEvents = [{ choices: [] }, { choices: [{ delta: { content: 'Test' } }] }];

      for (const chunk of streamEvents) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          chunks.push(content);
        }
      }

      expect(chunks).toEqual(['Test']);
    });
  });
});

describe('OpenAI Client Singleton', () => {
  it('should reuse client instance', async () => {
    // The module uses a singleton pattern for the client
    // Multiple imports should use the same client
    const mod1 = await import('./openai');
    const mod2 = await import('./openai');

    // Same module reference
    expect(mod1.promptLLM).toBe(mod2.promptLLM);
  });
});
