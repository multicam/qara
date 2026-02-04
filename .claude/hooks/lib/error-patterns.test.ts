/**
 * Tests for error-patterns.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

// Import all functions including new ones
import {
  logErrorPattern,
  lookupErrorPattern,
  getErrorsByCategory,
  getErrorStats,
  compactErrorPatterns,
  type ErrorPattern,
  type ErrorCategory
} from './error-patterns';

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

  describe('Deduplication', () => {
    it('should deduplicate identical errors and increment frequency', async () => {
      await logErrorPattern('ENOENT: no such file', 'reading config.json', 'Read');
      await logErrorPattern('ENOENT: no such file', 'reading config.json', 'Read');
      await logErrorPattern('ENOENT: no such file', 'reading config.json', 'Read');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const lines = content.trim().split('\n');

      // Should only have one entry (deduplicated)
      expect(lines.length).toBe(1);

      const entry = JSON.parse(lines[0]);
      expect(entry.frequency).toBe(3);
    });

    it('should not deduplicate different errors', async () => {
      await logErrorPattern('ENOENT: no such file', 'reading config.json', 'Read');
      await logErrorPattern('EACCES: permission denied', 'writing log.txt', 'Write');
      await logErrorPattern('MODULE_NOT_FOUND', 'importing lodash', 'Bash');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const lines = content.trim().split('\n');

      // Should have three different entries
      expect(lines.length).toBe(3);

      const entries = lines.map(l => JSON.parse(l));
      expect(entries.every(e => e.frequency === 1)).toBe(true);
    });

    it('should generate unique hashes for different contexts', async () => {
      await logErrorPattern('ENOENT: no such file', 'reading config.json', 'Read');
      await logErrorPattern('ENOENT: no such file', 'reading data.db', 'Read');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const lines = content.trim().split('\n');

      // Different contexts should create different entries
      expect(lines.length).toBe(2);

      const entries = lines.map(l => JSON.parse(l));
      expect(entries[0].hash).not.toBe(entries[1].hash);
    });
  });

  describe('Resolution Hints', () => {
    it('should add automatic resolution hints for known errors', async () => {
      await logErrorPattern('ENOENT: no such file or directory', 'reading file', 'Read');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.solution).toBeTruthy();
      expect(entry.solution.length).toBeGreaterThan(0);
      expect(entry.solution).toContain('file');
    });

    it('should add hints for TypeScript errors', async () => {
      await logErrorPattern('error TS2339: Property does not exist', 'compiling', 'Bash');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.solution).toBeTruthy();
      expect(entry.solution).toContain('Property');
    });

    it('should add hints for HTTP errors', async () => {
      await logErrorPattern('Request failed with status 404', 'API call', 'WebFetch');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.solution).toBeTruthy();
      expect(entry.solution).toContain('Not Found');
    });

    it('should preserve user solutions over auto-hints on duplicate', async () => {
      // First, log the error to get the proper hash
      await logErrorPattern('ENOENT: no such file', 'reading config.json', 'Read');

      // Read it back and update with user solution
      const content1 = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry1 = JSON.parse(content1.trim());
      entry1.solution = 'User custom solution';
      writeFileSync(ERROR_PATTERNS_FILE, JSON.stringify(entry1) + '\n');

      // Log same error again - should keep user solution
      await logErrorPattern('ENOENT: no such file', 'reading config.json', 'Read');

      const content2 = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry2 = JSON.parse(content2.trim());

      expect(entry2.solution).toBe('User custom solution');
      expect(entry2.frequency).toBe(2);
    });
  });

  describe('Error Categorization', () => {
    it('should categorize filesystem errors', async () => {
      await logErrorPattern('ENOENT: no such file', 'reading file', 'Read');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.category).toBe('filesystem');
    });

    it('should categorize network errors', async () => {
      await logErrorPattern('ECONNREFUSED: connection refused', 'connecting', 'WebFetch');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.category).toBe('network');
    });

    it('should categorize permission errors', async () => {
      await logErrorPattern('EACCES: permission denied', 'writing file', 'Write');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.category).toBe('permission');
    });

    it('should categorize module errors', async () => {
      await logErrorPattern('MODULE_NOT_FOUND: Cannot find module', 'import', 'Bash');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.category).toBe('module');
    });

    it('should categorize type errors', async () => {
      await logErrorPattern('error TS2339: Property does not exist', 'compile', 'Bash');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.category).toBe('type');
    });

    it('should categorize syntax errors', async () => {
      await logErrorPattern('SyntaxError: Unexpected token', 'parse', 'Bash');

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.category).toBe('syntax');
    });
  });

  describe('getErrorsByCategory', () => {
    it('should group errors by category', async () => {
      await logErrorPattern('ENOENT: no such file', 'reading', 'Read');
      await logErrorPattern('EACCES: permission denied', 'writing', 'Write');
      await logErrorPattern('TS2339: Property missing', 'compile', 'Bash');
      await logErrorPattern('HTTP404: Not found', 'fetch', 'WebFetch');

      const grouped = await getErrorsByCategory();

      expect(grouped.filesystem.length).toBe(1);
      expect(grouped.permission.length).toBe(1);
      expect(grouped.type.length).toBe(1);
      expect(grouped.network.length).toBe(1);
    });

    it('should sort each category by frequency', async () => {
      // Create patterns with different frequencies and different contexts
      await logErrorPattern('ENOENT: file1', 'reading config.json', 'Read');
      await logErrorPattern('ENOENT: file1', 'reading config.json', 'Read'); // freq 2
      await logErrorPattern('ENOENT: file1', 'reading config.json', 'Read'); // freq 3

      await logErrorPattern('ENOENT: file2', 'writing data.db', 'Write'); // Different context/tool

      const grouped = await getErrorsByCategory();

      expect(grouped.filesystem.length).toBe(2);
      expect(grouped.filesystem[0].frequency).toBe(3);
      expect(grouped.filesystem[1].frequency).toBe(1);
    });

    it('should return empty categories when no errors exist', async () => {
      const grouped = await getErrorsByCategory();

      expect(grouped.filesystem).toEqual([]);
      expect(grouped.network).toEqual([]);
      expect(grouped.permission).toEqual([]);
    });
  });

  describe('getErrorStats', () => {
    it('should calculate basic statistics', async () => {
      await logErrorPattern('ENOENT: file1', 'reading', 'Read');
      await logErrorPattern('EACCES: perm', 'writing', 'Write');
      await logErrorPattern('TS2339: prop', 'compile', 'Bash');

      const stats = await getErrorStats();

      expect(stats.total).toBe(3);
      expect(stats.byCategory.filesystem).toBe(1);
      expect(stats.byCategory.permission).toBe(1);
      expect(stats.byCategory.type).toBe(1);
    });

    it('should identify top errors by frequency', async () => {
      await logErrorPattern('ENOENT: common', 'reading', 'Read');
      await logErrorPattern('ENOENT: common', 'reading', 'Read');
      await logErrorPattern('ENOENT: common', 'reading', 'Read');
      await logErrorPattern('ENOENT: common', 'reading', 'Read');
      await logErrorPattern('ENOENT: common', 'reading', 'Read');

      await logErrorPattern('EACCES: rare', 'writing', 'Write');

      const stats = await getErrorStats();

      expect(stats.topErrors.length).toBeGreaterThan(0);
      expect(stats.topErrors[0].frequency).toBe(5);
      expect(stats.topErrors[0].error).toBe('ENOENT');
    });

    it('should track recent errors', async () => {
      await logErrorPattern('ENOENT: recent', 'reading', 'Read');

      const stats = await getErrorStats();

      expect(stats.recentErrors.length).toBe(1);
      expect(stats.recentErrors[0].error).toBe('ENOENT');
    });

    it('should return zero stats when no errors exist', async () => {
      const stats = await getErrorStats();

      expect(stats.total).toBe(0);
      expect(stats.topErrors).toEqual([]);
      expect(stats.recentErrors).toEqual([]);
    });
  });

  describe('compactErrorPatterns', () => {
    it('should remove old infrequent errors', async () => {
      mkdirSync(dirname(ERROR_PATTERNS_FILE), { recursive: true });

      const oldTime = Date.now() - 100 * 24 * 60 * 60 * 1000; // 100 days ago
      const oldPattern: ErrorPattern = {
        error: 'OLD_ERROR',
        pattern: 'old',
        solution: 'old solution',
        frequency: 1,
        lastSeen: oldTime,
        category: 'unknown',
        hash: 'old123'
      };

      const recentPattern: ErrorPattern = {
        error: 'RECENT_ERROR',
        pattern: 'recent',
        solution: 'recent solution',
        frequency: 1,
        lastSeen: Date.now(),
        category: 'unknown',
        hash: 'recent123'
      };

      writeFileSync(ERROR_PATTERNS_FILE,
        JSON.stringify(oldPattern) + '\n' +
        JSON.stringify(recentPattern) + '\n'
      );

      const removed = await compactErrorPatterns();

      expect(removed).toBe(1);

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(1);
      expect(JSON.parse(lines[0]).error).toBe('RECENT_ERROR');
    });

    it('should keep high-frequency errors even if old', async () => {
      mkdirSync(dirname(ERROR_PATTERNS_FILE), { recursive: true });

      const oldTime = Date.now() - 100 * 24 * 60 * 60 * 1000; // 100 days ago
      const oldFrequentPattern: ErrorPattern = {
        error: 'OLD_FREQUENT',
        pattern: 'old but frequent',
        solution: 'solution',
        frequency: 10, // High frequency
        lastSeen: oldTime,
        category: 'unknown',
        hash: 'oldfreq123'
      };

      writeFileSync(ERROR_PATTERNS_FILE, JSON.stringify(oldFrequentPattern) + '\n');

      const removed = await compactErrorPatterns();

      expect(removed).toBe(0);

      const content = readFileSync(ERROR_PATTERNS_FILE, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(1);
    });

    it('should return zero when no file exists', async () => {
      const removed = await compactErrorPatterns();

      expect(removed).toBe(0);
    });
  });
});
