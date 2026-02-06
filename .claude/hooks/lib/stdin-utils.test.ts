/**
 * Tests for stdin-utils.ts
 *
 * Uses in-process Bun.stdin mocking to exercise all code paths
 * while remaining visible to Bun's coverage instrumenter.
 */

import { describe, it, expect, afterEach } from 'bun:test';
import { delay, readStdin, readHookInput, readStdinWithTimeout, type HookInput } from './stdin-utils';

// Save originals for restoration
const originalText = Bun.stdin.text.bind(Bun.stdin);
const originalStream = Bun.stdin.stream.bind(Bun.stdin);

function mockStdinText(data: string) {
  (Bun.stdin as any).text = () => Promise.resolve(data);
}

function mockStdinStream(data: string, opts?: { neverClose?: boolean }) {
  (Bun.stdin as any).stream = () => new ReadableStream({
    start(controller) {
      if (opts?.neverClose) return; // simulate blocking stdin
      if (data) controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  });
}

function restoreStdin() {
  (Bun.stdin as any).text = originalText;
  (Bun.stdin as any).stream = originalStream;
}

describe('Stdin Utils', () => {
  afterEach(() => restoreStdin());

  describe('HookInput interface', () => {
    it('should accept valid hook input structure', () => {
      const input: HookInput = {
        session_id: 'test-session-123',
        prompt: 'Hello world',
        transcript_path: '/path/to/transcript.jsonl',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'ls -la' },
      };

      expect(input.session_id).toBe('test-session-123');
      expect(input.prompt).toBe('Hello world');
      expect(input.tool_name).toBe('Bash');
    });

    it('should allow optional fields', () => {
      const minimalInput: HookInput = {
        session_id: 'session-only',
      };

      expect(minimalInput.session_id).toBe('session-only');
      expect(minimalInput.prompt).toBeUndefined();
      expect(minimalInput.tool_name).toBeUndefined();
    });

    it('should allow additional fields via index signature', () => {
      const extendedInput: HookInput = {
        session_id: 'test',
        custom_field: 'custom value',
        another_field: 123,
      };

      expect(extendedInput.custom_field).toBe('custom value');
      expect(extendedInput.another_field).toBe(123);
    });
  });

  describe('readStdin', () => {
    it('should read text from stdin', async () => {
      mockStdinText('hello world');
      const result = await readStdin();
      expect(result).toBe('hello world');
    });

    it('should handle empty stdin', async () => {
      mockStdinText('');
      const result = await readStdin();
      expect(result).toBe('');
    });

    it('should handle multiline input', async () => {
      mockStdinText('line1\nline2\nline3');
      const result = await readStdin();
      expect(result).toBe('line1\nline2\nline3');
    });
  });

  describe('readHookInput', () => {
    it('should parse valid JSON from stdin', async () => {
      mockStdinText(JSON.stringify({ session_id: 'test-123', prompt: 'hi' }));
      const input = await readHookInput();
      expect(input.session_id).toBe('test-123');
      expect(input.prompt).toBe('hi');
    });

    it('should throw on empty stdin', async () => {
      mockStdinText('');
      await expect(readHookInput()).rejects.toThrow('Empty stdin');
    });

    it('should throw on whitespace-only stdin', async () => {
      mockStdinText('   \n  \t  ');
      await expect(readHookInput()).rejects.toThrow('Empty stdin');
    });

    it('should throw on invalid JSON', async () => {
      mockStdinText('not json at all');
      await expect(readHookInput()).rejects.toThrow();
    });

    it('should handle complex hook input with all fields', async () => {
      const hookData = {
        session_id: 'sess-abc',
        prompt: 'do something',
        transcript_path: '/tmp/transcript.jsonl',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'ls' },
      };
      mockStdinText(JSON.stringify(hookData));
      const input = await readHookInput();
      expect(input.tool_name).toBe('Bash');
      expect(input.tool_input.command).toBe('ls');
    });
  });

  describe('readStdinWithTimeout', () => {
    it('should read stdin data within timeout', async () => {
      mockStdinStream('timeout test data');
      const result = await readStdinWithTimeout(5000);
      expect(result).toBe('timeout test data');
    });

    it('should use default timeout when not specified', async () => {
      mockStdinStream('default timeout data');
      const result = await readStdinWithTimeout();
      expect(result).toBe('default timeout data');
    });

    it('should handle empty stream', async () => {
      mockStdinStream('');
      const result = await readStdinWithTimeout(1000);
      expect(result).toBe('');
    });

    it('should timeout when stdin blocks', async () => {
      mockStdinStream('', { neverClose: true });
      await expect(readStdinWithTimeout(50)).rejects.toThrow('Stdin read timeout');
    });
  });

  describe('delay', () => {
    it('should return a Promise', () => {
      const result = delay(0);
      expect(result instanceof Promise).toBe(true);
    });

    it('should resolve after specified time', async () => {
      const start = Date.now();
      await delay(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(100);
    });

    it('should work with 0ms delay', async () => {
      const start = Date.now();
      await delay(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it('should not block other async operations', async () => {
      const results: number[] = [];

      const promise1 = delay(30).then(() => results.push(1));
      const promise2 = delay(10).then(() => results.push(2));
      const promise3 = delay(20).then(() => results.push(3));

      await Promise.all([promise1, promise2, promise3]);

      expect(results).toEqual([2, 3, 1]);
    });
  });
});
