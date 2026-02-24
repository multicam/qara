/**
 * session-start.ts tests
 *
 * Tests subagent detection, debounce logic, and CORE context loading.
 */

import { describe, it, expect } from 'bun:test';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

const HOOK = join(import.meta.dir, 'session-start.ts');

async function runHook(
  env?: Record<string, string>,
  stdin = ''
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', HOOK], {
      cwd: import.meta.dir,
      env: { ...process.env, ...env },
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.stdin.write(stdin);
    proc.stdin.end();
    const timer = setTimeout(() => { proc.kill('SIGTERM'); resolve({ stdout, stderr, exitCode: 124 }); }, 10000);
    proc.on('close', (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code ?? 1 }); });
  });
}

describe('session-start.ts', () => {
  describe('subagent detection', () => {
    it('should skip when CLAUDE_AGENT_TYPE is set', async () => {
      const result = await runHook({
        CLAUDE_AGENT_TYPE: 'subagent',
        CLAUDE_SESSION_ID: 'subagent-test-' + Date.now(),
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('<system-reminder>');
    });

    it('should skip when CLAUDE_PROJECT_DIR contains agents path', async () => {
      const result = await runHook({
        CLAUDE_PROJECT_DIR: '/home/user/.claude/agents/codebase-analyzer',
        CLAUDE_SESSION_ID: 'subagent-test-' + Date.now(),
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('<system-reminder>');
    });

    it('should NOT skip for normal sessions', async () => {
      const result = await runHook({
        CLAUDE_SESSION_ID: 'normal-test-' + Date.now(),
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<system-reminder>');
    });
  });

  describe('debounce', () => {
    it('should debounce rapid duplicate calls', async () => {
      const sessionId = 'debounce-test-' + Date.now();
      const lockfile = join(tmpdir(), `pai-session-start-${sessionId}.lock`);

      try {
        // First call — should produce output
        const first = await runHook({ CLAUDE_SESSION_ID: sessionId });
        expect(first.stdout).toContain('<system-reminder>');

        // Second call within 2s — should be debounced
        const second = await runHook({ CLAUDE_SESSION_ID: sessionId });
        expect(second.stdout).not.toContain('<system-reminder>');
        expect(second.stderr).toContain('Debouncing');
      } finally {
        try { unlinkSync(lockfile); } catch {}
      }
    });

    it('should NOT debounce after window expires', async () => {
      const sessionId = 'debounce-expired-' + Date.now();
      const lockfile = join(tmpdir(), `pai-session-start-${sessionId}.lock`);

      try {
        // Write an old lockfile (3 seconds ago)
        writeFileSync(lockfile, (Date.now() - 3000).toString());

        const result = await runHook({ CLAUDE_SESSION_ID: sessionId });
        expect(result.stdout).toContain('<system-reminder>');
      } finally {
        try { unlinkSync(lockfile); } catch {}
      }
    });
  });

  describe('CORE context loading', () => {
    it('should output SKILL.md content wrapped in system-reminder', async () => {
      const result = await runHook({
        CLAUDE_SESSION_ID: 'context-test-' + Date.now(),
      });
      expect(result.stdout).toContain('<system-reminder>');
      expect(result.stdout).toContain('</system-reminder>');
      // Should contain actual CORE SKILL.md content
      expect(result.stdout).toContain('Qara');
    });

    it('should handle missing SKILL.md gracefully', async () => {
      const result = await runHook({
        CLAUDE_SESSION_ID: 'missing-skill-' + Date.now(),
        // Point to a PAI_DIR that exists but has no skills/CORE/SKILL.md
        PAI_DIR: tmpdir(),
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('SKILL.md not found');
    });
  });

  describe('tab title', () => {
    it('should use DA env var for title', async () => {
      const result = await runHook({
        CLAUDE_SESSION_ID: 'title-test-' + Date.now(),
        DA: 'Qara',
      });
      expect(result.exitCode).toBe(0);
      // Tab title escape sequences go to stderr
      expect(result.stderr).toContain('Qara Ready');
    });
  });
});
