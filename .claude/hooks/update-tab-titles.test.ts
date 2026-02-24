/**
 * update-tab-titles.ts tests
 *
 * Tests prompt-based tab title generation and escape sequence output.
 */

import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { spawn } from 'child_process';

const HOOK = join(import.meta.dir, 'update-tab-titles.ts');

async function runHook(
  input: object | string,
  env?: Record<string, string>
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', HOOK], {
      cwd: import.meta.dir,
      env: { ...process.env, ...env },
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    const str = typeof input === 'string' ? input : JSON.stringify(input);
    proc.stdin.write(str);
    proc.stdin.end();
    const timer = setTimeout(() => { proc.kill('SIGTERM'); resolve({ stdout, stderr, exitCode: 124 }); }, 10000);
    proc.on('close', (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code ?? 1 }); });
  });
}

function hookInput(prompt: string) {
  return {
    session_id: 'test-123',
    transcript_path: '/tmp/fake',
    hook_event_name: 'UserPromptSubmit',
    prompt,
  };
}

describe('update-tab-titles.ts', () => {
  describe('title generation', () => {
    it('should set tab title from prompt', async () => {
      const result = await runHook(hookInput('fix the authentication bug'));
      expect(result.exitCode).toBe(0);
      // Tab title escape sequences go to stderr
      expect(result.stderr).toContain('\x1b]');
    });

    it('should include processing emoji in title', async () => {
      const result = await runHook(hookInput('refactor the login module'));
      // Title format is "♻️ AI: <title>"
      expect(result.stderr).toContain('♻️');
    });

    it('should use DA env var for agent name in title', async () => {
      const result = await runHook(hookInput('deploy to staging'), { DA: 'Qara' });
      expect(result.stderr).toContain('Qara');
    });

    it('should default to "AI" when DA is not set', async () => {
      const env = { ...process.env };
      delete env.DA;
      const result = await runHook(hookInput('run the tests'), { DA: '' });
      // When DA is empty string, it's falsy so defaults to 'AI'
      expect(result.stderr).toContain('AI');
    });
  });

  describe('edge cases', () => {
    it('should exit 0 with empty prompt', async () => {
      const result = await runHook(hookInput(''));
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 with missing prompt field', async () => {
      const result = await runHook({
        session_id: 'test-123',
        hook_event_name: 'UserPromptSubmit',
      });
      expect(result.exitCode).toBe(0);
    });

    it('should handle very long prompts', async () => {
      const longPrompt = 'x'.repeat(10000);
      const result = await runHook(hookInput(longPrompt));
      expect(result.exitCode).toBe(0);
    });

    it('should handle prompts with special characters', async () => {
      const result = await runHook(hookInput('fix the "quoted" thing & <html> stuff'));
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error resilience', () => {
    it('should exit 0 with empty stdin', async () => {
      const result = await runHook('');
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 with malformed JSON', async () => {
      const result = await runHook('{bad json');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('output contract', () => {
    it('should produce no stdout (escape sequences go to stderr)', async () => {
      const result = await runHook(hookInput('test prompt'));
      expect(result.stdout.trim()).toBe('');
    });
  });
});
