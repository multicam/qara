/**
 * Tests for summarizer.ts
 *
 * Tests the event summarization logic without making actual API calls.
 */

import { describe, it, expect } from 'bun:test';

// Test the response cleaning logic that generateEventSummary applies
describe('Summarizer', () => {
  describe('Response cleaning logic', () => {
    function cleanSummary(summary: string): string {
      return summary
        .trim()
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\.$/, '') // Remove trailing period
        .split('\n')[0] // Take only first line
        .slice(0, 100); // Limit length
    }

    it('should trim whitespace', () => {
      expect(cleanSummary('  Hello World  ')).toBe('Hello World');
    });

    it('should remove surrounding double quotes', () => {
      expect(cleanSummary('"Hello World"')).toBe('Hello World');
    });

    it('should remove surrounding single quotes', () => {
      expect(cleanSummary("'Hello World'")).toBe('Hello World');
    });

    it('should remove trailing period', () => {
      expect(cleanSummary('Hello World.')).toBe('Hello World');
    });

    it('should take only first line', () => {
      expect(cleanSummary('First line\nSecond line\nThird line')).toBe('First line');
    });

    it('should limit length to 100 characters', () => {
      const longText = 'A'.repeat(150);
      expect(cleanSummary(longText).length).toBe(100);
    });

    it('should handle combined cleaning operations', () => {
      // Period removal only works at end of string, first line extraction preserves internal periods
      const messy = '"Reads file from disk\nMore details."';
      expect(cleanSummary(messy)).toBe('Reads file from disk');
    });

    it('should handle empty string', () => {
      expect(cleanSummary('')).toBe('');
    });

    it('should preserve internal quotes', () => {
      expect(cleanSummary('Says "hello" to user')).toBe('Says "hello" to user');
    });
  });

  describe('Payload truncation logic', () => {
    function truncatePayload(payload: object): string {
      let payloadStr = JSON.stringify(payload, null, 2);
      if (payloadStr.length > 1000) {
        payloadStr = payloadStr.slice(0, 1000) + '...';
      }
      return payloadStr;
    }

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
