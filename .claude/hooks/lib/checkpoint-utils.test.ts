/**
 * Tests for checkpoint-utils.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import {
  logCheckpointEvent,
  checkAndLogDestructive,
  trackErrorAndSuggestRecovery,
  detectIterationLoop,
  DESTRUCTIVE_PATTERNS,
  ERROR_THRESHOLDS,
  type CheckpointEventType,
} from './checkpoint-utils';
import { STATE_DIR } from './pai-paths';

const CHECKPOINT_LOG = join(STATE_DIR, 'checkpoint-events.jsonl');
const BACKUP_FILE = CHECKPOINT_LOG + '.backup';

describe('Checkpoint Utils', () => {
  let originalContent: string | null = null;

  beforeEach(() => {
    // Backup existing file if it exists
    if (existsSync(CHECKPOINT_LOG)) {
      originalContent = readFileSync(CHECKPOINT_LOG, 'utf-8');
      rmSync(CHECKPOINT_LOG);
    }
  });

  afterEach(() => {
    // Restore original content
    if (originalContent !== null) {
      mkdirSync(dirname(CHECKPOINT_LOG), { recursive: true });
      Bun.write(CHECKPOINT_LOG, originalContent);
      originalContent = null;
    } else if (existsSync(CHECKPOINT_LOG)) {
      rmSync(CHECKPOINT_LOG);
    }
  });

  describe('DESTRUCTIVE_PATTERNS', () => {
    it('should detect rm commands', () => {
      const rmPattern = DESTRUCTIVE_PATTERNS.find((p) => p.operation === 'file deletion');
      expect(rmPattern).toBeDefined();
      expect(rmPattern!.pattern.test('rm -rf /tmp/test')).toBe(true);
      expect(rmPattern!.pattern.test('rm file.txt')).toBe(true);
      expect(rmPattern!.pattern.test('rm -r directory')).toBe(true);
    });

    it('should detect git reset --hard', () => {
      const pattern = DESTRUCTIVE_PATTERNS.find((p) => p.operation === 'git hard reset');
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test('git reset --hard HEAD~1')).toBe(true);
      expect(pattern!.pattern.test('git reset --hard')).toBe(true);
      expect(pattern!.pattern.test('git reset --soft HEAD')).toBe(false);
    });

    it('should detect git force push', () => {
      const pattern = DESTRUCTIVE_PATTERNS.find((p) => p.operation === 'git force push');
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test('git push --force')).toBe(true);
      expect(pattern!.pattern.test('git push origin main --force')).toBe(true);
      expect(pattern!.pattern.test('git push')).toBe(false);
    });

    it('should detect database DROP statements', () => {
      const pattern = DESTRUCTIVE_PATTERNS.find((p) => p.operation === 'database drop');
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test('DROP TABLE users')).toBe(true);
      expect(pattern!.pattern.test('DROP DATABASE mydb')).toBe(true);
      expect(pattern!.pattern.test('SELECT * FROM users')).toBe(false);
    });

    it('should detect TRUNCATE statements', () => {
      const pattern = DESTRUCTIVE_PATTERNS.find((p) => p.operation === 'table truncation');
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test('TRUNCATE TABLE logs')).toBe(true);
      expect(pattern!.pattern.test('truncate table audit')).toBe(true);
    });

    it('should detect DELETE without WHERE', () => {
      const pattern = DESTRUCTIVE_PATTERNS.find((p) => p.operation === 'delete without WHERE');
      expect(pattern).toBeDefined();
      expect(pattern!.pattern.test('DELETE FROM users;')).toBe(true);
      expect(pattern!.pattern.test('DELETE FROM logs')).toBe(true);
      // Note: The pattern is simple and may match some WHERE clauses too
    });
  });

  describe('ERROR_THRESHOLDS', () => {
    it('should have sensible threshold values', () => {
      expect(ERROR_THRESHOLDS.SUGGEST_REWIND).toBe(3);
      expect(ERROR_THRESHOLDS.ITERATION_WARNING).toBe(3);
      expect(ERROR_THRESHOLDS.MAX_ITERATIONS).toBe(5);
      expect(ERROR_THRESHOLDS.MAX_ITERATIONS).toBeGreaterThan(ERROR_THRESHOLDS.ITERATION_WARNING);
    });
  });

  describe('logCheckpointEvent', () => {
    it('should create checkpoint log file', () => {
      logCheckpointEvent('manual_checkpoint', { operation: 'test' });

      expect(existsSync(CHECKPOINT_LOG)).toBe(true);
    });

    it('should log event with timestamp', () => {
      logCheckpointEvent('pre_destructive', { operation: 'rm -rf' });

      const content = readFileSync(CHECKPOINT_LOG, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(entry.event).toBe('pre_destructive');
      expect(entry.operation).toBe('rm -rf');
    });

    it('should include session_id from environment', () => {
      const originalSessionId = process.env.SESSION_ID;
      process.env.SESSION_ID = 'test-session-123';

      logCheckpointEvent('iteration_warning', { error_count: 3 });

      const content = readFileSync(CHECKPOINT_LOG, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.session_id).toBe('test-session-123');

      if (originalSessionId) {
        process.env.SESSION_ID = originalSessionId;
      } else {
        delete process.env.SESSION_ID;
      }
    });

    it('should log different event types', () => {
      const eventTypes: CheckpointEventType[] = [
        'pre_destructive',
        'iteration_warning',
        'recovery_suggested',
        'error_threshold',
        'manual_checkpoint',
      ];

      eventTypes.forEach((event) => {
        logCheckpointEvent(event, { operation: event });
      });

      const content = readFileSync(CHECKPOINT_LOG, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(5);
      lines.forEach((line, i) => {
        const entry = JSON.parse(line);
        expect(entry.event).toBe(eventTypes[i]);
      });
    });
  });

  describe('checkAndLogDestructive', () => {
    it('should return true and log for destructive commands', () => {
      const result = checkAndLogDestructive('rm -rf /tmp/test');

      expect(result).toBe(true);
      expect(existsSync(CHECKPOINT_LOG)).toBe(true);
    });

    it('should return false for safe commands', () => {
      const result = checkAndLogDestructive('ls -la');

      expect(result).toBe(false);
    });

    it('should detect all destructive pattern types', () => {
      const commands = [
        'rm -rf /tmp',
        'git reset --hard HEAD',
        'git push --force',
        'git clean -fd',
        'DROP TABLE users',
        'TRUNCATE TABLE logs',
        'DELETE FROM users;',
      ];

      commands.forEach((cmd) => {
        // Clear the log before each check
        if (existsSync(CHECKPOINT_LOG)) {
          rmSync(CHECKPOINT_LOG);
        }
        const result = checkAndLogDestructive(cmd);
        expect(result).toBe(true);
      });
    });

    it('should truncate long commands in log', () => {
      const longCommand = 'rm -rf ' + 'a'.repeat(300);
      checkAndLogDestructive(longCommand);

      const content = readFileSync(CHECKPOINT_LOG, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.context.command.length).toBeLessThanOrEqual(200);
    });
  });

  describe('trackErrorAndSuggestRecovery', () => {
    it('should return null when below threshold', () => {
      const result = trackErrorAndSuggestRecovery('ENOENT', 1);
      expect(result).toBeNull();

      const result2 = trackErrorAndSuggestRecovery('ENOENT', 2);
      expect(result2).toBeNull();
    });

    it('should return suggestion at threshold', () => {
      const result = trackErrorAndSuggestRecovery('ENOENT', 3);

      expect(result).not.toBeNull();
      expect(result).toContain('/rewind');
      expect(result).toContain('3');
    });

    it('should return suggestion above threshold', () => {
      const result = trackErrorAndSuggestRecovery('ENOENT', 5);

      expect(result).not.toBeNull();
      expect(result).toContain('/rewind');
      expect(result).toContain('5');
    });

    it('should log recovery suggestion event', () => {
      trackErrorAndSuggestRecovery('TEST_ERROR', 4);

      const content = readFileSync(CHECKPOINT_LOG, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe('recovery_suggested');
      expect(entry.error_count).toBe(4);
      expect(entry.context.error_type).toBe('TEST_ERROR');
    });
  });

  describe('detectIterationLoop', () => {
    it('should not warn below warning threshold', () => {
      const result = detectIterationLoop(2, 'testing');

      expect(result.warn).toBe(false);
      expect(result.stop).toBe(false);
      expect(result.suggestion).toBeNull();
    });

    it('should warn at warning threshold', () => {
      const result = detectIterationLoop(3, 'testing');

      expect(result.warn).toBe(true);
      expect(result.stop).toBe(false);
      expect(result.suggestion).toContain('Warning');
      expect(result.suggestion).toContain('/rewind');
    });

    it('should stop at max iterations', () => {
      const result = detectIterationLoop(5, 'testing');

      expect(result.warn).toBe(true);
      expect(result.stop).toBe(true);
      expect(result.suggestion).toContain('STOP');
      expect(result.suggestion).toContain('/rewind');
    });

    it('should log iteration warning events', () => {
      detectIterationLoop(4, 'test context');

      const content = readFileSync(CHECKPOINT_LOG, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe('iteration_warning');
      expect(entry.error_count).toBe(4);
      expect(entry.context.description).toBe('test context');
    });

    it('should include iteration count in suggestion', () => {
      const result3 = detectIterationLoop(3, 'test');
      const result5 = detectIterationLoop(5, 'test');

      expect(result3.suggestion).toContain('3');
      expect(result5.suggestion).toContain('5');
    });
  });
});
