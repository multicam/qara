/**
 * Tests for error-patterns.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

// We need to test the extractErrorType function which is not exported
// So we'll test it indirectly through logErrorPattern and lookupErrorPattern
import { logErrorPattern, lookupErrorPattern, type ErrorPattern } from './error-patterns';

const STATE_DIR = join(process.env.PAI_DIR || process.env.HOME + '/qara', 'state');
const ERROR_PATTERNS_FILE = join(STATE_DIR, 'error-patterns.jsonl');
const BACKUP_FILE = ERROR_PATTERNS_FILE + '.backup';

describe('Error Patterns', () => {
  let originalContent: string | null = null;

  beforeEach(() => {
    // Backup existing file if it exists
    if (existsSync(ERROR_PATTERNS_FILE)) {
      originalContent = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
    }
    // Create a fresh test file
    if (existsSync(ERROR_PATTERNS_FILE)) {
      rmSync(ERROR_PATTERNS_FILE);
    }
  });

  afterEach(() => {
    // Restore original content
    if (originalContent !== null) {
      mkdirSync(dirname(ERROR_PATTERNS_FILE), { recursive: true });
      writeFileSync(ERROR_PATTERNS_FILE, originalContent);
      originalContent = null;
    } else if (existsSync(ERROR_PATTERNS_FILE)) {
      rmSync(ERROR_PATTERNS_FILE);
    }
  });

  describe('logErrorPattern', () => {
    it('should create error pattern file if it does not exist', async () => {
      await logErrorPattern('ENOENT: no such file', 'reading config', 'Read');

      expect(existsSync(ERROR_PATTERNS_FILE)).toBe(true);
    });

    it('should log error with extracted error type', async () => {
      await logErrorPattern('ENOENT: no such file or directory', 'reading config', 'Read');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.error).toBe('ENOENT');
      expect(entry.pattern).toContain('Read');
    });

    it('should extract TypeScript error codes', async () => {
      await logErrorPattern('error TS2339: Property does not exist', 'compiling', 'Bash');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.error).toBe('TS2339');
    });

    it('should extract HTTP status codes', async () => {
      await logErrorPattern('Request failed with status 404', 'fetching API', 'WebFetch');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.error).toBe('HTTP404');
    });

    it('should truncate long context', async () => {
      const longContext = 'A'.repeat(200);
      await logErrorPattern('Some error', longContext, 'Bash');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.pattern.length).toBeLessThanOrEqual(110); // "Bash: " + 100 chars
    });

    it('should detect common error patterns from text', async () => {
      await logErrorPattern('Error: no such file or directory', 'test', 'Read');
      await logErrorPattern('Error: connection refused to localhost:3000', 'test', 'WebFetch');
      await logErrorPattern('Error: permission denied accessing /root', 'test', 'Bash');
      await logErrorPattern("Error: cannot find module 'lodash'", 'test', 'Bash');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const lines = content.trim().split('\n');
      const entries = lines.map((l) => JSON.parse(l));

      expect(entries[0].error).toBe('ENOENT');
      expect(entries[1].error).toBe('ECONNREFUSED');
      expect(entries[2].error).toBe('EACCES');
      expect(entries[3].error).toBe('MODULE_NOT_FOUND');
    });
  });

  describe('lookupErrorPattern', () => {
    it('should return null if file does not exist', async () => {
      const result = await lookupErrorPattern('ENOENT: no such file');

      expect(result).toBeNull();
    });

    it('should return null if no matching pattern found', async () => {
      // Create file with unrelated pattern
      mkdirSync(dirname(ERROR_PATTERNS_FILE), { recursive: true });
      const pattern: ErrorPattern = {
        error: 'OTHER_ERROR',
        pattern: 'test',
        solution: 'do something',
        frequency: 1,
        lastSeen: Date.now(),
      };
      writeFileSync(ERROR_PATTERNS_FILE, JSON.stringify(pattern) + '\n');

      const result = await lookupErrorPattern('ENOENT: no such file');

      expect(result).toBeNull();
    });

    it('should return null if pattern has no solution', async () => {
      mkdirSync(dirname(ERROR_PATTERNS_FILE), { recursive: true });
      const pattern: ErrorPattern = {
        error: 'ENOENT',
        pattern: 'test',
        solution: '', // No solution
        frequency: 1,
        lastSeen: Date.now(),
      };
      writeFileSync(ERROR_PATTERNS_FILE, JSON.stringify(pattern) + '\n');

      const result = await lookupErrorPattern('ENOENT: no such file');

      expect(result).toBeNull();
    });

    it('should return matching pattern with solution', async () => {
      mkdirSync(dirname(ERROR_PATTERNS_FILE), { recursive: true });
      const pattern: ErrorPattern = {
        error: 'ENOENT',
        pattern: 'file not found',
        solution: 'Check if the file exists before reading',
        frequency: 5,
        lastSeen: Date.now(),
      };
      writeFileSync(ERROR_PATTERNS_FILE, JSON.stringify(pattern) + '\n');

      const result = await lookupErrorPattern('ENOENT: no such file');

      expect(result).not.toBeNull();
      expect(result!.error).toBe('ENOENT');
      expect(result!.solution).toBe('Check if the file exists before reading');
    });

    it('should return most frequent matching pattern', async () => {
      mkdirSync(dirname(ERROR_PATTERNS_FILE), { recursive: true });
      const patterns: ErrorPattern[] = [
        {
          error: 'ENOENT',
          pattern: 'config',
          solution: 'Less frequent solution',
          frequency: 2,
          lastSeen: Date.now(),
        },
        {
          error: 'ENOENT',
          pattern: 'data',
          solution: 'Most frequent solution',
          frequency: 10,
          lastSeen: Date.now(),
        },
        {
          error: 'ENOENT',
          pattern: 'cache',
          solution: 'Medium frequency solution',
          frequency: 5,
          lastSeen: Date.now(),
        },
      ];
      writeFileSync(ERROR_PATTERNS_FILE, patterns.map((p) => JSON.stringify(p)).join('\n') + '\n');

      const result = await lookupErrorPattern('ENOENT: no such file');

      expect(result).not.toBeNull();
      expect(result!.solution).toBe('Most frequent solution');
      expect(result!.frequency).toBe(10);
    });

    it('should handle invalid JSON lines gracefully', async () => {
      mkdirSync(dirname(ERROR_PATTERNS_FILE), { recursive: true });
      const validPattern: ErrorPattern = {
        error: 'ENOENT',
        pattern: 'test',
        solution: 'Valid solution',
        frequency: 1,
        lastSeen: Date.now(),
      };
      const content = 'invalid json\n' + JSON.stringify(validPattern) + '\n' + '{broken\n';
      writeFileSync(ERROR_PATTERNS_FILE, content);

      const result = await lookupErrorPattern('ENOENT: no such file');

      expect(result).not.toBeNull();
      expect(result!.solution).toBe('Valid solution');
    });

    it('should handle empty file', async () => {
      mkdirSync(dirname(ERROR_PATTERNS_FILE), { recursive: true });
      writeFileSync(ERROR_PATTERNS_FILE, '');

      const result = await lookupErrorPattern('ENOENT: no such file');

      expect(result).toBeNull();
    });
  });
});
