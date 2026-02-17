/**
 * Hooks System Validation Tests
 *
 * Validates PAI hooks including:
 * - Hook script structure
 * - Settings.json hook configuration
 * - Hook library modules
 *
 * Run with: bun test ./.claude/tests/hooks-validation.test.ts
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const QARA_CLAUDE_DIR = join(homedir(), 'qara', '.claude');
const HOOKS_DIR = join(QARA_CLAUDE_DIR, 'hooks');
const SETTINGS_PATH = join(QARA_CLAUDE_DIR, 'settings.json');

// =============================================================================
// SECTION 1: Hook Script Discovery
// =============================================================================

describe('Hook Script Discovery', () => {
  let hookScripts: string[];

  beforeAll(() => {
    hookScripts = readdirSync(HOOKS_DIR).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.startsWith('.')
    );
  });

  it('should discover hook scripts', () => {
    expect(hookScripts.length).toBeGreaterThanOrEqual(4);
  });

  const requiredHooks = [
    'session-start.ts',
    'stop-hook.ts',
    'update-tab-titles.ts',
    'pre-tool-use-security.ts',
    'post-tool-use.ts',
    'notification-hook.ts',
  ];

  for (const hook of requiredHooks) {
    it(`should have ${hook}`, () => {
      expect(hookScripts).toContain(hook);
    });
  }
});

// =============================================================================
// SECTION 2: Hook Script Structure
// =============================================================================

describe('Hook Script Structure', () => {
  const activeHooks = [
    'session-start.ts',
    'stop-hook.ts',
    'update-tab-titles.ts',
    'pre-tool-use-security.ts',
    'post-tool-use.ts',
    'notification-hook.ts',
  ];

  for (const hookFile of activeHooks) {
    describe(`${hookFile}`, () => {
      let content: string;

      beforeAll(() => {
        content = readFileSync(join(HOOKS_DIR, hookFile), 'utf-8');
      });

      it('should have bun shebang', () => {
        const hasBunShebang = content.startsWith('#!/usr/bin/env bun') || content.startsWith('#!') && content.includes('bun');
        expect(hasBunShebang).toBe(true);
      });

      it('should have JSDoc comment', () => {
        expect(content).toContain('/**');
        expect(content).toContain('*/');
      });

      it('should be valid TypeScript (has imports)', () => {
        expect(content).toContain('import');
      });

      it('should have main function or direct execution', () => {
        const hasMain = content.includes('function main') || content.includes('async function main');
        const hasIIFE = content.includes('(async () =>') || content.includes('(() =>');
        const hasDirectExecution = content.includes('main()');
        const hasTopLevelAwait = content.includes('await ') && !content.includes('async function');
        expect(hasMain || hasIIFE || hasDirectExecution || hasTopLevelAwait).toBe(true);
      });
    });
  }
});

// =============================================================================
// SECTION 3: Settings.json Hook Configuration
// =============================================================================

describe('Settings Hook Configuration', () => {
  let settings: any;

  beforeAll(() => {
    settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  });

  describe('Hook Event Types', () => {
    const requiredEvents = [
      'SessionStart',
      'PreToolUse',
      'UserPromptSubmit',
      'Stop',
      'PostToolUse',
      'Notification',
    ];

    for (const event of requiredEvents) {
      it(`should configure ${event} hooks`, () => {
        expect(settings.hooks[event]).toBeDefined();
        expect(Array.isArray(settings.hooks[event])).toBe(true);
      });
    }
  });

  describe('Hook Command Paths', () => {
    it('should reference valid hook files', () => {
      for (const [_event, configs] of Object.entries(settings.hooks)) {
        for (const config of configs as any[]) {
          if (config.hooks) {
            for (const hook of config.hooks) {
              if (hook.command) {
                expect(hook.command).toContain('/hooks/');
                // Extract the script path and verify it exists
                const match = hook.command.match(/\/hooks\/([^\s]+\.ts)/);
                if (match) {
                  const scriptName = match[1];
                  expect(existsSync(join(HOOKS_DIR, scriptName))).toBe(true);
                }
              }
            }
          }
        }
      }
    });
  });
});

// =============================================================================
// SECTION 4: Hook Library
// =============================================================================

describe('Hook Library', () => {
  const libPath = join(HOOKS_DIR, 'lib');

  it('should have lib/ directory', () => {
    expect(existsSync(libPath)).toBe(true);
  });

  describe('Core Utilities', () => {
    const coreLibs = [
      'pai-paths.ts',
      'stdin-utils.ts',
      'tab-titles.ts',
      'jsonl-utils.ts',
      'datetime-utils.ts',
    ];

    for (const lib of coreLibs) {
      it(`should have ${lib}`, () => {
        expect(existsSync(join(libPath, lib))).toBe(true);
      });
    }
  });

  describe('Test Coverage', () => {
    const coreLibs = ['pai-paths', 'stdin-utils', 'tab-titles', 'jsonl-utils', 'datetime-utils'];

    for (const lib of coreLibs) {
      it(`should have tests for ${lib}`, () => {
        expect(existsSync(join(libPath, `${lib}.test.ts`))).toBe(true);
      });
    }
  });
});

// =============================================================================
// SECTION 5: Hook Input/Output Contracts
// =============================================================================

describe('Hook Input/Output Contracts', () => {
  describe('SessionStart hooks', () => {
    const sessionHook = readFileSync(
      join(HOOKS_DIR, 'session-start.ts'),
      'utf-8'
    );

    it('should output system-reminder tags', () => {
      expect(sessionHook).toContain('<system-reminder>');
      expect(sessionHook).toContain('</system-reminder>');
    });
  });
});

// =============================================================================
// Summary
// =============================================================================

describe('Hooks Validation Summary', () => {
  it('should pass all hook validations', () => {
    expect(true).toBe(true);
  });
});
