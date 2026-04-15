/**
 * Tests for package-skill.ts
 *
 * Tests the CLI's behavior by spawning it as a subprocess with fixture skill
 * directories and validating the output, exit codes, and generated .skill files.
 *
 * Each test creates a temporary skill directory (with SKILL.md, workflows/, etc.),
 * runs the packager, and validates the output JSON and zip contents.
 *
 * Centralized in .claude/tests/ per Qara convention.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// ── Fixture helpers ──────────────────────────────────────────────────────────

interface FixtureCtx {
  skillDir: string;
  outputPath: string;
  workflowsDir: string;
  referencesDir: string;
  scriptsDir: string;
}

function makeFixture(): FixtureCtx {
  const skillDir = mkdtempSync(join(tmpdir(), 'package-skill-'));
  const outputPath = join(tmpdir(), `fixture-${Date.now()}-${Math.random().toString(36).slice(2)}.skill`);
  const workflowsDir = join(skillDir, 'workflows');
  const referencesDir = join(skillDir, 'references');
  const scriptsDir = join(skillDir, 'scripts');

  mkdirSync(workflowsDir);
  mkdirSync(referencesDir);
  mkdirSync(scriptsDir);

  return { skillDir, outputPath, workflowsDir, referencesDir, scriptsDir };
}

function teardownFixture(ctx: FixtureCtx): void {
  rmSync(ctx.skillDir, { recursive: true, force: true });
  // Clean up output file if it exists
  try {
    rmSync(ctx.outputPath, { force: true });
  } catch {}
}

/** Write a minimal valid SKILL.md with frontmatter. */
function writeValidSKILLmd(ctx: FixtureCtx): void {
  const skillMd = `---
name: test-skill
description: Test skill for packaging.
---

## Workflow Routing

| Trigger | Workflow |
|---------|----------|
| "test" | \`workflows/main.md\` |

## Overview

Test skill content.

- workflows/main.md — main workflow
- references/guide.md — reference guide
`;
  writeFileSync(join(ctx.skillDir, 'SKILL.md'), skillMd);
}

/** Write minimal workflow and reference files. */
function writeWorkflowAndReference(ctx: FixtureCtx): void {
  writeFileSync(
    join(ctx.workflowsDir, 'main.md'),
    '# Main Workflow\n\nDo the main thing.\n'
  );
  writeFileSync(
    join(ctx.referencesDir, 'guide.md'),
    '# Reference Guide\n\nGuide content.\n'
  );
}

/** Spawn the package-skill.ts script and return its output and exit code. */
async function runPackageSkill(skillDir: string, outputPath: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const proc = Bun.spawn(['bun', 'run', '/home/jean-marc/qara/.claude/skills/system-create-skill/scripts/package-skill.ts', skillDir, outputPath], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stdout, stderr };
}

