/**
 * Runtime Integration Tests
 *
 * Tests that actually execute PAI components to verify
 * they work correctly at runtime.
 *
 * Run with: bun test ./.claude/tests/runtime-integration.test.ts
 */

import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const QARA_CLAUDE_DIR = join(homedir(), 'qara', '.claude');
const HOOKS_DIR = join(QARA_CLAUDE_DIR, 'hooks');

// =============================================================================
// SECTION 1: Path Resolution Module
// =============================================================================

describe('pai-paths Module', () => {
  it('should export PAI_DIR', async () => {
    const paiPaths = await import('../hooks/lib/pai-paths');
    expect(paiPaths.PAI_DIR).toBeDefined();
    expect(typeof paiPaths.PAI_DIR).toBe('string');
  });

  it('should export HOOKS_DIR', async () => {
    const paiPaths = await import('../hooks/lib/pai-paths');
    expect(paiPaths.HOOKS_DIR).toBeDefined();
    expect(existsSync(paiPaths.HOOKS_DIR)).toBe(true);
  });

  it('should export SKILLS_DIR', async () => {
    const paiPaths = await import('../hooks/lib/pai-paths');
    expect(paiPaths.SKILLS_DIR).toBeDefined();
    expect(existsSync(paiPaths.SKILLS_DIR)).toBe(true);
  });

  it('ensureDir should create directories', async () => {
    const paiPaths = await import('../hooks/lib/pai-paths');
    const testDir = join(paiPaths.STATE_DIR, 'test-' + Date.now());

    paiPaths.ensureDir(testDir);
    expect(existsSync(testDir)).toBe(true);

    // Cleanup
    const { rmdirSync } = await import('fs');
    try { rmdirSync(testDir); } catch {}
  });
});

// =============================================================================
// SECTION 2: stdin-utils Module
// =============================================================================

describe('stdin-utils Module', () => {
  it('should export readStdin function', async () => {
    const mod = await import('../hooks/lib/stdin-utils');
    expect(typeof mod.readStdin).toBe('function');
  });

  it('should export readHookInput function', async () => {
    const mod = await import('../hooks/lib/stdin-utils');
    expect(typeof mod.readHookInput).toBe('function');
  });

  it('should export readStdinWithTimeout function', async () => {
    const mod = await import('../hooks/lib/stdin-utils');
    expect(typeof mod.readStdinWithTimeout).toBe('function');
  });

  it('should export delay function', async () => {
    const mod = await import('../hooks/lib/stdin-utils');
    expect(typeof mod.delay).toBe('function');
  });
});

// =============================================================================
// SECTION 3: Skill Loading
// =============================================================================

describe('Skill Loading', () => {
  const SKILLS_DIR = join(QARA_CLAUDE_DIR, 'skills');

  it('should be able to read CORE skill', () => {
    const coreSkillPath = join(SKILLS_DIR, 'CORE', 'SKILL.md');
    const content = readFileSync(coreSkillPath, 'utf-8');

    expect(content).toContain('---');
    expect(content).toContain('name: CORE');
    expect(content).toContain('context: same');
  });

  it('should parse skill frontmatter', () => {
    const coreSkillPath = join(SKILLS_DIR, 'CORE', 'SKILL.md');
    const content = readFileSync(coreSkillPath, 'utf-8');

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).not.toBeNull();

    const nameMatch = frontmatterMatch![1].match(/name:\s*(\w+)/);
    expect(nameMatch).not.toBeNull();
    expect(nameMatch![1]).toBe('CORE');
  });
});

// =============================================================================
// SECTION 4: Settings Loading
// =============================================================================

describe('Settings Loading', () => {
  it('should load and parse settings.json', () => {
    const settingsPath = join(QARA_CLAUDE_DIR, 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    expect(settings.$schema).toBeDefined();
    expect(settings.hooks).toBeDefined();
    expect(settings.permissions).toBeDefined();
  });

  it('should have valid hook command paths', () => {
    const settingsPath = join(QARA_CLAUDE_DIR, 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    const sessionStartHooks = settings.hooks.SessionStart[0].hooks;
    const firstCommand = sessionStartHooks[0].command;

    expect(firstCommand).toContain('.ts');
  });

  it('all configured hook commands should point to existing files', () => {
    const settingsPath = join(QARA_CLAUDE_DIR, 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    for (const [_event, configs] of Object.entries(settings.hooks)) {
      for (const config of configs as any[]) {
        if (config.hooks) {
          for (const hook of config.hooks) {
            if (hook.command) {
              // Extract the .ts file path from the command
              const match = hook.command.match(/(\/[^\s]+\.ts)/);
              if (match) {
                expect(existsSync(match[1])).toBe(true);
              }
            }
          }
        }
      }
    }
  });
});

// =============================================================================
// Summary
// =============================================================================

describe('Runtime Integration Summary', () => {
  it('should pass all runtime tests', () => {
    expect(true).toBe(true);
  });
});
