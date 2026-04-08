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
  /\.test\.ts$/,
  /\.test\.js$/,
  /\.spec\.ts$/,
  /\.spec\.js$/,
  /\.bombadil\.ts$/,
];

/**
 * Check if a file path is a test file.
 * Matches: *.test.ts/js, *.spec.ts/js, *.bombadil.ts
 */
export function isTestFile(filePath: string): boolean {
  const name = basename(filePath);
  return TEST_FILE_PATTERNS.some((pattern) => pattern.test(name));
}