/** Parse JSON from stdout, handling parse errors. */
function tryParseJSON(text: string): object | null {
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

/** Get list of files in zip. */
function getZipContents(zipPath: string): string[] {
  const proc = Bun.spawnSync(['unzip', '-l', zipPath], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = new TextDecoder().decode(proc.stdout);
  const lines = stdout.split('\n');
  const files: string[] = [];
  for (const line of lines) {
    const match = line.match(/\s+\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/);
    if (match) {
      files.push(match[1]);
    }
  }
  return files;
}

/** Check if a file exists in a zip. */
function fileExistsInZip(zipPath: string, filename: string): boolean {
  const contents = getZipContents(zipPath);
  return contents.some(f => f.includes(filename));
}

// ── Helper for common test pattern ──────────────────────────────────────────

/** Setup fixture, run packager with optional extra files, and return result.
 * Note: caller is responsible for cleaning up outputPath if needed via teardownFixture(). */
async function packSkillWithSetup(
  setupExtra?: (ctx: FixtureCtx) => void,
): Promise<{ ctx: FixtureCtx; exitCode: number; stdout: string; stderr: string; json: any }> {
  const testCtx = makeFixture();
  writeValidSKILLmd(testCtx);
  writeWorkflowAndReference(testCtx);
  if (setupExtra) {
    setupExtra(testCtx);
  }
  const result = await runPackageSkill(testCtx.skillDir, testCtx.outputPath);
  return { ctx: testCtx, ...result, json: tryParseJSON(result.stdout) };
}

/** Run a test with automatic cleanup. */
async function testWithCleanup(
  fn: (result: { ctx: FixtureCtx; exitCode: number; stdout: string; stderr: string; json: any }) => void,
  setupExtra?: (ctx: FixtureCtx) => void,
): Promise<void> {
  const result = await packSkillWithSetup(setupExtra);
  try {
    fn(result);
  } finally {
    teardownFixture(result.ctx);
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

let ctx: FixtureCtx;

beforeEach(() => {
  ctx = makeFixture();
});

afterEach(() => {
  teardownFixture(ctx);
});

describe('package-skill CLI argument validation', () => {
  test('missing both args → exit 2, stderr mentions usage', async () => {
    const { exitCode, stderr } = await runPackageSkill('', '');
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Usage');
  });

  test('missing output arg → exit 2, stderr mentions usage', async () => {
    const { exitCode, stderr } = await runPackageSkill(ctx.skillDir, '');
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Usage');
  });

  test('missing skill-dir arg → exit 2, stderr mentions usage', async () => {
    const { exitCode, stderr } = await runPackageSkill('', ctx.outputPath);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Usage');
  });
});

describe('package-skill invalid skill directory', () => {
  test('nonexistent skill dir → exit 2, stderr mentions "not found"', async () => {
    const { exitCode, stderr } = await runPackageSkill('/nonexistent/path', ctx.outputPath);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('not found');
  });

  test('skill dir without SKILL.md → exit 2, stderr mentions "SKILL.md not found"', async () => {
    // Create a dir but don't write SKILL.md
    const { exitCode, stderr } = await runPackageSkill(ctx.skillDir, ctx.outputPath);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('SKILL.md not found');
  });
});

describe('package-skill success path', () => {
  test('valid skill dir → exit 0, output file exists, stdout is valid JSON', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      expect(json).not.toBeNull();
      expect(json).toHaveProperty('output');
      expect(json).toHaveProperty('bytes');
      expect(json).toHaveProperty('files');
    });
  });

  test('JSON output includes expected fields with correct types', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      expect(typeof json.output).toBe('string');
      expect(typeof json.bytes).toBe('number');
      expect(typeof json.files).toBe('number');
      expect(json.bytes).toBeGreaterThan(0);
      expect(json.files).toBeGreaterThan(0);
    });
  });

  test('output file is created and has nonzero size', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const stat = Bun.file(json.output).size;
      expect(stat).toBeGreaterThan(0);
    });
  });

  test('output file is a valid zip archive', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const proc = Bun.spawnSync(['unzip', '-l', json.output], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(proc.exitCode).toBe(0);
    });
  });
});

describe('package-skill excludes patterns', () => {
  test('excludes .backup-* files', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const hasBackup = fileExistsInZip(json.output, '.backup-old');
      expect(hasBackup).toBe(false);
    }, ctx => {
      writeFileSync(join(ctx.skillDir, '.backup-old'), 'backup content');
    });
  });


  test('excludes .DS_Store files', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const hasDS = fileExistsInZip(json.output, '.DS_Store');
      expect(hasDS).toBe(false);
    }, ctx => {
      writeFileSync(join(ctx.skillDir, '.DS_Store'), 'macos metadata');
    });
  });

  test('excludes *.test.ts files', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const hasTest = fileExistsInZip(json.output, '.test.ts');
      expect(hasTest).toBe(false);
    }, ctx => {
      writeFileSync(join(ctx.scriptsDir, 'helper.test.ts'), 'test code');
    });
  });

  test('excludes *.spec.ts files', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const hasSpec = fileExistsInZip(json.output, '.spec.ts');
      expect(hasSpec).toBe(false);
    }, ctx => {
      writeFileSync(join(ctx.scriptsDir, 'helper.spec.ts'), 'spec code');
    });
  });
});

describe('package-skill includes expected structure', () => {
  test('includes SKILL.md', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const hasSkill = fileExistsInZip(json.output, 'SKILL.md');
      expect(hasSkill).toBe(true);
    });
  });

  test('includes workflows/ directory and files', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const contents = getZipContents(json.output);
      const hasWorkflow = contents.some(f => f.includes('workflows/main.md'));
      expect(hasWorkflow).toBe(true);
    });
  });

  test('includes references/ directory and files', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const contents = getZipContents(json.output);
      const hasReference = contents.some(f => f.includes('references/guide.md'));
      expect(hasReference).toBe(true);
    });
  });

  test('includes scripts/ directory (minus test files)', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      const contents = getZipContents(json.output);
      const hasHelper = contents.some(f => f.includes('scripts/helper.ts'));
      expect(hasHelper).toBe(true);
    }, ctx => {
      writeFileSync(join(ctx.scriptsDir, 'helper.ts'), 'export function help() {}');
    });
  });
});

describe('package-skill file count reporting', () => {
  test('files field counts actual archived files (non-zero)', async () => {
    await testWithCleanup(({ exitCode, json }) => {
      expect(exitCode).toBe(0);
      expect(json.files).toBeGreaterThanOrEqual(3);
    });
  });

  test('stderr includes progress and completion messages', async () => {
    await testWithCleanup(({ exitCode, stderr }) => {
      expect(exitCode).toBe(0);
      expect(stderr).toContain('Packaging');
      expect(stderr).toContain('Done');
    });
  });
});
