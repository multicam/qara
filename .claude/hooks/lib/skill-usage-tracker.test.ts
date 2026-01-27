/**
 * Tests for skill-usage-tracker.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  recordSkillInvocation,
  getSkillUsageStats,
  getTopSkills,
  generateSkillUsageReport,
  detectSkillPatterns,
} from './skill-usage-tracker';
import { STATE_DIR } from './pai-paths';

const USAGE_LOG = join(STATE_DIR, 'skill-usage.jsonl');
const STATS_FILE = join(STATE_DIR, 'skill-usage-stats.json');

describe('Skill Usage Tracker', () => {
  let originalUsageLog: string | null = null;
  let originalStats: string | null = null;

  beforeEach(() => {
    // Backup existing files
    if (existsSync(USAGE_LOG)) {
      originalUsageLog = readFileSync(USAGE_LOG, 'utf-8');
    }
    if (existsSync(STATS_FILE)) {
      originalStats = readFileSync(STATS_FILE, 'utf-8');
    }

    // Clear files for fresh tests
    mkdirSync(STATE_DIR, { recursive: true });
    if (existsSync(USAGE_LOG)) rmSync(USAGE_LOG);
    if (existsSync(STATS_FILE)) rmSync(STATS_FILE);
  });

  afterEach(() => {
    // Restore original files
    if (originalUsageLog !== null) {
      writeFileSync(USAGE_LOG, originalUsageLog);
      originalUsageLog = null;
    } else if (existsSync(USAGE_LOG)) {
      rmSync(USAGE_LOG);
    }

    if (originalStats !== null) {
      writeFileSync(STATS_FILE, originalStats);
      originalStats = null;
    } else if (existsSync(STATS_FILE)) {
      rmSync(STATS_FILE);
    }
  });

  describe('recordSkillInvocation', () => {
    it('should create usage log file if not exists', () => {
      recordSkillInvocation({
        skill_name: 'test-skill',
        session_id: 'test-session',
        invoked_by: 'user',
      });

      expect(existsSync(USAGE_LOG)).toBe(true);
    });

    it('should append invocation to log file', () => {
      recordSkillInvocation({
        skill_name: 'skill-a',
        session_id: 'session-1',
        invoked_by: 'user',
      });

      recordSkillInvocation({
        skill_name: 'skill-b',
        session_id: 'session-1',
        invoked_by: 'auto',
      });

      const content = readFileSync(USAGE_LOG, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);

      const first = JSON.parse(lines[0]);
      const second = JSON.parse(lines[1]);

      expect(first.skill_name).toBe('skill-a');
      expect(second.skill_name).toBe('skill-b');
    });

    it('should include timestamp', () => {
      recordSkillInvocation({
        skill_name: 'test-skill',
        session_id: 'test',
        invoked_by: 'user',
      });

      const content = readFileSync(USAGE_LOG, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include optional args', () => {
      recordSkillInvocation({
        skill_name: 'commit',
        args: '-m "test message"',
        session_id: 'test',
        invoked_by: 'user',
      });

      const content = readFileSync(USAGE_LOG, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.args).toBe('-m "test message"');
    });

    it('should update stats file', () => {
      recordSkillInvocation({
        skill_name: 'tracked-skill',
        session_id: 'test',
        invoked_by: 'user',
      });

      expect(existsSync(STATS_FILE)).toBe(true);

      const stats = JSON.parse(readFileSync(STATS_FILE, 'utf-8'));
      expect(stats['tracked-skill']).toBeDefined();
      expect(stats['tracked-skill'].total_invocations).toBe(1);
    });
  });

  describe('getSkillUsageStats', () => {
    it('should return empty object if no stats file exists', () => {
      const stats = getSkillUsageStats();
      expect(stats).toEqual({});
    });

    it('should return stats from file', () => {
      // Create stats directly
      const testStats = {
        'skill-x': {
          skill_name: 'skill-x',
          total_invocations: 5,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 3,
          auto_invocations: 2,
        },
      };
      writeFileSync(STATS_FILE, JSON.stringify(testStats));

      const stats = getSkillUsageStats();

      expect(stats['skill-x']).toBeDefined();
      expect(stats['skill-x'].total_invocations).toBe(5);
      expect(stats['skill-x'].user_invocations).toBe(3);
    });
  });

  describe('getTopSkills', () => {
    it('should return empty array if no stats', () => {
      const top = getTopSkills();
      expect(top).toEqual([]);
    });

    it('should return skills sorted by total invocations', () => {
      const testStats = {
        'low-skill': {
          skill_name: 'low-skill',
          total_invocations: 2,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 1,
          auto_invocations: 1,
        },
        'high-skill': {
          skill_name: 'high-skill',
          total_invocations: 10,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 8,
          auto_invocations: 2,
        },
        'mid-skill': {
          skill_name: 'mid-skill',
          total_invocations: 5,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 3,
          auto_invocations: 2,
        },
      };
      writeFileSync(STATS_FILE, JSON.stringify(testStats));

      const top = getTopSkills(10);

      expect(top[0].skill_name).toBe('high-skill');
      expect(top[1].skill_name).toBe('mid-skill');
      expect(top[2].skill_name).toBe('low-skill');
    });

    it('should respect limit parameter', () => {
      const testStats: Record<string, any> = {};
      for (let i = 1; i <= 20; i++) {
        testStats[`skill-${i}`] = {
          skill_name: `skill-${i}`,
          total_invocations: i,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: i,
          auto_invocations: 0,
        };
      }
      writeFileSync(STATS_FILE, JSON.stringify(testStats));

      const top5 = getTopSkills(5);
      const top10 = getTopSkills(10);

      expect(top5.length).toBe(5);
      expect(top10.length).toBe(10);
    });
  });

  describe('generateSkillUsageReport', () => {
    it('should return message if no data available', () => {
      const report = generateSkillUsageReport();
      expect(report).toContain('No skill usage data');
    });

    it('should include total counts', () => {
      const testStats = {
        'skill-a': {
          skill_name: 'skill-a',
          total_invocations: 10,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 7,
          auto_invocations: 3,
        },
        'skill-b': {
          skill_name: 'skill-b',
          total_invocations: 5,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 2,
          auto_invocations: 3,
        },
      };
      writeFileSync(STATS_FILE, JSON.stringify(testStats));

      const report = generateSkillUsageReport();

      expect(report).toContain('Total skills tracked: 2');
      expect(report).toContain('Total invocations: 15');
    });

    it('should list skills by usage', () => {
      const testStats = {
        'commit': {
          skill_name: 'commit',
          total_invocations: 20,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 15,
          auto_invocations: 5,
        },
      };
      writeFileSync(STATS_FILE, JSON.stringify(testStats));

      const report = generateSkillUsageReport();

      expect(report).toContain('commit');
      expect(report).toContain('20');
    });

    it('should identify low usage skills', () => {
      const testStats = {
        'popular': {
          skill_name: 'popular',
          total_invocations: 50,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 40,
          auto_invocations: 10,
        },
        'rarely-used': {
          skill_name: 'rarely-used',
          total_invocations: 1,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 1,
          auto_invocations: 0,
        },
      };
      writeFileSync(STATS_FILE, JSON.stringify(testStats));

      const report = generateSkillUsageReport();

      expect(report).toContain('Low Usage Skills');
      expect(report).toContain('rarely-used');
    });
  });

  describe('detectSkillPatterns', () => {
    it('should return empty arrays if no data', () => {
      const patterns = detectSkillPatterns();

      expect(patterns.user_favorites).toEqual([]);
      expect(patterns.auto_suggestions_accepted).toEqual([]);
      expect(patterns.discovery_candidates).toEqual([]);
    });

    it('should identify user favorites', () => {
      const testStats = {
        'user-fav': {
          skill_name: 'user-fav',
          total_invocations: 10,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 8,
          auto_invocations: 2,
        },
        'auto-heavy': {
          skill_name: 'auto-heavy',
          total_invocations: 10,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 2,
          auto_invocations: 8,
        },
      };
      writeFileSync(STATS_FILE, JSON.stringify(testStats));

      const patterns = detectSkillPatterns();

      expect(patterns.user_favorites).toContain('user-fav');
      expect(patterns.user_favorites).not.toContain('auto-heavy');
    });

    it('should identify auto suggestions that led to user adoption', () => {
      const testStats = {
        'adopted': {
          skill_name: 'adopted',
          total_invocations: 10,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 3,
          auto_invocations: 7,
        },
      };
      writeFileSync(STATS_FILE, JSON.stringify(testStats));

      const patterns = detectSkillPatterns();

      expect(patterns.auto_suggestions_accepted).toContain('adopted');
    });

    it('should identify discovery candidates (low usage)', () => {
      const testStats = {
        'hidden-gem': {
          skill_name: 'hidden-gem',
          total_invocations: 1,
          last_invocation: '2026-01-27T10:00:00Z',
          first_invocation: '2026-01-20T10:00:00Z',
          user_invocations: 0,
          auto_invocations: 1,
        },
      };
      writeFileSync(STATS_FILE, JSON.stringify(testStats));

      const patterns = detectSkillPatterns();

      expect(patterns.discovery_candidates).toContain('hidden-gem');
    });
  });
});
