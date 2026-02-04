/**
 * Error Pattern Learning System
 *
 * Tracks recurring errors and suggests known solutions.
 * Part of Factor 6: Learn from Mistakes
 * Enhanced with Factor 9: Error Compaction
 */

import { readFile, appendFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const ERROR_PATTERNS_FILE = join(
  process.env.PAI_DIR || process.env.HOME + '/qara',
  'state/error-patterns.jsonl'
);

export type ErrorCategory =
  | 'syntax'
  | 'runtime'
  | 'network'
  | 'filesystem'
  | 'permission'
  | 'type'
  | 'module'
  | 'database'
  | 'unknown';

export interface ErrorPattern {
  error: string;
  pattern: string;
  solution: string;
  frequency: number;
  lastSeen: number;
  category?: ErrorCategory;
  hash?: string; // For deduplication
}

/**
 * Log an error occurrence to the patterns database with deduplication
 */
export async function logErrorPattern(
  error: string,
  context: string,
  toolName: string
): Promise<void> {
  const errorType = extractErrorType(error);
  const category = categorizeError(errorType, error);
  const hash = generateErrorHash(errorType, context, toolName);
  const autoSolution = RESOLUTION_HINTS[errorType] || '';

  try {
    // Read existing patterns for deduplication
    let existingPatterns: ErrorPattern[] = [];
    if (existsSync(ERROR_PATTERNS_FILE)) {
      const content = await readFile(ERROR_PATTERNS_FILE, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.length > 0);
      existingPatterns = lines.map(line => {
        try {
          return JSON.parse(line) as ErrorPattern;
        } catch {
          return null;
        }
      }).filter((p): p is ErrorPattern => p !== null);
    }

    // Check for duplicate using hash
    const duplicateIndex = existingPatterns.findIndex(p => p.hash === hash);

    if (duplicateIndex !== -1) {
      // Update existing pattern: increment frequency and update lastSeen
      existingPatterns[duplicateIndex].frequency += 1;
      existingPatterns[duplicateIndex].lastSeen = Date.now();

      // Keep user's solution if it exists, otherwise use auto-solution
      if (!existingPatterns[duplicateIndex].solution && autoSolution) {
        existingPatterns[duplicateIndex].solution = autoSolution;
      }

      // Write all patterns back (deduplication complete)
      await writeFile(
        ERROR_PATTERNS_FILE,
        existingPatterns.map(p => JSON.stringify(p)).join('\n') + '\n'
      );
    } else {
      // New error pattern - append to file
      const pattern: ErrorPattern = {
        error: errorType,
        pattern: `${toolName}: ${context.substring(0, 100)}`,
        solution: autoSolution,
        frequency: 1,
        lastSeen: Date.now(),
        category,
        hash
      };

      await appendFile(ERROR_PATTERNS_FILE, JSON.stringify(pattern) + '\n');
    }
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
 * Get all errors grouped by category
 */
export async function getErrorsByCategory(): Promise<Record<ErrorCategory, ErrorPattern[]>> {
  const result: Record<ErrorCategory, ErrorPattern[]> = {
    syntax: [],
    runtime: [],
    network: [],
    filesystem: [],
    permission: [],
    type: [],
    module: [],
    database: [],
    unknown: []
  };

  if (!existsSync(ERROR_PATTERNS_FILE)) {
    return result;
  }

  try {
    const content = await readFile(ERROR_PATTERNS_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    const patterns = lines.map(line => {
      try {
        return JSON.parse(line) as ErrorPattern;
      } catch {
        return null;
      }
    }).filter((p): p is ErrorPattern => p !== null);

    // Group by category
    for (const pattern of patterns) {
      const category = pattern.category || 'unknown';
      result[category].push(pattern);
    }

    // Sort each category by frequency (most common first)
    for (const category in result) {
      result[category as ErrorCategory].sort((a, b) => b.frequency - a.frequency);
    }

    return result;
  } catch (err) {
    return result;
  }
}

/**
 * Get error statistics and insights
 */
export async function getErrorStats(): Promise<{
  total: number;
  byCategory: Record<ErrorCategory, number>;
  topErrors: Array<{ error: string; frequency: number; category: ErrorCategory }>;
  recentErrors: ErrorPattern[];
}> {
  const stats = {
    total: 0,
    byCategory: {
      syntax: 0,
      runtime: 0,
      network: 0,
      filesystem: 0,
      permission: 0,
      type: 0,
      module: 0,
      database: 0,
      unknown: 0
    } as Record<ErrorCategory, number>,
    topErrors: [] as Array<{ error: string; frequency: number; category: ErrorCategory }>,
    recentErrors: [] as ErrorPattern[]
  };

  if (!existsSync(ERROR_PATTERNS_FILE)) {
    return stats;
  }

  try {
    const content = await readFile(ERROR_PATTERNS_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    const patterns = lines.map(line => {
      try {
        return JSON.parse(line) as ErrorPattern;
      } catch {
        return null;
      }
    }).filter((p): p is ErrorPattern => p !== null);

    stats.total = patterns.length;

    // Count by category
    for (const pattern of patterns) {
      const category = pattern.category || 'unknown';
      stats.byCategory[category]++;
    }

    // Get top errors by frequency
    const sortedByFrequency = [...patterns].sort((a, b) => b.frequency - a.frequency);
    stats.topErrors = sortedByFrequency.slice(0, 10).map(p => ({
      error: p.error,
      frequency: p.frequency,
      category: p.category || 'unknown'
    }));

    // Get recent errors (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    stats.recentErrors = patterns
      .filter(p => p.lastSeen > oneDayAgo)
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 10);

    return stats;
  } catch (err) {
    return stats;
  }
}

/**
 * Compact error patterns file by removing old duplicates
 */
export async function compactErrorPatterns(maxAge: number = 90 * 24 * 60 * 60 * 1000): Promise<number> {
  if (!existsSync(ERROR_PATTERNS_FILE)) {
    return 0;
  }

  try {
    const content = await readFile(ERROR_PATTERNS_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    const patterns = lines.map(line => {
      try {
        return JSON.parse(line) as ErrorPattern;
      } catch {
        return null;
      }
    }).filter((p): p is ErrorPattern => p !== null);

    const now = Date.now();
    const cutoff = now - maxAge;

    // Keep patterns that are either recent OR have high frequency
    const kept = patterns.filter(p =>
      p.lastSeen > cutoff || p.frequency >= 5
    );

    const removed = patterns.length - kept.length;

    if (removed > 0) {
      await writeFile(
        ERROR_PATTERNS_FILE,
        kept.map(p => JSON.stringify(p)).join('\n') + '\n'
      );
    }

    return removed;
  } catch (err) {
    return 0;
  }
}

/**
 * Resolution hints for common error patterns
 */
const RESOLUTION_HINTS: Record<string, string> = {
  ENOENT: 'Check if the file/directory exists. Verify the path is correct and use absolute paths when possible.',
  ECONNREFUSED: 'Verify the service is running and the port/host are correct. Check firewall settings.',
  EACCES: 'Check file permissions. You may need to run with sudo or change file ownership.',
  MODULE_NOT_FOUND: 'Run "bun install" to install missing dependencies. Verify the module name is correct.',
  SYNTAX_ERROR: 'Check for missing brackets, quotes, or semicolons. Review the syntax at the line indicated.',
  TYPE_ERROR: 'Verify variable types match expected types. Check for null/undefined values.',
  REFERENCE_ERROR: 'Check if the variable is defined before use. Look for typos in variable names.',
  TS2339: 'Property does not exist on type. Check the type definition or add the property.',
  TS2304: 'Cannot find name. Import the missing type or check for typos.',
  TS2345: 'Argument type mismatch. Check the function signature and passed arguments.',
  TS2741: 'Property missing in type. Add the required property to satisfy the type.',
  HTTP400: 'Bad Request: Verify request parameters and body format.',
  HTTP401: 'Unauthorized: Check authentication credentials or tokens.',
  HTTP403: 'Forbidden: Verify you have permission to access this resource.',
  HTTP404: 'Not Found: Check the URL/endpoint is correct and the resource exists.',
  HTTP429: 'Too Many Requests: Implement rate limiting or back-off strategy.',
  HTTP500: 'Internal Server Error: Check server logs for details.',
  HTTP503: 'Service Unavailable: The service may be down or overloaded. Try again later.',
  SQLITE_ERROR: 'Check SQL syntax and table/column names. Verify database file permissions.',
  SQLITE_CONSTRAINT: 'Constraint violation: Check unique, foreign key, or not-null constraints.',
  EADDRINUSE: 'Port already in use. Kill the existing process or use a different port.',
  ETIMEDOUT: 'Connection timeout: Check network connectivity and increase timeout if needed.',
  CORS_ERROR: 'Configure CORS headers on the server to allow requests from your origin.',
};

/**
 * Categorize error by type
 */
function categorizeError(errorType: string, error: string): ErrorCategory {
  const lowerError = error.toLowerCase();

  // Syntax errors
  if (errorType === 'SYNTAX_ERROR' || lowerError.includes('syntax error') ||
      lowerError.includes('unexpected token')) {
    return 'syntax';
  }

  // TypeScript/Type errors
  if (errorType.startsWith('TS') || errorType === 'TYPE_ERROR' ||
      lowerError.includes('type error')) {
    return 'type';
  }

  // Network errors
  if (errorType.startsWith('HTTP') || errorType === 'ECONNREFUSED' ||
      errorType === 'ETIMEDOUT' || errorType === 'ENOTFOUND' ||
      lowerError.includes('network') || lowerError.includes('cors') ||
      lowerError.includes('connection')) {
    return 'network';
  }

  // Filesystem errors
  if (errorType === 'ENOENT' || errorType === 'EISDIR' ||
      lowerError.includes('no such file') || lowerError.includes('directory')) {
    return 'filesystem';
  }

  // Permission errors
  if (errorType === 'EACCES' || errorType === 'EPERM' ||
      lowerError.includes('permission') || lowerError.includes('access denied')) {
    return 'permission';
  }

  // Module/Import errors
  if (errorType === 'MODULE_NOT_FOUND' || errorType === 'REFERENCE_ERROR' ||
      lowerError.includes('cannot find module') || lowerError.includes('import')) {
    return 'module';
  }

  // Database errors
  if (errorType.includes('SQLITE') || errorType.includes('SQL') ||
      lowerError.includes('database') || lowerError.includes('query')) {
    return 'database';
  }

  // Runtime errors
  if (errorType === 'REFERENCE_ERROR' || lowerError.includes('runtime')) {
    return 'runtime';
  }

  return 'unknown';
}

/**
 * Generate hash for error deduplication
 */
function generateErrorHash(errorType: string, context: string, toolName: string): string {
  const normalized = `${errorType}:${toolName}:${context.substring(0, 50).trim()}`;
  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
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

  // Try SQLite errors
  if (error.includes('SQLITE_')) {
    const sqliteMatch = error.match(/SQLITE_[A-Z]+/);
    if (sqliteMatch) return sqliteMatch[0];
  }

  // Try common patterns
  if (error.toLowerCase().includes('no such file')) return 'ENOENT';
  if (error.toLowerCase().includes('connection refused')) return 'ECONNREFUSED';
  if (error.toLowerCase().includes('permission denied')) return 'EACCES';
  if (error.toLowerCase().includes('cannot find module')) return 'MODULE_NOT_FOUND';
  if (error.toLowerCase().includes('syntax error')) return 'SYNTAX_ERROR';
  if (error.toLowerCase().includes('type error')) return 'TYPE_ERROR';
  if (error.toLowerCase().includes('reference error')) return 'REFERENCE_ERROR';
  if (error.toLowerCase().includes('address already in use')) return 'EADDRINUSE';
  if (error.toLowerCase().includes('timeout')) return 'ETIMEDOUT';
  if (error.toLowerCase().includes('cors')) return 'CORS_ERROR';

  // Fallback: first line, truncated
  return error.split('\n')[0].slice(0, 50);
}
