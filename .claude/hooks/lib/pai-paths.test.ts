/**
 * Tests for pai-paths.ts
 *
 * Note: pai-paths.ts validates directory structure on import,
 * so we test after the module is successfully loaded.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmdirSync } from 'fs';
import { join } from 'path';
import {
  PAI_DIR,
  HOOKS_DIR,
  SKILLS_DIR,
  AGENTS_DIR,
  HISTORY_DIR,
  COMMANDS_DIR,
  STATE_DIR,
  QARA_DIR,
  THOUGHTS_DIR,
  MEMORY_DIR,
  getHistoryFilePath,
  ensureDir,
} from './pai-paths';

describe('PAI Paths', () => {
  describe('Directory constants', () => {
    it('should export PAI_DIR', () => {
      expect(PAI_DIR).toBeDefined();
      expect(typeof PAI_DIR).toBe('string');
      expect(PAI_DIR.length).toBeGreaterThan(0);
    });

    it('should export HOOKS_DIR as subdirectory of PAI_DIR', () => {
      expect(HOOKS_DIR).toBe(join(PAI_DIR, 'hooks'));
    });

    it('should export SKILLS_DIR as subdirectory of PAI_DIR', () => {
      expect(SKILLS_DIR).toBe(join(PAI_DIR, 'skills'));
    });

    it('should export AGENTS_DIR as subdirectory of PAI_DIR', () => {
      expect(AGENTS_DIR).toBe(join(PAI_DIR, 'agents'));
    });

    it('should export HISTORY_DIR as subdirectory of PAI_DIR', () => {
      expect(HISTORY_DIR).toBe(join(PAI_DIR, 'history'));
    });

    it('should export COMMANDS_DIR as subdirectory of PAI_DIR', () => {
      expect(COMMANDS_DIR).toBe(join(PAI_DIR, 'commands'));
    });

    it('should export STATE_DIR as subdirectory of PAI_DIR', () => {
      expect(STATE_DIR).toBe(join(PAI_DIR, 'state'));
    });

    it('should export QARA_DIR', () => {
      expect(QARA_DIR).toBeDefined();
      expect(QARA_DIR).toContain('qara');
    });

    it('should export THOUGHTS_DIR as subdirectory of QARA_DIR', () => {
      expect(THOUGHTS_DIR).toBe(join(QARA_DIR, 'thoughts'));
    });

    it('should export MEMORY_DIR as subdirectory of THOUGHTS_DIR', () => {
      expect(MEMORY_DIR).toBe(join(THOUGHTS_DIR, 'memory'));
    });
  });

  describe('getHistoryFilePath', () => {
    it('should return path with year-month subdirectory', () => {
      const path = getHistoryFilePath('events', 'test.jsonl');

      expect(path).toContain(HISTORY_DIR);
      expect(path).toContain('events');
      expect(path).toContain('test.jsonl');
      // Should have YYYY-MM format in path
      expect(path).toMatch(/\d{4}-\d{2}/);
    });

    it('should handle different subdirectories', () => {
      const eventsPath = getHistoryFilePath('events', 'data.json');
      const sessionsPath = getHistoryFilePath('sessions', 'data.json');

      expect(eventsPath).toContain('events');
      expect(sessionsPath).toContain('sessions');
    });

    it('should handle different filenames', () => {
      const path1 = getHistoryFilePath('dir', 'file1.jsonl');
      const path2 = getHistoryFilePath('dir', 'file2.json');

      expect(path1).toContain('file1.jsonl');
      expect(path2).toContain('file2.json');
    });

    it('should use current date for path', () => {
      const now = new Date();
      const path = getHistoryFilePath('test', 'data.json');

      // Path should contain current year
      expect(path).toContain(String(now.getFullYear()));
    });
  });

  describe('ensureDir', () => {
    const TEST_DIR = '/tmp/pai-paths-test-dir';
    const NESTED_DIR = join(TEST_DIR, 'nested', 'deep', 'dir');

    afterEach(() => {
      // Clean up test directories
      try {
        if (existsSync(NESTED_DIR)) rmdirSync(NESTED_DIR);
        if (existsSync(join(TEST_DIR, 'nested', 'deep'))) rmdirSync(join(TEST_DIR, 'nested', 'deep'));
        if (existsSync(join(TEST_DIR, 'nested'))) rmdirSync(join(TEST_DIR, 'nested'));
        if (existsSync(TEST_DIR)) rmdirSync(TEST_DIR);
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should create directory if it does not exist', () => {
      expect(existsSync(TEST_DIR)).toBe(false);

      ensureDir(TEST_DIR);

      expect(existsSync(TEST_DIR)).toBe(true);
    });

    it('should create nested directories recursively', () => {
      expect(existsSync(NESTED_DIR)).toBe(false);

      ensureDir(NESTED_DIR);

      expect(existsSync(NESTED_DIR)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      expect(existsSync(TEST_DIR)).toBe(true);

      expect(() => ensureDir(TEST_DIR)).not.toThrow();
    });

    it('should be idempotent', () => {
      ensureDir(TEST_DIR);
      ensureDir(TEST_DIR);
      ensureDir(TEST_DIR);

      expect(existsSync(TEST_DIR)).toBe(true);
    });
  });

  describe('PAI structure validation', () => {
    it('should have validated PAI_DIR exists (module loaded successfully)', () => {
      // If we got here, validatePAIStructure() passed
      expect(existsSync(PAI_DIR)).toBe(true);
    });

    it('should have validated HOOKS_DIR exists', () => {
      expect(existsSync(HOOKS_DIR)).toBe(true);
    });
  });
});
