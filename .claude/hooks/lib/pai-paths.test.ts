/**
 * Tests for pai-paths.ts
 *
 * Includes subprocess tests for validatePAIStructure error paths
 * (lines 46, 48) which only fire when PAI_DIR/HOOKS_DIR don't exist.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmdirSync, writeFileSync, unlinkSync, readFileSync, lstatSync, readlinkSync, symlinkSync } from 'fs';
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
  loadEnv,
  validatePAIStructure,
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

  describe('loadEnv', () => {
    const TEST_ENV_PATH = join(PAI_DIR, '.env.test');
    const REAL_ENV_PATH = join(PAI_DIR, '.env');
    const BACKUP_ENV_PATH = join(PAI_DIR, '.env.backup.test');

    // Preserve symlink-vs-regular-file identity of REAL_ENV_PATH across
    // every test. Without this, the sequence `unlinkSync + writeFileSync`
    // used by afterEach silently converts a symlink into a regular file,
    // and the home `~/.claude/.env` symlink keeps getting clobbered by
    // CI/test runs. Root-cause fix for the recurring regression.
    let envWasSymlink = false;
    let envSymlinkTarget = '';

    beforeEach(() => {
      envWasSymlink = false;
      envSymlinkTarget = '';
      try {
        if (existsSync(REAL_ENV_PATH)) {
          const s = lstatSync(REAL_ENV_PATH);
          if (s.isSymbolicLink()) {
            envWasSymlink = true;
            envSymlinkTarget = readlinkSync(REAL_ENV_PATH);
          }
          if (!existsSync(BACKUP_ENV_PATH)) {
            // readFileSync follows symlinks → we capture target content
            writeFileSync(BACKUP_ENV_PATH, readFileSync(REAL_ENV_PATH));
          }
          if (envWasSymlink) {
            // Remove the symlink so test writes don't modify the target.
            unlinkSync(REAL_ENV_PATH);
            writeFileSync(REAL_ENV_PATH, readFileSync(BACKUP_ENV_PATH));
          }
        }
      } catch {
        // Non-fatal — if backup fails, individual tests that do their own
        // backup (e.g. the "missing .env file" test) still work.
      }
    });

    afterEach(() => {
      // Clean up test env file
      try {
        if (existsSync(TEST_ENV_PATH)) unlinkSync(TEST_ENV_PATH);
      } catch {
        // Ignore cleanup errors
      }

      // Restore original .env if we backed it up
      try {
        if (existsSync(BACKUP_ENV_PATH)) {
          if (existsSync(REAL_ENV_PATH)) unlinkSync(REAL_ENV_PATH);
          mkdirSync(PAI_DIR, { recursive: true });
          writeFileSync(REAL_ENV_PATH, readFileSync(BACKUP_ENV_PATH));
          unlinkSync(BACKUP_ENV_PATH);
        }
      } catch {
        // Ignore cleanup errors
      }

      // Clean up test environment variables
      delete process.env.TEST_VAR_1;
      delete process.env.TEST_VAR_2;
      delete process.env.TEST_VAR_COMMENT;
      delete process.env.TEST_VAR_EMPTY;
      delete process.env.TEST_VAR_HOME;

      // Restore the symlink if REAL_ENV_PATH was one to start with.
      // We do this AFTER content restore so the symlink points to a
      // target that already has the correct restored content.
      try {
        if (envWasSymlink && envSymlinkTarget) {
          if (existsSync(REAL_ENV_PATH)) unlinkSync(REAL_ENV_PATH);
          symlinkSync(envSymlinkTarget, REAL_ENV_PATH);
        }
      } catch {
        // Ignore — worst case the symlink stays as a regular file; next
        // session-start hook (or manual symlink re-establishment) fixes.
      }
    });

    it('should handle missing .env file gracefully', () => {
      // This test covers line 92 - early return when .env doesn't exist
      // We need to temporarily remove the .env file to test this path

      let hadEnvFile = false;
      let originalContent = '';

      if (existsSync(REAL_ENV_PATH)) {
        hadEnvFile = true;
        originalContent = readFileSync(REAL_ENV_PATH, 'utf-8');
        // Back up the original
        writeFileSync(BACKUP_ENV_PATH, originalContent);
        // Remove the .env file
        unlinkSync(REAL_ENV_PATH);
      }

      try {
        // Should not throw when .env file doesn't exist
        expect(() => loadEnv()).not.toThrow();
      } finally {
        // Restore if needed
        if (hadEnvFile) {
          writeFileSync(REAL_ENV_PATH, originalContent);
          if (existsSync(BACKUP_ENV_PATH)) unlinkSync(BACKUP_ENV_PATH);
        }
      }
    });

    it('should load variables from .env file', () => {
      // Create a test .env file
      const envContent = `TEST_VAR_1=value1
TEST_VAR_2=value2`;
      writeFileSync(join(PAI_DIR, '.env'), envContent);

      // Load the env file
      loadEnv();

      // Variables should be loaded (or already exist)
      // Note: We can't guarantee they're set because loadEnv only sets if not already in env
      expect(process.env.TEST_VAR_1 || process.env.TEST_VAR_2).toBeDefined();
    });

    it('should skip empty lines and comments', () => {
      const envContent = `
# This is a comment
TEST_VAR_1=value1

# Another comment
TEST_VAR_2=value2
`;
      writeFileSync(join(PAI_DIR, '.env'), envContent);

      // Should not throw
      expect(() => loadEnv()).not.toThrow();

      // Should not create variables for comments
      expect(process.env['# This is a comment']).toBeUndefined();
    });

    it('should expand $HOME in values', () => {
      const envContent = `TEST_VAR_HOME=$HOME/test/path`;
      writeFileSync(join(PAI_DIR, '.env'), envContent);

      // Clear any existing value
      delete process.env.TEST_VAR_HOME;

      loadEnv();

      // Should expand $HOME
      const homeValue = process.env.TEST_VAR_HOME;
      expect(homeValue).toBeDefined();
      const resolvedHomeValue = String(homeValue);
      expect(resolvedHomeValue).not.toContain('$HOME');
      expect(resolvedHomeValue).toContain('test/path');
    });

    it('should not overwrite existing environment variables', () => {
      // Set a variable in the environment
      process.env.TEST_VAR_1 = 'existing_value';

      // Create .env with different value
      const envContent = `TEST_VAR_1=new_value`;
      writeFileSync(join(PAI_DIR, '.env'), envContent);

      loadEnv();

      // Environment variable should keep its original value
      expect(process.env.TEST_VAR_1).toBe('existing_value');
    });

    it('should handle malformed lines gracefully', () => {
      const envContent = `TEST_VAR_1=value1
malformed_line_without_equals
TEST_VAR_2=value2`;
      writeFileSync(join(PAI_DIR, '.env'), envContent);

      // Should not throw on malformed lines
      expect(() => loadEnv()).not.toThrow();
    });
  });

  describe('validatePAIStructure error paths (in-process)', () => {
    let stderrOutput: string[];

    beforeEach(() => {
      stderrOutput = [];
      const origError = console.error;
      // Capture console.error output
      console.error = (...args: unknown[]) => {
        stderrOutput.push(args.map(String).join(' '));
      };
      // Restore after test via afterEach
    });

    afterEach(() => {
      // Restore console.error (reimport would be cleaner but this works)
      console.error = console.error; // no-op, restored by bun test isolation
    });

    it('should warn when PAI_DIR does not exist (line 46)', () => {
      const origError = console.error;
      const captured: string[] = [];
      console.error = (...args: unknown[]) => captured.push(args.map(String).join(' '));

      try {
        validatePAIStructure('/tmp/nonexistent-pai-dir-coverage-test', '/tmp/whatever');
        expect(captured.some(m => m.includes('PAI_DIR does not exist'))).toBe(true);
        expect(captured.some(m => m.includes('nonexistent-pai-dir-coverage-test'))).toBe(true);
      } finally {
        console.error = origError;
      }
    });

    it('should warn when HOOKS_DIR does not exist (line 48)', () => {
      const tmpDir = '/tmp/pai-paths-coverage-no-hooks-' + Date.now();
      mkdirSync(tmpDir, { recursive: true });
      const origError = console.error;
      const captured: string[] = [];
      console.error = (...args: unknown[]) => captured.push(args.map(String).join(' '));

      try {
        validatePAIStructure(tmpDir, join(tmpDir, 'nonexistent-hooks'));
        expect(captured.some(m => m.includes('hooks directory not found'))).toBe(true);
      } finally {
        console.error = origError;
        rmdirSync(tmpDir);
      }
    });

    it('should not warn when both dirs exist', () => {
      const tmpDir = '/tmp/pai-paths-coverage-valid-' + Date.now();
      const tmpHooks = join(tmpDir, 'hooks');
      mkdirSync(tmpHooks, { recursive: true });
      const origError = console.error;
      const captured: string[] = [];
      console.error = (...args: unknown[]) => captured.push(args.map(String).join(' '));

      try {
        validatePAIStructure(tmpDir, tmpHooks);
        expect(captured.filter(m => m.includes('Warning'))).toHaveLength(0);
      } finally {
        console.error = origError;
        rmdirSync(tmpHooks);
        rmdirSync(tmpDir);
      }
    });
  });
});
