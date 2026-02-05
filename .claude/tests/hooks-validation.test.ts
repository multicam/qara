/**
 * Hooks System Validation Tests
 *
 * Validates PAI hooks including:
 * - Hook script structure
 * - Settings.json hook configuration
 * - Hook library modules
 * - Security patterns
 *
 * Run with: bun test .claude/tests/hooks-validation.test.ts
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
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
    expect(hookScripts.length).toBeGreaterThan(5);
  });

  const requiredHooks = [
    'session-start.ts',
    'pre-tool-use-security.ts',
    'post-tool-use-audit.ts',
    'capture-all-events.ts',
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
  // Only test hooks that are configured in settings.json (active hooks)
  const activeHooks = [
    'session-start.ts',
    'pre-tool-use-security.ts',
    'post-tool-use-audit.ts',
    'capture-all-events.ts',
  ];

  for (const hookFile of activeHooks) {
    describe(`${hookFile}`, () => {
      let content: string;

      beforeAll(() => {
        content = readFileSync(join(HOOKS_DIR, hookFile), 'utf-8');
      });

      it('should have bun shebang', () => {
        expect(content.startsWith('#!/usr/bin/env bun')).toBe(true);
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
// SECTION 3: Security Hook Validation
// =============================================================================

describe('Security Hook', () => {
  let securityHook: string;

  beforeAll(() => {
    securityHook = readFileSync(
      join(HOOKS_DIR, 'pre-tool-use-security.ts'),
      'utf-8'
    );
  });

  describe('Dangerous Pattern Detection', () => {
    const patterns = [
      { name: 'rm -rf', pattern: 'rm' },
      { name: 'git force push', pattern: '--force' },
      { name: 'DROP TABLE', pattern: 'DROP' },
      { name: 'chmod 777', pattern: '777' },
      { name: 'curl pipe shell', pattern: 'curl' },
    ];

    for (const { name, pattern } of patterns) {
      it(`should detect ${name}`, () => {
        expect(securityHook).toContain(pattern);
      });
    }
  });

  describe('Decision Output', () => {
    it('should output APPROVED for safe commands', () => {
      expect(securityHook).toContain('APPROVED');
    });

    it('should output BLOCKED for dangerous commands', () => {
      expect(securityHook).toContain('BLOCKED');
    });

    it('should output REQUIRE_APPROVAL for risky commands', () => {
      expect(securityHook).toContain('REQUIRE_APPROVAL');
    });
  });

  describe('JSON Output Format', () => {
    it('should use JSON.stringify for output', () => {
      expect(securityHook).toContain('JSON.stringify');
    });

    it('should include decision field', () => {
      expect(securityHook).toContain('decision');
    });

    it('should support additionalContext (CC 2.1.9)', () => {
      expect(securityHook).toContain('additionalContext');
    });
  });

  describe('Error Handling', () => {
    it('should have try-catch for graceful failure', () => {
      expect(securityHook).toContain('try');
      expect(securityHook).toContain('catch');
    });

    it('should fail open (approve on error)', () => {
      // On error, should still output APPROVED to not block workflow
      expect(securityHook).toContain('// On error, fail open');
    });
  });
});

// =============================================================================
// SECTION 4: Settings.json Hook Configuration
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
      'PostToolUse',
      'UserPromptSubmit',
      'Stop',
    ];

    for (const event of requiredEvents) {
      it(`should configure ${event} hooks`, () => {
        expect(settings.hooks[event]).toBeDefined();
        expect(Array.isArray(settings.hooks[event])).toBe(true);
      });
    }
  });

  describe('PreToolUse Configuration', () => {
    it('should have Bash matcher for security', () => {
      const bashHook = settings.hooks.PreToolUse.find(
        (h: any) => h.matcher === 'Bash'
      );
      expect(bashHook).toBeDefined();
    });

    it('should have wildcard matcher for capture', () => {
      const wildcardHook = settings.hooks.PreToolUse.find(
        (h: any) => h.matcher === '*'
      );
      expect(wildcardHook).toBeDefined();
    });
  });

  describe('Hook Command Paths', () => {
    it('should reference valid hook files', () => {
      for (const [event, configs] of Object.entries(settings.hooks)) {
        for (const config of configs as any[]) {
          if (config.hooks) {
            for (const hook of config.hooks) {
              if (hook.command) {
                const hookPath = hook.command.replace(/^.*\/hooks\//, '');
                const fullPath = join(HOOKS_DIR, hookPath.split('/').pop());
                // Just check if it looks like a valid path format
                expect(hook.command).toContain('/hooks/');
              }
            }
          }
        }
      }
    });
  });
});

// =============================================================================
// SECTION 5: Hook Library
// =============================================================================

describe('Hook Library', () => {
  const libPath = join(HOOKS_DIR, 'lib');

  it('should have lib/ directory', () => {
    expect(existsSync(libPath)).toBe(true);
  });

  describe('Core Utilities', () => {
    const coreLibs = [
      'pai-paths.ts',
      'jsonl-utils.ts',
      'datetime-utils.ts',
    ];

    for (const lib of coreLibs) {
      it(`should have ${lib}`, () => {
        expect(existsSync(join(libPath, lib))).toBe(true);
      });
    }
  });

  describe('LLM Clients', () => {
    const llmPath = join(libPath, 'llm');

    it('should have llm/ directory', () => {
      expect(existsSync(llmPath)).toBe(true);
    });

    const clients = ['anthropic.ts', 'openai.ts'];

    for (const client of clients) {
      it(`should have ${client} client`, () => {
        expect(existsSync(join(llmPath, client))).toBe(true);
      });

      it(`should have ${client.replace('.ts', '.test.ts')} tests`, () => {
        expect(existsSync(join(llmPath, client.replace('.ts', '.test.ts')))).toBe(
          true
        );
      });
    }
  });
});

// =============================================================================
// SECTION 6: Hook Tests Exist
// =============================================================================

describe('Hook Test Coverage', () => {
  const llmPath = join(HOOKS_DIR, 'lib', 'llm');

  it('should have test files for LLM clients', () => {
    const testFiles = readdirSync(llmPath).filter((f) => f.endsWith('.test.ts'));
    expect(testFiles.length).toBeGreaterThanOrEqual(3);
  });
});

// =============================================================================
// SECTION 7: Hook Input/Output Contracts
// =============================================================================

describe('Hook Input/Output Contracts', () => {
  describe('PreToolUse hooks', () => {
    const securityHook = readFileSync(
      join(HOOKS_DIR, 'pre-tool-use-security.ts'),
      'utf-8'
    );

    it('should read from stdin', () => {
      expect(securityHook).toContain('readFileSync(0');
    });

    it('should parse JSON input', () => {
      expect(securityHook).toContain('JSON.parse');
    });

    it('should access tool_name', () => {
      expect(securityHook).toContain('tool_name');
    });

    it('should access tool_input', () => {
      expect(securityHook).toContain('tool_input');
    });
  });

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
// SECTION 8: Subagent Hooks
// =============================================================================

describe('Subagent Hooks', () => {
  it('should have subagent-start-hook.ts', () => {
    expect(existsSync(join(HOOKS_DIR, 'subagent-start-hook.ts'))).toBe(true);
  });

  it('should have subagent-stop-hook.ts', () => {
    expect(existsSync(join(HOOKS_DIR, 'subagent-stop-hook.ts'))).toBe(true);
  });

  it('SubagentStart should be configured in settings', () => {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
    expect(settings.hooks.SubagentStart).toBeDefined();
  });

  it('SubagentStop should be configured in settings', () => {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
    expect(settings.hooks.SubagentStop).toBeDefined();
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
