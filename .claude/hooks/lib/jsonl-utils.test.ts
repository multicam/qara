/**
 * Tests for jsonl-utils.ts
 */

import { describe, it, expect, afterAll } from 'bun:test';
import { existsSync, readFileSync, unlinkSync, mkdirSync, rmdirSync } from 'fs';
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

describe('truncate', () => {
  it('should return empty string for undefined', () => {
    expect(truncate(undefined)).toBe('');
  });

  it('should return short strings unchanged', () => {
    expect(truncate('hello')).toBe('hello');
  });

  it('should truncate long strings', () => {
    const long = 'a'.repeat(600);
    const result = truncate(long, 500);
    expect(result.length).toBeLessThan(600);
    expect(result).toContain('...[truncated]');
  });

  it('should respect custom maxLen', () => {
    const result = truncate('hello world', 5);
    expect(result).toBe('hello...[truncated]');
  });
});
