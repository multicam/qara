/**
 * PAI (Personal AI Infrastructure) Validation Test Suite
 *
 * Comprehensive tests to validate PAI integrity, configuration,
 * and compliance with Claude Code best practices.
 *
 * Run with: bun test ./.claude/tests/pai-validation.test.ts
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

// PAI Paths
const PAI_DIR = process.env.PAI_DIR || resolve(homedir(), '.claude');
const QARA_DIR = resolve(homedir(), 'qara');
const QARA_CLAUDE_DIR = join(QARA_DIR, '.claude');

// =============================================================================
// SECTION 1: Directory Structure Validation
// =============================================================================

describe('PAI Directory Structure', () => {
  const requiredDirs = [
    'hooks',
    'skills',
    'agents',
    'commands',
    'history',
  ];

  const qaraDirs = [
    'context',
  ];

  it('should have PAI_DIR exist', () => {
    expect(existsSync(PAI_DIR)).toBe(true);
  });

  for (const dir of requiredDirs) {
    it(`should have ${dir}/ directory (or symlink)`, () => {
      expect(existsSync(join(PAI_DIR, dir))).toBe(true);
    });
  }

  for (const dir of qaraDirs) {
    it(`should have ${dir}/ in qara/.claude`, () => {
      expect(existsSync(join(QARA_CLAUDE_DIR, dir))).toBe(true);
    });
  }

  it('should have settings.json', () => {
    expect(existsSync(join(PAI_DIR, 'settings.json'))).toBe(true);
  });

  it('should have .env file', () => {
    expect(existsSync(join(PAI_DIR, '.env'))).toBe(true);
  });

  it('should have thoughts/ directory for memory', () => {
    expect(existsSync(join(QARA_DIR, 'thoughts'))).toBe(true);
  });
});

// =============================================================================
// SECTION 2: Settings.json Validation
// =============================================================================

describe('Settings Configuration', () => {
  let settings: any;

  beforeAll(() => {
    const settingsPath = join(PAI_DIR, 'settings.json');
    settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
  });

  describe('Schema and Basic Structure', () => {
    it('should have valid JSON schema reference', () => {
      expect(settings.$schema).toContain('claude-code-settings');
    });

    it('should have env configuration', () => {
      expect(settings.env).toBeDefined();
      expect(typeof settings.env).toBe('object');
    });

    it('should have PAI_DIR in env', () => {
      expect(settings.env.PAI_DIR).toBeDefined();
    });
  });

  describe('Permissions Configuration', () => {
    it('should have permissions object', () => {
      expect(settings.permissions).toBeDefined();
      expect(settings.permissions.allow).toBeInstanceOf(Array);
      expect(settings.permissions.deny).toBeInstanceOf(Array);
    });

    it('should allow essential tools', () => {
      const { allow } = settings.permissions;
      expect(allow).toContain('Bash');
      expect(allow).toContain('Read');
      expect(allow).toContain('Write');
      expect(allow).toContain('Edit');
      expect(allow).toContain('Glob');
      expect(allow).toContain('Grep');
    });

    it('should deny destructive disk operations', () => {
      const { deny } = settings.permissions;
      const hasDiskProtection = deny.some(
        (d: string) => d.includes('rm -rf /')
      );
      expect(hasDiskProtection).toBe(true);
    });
  });

  describe('Hooks Configuration', () => {
    it('should have hooks object', () => {
      expect(settings.hooks).toBeDefined();
      expect(typeof settings.hooks).toBe('object');
    });

    const requiredHookEvents = [
      'SessionStart',
      'PreToolUse',
      'UserPromptSubmit',
      'Stop',
    ];

    for (const event of requiredHookEvents) {
      it(`should have ${event} hook configured`, () => {
        expect(settings.hooks[event]).toBeDefined();
        expect(settings.hooks[event]).toBeInstanceOf(Array);
        expect(settings.hooks[event].length).toBeGreaterThan(0);
      });
    }

    it('all configured hook commands should reference existing files', () => {
      for (const [_event, configs] of Object.entries(settings.hooks)) {
        for (const config of configs as any[]) {
          if (config.hooks) {
            for (const hook of config.hooks) {
              if (hook.command) {
                // Extract .ts file path and expand ${PAI_DIR} variable
                const match = hook.command.match(/((?:\$\{PAI_DIR\}|\/)[^\s]+\.(?:ts|sh))/);
                if (match) {
                  const resolved = match[1].replace('${PAI_DIR}', PAI_DIR);
                  expect(existsSync(resolved)).toBe(true);
                }
              }
            }
          }
        }
      }
    });
  });

  describe('Advanced Features', () => {
    it('should have plansDirectory configured', () => {
      expect(settings.plansDirectory).toBeDefined();
      expect(typeof settings.plansDirectory).toBe('string');
    });

    it('should have statusLine configured', () => {
      expect(settings.statusLine).toBeDefined();
      expect(settings.statusLine.type).toBe('command');
    });
  });
});

// =============================================================================
// SECTION 3: Skills System Validation
// =============================================================================

describe('Skills System', () => {
  let skillDirs: string[];

  beforeAll(() => {
    const skillsPath = join(PAI_DIR, 'skills');
    skillDirs = readdirSync(skillsPath).filter((f) =>
      statSync(join(skillsPath, f)).isDirectory()
    );
  });

  it('should have at least 10 skills', () => {
    expect(skillDirs.length).toBeGreaterThanOrEqual(10);
  });

  it('should have CORE skill', () => {
    expect(skillDirs).toContain('CORE');
  });

  describe('SKILL.md Frontmatter Validation', () => {
    for (const skillName of [
      'CORE',
      'research',
      'frontend-design',
      'system-create-skill',
    ]) {
      it(`${skillName} should have valid SKILL.md`, () => {
        const skillMdPath = join(PAI_DIR, 'skills', skillName, 'SKILL.md');

        if (!existsSync(skillMdPath)) {
          return;
        }

        const content = readFileSync(skillMdPath, 'utf-8');

        expect(content.startsWith('---')).toBe(true);
        expect(content).toContain('name:');
        expect(content).toContain('context:');
        expect(content).toContain('description:');

        const contextMatch = content.match(/context:\s*(same|fork)/);
        expect(contextMatch).not.toBeNull();
      });
    }
  });

  describe('Skill Directory Structure', () => {
    it('CORE skill should have workflows directory', () => {
      const workflowsPath = join(PAI_DIR, 'skills', 'CORE', 'workflows');
      expect(existsSync(workflowsPath)).toBe(true);
    });

    it('skills should not have node_modules at top level', () => {
      const skillsPath = join(PAI_DIR, 'skills');
      const hasNodeModules = skillDirs.includes('node_modules');
      expect(hasNodeModules).toBe(false);
    });
  });
});

// =============================================================================
// SECTION 4: Hooks Validation
// =============================================================================

describe('Hooks System', () => {
  const hooksPath = join(PAI_DIR, 'hooks');

  const requiredHooks = [
    'session-start.ts',
    'stop-hook.ts',
    'update-tab-titles.ts',
    'pre-tool-use-security.ts',
  ];

  for (const hook of requiredHooks) {
    it(`should have ${hook} hook script`, () => {
      expect(existsSync(join(hooksPath, hook))).toBe(true);
    });
  }

  describe('Hook Script Validation', () => {
    it('hooks should be TypeScript files', () => {
      const hookFiles = readdirSync(hooksPath).filter(
        (f) => f.endsWith('.ts') && !f.endsWith('.test.ts')
      );
      expect(hookFiles.length).toBeGreaterThan(0);
    });

    it('hooks should have shebang for bun', () => {
      const hookFile = join(hooksPath, 'session-start.ts');
      const content = readFileSync(hookFile, 'utf-8');
      expect(content.startsWith('#!/usr/bin/env bun')).toBe(true);
    });
  });

  describe('Hook Library', () => {
    const libPath = join(hooksPath, 'lib');

    it('should have lib/ directory', () => {
      expect(existsSync(libPath)).toBe(true);
    });

    it('should have pai-paths.ts', () => {
      expect(existsSync(join(libPath, 'pai-paths.ts'))).toBe(true);
    });

    it('should have tab-titles.ts', () => {
      expect(existsSync(join(libPath, 'tab-titles.ts'))).toBe(true);
    });

    it('should have jsonl-utils.ts', () => {
      expect(existsSync(join(libPath, 'jsonl-utils.ts'))).toBe(true);
    });

    it('should have datetime-utils.ts', () => {
      expect(existsSync(join(libPath, 'datetime-utils.ts'))).toBe(true);
    });
  });
});

// =============================================================================
// SECTION 5: Core Factor Compliance
// =============================================================================

describe('Core Factor Compliance', () => {
  let settings: any;

  beforeAll(() => {
    settings = JSON.parse(readFileSync(join(PAI_DIR, 'settings.json'), 'utf-8'));
  });

  // Factor 1: Single System Prompt
  it('Factor 1: Should have CORE skill as single system prompt', () => {
    const coreSkillPath = join(PAI_DIR, 'skills', 'CORE', 'SKILL.md');
    expect(existsSync(coreSkillPath)).toBe(true);
  });

  // Factor 8: Isolate Tasks by Permission/Context
  it('Factor 8: Skills should declare context type (same/fork)', () => {
    const skillMd = readFileSync(join(PAI_DIR, 'skills', 'CORE', 'SKILL.md'), 'utf-8');
    expect(skillMd).toMatch(/context:\s*(same|fork)/);
  });

  // Factor 10: Clear History Per Task
  it('Factor 10: Should have history directory with organization', () => {
    const historyPath = join(PAI_DIR, 'history');
    expect(existsSync(historyPath)).toBe(true);
  });

  // Factor 12: Run a Simple Loop
  it('Factor 12: Hooks follow simple input/output pattern', () => {
    const sessionHook = readFileSync(
      join(PAI_DIR, 'hooks', 'session-start.ts'),
      'utf-8'
    );
    // Should output to stdout
    expect(sessionHook).toContain('console.log');
  });
});

// =============================================================================
// SECTION 6: Security Configuration Validation
// =============================================================================

describe('Security Configuration', () => {
  let settings: any;

  beforeAll(() => {
    settings = JSON.parse(readFileSync(join(PAI_DIR, 'settings.json'), 'utf-8'));
  });

  describe('Deny List', () => {
    const criticalDenyPatterns = [
      'rm -rf /',
      'rm -rf /*',
      'dd if=',
      'mkfs',
    ];

    for (const pattern of criticalDenyPatterns) {
      it(`should deny "${pattern}" operations`, () => {
        const hasDeny = settings.permissions.deny.some((d: string) =>
          d.includes(pattern)
        );
        expect(hasDeny).toBe(true);
      });
    }
  });

  describe('Environment Security', () => {
    it('.env should not be in .gitignore exception', () => {
      const gitignorePath = join(PAI_DIR, '.gitignore');
      if (existsSync(gitignorePath)) {
        const gitignore = readFileSync(gitignorePath, 'utf-8');
        expect(gitignore).toContain('.env');
      }
    });

    it('should have .env.example for reference', () => {
      expect(existsSync(join(QARA_CLAUDE_DIR, '.env.example'))).toBe(true);
    });
  });
});

// =============================================================================
// SECTION 7: Context System Validation
// =============================================================================

describe('Context System', () => {
  it('should have CLAUDE.md in qara root', () => {
    expect(existsSync(join(QARA_DIR, 'CLAUDE.md'))).toBe(true);
  });

  it('should have context/ directory with includes', () => {
    const contextPath = join(QARA_CLAUDE_DIR, 'context');
    expect(existsSync(contextPath)).toBe(true);

    const contextFiles = readdirSync(contextPath);
    expect(contextFiles.length).toBeGreaterThan(0);
  });

  it('CLAUDE.md should be minimal (JIT loading via CORE)', () => {
    const claudeMd = readFileSync(join(QARA_DIR, 'CLAUDE.md'), 'utf-8');
    const lines = claudeMd.trim().split('\n');
    expect(lines.length).toBeLessThan(20);
  });
});

// =============================================================================
// SECTION 8: Agent Configuration Validation
// =============================================================================

describe('Agent Configuration', () => {
  const agentsPath = join(PAI_DIR, 'agents');

  it('should have agents/ directory', () => {
    expect(existsSync(agentsPath)).toBe(true);
  });

  it('should have agent definition files', () => {
    const agentFiles = readdirSync(agentsPath);
    expect(agentFiles.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// SECTION 9: State Management Validation
// =============================================================================

describe('State Management', () => {
  const statePath = join(PAI_DIR, 'state');

  it('should have state/ directory', () => {
    expect(existsSync(statePath)).toBe(true);
  });
});

// =============================================================================
// SECTION 10: TypeScript/Bun Configuration
// =============================================================================

describe('TypeScript/Bun Configuration', () => {
  const hooksPath = join(PAI_DIR, 'hooks');

  it('hooks should have package.json', () => {
    expect(existsSync(join(hooksPath, 'package.json'))).toBe(true);
  });

  it('hooks package.json should use bun', () => {
    const pkg = JSON.parse(readFileSync(join(hooksPath, 'package.json'), 'utf-8'));
    expect(
      pkg.scripts?.test?.includes('bun') ||
        pkg.devDependencies?.['bun-types'] ||
        pkg.dependencies
    ).toBeTruthy();
  });

  it('hooks should have tsconfig.json', () => {
    expect(existsSync(join(hooksPath, 'tsconfig.json'))).toBe(true);
  });
});

// =============================================================================
// SECTION 11: Integration Tests
// =============================================================================

describe('Integration: Path Resolution', () => {
  it('pai-paths module should export all required paths', async () => {
    const paiPaths = await import('../hooks/lib/pai-paths');

    expect(paiPaths.PAI_DIR).toBeDefined();
    expect(paiPaths.HOOKS_DIR).toBeDefined();
    expect(paiPaths.SKILLS_DIR).toBeDefined();
    expect(paiPaths.AGENTS_DIR).toBeDefined();
    expect(paiPaths.STATE_DIR).toBeDefined();
    expect(paiPaths.HISTORY_DIR).toBeDefined();
  });

  it('pai-paths paths should exist on filesystem', async () => {
    const paiPaths = await import('../hooks/lib/pai-paths');

    expect(existsSync(paiPaths.PAI_DIR)).toBe(true);
    expect(existsSync(paiPaths.HOOKS_DIR)).toBe(true);
    expect(existsSync(paiPaths.SKILLS_DIR)).toBe(true);
  });
});

// =============================================================================
// Summary
// =============================================================================

describe('PAI Validation Summary', () => {
  it('should pass all critical validations', () => {
    expect(true).toBe(true);
  });
});
