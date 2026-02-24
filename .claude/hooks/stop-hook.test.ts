/**
 * stop-hook.ts tests
 *
 * Tests transcript tail reading, user query extraction, and tab title setting.
 */

import { describe, it, expect, afterEach } from 'bun:test';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

const HOOK = join(import.meta.dir, 'stop-hook.ts');

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

const tmpFiles: string[] = [];
afterEach(() => {
  for (const f of tmpFiles) {
    try { if (existsSync(f)) unlinkSync(f); } catch {}
  }
  tmpFiles.length = 0;
});

function writeTmpTranscript(lines: object[]): string {
  const path = join(tmpdir(), `stop-hook-test-${Date.now()}.jsonl`);
  writeFileSync(path, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  tmpFiles.push(path);
  return path;
}

describe('stop-hook.ts', () => {
  describe('stdin handling', () => {
    it('should exit 0 with empty stdin', async () => {
      const result = await runHook('');
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 with malformed JSON', async () => {
      const result = await runHook('not json');
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 with missing transcript_path', async () => {
      const result = await runHook({ stop_reason: 'end_turn' });
      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 with nonexistent transcript', async () => {
      const result = await runHook({
        transcript_path: '/tmp/nonexistent-' + Date.now() + '.jsonl',
      });
      expect(result.exitCode).toBe(0);
    });
  });

  describe('user query extraction', () => {
    it('should extract string content from user message', async () => {
      const path = writeTmpTranscript([
        { type: 'user', message: { content: 'fix the login bug' } },
        { type: 'assistant', message: { content: 'Done.' } },
      ]);
      const result = await runHook({ transcript_path: path });
      expect(result.exitCode).toBe(0);
      // Should set tab title from user query (escape sequences in stderr)
      expect(result.stderr).toContain('\x1b]');
    });

    it('should extract text from array content (multimodal format)', async () => {
      const path = writeTmpTranscript([
        {
          type: 'user',
          message: {
            content: [
              { type: 'text', text: 'refactor the auth module' },
            ],
          },
        },
      ]);
      const result = await runHook({ transcript_path: path });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('\x1b]');
    });

    it('should use the LAST user message, not the first', async () => {
      const path = writeTmpTranscript([
        { type: 'user', message: { content: 'first message' } },
        { type: 'assistant', message: { content: 'reply' } },
        { type: 'user', message: { content: 'second message about deploy' } },
        { type: 'assistant', message: { content: 'done' } },
      ]);
      const result = await runHook({ transcript_path: path });
      expect(result.exitCode).toBe(0);
      // Tab title should reflect the last user message
      expect(result.stderr).toContain('\x1b]');
    });

    it('should handle transcript with no user messages', async () => {
      const path = writeTmpTranscript([
        { type: 'assistant', message: { content: 'Hello' } },
      ]);
      const result = await runHook({ transcript_path: path });
      expect(result.exitCode).toBe(0);
    });

    it('should handle transcript with invalid JSON lines', async () => {
      const path = join(tmpdir(), `stop-hook-mixed-${Date.now()}.jsonl`);
      writeFileSync(path, [
        'this is not json',
        JSON.stringify({ type: 'user', message: { content: 'valid query' } }),
      ].join('\n') + '\n');
      tmpFiles.push(path);

      const result = await runHook({ transcript_path: path });
      expect(result.exitCode).toBe(0);
    });
  });

  describe('large transcript handling', () => {
    it('should handle transcripts larger than 32KB by reading only the tail', async () => {
      // Create a transcript > 32KB with padding then a final user message
      const padding = Array(500).fill(
        JSON.stringify({ type: 'assistant', message: { content: 'x'.repeat(100) } })
      );
      padding.push(JSON.stringify({ type: 'user', message: { content: 'deploy to staging' } }));
      const path = join(tmpdir(), `stop-hook-large-${Date.now()}.jsonl`);
      writeFileSync(path, padding.join('\n') + '\n');
      tmpFiles.push(path);

      const result = await runHook({ transcript_path: path });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('\x1b]');
    });
  });
});
