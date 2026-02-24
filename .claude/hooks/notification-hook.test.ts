/**
 * notification-hook.ts tests
 *
 * Tests notification dispatch logic and graceful error handling.
 */

import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { spawn } from 'child_process';

const HOOK = join(import.meta.dir, 'notification-hook.ts');

async function runHook(
  input: object | string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', HOOK], {
      cwd: import.meta.dir,
      env: { ...process.env },
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

describe('notification-hook.ts', () => {
  describe('stop reason filtering', () => {
    it('should exit 0 on end_turn (triggers notification)', async () => {
      const result = await runHook({ stop_reason: 'end_turn' });
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 on tool_use (no notification)', async () => {
      const result = await runHook({ stop_reason: 'tool_use' });
      expect(result.exitCode).toBe(0);
    });

    it('should default stop_reason to "completed" when missing', async () => {
      const result = await runHook({});
      expect(result.exitCode).toBe(0);
    });

    it('should handle unknown stop_reason gracefully', async () => {
      const result = await runHook({ stop_reason: 'something_unexpected' });
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error resilience', () => {
    it('should exit 0 with empty stdin', async () => {
      const result = await runHook('');
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 with malformed JSON', async () => {
      const result = await runHook('{broken');
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 with completely invalid input', async () => {
      const result = await runHook('not even close to json');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('output contract', () => {
    it('should produce no stdout (notifications are side-effects)', async () => {
      const result = await runHook({ stop_reason: 'end_turn' });
      expect(result.stdout.trim()).toBe('');
    });
  });
});
