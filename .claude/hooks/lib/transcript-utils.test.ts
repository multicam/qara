/**
 * Tests for transcript-utils.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  contentToText,
  findTaskResult,
  extractCompletionMessage,
  getLastUserQuery,
} from './transcript-utils';

const TEST_DIR = '/tmp/transcript-utils-test';

describe('Transcript Utils', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('contentToText', () => {
    it('should return string content as-is', () => {
      expect(contentToText('Hello World')).toBe('Hello World');
    });

    it('should return empty string for null/undefined', () => {
      expect(contentToText(null)).toBe('');
      expect(contentToText(undefined)).toBe('');
    });

    it('should extract text from text content block', () => {
      const content = { type: 'text', text: 'Hello World' };
      expect(contentToText(content)).toBe('Hello World');
    });

    it('should handle array of strings', () => {
      const content = ['Hello', 'World'];
      expect(contentToText(content)).toBe('Hello\nWorld');
    });

    it('should handle array of text blocks', () => {
      const content = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'World' },
      ];
      expect(contentToText(content)).toBe('Hello\nWorld');
    });

    it('should handle mixed array content', () => {
      const content = ['Plain text', { type: 'text', text: 'Block text' }];
      expect(contentToText(content)).toBe('Plain text\nBlock text');
    });

    it('should handle tool_result content recursively', () => {
      const content = [
        {
          type: 'tool_result',
          content: 'Tool output text',
        },
      ];
      expect(contentToText(content)).toBe('Tool output text');
    });

    it('should handle nested tool_result with text blocks', () => {
      const content = [
        {
          type: 'tool_result',
          content: [{ type: 'text', text: 'Nested text' }],
        },
      ];
      expect(contentToText(content)).toBe('Nested text');
    });

    it('should filter out empty/invalid content', () => {
      const content = [
        { type: 'text', text: 'Valid' },
        { type: 'image', data: 'base64...' },
        null,
        '',
      ];
      expect(contentToText(content)).toBe('Valid');
    });

    it('should return empty for non-text content block', () => {
      const content = { type: 'image', data: 'base64...' };
      expect(contentToText(content)).toBe('');
    });
  });

  describe('extractCompletionMessage', () => {
    it('should extract standard COMPLETED message', () => {
      const output = 'Some output\n🎯 COMPLETED: Task finished successfully\nMore output';
      const result = extractCompletionMessage(output);

      expect(result.message).toBe('Task finished successfully');
    });

    it('should extract COMPLETED with markdown formatting', () => {
      const output = '**COMPLETED:** Fixed the bug';
      const result = extractCompletionMessage(output);

      expect(result.message).toBe('Fixed the bug');
    });

    it('should extract CUSTOM COMPLETED message', () => {
      const output = '🗣️ CUSTOM COMPLETED: Test passed';
      const result = extractCompletionMessage(output);

      expect(result.message).toBe('Test passed');
    });

    it('should return null for messages over 12 words', () => {
      const output =
        'COMPLETED: This is a very long message that has more than twelve words in it and should be rejected';
      const result = extractCompletionMessage(output);

      expect(result.message).toBeNull();
    });

    it('should accept CUSTOM COMPLETED up to 8 words', () => {
      const output = 'CUSTOM COMPLETED: One two three four five six seven eight';
      const result = extractCompletionMessage(output);

      expect(result.message).toBe('One two three four five six seven eight');
    });

    it('should reject CUSTOM COMPLETED over 8 words and fall through to standard check', () => {
      // 9 words - rejected by CUSTOM COMPLETED (8 word limit)
      // but accepted by standard COMPLETED (12 word limit)
      const output = 'CUSTOM COMPLETED: One two three four five six seven eight nine';
      const result = extractCompletionMessage(output);

      // Falls through to standard COMPLETED which allows up to 12 words
      expect(result.message).toBe('One two three four five six seven eight nine');
    });

    it('should reject messages over 12 words completely', () => {
      const output = 'COMPLETED: One two three four five six seven eight nine ten eleven twelve thirteen';
      const result = extractCompletionMessage(output);

      expect(result.message).toBeNull();
    });

    it('should extract agent type from output', () => {
      const output = '[AGENT:explorer] COMPLETED: Found files\nSub-agent explorer completed';
      const result = extractCompletionMessage(output);

      expect(result.agentType).toBe('explorer');
    });

    it('should extract agent type from Sub-agent pattern', () => {
      const output = 'Sub-agent Researcher completed successfully\nCOMPLETED: Research done';
      const result = extractCompletionMessage(output);

      expect(result.agentType).toBe('researcher');
    });

    it('should return null message if no COMPLETED found', () => {
      const output = 'Just some regular output without completion marker';
      const result = extractCompletionMessage(output);

      expect(result.message).toBeNull();
    });

    it('should strip brackets from message', () => {
      const output = 'COMPLETED: Task [done] finished [ok]';
      const result = extractCompletionMessage(output);

      expect(result.message).toBe('Task  finished');
    });

    it('should handle case-insensitive matching', () => {
      const output = 'completed: lowercase works';
      const result = extractCompletionMessage(output);

      expect(result.message).toBe('lowercase works');
    });
  });

  describe('getLastUserQuery', () => {
    it('should return null for non-existent file', () => {
      const result = getLastUserQuery('/non/existent/file.jsonl');
      expect(result).toBeNull();
    });

    it('should return last user query from transcript', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [
        { type: 'user', message: { content: [{ type: 'text', text: 'First query' }] } },
        { type: 'assistant', message: { content: 'Response' } },
        { type: 'user', message: { content: [{ type: 'text', text: 'Last query' }] } },
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = getLastUserQuery(testFile);
      expect(result).toBe('Last query');
    });

    it('should skip non-user entries', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [
        { type: 'user', message: { content: [{ type: 'text', text: 'User query' }] } },
        { type: 'assistant', message: { content: 'Response' } },
        { type: 'system', message: { content: 'System message' } },
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = getLastUserQuery(testFile);
      expect(result).toBe('User query');
    });

    it('should return null for empty transcript', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      await Bun.write(testFile, '');

      const result = getLastUserQuery(testFile);
      expect(result).toBeNull();
    });

    it('should handle invalid JSON lines gracefully', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const content = [
        'invalid json',
        JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'Valid query' }] } }),
      ].join('\n');

      await Bun.write(testFile, content);

      const result = getLastUserQuery(testFile);
      expect(result).toBe('Valid query');
    });

    it('should handle user entries without text content', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [
        { type: 'user', message: { content: [{ type: 'text', text: 'Text query' }] } },
        { type: 'user', message: { content: [{ type: 'image', data: 'base64...' }] } },
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = getLastUserQuery(testFile);
      // Should skip the image-only entry and find the text query
      expect(result).toBe('Text query');
    });
  });

  describe('findTaskResult', () => {
    it('should return null result for non-existent file', async () => {
      const result = await findTaskResult('/non/existent/file.jsonl', 1);
      expect(result.result).toBeNull();
      expect(result.agentType).toBeNull();
    });

    it('should find Task result in transcript', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const taskId = 'task-123';
      const transcript = [
        {
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Task', id: taskId, input: { prompt: 'test' } }],
          },
        },
        {
          type: 'user',
          message: {
            content: [{ type: 'tool_result', tool_use_id: taskId, content: 'Task completed successfully' }],
          },
        },
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = await findTaskResult(testFile, 1);
      expect(result.result).toBe('Task completed successfully');
    });

    it('should extract agent type from task output', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const taskId = 'task-456';
      const transcript = [
        {
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Task', id: taskId, input: {} }],
          },
        },
        {
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: taskId,
                content: 'Sub-agent Explorer completed: Found 5 files',
              },
            ],
          },
        },
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = await findTaskResult(testFile, 1);
      expect(result.agentType).toBe('explorer');
    });

    it('should handle missing tool_result', async () => {
      const testFile = join(TEST_DIR, 'transcript.jsonl');
      const transcript = [
        {
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Task', id: 'task-789', input: {} }],
          },
        },
        // No matching tool_result
      ];

      await Bun.write(testFile, transcript.map((e) => JSON.stringify(e)).join('\n'));

      const result = await findTaskResult(testFile, 1);
      expect(result.result).toBeNull();
    });
  });
});
