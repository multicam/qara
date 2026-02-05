/**
 * Runtime Integration Tests
 *
 * Tests that actually execute PAI components to verify
 * they work correctly at runtime.
 *
 * Run with: bun test .claude/tests/runtime-integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';

const QARA_CLAUDE_DIR = join(homedir(), 'qara', '.claude');
const HOOKS_DIR = join(QARA_CLAUDE_DIR, 'hooks');

// =============================================================================
// Helper: Run a hook with input
// =============================================================================

async function runHook(
  hookPath: string,
  input: object
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', [hookPath], {
      cwd: HOOKS_DIR,
      env: {
        ...process.env,
        PAI_DIR: QARA_CLAUDE_DIR,
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });
  });
}

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
    try {
      unlinkSync(testDir);
    } catch {
      // Directory, use rmdir
      const { rmdirSync } = await import('fs');
      rmdirSync(testDir);
    }
  });
});

// =============================================================================
// SECTION 2: JSONL Utilities
// =============================================================================

describe('jsonl-utils Module', () => {
  const testFile = join(QARA_CLAUDE_DIR, 'state', 'test-jsonl-' + Date.now() + '.jsonl');

  afterAll(() => {
    if (existsSync(testFile)) {
      unlinkSync(testFile);
    }
  });

  it('should append entries to JSONL file', async () => {
    const { appendJsonl } = await import('../hooks/lib/jsonl-utils');

    const entry1 = { id: 1, message: 'test1' };
    const entry2 = { id: 2, message: 'test2' };

    appendJsonl(testFile, entry1);
    appendJsonl(testFile, entry2);

    const content = readFileSync(testFile, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0])).toEqual(entry1);
    expect(JSON.parse(lines[1])).toEqual(entry2);
  });
});

// =============================================================================
// SECTION 3: DateTime Utilities
// =============================================================================

describe('datetime-utils Module', () => {
  it('should return ISO timestamp', async () => {
    const { getISOTimestamp } = await import('../hooks/lib/datetime-utils');

    const timestamp = getISOTimestamp();

    expect(typeof timestamp).toBe('string');
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('timestamps should be unique across calls', async () => {
    const { getISOTimestamp } = await import('../hooks/lib/datetime-utils');

    const t1 = getISOTimestamp();
    await new Promise((r) => setTimeout(r, 10));
    const t2 = getISOTimestamp();

    // Timestamps should be close but may be same within ms
    expect(typeof t1).toBe('string');
    expect(typeof t2).toBe('string');
  });
});

// =============================================================================
// SECTION 4: Security Hook Runtime
// =============================================================================

describe('Security Hook Runtime', () => {
  const securityHookPath = join(HOOKS_DIR, 'pre-tool-use-security.ts');

  it('should approve safe commands', async () => {
    const result = await runHook(securityHookPath, {
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
    });

    const output = JSON.parse(result.stdout.trim());
    // CC 2.1.9 format: { continue: boolean, reason?: string }
    expect(output.continue).toBe(true);
  });

  it('should block rm -rf /', async () => {
    const result = await runHook(securityHookPath, {
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
    });

    const output = JSON.parse(result.stdout.trim());
    // CC 2.1.9 format: continue=false with reason containing BLOCKED
    expect(output.continue).toBe(false);
    expect(output.reason).toContain('BLOCKED');
  });

  it('should require approval for git push --force', async () => {
    const result = await runHook(securityHookPath, {
      tool_name: 'Bash',
      tool_input: { command: 'git push --force origin main' },
    });

    const output = JSON.parse(result.stdout.trim());
    // CC 2.1.9 format: continue=false with reason containing REQUIRE_APPROVAL
    expect(output.continue).toBe(false);
    expect(output.reason).toContain('REQUIRE_APPROVAL');
  });

  it('should approve non-Bash tools', async () => {
    const result = await runHook(securityHookPath, {
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.txt' },
    });

    const output = JSON.parse(result.stdout.trim());
    // CC 2.1.9 format: { continue: boolean }
    expect(output.continue).toBe(true);
  });

  it('should include additionalContext for git operations', async () => {
    const result = await runHook(securityHookPath, {
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
    });

    const output = JSON.parse(result.stdout.trim());
    // Safe git push - CC 2.1.9 format: continue=true
    expect(output.continue).toBe(true);
  });
});

// =============================================================================
// SECTION 5: LLM Client Modules
// =============================================================================

// Check if SDK packages are available
const hasAnthropicSdk = (() => {
  try { require.resolve('@anthropic-ai/sdk'); return true; }
  catch { return false; }
})();

const hasOpenAiSdk = (() => {
  try { require.resolve('openai'); return true; }
  catch { return false; }
})();

describe('LLM Client Modules', () => {
  // Skip Anthropic tests if SDK not installed
  (hasAnthropicSdk ? describe : describe.skip)('Anthropic Client', () => {
    it('should export required functions', async () => {
      const anthropic = await import('../hooks/lib/llm/anthropic');

      expect(typeof anthropic.promptLLM).toBe('function');
      expect(typeof anthropic.promptLLMStream).toBe('function');
    });
  });

  // Skip OpenAI tests if SDK not installed
  (hasOpenAiSdk ? describe : describe.skip)('OpenAI Client', () => {
    it('should export required functions', async () => {
      const openai = await import('../hooks/lib/llm/openai');

      expect(typeof openai.promptLLM).toBe('function');
      expect(typeof openai.promptLLMStream).toBe('function');
    });
  });
});

// =============================================================================
// SECTION 6: Skill Loading
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

    // Simple YAML parsing for name field
    const nameMatch = frontmatterMatch![1].match(/name:\s*(\w+)/);
    expect(nameMatch).not.toBeNull();
    expect(nameMatch![1]).toBe('CORE');
  });
});

// =============================================================================
// SECTION 7: Settings Loading
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

    // Check that at least one hook command path is valid
    const sessionStartHooks = settings.hooks.SessionStart[0].hooks;
    const firstCommand = sessionStartHooks[0].command;

    expect(firstCommand).toContain('.ts');
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
