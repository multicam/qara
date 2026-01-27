#!/usr/bin/env bun

/**
 * code-lint-check.ts
 *
 * Per-agent hook for engineer: Quick syntax validation after code edits.
 * Performs lightweight TypeScript/JavaScript validation without blocking.
 *
 * Triggered: PostToolUse Edit (when engineer edits code files)
 */

import { existsSync } from 'fs';
import { extname, dirname, join } from 'path';
import { spawnSync } from 'child_process';

interface HookInput {
  tool_name: string;
  tool_input?: {
    file_path?: string;
  };
}

/**
 * File extensions to lint
 */
const LINTABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/**
 * Quick TypeScript syntax check using tsc --noEmit
 */
function checkTypeScript(filePath: string): { ok: boolean; errors: string[] } {
  const dir = dirname(filePath);
  const errors: string[] = [];

  // Check if tsconfig exists (indicates a TypeScript project)
  const tsconfigPath = findTsConfig(dir);

  if (!tsconfigPath) {
    // No tsconfig - skip TS validation
    return { ok: true, errors: [] };
  }

  try {
    // Run tsc with --noEmit for syntax check only
    const result = spawnSync('bun', ['x', 'tsc', '--noEmit', filePath], {
      cwd: dirname(tsconfigPath),
      timeout: 10000, // 10 second timeout
      encoding: 'utf-8',
    });

    if (result.status !== 0 && result.stderr) {
      // Extract relevant error lines
      const errorLines = result.stderr
        .split('\n')
        .filter((line) => line.includes('error TS'))
        .slice(0, 5); // Max 5 errors

      errors.push(...errorLines);
    }
  } catch {
    // tsc not available or failed - don't block
    return { ok: true, errors: [] };
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Quick ESLint check if available
 */
function checkESLint(filePath: string): { ok: boolean; errors: string[] } {
  const dir = dirname(filePath);
  const errors: string[] = [];

  // Check if eslint config exists
  const eslintConfig = [
    join(dir, '.eslintrc.js'),
    join(dir, '.eslintrc.json'),
    join(dir, 'eslint.config.js'),
    join(dir, 'eslint.config.mjs'),
  ].find(existsSync);

  if (!eslintConfig) {
    // No eslint config - skip
    return { ok: true, errors: [] };
  }

  try {
    const result = spawnSync('bun', ['x', 'eslint', '--format', 'compact', filePath], {
      cwd: dir,
      timeout: 15000, // 15 second timeout
      encoding: 'utf-8',
    });

    if (result.status !== 0 && result.stdout) {
      // Extract error lines
      const errorLines = result.stdout
        .split('\n')
        .filter((line) => line.includes('Error') || line.includes('error'))
        .slice(0, 5);

      errors.push(...errorLines);
    }
  } catch {
    // ESLint not available or failed - don't block
    return { ok: true, errors: [] };
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Find nearest tsconfig.json
 */
function findTsConfig(startDir: string): string | null {
  let dir = startDir;
  const root = '/';

  while (dir !== root) {
    const tsconfigPath = join(dir, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      return tsconfigPath;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

async function main(): Promise<void> {
  try {
    const input = await Bun.stdin.text();
    if (!input.trim()) {
      process.exit(0);
    }

    const data: HookInput = JSON.parse(input);

    // Only process Edit tool calls
    if (data.tool_name !== 'Edit') {
      process.exit(0);
    }

    const filePath = data.tool_input?.file_path;

    if (!filePath || !existsSync(filePath)) {
      process.exit(0);
    }

    // Only lint supported file types
    const ext = extname(filePath).toLowerCase();
    if (!LINTABLE_EXTENSIONS.includes(ext)) {
      process.exit(0);
    }

    // Run checks
    const tsResult = checkTypeScript(filePath);
    const eslintResult = checkESLint(filePath);

    const allErrors = [...tsResult.errors, ...eslintResult.errors];

    if (allErrors.length > 0) {
      console.error(`⚠️ Code Quality Warning for ${filePath}:`);
      for (const error of allErrors) {
        console.error(`  ${error}`);
      }
      console.error(`💡 Consider fixing these issues before committing.`);
    } else {
      console.error(`✅ Code lint check passed: ${filePath}`);
    }
  } catch (error) {
    // Fail silently - don't block engineer operations
    console.error('Code lint hook error:', error);
  }
}

main();
