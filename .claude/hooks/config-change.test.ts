/**
 * config-change.ts tests
 *
 * Tests config change logging, JSONL output, and graceful error handling.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { existsSync, readFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

const HOOK = join(import.meta.dir, 'config-change.ts');
const TEST_STATE_DIR = join(tmpdir(), `config-change-test-${Date.now()}`);
const LOG_FILE = join(TEST_STATE_DIR, 'state', 'config-changes.jsonl');

beforeAll(() => mkdirSync(join(TEST_STATE_DIR, 'state'), { recursive: true }));
afterAll(() => { try { unlinkSync(LOG_FILE); } catch {} });

async function runHook(
  input: object | string,
  env?: Record<string, string>
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', HOOK], {
      cwd: import.meta.dir,
      env: { ...process.env, PAI_DIR: TEST_STATE_DIR, ...env },
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

describe('config-change.ts', () => {
  describe('config change logging', () => {
    it('should log config change to JSONL file', async () => {
      const before = getLogLineCount();
      await runHook({
        config_source: 'settings.json',
        session_id: 'test-session-1',
      });
      await new Promise(r => setTimeout(r, 300));

      const after = getLogLineCount();
      expect(after).toBeGreaterThan(before);

      const last = getLastLogLine();
      expect(last).not.toBeNull();
      expect(last!.source).toBe('settings.json');
      expect(last!.timestamp).toBeDefined();
    });

    it('should record session_id from input', async () => {
      await runHook({
        config_source: 'mcp.json',
        session_id: 'explicit-session-id',
      });
      await new Promise(r => setTimeout(r, 300));

      const last = getLastLogLine();
      expect(last!.session_id).toBe('explicit-session-id');
    });

    it('should fall back to CLAUDE_SESSION_ID env var', async () => {
      await runHook(
        { config_source: 'settings.json' },
        { CLAUDE_SESSION_ID: 'env-session-xyz' }
      );
      await new Promise(r => setTimeout(r, 300));

      const last = getLastLogLine();
      expect(last!.session_id).toBe('env-session-xyz');
    });

    it('should use "unknown" for missing source', async () => {
      await runHook({ session_id: 'test' });
      await new Promise(r => setTimeout(r, 300));

      const last = getLastLogLine();
      expect(last!.source).toBe('unknown');
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
        config_source: 'test',
        session_id: 'test',
      });
      expect(result.stdout.trim()).toBe('');
    });
  });
});
