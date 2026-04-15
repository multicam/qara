/**
 * Tests for jsonl-utils.ts
 */

import { describe, it, expect, afterAll } from 'bun:test';
import { existsSync, readFileSync, unlinkSync, mkdirSync, rmdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { appendJsonl, truncate } from './jsonl-utils';
import { ensureDir } from './pai-paths';

const TEST_DIR = join(tmpdir(), 'jsonl-utils-test-' + Date.now());

afterAll(() => {
  try {
    // Clean up test files
    const files = ['test.jsonl', 'nested/deep/test.jsonl'];
    for (const f of files) {
      try { unlinkSync(join(TEST_DIR, f)); } catch {}
    }
    try { rmdirSync(join(TEST_DIR, 'nested', 'deep')); } catch {}
    try { rmdirSync(join(TEST_DIR, 'nested')); } catch {}
    try { rmdirSync(TEST_DIR); } catch {}
  } catch {}
});

describe('ensureDir', () => {
  it('should create directory if it does not exist', () => {
    const dir = join(TEST_DIR, 'new-dir');
    ensureDir(dir);
    expect(existsSync(dir)).toBe(true);
    rmdirSync(dir);
  });

  it('should not throw if directory already exists', () => {
    ensureDir(TEST_DIR);
    expect(() => ensureDir(TEST_DIR)).not.toThrow();
  });
});

describe('appendJsonl', () => {
  it('should create file and append entry', () => {
    const file = join(TEST_DIR, 'test.jsonl');
    appendJsonl(file, { id: 1, msg: 'hello' });

    const content = readFileSync(file, 'utf-8');
    const parsed = JSON.parse(content.trim());
    expect(parsed).toEqual({ id: 1, msg: 'hello' });
  });

  it('should append multiple entries as separate lines', () => {
    const file = join(TEST_DIR, 'test.jsonl');
    appendJsonl(file, { id: 2, msg: 'world' });

    const lines = readFileSync(file, 'utf-8').trim().split('\n');
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[1])).toEqual({ id: 2, msg: 'world' });
  });

  it('should create parent directories', () => {
    const file = join(TEST_DIR, 'nested', 'deep', 'test.jsonl');
    appendJsonl(file, { nested: true });
    expect(existsSync(file)).toBe(true);
  });
});

describe('parseStdin', () => {
  const libPath = join(import.meta.dir, 'jsonl-utils.ts');

  async function runWithStdin(stdin: string): Promise<string> {
    const code = `import { parseStdin } from "${libPath}"; console.log(JSON.stringify(parseStdin()));`;
    const proc = Bun.spawn({
      cmd: ['bun', '-e', code],
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    proc.stdin.write(stdin);
    proc.stdin.end();
    await proc.exited;
    return (await new Response(proc.stdout).text()).trim();
  }

  it('returns null for empty stdin', async () => {
    expect(await runWithStdin('')).toBe('null');
  });

  it('returns null for whitespace-only stdin', async () => {
    expect(await runWithStdin('   \n\t  ')).toBe('null');
  });

  it('returns null for malformed JSON (catch branch)', async () => {
    expect(await runWithStdin('{not valid json')).toBe('null');
  });

  it('returns parsed object for valid JSON', async () => {
    expect(await runWithStdin('{"foo":"bar","n":42}')).toBe('{"foo":"bar","n":42}');
  });

  it('returns null when stdin is closed in-process (bun test default)', async () => {
    const { parseStdin } = await import('./jsonl-utils');
    const result = parseStdin();
    expect(result).toBeNull();
  });
});

describe('resolveSessionId', () => {
  it('returns session_id when present on data', async () => {
    const { resolveSessionId } = await import('./jsonl-utils');
    expect(resolveSessionId({ session_id: 'abc-123' })).toBe('abc-123');
  });

  it('falls back to getSessionId when data lacks session_id', async () => {
    const { resolveSessionId } = await import('./jsonl-utils');
    const result = resolveSessionId({});
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back when data is null-prototype object without session_id', async () => {
    const { resolveSessionId } = await import('./jsonl-utils');
    const result = resolveSessionId({ other: 'field' } as Record<string, unknown>);
    expect(typeof result).toBe('string');
  });
});

describe('truncate', () => {
  it('should return empty string for undefined', () => {
    expect(truncate(undefined)).toBe('');
  });

  it('should return short strings unchanged', () => {
    expect(truncate('hello')).toBe('hello');
  });

  it('should truncate long strings within maxLen budget', () => {
    const long = 'a'.repeat(600);
    const result = truncate(long, 500);
    expect(result.length).toBeLessThanOrEqual(500);
    expect(result).toContain('...[truncated]');
  });

  it('should respect custom maxLen (hard truncate when too small for suffix)', () => {
    const result = truncate('hello world', 5);
    expect(result).toBe('hello');
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('should include suffix when maxLen has room', () => {
    const result = truncate('a'.repeat(100), 30);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result).toContain('...[truncated]');
  });
});
