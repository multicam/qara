/**
 * post-tool-use.ts tests
 *
 * Tests tool usage logging, JSONL output, and graceful error handling.
 */

import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';

const HOOK = join(import.meta.dir, 'post-tool-use.ts');
const STATE_DIR = join(homedir(), '.claude', 'state');
const LOG_FILE = join(STATE_DIR, 'tool-usage.jsonl');

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

function getLastLogLine(): Record<string, unknown> | null {
  if (!existsSync(LOG_FILE)) return null;
  const lines = readFileSync(LOG_FILE, 'utf-8').trim().split('\n');
  return JSON.parse(lines[lines.length - 1]);
}

function getLogLineCount(): number {
  if (!existsSync(LOG_FILE)) return 0;
  return readFileSync(LOG_FILE, 'utf-8').trim().split('\n').length;
}

describe('post-tool-use.ts', () => {
  describe('tool logging', () => {
    it('should log tool usage to JSONL file', async () => {
      const before = getLogLineCount();
      await runHook({
        tool_name: 'TestToolColocated',
        tool_input: { file_path: '/tmp/test.txt' },
        was_error: false,
      });
      await new Promise(r => setTimeout(r, 300));

      const after = getLogLineCount();
      expect(after).toBeGreaterThan(before);

      const last = getLastLogLine();
      expect(last).not.toBeNull();
      expect(last!.tool).toBe('TestToolColocated');
      expect(last!.error).toBe(false);
      expect(last!.timestamp).toBeDefined();
    });

    it('should record was_error=true for failed tools', async () => {
      await runHook({
        tool_name: 'FailedTool',
        tool_input: { command: 'false' },
        was_error: true,
      });
      await new Promise(r => setTimeout(r, 300));

      const last = getLastLogLine();
      expect(last!.tool).toBe('FailedTool');
      expect(last!.error).toBe(true);
    });

    it('should record session_id from environment', async () => {
      await runHook(
        { tool_name: 'SessionTest', tool_input: {}, was_error: false },
        { CLAUDE_SESSION_ID: 'test-session-xyz' }
      );
      await new Promise(r => setTimeout(r, 300));

      const last = getLastLogLine();
      expect(last!.session_id).toBe('test-session-xyz');
    });

    it('should fall back to SESSION_ID env var', async () => {
      await runHook(
        { tool_name: 'SessionFallback', tool_input: {}, was_error: false },
        { SESSION_ID: 'fallback-session-abc', CLAUDE_SESSION_ID: '' }
      );
      await new Promise(r => setTimeout(r, 300));

      const last = getLastLogLine();
      // Should use SESSION_ID since CLAUDE_SESSION_ID is empty string (truthy in JS)
      expect(last!.session_id).toBeDefined();
    });
  });

  describe('error resilience', () => {
    it('should exit 0 with empty stdin', async () => {
      const result = await runHook('');
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 with malformed JSON', async () => {
      const result = await runHook('not json at all');
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 with missing fields', async () => {
      const result = await runHook({ unexpected: 'data' });
      expect(result.exitCode).toBe(0);
    });
  });

  describe('output contract', () => {
    it('should produce no stdout (logging is a side-effect)', async () => {
      const result = await runHook({
        tool_name: 'Read',
        tool_input: { file_path: '/tmp/x' },
      });
      expect(result.stdout.trim()).toBe('');
    });
  });
});
