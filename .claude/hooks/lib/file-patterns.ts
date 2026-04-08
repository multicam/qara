/**
 * File Pattern Classification
 *
 * Pure functions for classifying file paths by type.
 * Extracted from tdd-state.ts — these have nothing to do with TDD state
 * management and are used across hooks and tools.
 */

import { basename } from "path";

// Test file patterns — matched against basename
const TEST_FILE_PATTERNS = [
  // TypeScript/JavaScript
  /\.test\.ts$/,
  /\.test\.js$/,
  /\.spec\.ts$/,
  /\.spec\.js$/,
  /\.bombadil\.ts$/,
  // Python (pytest conventions)
  /^test_.*\.py$/,
  /.*_test\.py$/,
  /^conftest\.py$/,
];

// Test directory patterns — matched against full path (or relative path starting with dir)
const TEST_DIR_PATTERNS = [
  /(^|\/)tests?\//,       // /test/ or /tests/ or starts with test(s)/
  /(^|\/)specs?\//,       // /spec/ or /specs/ or starts with spec(s)/
  /(^|\/)__tests__\//,    // /__tests__/ (jest convention)
];

/**
 * Check if a file path is a test file.
 * Matches: *.test.ts/js, *.spec.ts/js, *.bombadil.ts,
 *          test_*.py, *_test.py, conftest.py,
 *          files inside test/tests/spec/specs/__tests__ directories
 */
export function isTestFile(filePath: string): boolean {
  const name = basename(filePath);
  if (TEST_FILE_PATTERNS.some((pattern) => pattern.test(name))) return true;
  // Python files in test directories are test files
  if (name.endsWith('.py') && TEST_DIR_PATTERNS.some((p) => p.test(filePath))) return true;
  return false;
}
