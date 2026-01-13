/**
 * Error Pattern Learning System
 *
 * Tracks recurring errors and suggests known solutions.
 * Part of Factor 6: Learn from Mistakes
 */

import { readFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const ERROR_PATTERNS_FILE = join(
  process.env.PAI_DIR || process.env.HOME + '/qara',
  'state/error-patterns.jsonl'
);

export interface ErrorPattern {
  error: string;
  pattern: string;
  solution: string;
  frequency: number;
  lastSeen: number;
}

/**
 * Log an error occurrence to the patterns database
 */
export async function logErrorPattern(
  error: string,
  context: string,
  toolName: string
): Promise<void> {
  const errorType = extractErrorType(error);

  const pattern: ErrorPattern = {
    error: errorType,
    pattern: `${toolName}: ${context.substring(0, 100)}`,
    solution: '', // Will be filled manually or by learning
    frequency: 1,
    lastSeen: Date.now()
  };

  try {
    await appendFile(ERROR_PATTERNS_FILE, JSON.stringify(pattern) + '\n');
  } catch (err) {
    // Fail silently - don't break hook flow
    console.error('Failed to log error pattern:', err);
  }
}

/**
 * Look up known solution for an error
 */
export async function lookupErrorPattern(error: string): Promise<ErrorPattern | null> {
  if (!existsSync(ERROR_PATTERNS_FILE)) {
    return null;
  }

  try {
    const content = await readFile(ERROR_PATTERNS_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    if (lines.length === 0) {
      return null;
    }

    const patterns = lines.map(line => {
      try {
        return JSON.parse(line) as ErrorPattern;
      } catch {
        return null;
      }
    }).filter((p): p is ErrorPattern => p !== null);

    // Find matching pattern with a solution
    const errorType = extractErrorType(error);
    const matches = patterns.filter(p =>
      p.error === errorType &&
      p.solution &&
      p.solution.length > 0
    );

    if (matches.length === 0) {
      return null;
    }

    // Return most frequently seen pattern
    matches.sort((a, b) => b.frequency - a.frequency);
    return matches[0];
  } catch (err) {
    // Fail silently
    return null;
  }
}

/**
 * Extract error type/code from error message
 */
function extractErrorType(error: string): string {
  // Try error code pattern (ENOENT, ECONNREFUSED, etc.)
  const codeMatch = error.match(/\b(E[A-Z0-9]{3,})\b/);
  if (codeMatch) return codeMatch[1];

  // Try TypeScript error pattern (TS2339, etc.)
  const tsMatch = error.match(/TS(\d{4})/);
  if (tsMatch) return `TS${tsMatch[1]}`;

  // Try HTTP status codes
  const httpMatch = error.match(/\b(4\d{2}|5\d{2})\b/);
  if (httpMatch) return `HTTP${httpMatch[1]}`;

  // Try common patterns
  if (error.toLowerCase().includes('no such file')) return 'ENOENT';
  if (error.toLowerCase().includes('connection refused')) return 'ECONNREFUSED';
  if (error.toLowerCase().includes('permission denied')) return 'EACCES';
  if (error.toLowerCase().includes('cannot find module')) return 'MODULE_NOT_FOUND';
  if (error.toLowerCase().includes('syntax error')) return 'SYNTAX_ERROR';
  if (error.toLowerCase().includes('type error')) return 'TYPE_ERROR';
  if (error.toLowerCase().includes('reference error')) return 'REFERENCE_ERROR';

  // Fallback: first line, truncated
  return error.split('\n')[0].slice(0, 50);
}
