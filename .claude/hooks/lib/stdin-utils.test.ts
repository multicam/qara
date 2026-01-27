/**
 * Tests for stdin-utils.ts
 *
 * Note: Testing stdin reading is challenging in unit tests.
 * These tests verify the module structure and helper functions.
 */

import { describe, it, expect } from 'bun:test';
import { delay, type HookInput } from './stdin-utils';

describe('Stdin Utils', () => {
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

  describe('delay', () => {
    it('should return a Promise', () => {
      const result = delay(0);
      expect(result instanceof Promise).toBe(true);
    });

    it('should resolve after specified time', async () => {
      const start = Date.now();
      await delay(50);
      const elapsed = Date.now() - start;

      // Allow some tolerance for timing
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

      // Shorter delays should resolve first
      expect(results).toEqual([2, 3, 1]);
    });
  });

  describe('Module exports', () => {
    it('should export readStdin function', async () => {
      const mod = await import('./stdin-utils');
      expect(typeof mod.readStdin).toBe('function');
    });

    it('should export readHookInput function', async () => {
      const mod = await import('./stdin-utils');
      expect(typeof mod.readHookInput).toBe('function');
    });

    it('should export readStdinWithTimeout function', async () => {
      const mod = await import('./stdin-utils');
      expect(typeof mod.readStdinWithTimeout).toBe('function');
    });

    it('should export delay function', async () => {
      const mod = await import('./stdin-utils');
      expect(typeof mod.delay).toBe('function');
    });
  });

  describe('Function signatures', () => {
    it('readStdin should return Promise<string>', async () => {
      const mod = await import('./stdin-utils');
      // Verify the function exists and has expected shape
      expect(mod.readStdin.length).toBe(0); // No required parameters
    });

    it('readHookInput should return Promise<HookInput>', async () => {
      const mod = await import('./stdin-utils');
      expect(mod.readHookInput.length).toBe(0);
    });

    it('readStdinWithTimeout should accept timeout parameter', async () => {
      const mod = await import('./stdin-utils');
      // Default timeout is 5000ms, parameter is optional
      expect(mod.readStdinWithTimeout.length).toBeLessThanOrEqual(1);
    });

    it('delay should accept ms parameter', () => {
      expect(delay.length).toBe(1);
    });
  });
});
