/**
 * Tests for summarizer.ts
 *
 * Tests the event summarization logic without making actual API calls.
 * Factor 9 Compliance: Pure functions are now exported and fully testable.
 */

import { describe, it, expect } from 'bun:test';
import {
  cleanSummaryResponse,
  truncatePayload,
  buildSummaryPrompt,
} from './summarizer';

// Test the exported pure functions
describe('Summarizer', () => {
  describe('cleanSummaryResponse (exported)', () => {

    it('should trim whitespace', () => {
      expect(cleanSummaryResponse('  Hello World  ')).toBe('Hello World');
    });

    it('should remove surrounding double quotes', () => {
      expect(cleanSummaryResponse('"Hello World"')).toBe('Hello World');
    });

    it('should remove surrounding single quotes', () => {
      expect(cleanSummaryResponse("'Hello World'")).toBe('Hello World');
    });

    it('should remove trailing period', () => {
      expect(cleanSummaryResponse('Hello World.')).toBe('Hello World');
    });

    it('should take only first line', () => {
      expect(cleanSummaryResponse('First line\nSecond line\nThird line')).toBe('First line');
    });

    it('should limit length to 100 characters', () => {
      const longText = 'A'.repeat(150);
      expect(cleanSummaryResponse(longText).length).toBe(100);
    });

    it('should handle combined cleaning operations', () => {
      // Period removal only works at end of string, first line extraction preserves internal periods
      const messy = '"Reads file from disk\nMore details."';
      expect(cleanSummaryResponse(messy)).toBe('Reads file from disk');
    });

    it('should handle empty string', () => {
      expect(cleanSummaryResponse('')).toBe('');
    });

    it('should preserve internal quotes', () => {
      expect(cleanSummaryResponse('Says "hello" to user')).toBe('Says "hello" to user');
    });
  });

  describe('truncatePayload (exported)', () => {
    it('should not truncate small payloads', () => {
      const payload = { key: 'value' };
      const result = truncatePayload(payload);
      expect(result).not.toContain('...');
    });

    it('should truncate large payloads at 1000 chars', () => {
      const payload = { data: 'A'.repeat(2000) };
      const result = truncatePayload(payload);
      expect(result.length).toBe(1003); // 1000 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle nested objects', () => {
      const payload = {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      };
      const result = truncatePayload(payload);
      expect(result).toContain('level3');
    });

    it('should handle empty object', () => {
      const result = truncatePayload({});
      expect(result).toBe('{}');
    });

    it('should handle arrays', () => {
      const payload = { items: [1, 2, 3, 4, 5] };
      const result = truncatePayload(payload);
      expect(result).toContain('[');
      expect(result).toContain(']');
    });

    it('should accept custom max length', () => {
      const payload = { data: 'A'.repeat(100) };
      const result = truncatePayload(payload, 50);
      expect(result.length).toBe(53); // 50 + '...'
    });
  });

  describe('buildSummaryPrompt (exported)', () => {
    it('should include event type in prompt', () => {
      const prompt = buildSummaryPrompt('PreToolUse', '{}');
      expect(prompt).toContain('Event Type: PreToolUse');
    });

    it('should include payload in prompt', () => {
      const prompt = buildSummaryPrompt('PostToolUse', '{"action": "test"}');
      expect(prompt).toContain('{"action": "test"}');
    });

    it('should include requirements section', () => {
      const prompt = buildSummaryPrompt('SessionStart', '{}');
      expect(prompt).toContain('Requirements:');
      expect(prompt).toContain('ONE sentence only');
    });

    it('should include examples', () => {
      const prompt = buildSummaryPrompt('Test', '{}');
      expect(prompt).toContain('Examples:');
      expect(prompt).toContain('Reads configuration file');
    });
  });

  describe('Module exports', () => {
    it('should export generateEventSummary function', async () => {
      const mod = await import('./summarizer');
      expect(typeof mod.generateEventSummary).toBe('function');
    });
  });

  describe('Event data handling', () => {
    it('should handle missing hook_event_type', () => {
      const eventData = { payload: { action: 'test' } };
      const eventType = eventData.hook_event_type || 'Unknown';
      expect(eventType).toBe('Unknown');
    });

    it('should handle missing payload', () => {
      const eventData = { hook_event_type: 'PreToolUse' };
      const payload = eventData.payload || {};
      expect(payload).toEqual({});
    });

    it('should extract event type correctly', () => {
      const eventData = { hook_event_type: 'PostToolUse', payload: {} };
      expect(eventData.hook_event_type).toBe('PostToolUse');
    });
  });
});
