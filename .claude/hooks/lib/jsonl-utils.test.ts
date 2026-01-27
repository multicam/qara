/**
 * Tests for jsonl-utils.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ensureDir, appendJsonl, truncate } from './jsonl-utils';

const TEST_DIR = '/tmp/jsonl-utils-test';

describe('JSONL Utils', () => {
  beforeEach(() => {
    // Clean up test directory before each test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('ensureDir', () => {
    it('should create a directory if it does not exist', () => {
      const testPath = join(TEST_DIR, 'new-dir');
      expect(existsSync(testPath)).toBe(false);

      ensureDir(testPath);

      expect(existsSync(testPath)).toBe(true);
    });

    it('should create nested directories recursively', () => {
      const testPath = join(TEST_DIR, 'level1', 'level2', 'level3');
      expect(existsSync(testPath)).toBe(false);

      ensureDir(testPath);

      expect(existsSync(testPath)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      expect(existsSync(TEST_DIR)).toBe(true);

      // Should not throw
      expect(() => ensureDir(TEST_DIR)).not.toThrow();
    });
  });

  describe('appendJsonl', () => {
    it('should create file and parent directories if they do not exist', () => {
      const testFile = join(TEST_DIR, 'subdir', 'test.jsonl');
      const entry = { id: 1, name: 'test' };

      appendJsonl(testFile, entry);

      expect(existsSync(testFile)).toBe(true);
    });

    it('should append JSON object as a single line', () => {
      const testFile = join(TEST_DIR, 'test.jsonl');
      const entry = { id: 1, name: 'test' };

      appendJsonl(testFile, entry);

      const content = readFileSync(testFile, 'utf-8');
      expect(content).toBe('{"id":1,"name":"test"}\n');
    });

    it('should append multiple entries on separate lines', () => {
      const testFile = join(TEST_DIR, 'test.jsonl');

      appendJsonl(testFile, { id: 1 });
      appendJsonl(testFile, { id: 2 });
      appendJsonl(testFile, { id: 3 });

      const content = readFileSync(testFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(3);
      expect(JSON.parse(lines[0])).toEqual({ id: 1 });
      expect(JSON.parse(lines[1])).toEqual({ id: 2 });
      expect(JSON.parse(lines[2])).toEqual({ id: 3 });
    });

    it('should handle complex nested objects', () => {
      const testFile = join(TEST_DIR, 'test.jsonl');
      const entry = {
        timestamp: '2026-01-27T10:00:00Z',
        data: {
          nested: {
            array: [1, 2, 3],
            value: 'test',
          },
        },
        tags: ['a', 'b', 'c'],
      };

      appendJsonl(testFile, entry);

      const content = readFileSync(testFile, 'utf-8');
      const parsed = JSON.parse(content.trim());
      expect(parsed).toEqual(entry);
    });

    it('should handle special characters in strings', () => {
      const testFile = join(TEST_DIR, 'test.jsonl');
      const entry = {
        message: 'Line 1\nLine 2\tTabbed',
        quote: 'He said "hello"',
      };

      appendJsonl(testFile, entry);

      const content = readFileSync(testFile, 'utf-8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.message).toBe('Line 1\nLine 2\tTabbed');
      expect(parsed.quote).toBe('He said "hello"');
    });
  });

  describe('truncate', () => {
    it('should return empty string for undefined input', () => {
      expect(truncate(undefined)).toBe('');
    });

    it('should return empty string for empty string input', () => {
      expect(truncate('')).toBe('');
    });

    it('should not truncate strings shorter than maxLen', () => {
      const short = 'Hello World';
      expect(truncate(short, 500)).toBe(short);
    });

    it('should truncate strings longer than maxLen with indicator', () => {
      const long = 'A'.repeat(600);
      const result = truncate(long, 500);

      expect(result.length).toBe(500 + '...[truncated]'.length);
      expect(result.endsWith('...[truncated]')).toBe(true);
    });

    it('should use default maxLen of 500', () => {
      const exactlyMax = 'A'.repeat(500);
      const overMax = 'A'.repeat(501);

      expect(truncate(exactlyMax)).toBe(exactlyMax);
      expect(truncate(overMax).endsWith('...[truncated]')).toBe(true);
    });

    it('should handle custom maxLen', () => {
      const input = 'Hello World This Is A Test';

      expect(truncate(input, 5)).toBe('Hello...[truncated]');
      // Input is 26 chars, so maxLen must be >= 26 to not truncate
      expect(truncate(input, 26)).toBe(input);
      expect(truncate(input, 10).endsWith('...[truncated]')).toBe(true);
    });

    it('should handle unicode characters', () => {
      const unicode = '🎯'.repeat(100);
      const result = truncate(unicode, 10);

      expect(result.endsWith('...[truncated]')).toBe(true);
    });
  });
});
