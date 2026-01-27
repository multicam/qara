/**
 * Tests for model-extractor.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getModelFromTranscript } from './model-extractor';

const TEST_DIR = '/tmp/model-extractor-test';

describe('Model Extractor', () => {
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('getModelFromTranscript', () => {
    it('should return empty string for non-existent file', async () => {
      const result = await getModelFromTranscript('/non/existent/file.jsonl');
      expect(result).toBe('');
    });

    it('should return empty string for empty file', async () => {
      const testFile = join(TEST_DIR, 'empty.jsonl');
      await Bun.write(testFile, '');

      const result = await getModelFromTranscript(testFile);
      expect(result).toBe('');
    });

    it('should extract model from assistant message', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [
        { type: 'user', message: { content: 'Hello' } },
        { type: 'assistant', message: { model: 'claude-3-opus-20240229', content: 'Hi there!' } },
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = await getModelFromTranscript(testFile);
      expect(result).toBe('claude-3-opus-20240229');
    });

    it('should return most recent assistant model', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [
        { type: 'assistant', message: { model: 'claude-3-haiku-20240307', content: 'First' } },
        { type: 'user', message: { content: 'Question' } },
        { type: 'assistant', message: { model: 'claude-3-sonnet-20240229', content: 'Last' } },
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = await getModelFromTranscript(testFile);
      // Should return the last assistant message's model (reading from end)
      expect(result).toBe('claude-3-sonnet-20240229');
    });

    it('should skip non-assistant entries', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [
        { type: 'system', message: { content: 'System prompt' } },
        { type: 'user', message: { content: 'Hello' } },
        { type: 'assistant', message: { model: 'claude-3-opus-20240229', content: 'Response' } },
        { type: 'user', message: { content: 'Follow up' } },
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = await getModelFromTranscript(testFile);
      expect(result).toBe('claude-3-opus-20240229');
    });

    it('should return empty string if no assistant messages have model', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [
        { type: 'user', message: { content: 'Hello' } },
        { type: 'assistant', message: { content: 'Hi, no model field' } },
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = await getModelFromTranscript(testFile);
      expect(result).toBe('');
    });

    it('should handle invalid JSON lines gracefully', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const content = [
        'not valid json',
        JSON.stringify({ type: 'assistant', message: { model: 'claude-3-opus-20240229', content: 'Valid' } }),
        '{broken json',
      ].join('\n');

      await Bun.write(testFile, content);

      const result = await getModelFromTranscript(testFile);
      expect(result).toBe('claude-3-opus-20240229');
    });

    it('should handle file with only whitespace lines', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      await Bun.write(testFile, '\n\n  \n\n');

      const result = await getModelFromTranscript(testFile);
      expect(result).toBe('');
    });

    it('should handle various Claude model names', async () => {
      const models = [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
      ];

      for (const model of models) {
        const testFile = join(TEST_DIR, `transcript-${model}.jsonl`);
        const transcript = [{ type: 'assistant', message: { model, content: 'Test' } }];

        await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

        const result = await getModelFromTranscript(testFile);
        expect(result).toBe(model);
      }
    });

    it('should handle OpenAI model names', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [{ type: 'assistant', message: { model: 'gpt-4o', content: 'Response' } }];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = await getModelFromTranscript(testFile);
      expect(result).toBe('gpt-4o');
    });

    it('should handle ZAI GLM model names', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [{ type: 'assistant', message: { model: 'glm-4.7', content: 'Response' } }];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = await getModelFromTranscript(testFile);
      expect(result).toBe('glm-4.7');
    });
  });
});
