/**
 * Checkpoint Event Tracking Utilities
 *
 * Provides logging and analysis for checkpoint-related events.
 * Supports Factor 6: Launch, Pause, Resume
 */

import { join } from 'path';
import { STATE_DIR, ensureDir } from './pai-paths';
import { appendJsonl } from './jsonl-utils';
import { getISOTimestamp } from './datetime-utils';

const CHECKPOINT_LOG = join(STATE_DIR, 'checkpoint-events.jsonl');

export type CheckpointEventType =
  | 'pre_destructive'      // Before a destructive operation
  | 'iteration_warning'    // Iteration loop detected
  | 'recovery_suggested'   // Recovery suggestion made
  | 'error_threshold'      // Error threshold exceeded
  | 'manual_checkpoint';   // User requested checkpoint

export interface CheckpointEvent {
  timestamp: string;
  event: CheckpointEventType;
  operation?: string;
  session_id?: string;
  error_count?: number;
  suggestion?: string;
  context?: Record<string, unknown>;
}

/**
 * Log a checkpoint-related event
 */
export function logCheckpointEvent(
  event: CheckpointEventType,
  details: Omit<CheckpointEvent, 'timestamp' | 'event'>
): void {
  const entry: CheckpointEvent = {
    timestamp: getISOTimestamp(),
    event,
    session_id: process.env.SESSION_ID || 'unknown',
    ...details
  };

  try {
    ensureDir(STATE_DIR);
    appendJsonl(CHECKPOINT_LOG, entry);
  } catch (e) {
    console.error(`Failed to log checkpoint event: ${e}`);
  }
}

/**
 * Patterns that indicate destructive operations
 */
export const DESTRUCTIVE_PATTERNS: Array<{ pattern: RegExp; operation: string }> = [
  { pattern: /rm\s+(-[rfRF]+\s+)*/, operation: 'file deletion' },
  { pattern: /git\s+reset\s+--hard/, operation: 'git hard reset' },
  { pattern: /git\s+push.*--force/, operation: 'git force push' },
  { pattern: /git\s+clean/, operation: 'git clean' },
  { pattern: /DROP\s+(DATABASE|TABLE)/i, operation: 'database drop' },
  { pattern: /TRUNCATE\s+TABLE/i, operation: 'table truncation' },
  { pattern: /DELETE\s+FROM\s+\w+\s*(;|$)/i, operation: 'delete without WHERE' },
];

/**
 * Check if a command is destructive and log if so
 */
export function checkAndLogDestructive(command: string): boolean {
  for (const { pattern, operation } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(command)) {
      logCheckpointEvent('pre_destructive', {
        operation,
        context: { command: command.substring(0, 200) }
      });
      return true;
    }
  }
  return false;
}

/**
 * Error threshold configuration
 */
export const ERROR_THRESHOLDS = {
  SUGGEST_REWIND: 3,       // Suggest /rewind after this many similar errors
  ITERATION_WARNING: 3,    // Warn about iteration loop
  MAX_ITERATIONS: 5        // Maximum iterations before forcing stop
};

/**
 * Track error occurrences and suggest recovery when threshold exceeded
 */
export function trackErrorAndSuggestRecovery(
  errorType: string,
  errorCount: number
): string | null {
  if (errorCount >= ERROR_THRESHOLDS.SUGGEST_REWIND) {
    const suggestion = `Consider \`/rewind\` - ${errorCount} similar errors detected. Try a different approach.`;

    logCheckpointEvent('recovery_suggested', {
      error_count: errorCount,
      suggestion,
      context: { error_type: errorType }
    });

    return suggestion;
  }
  return null;
}

/**
 * Detect iteration loops and suggest recovery
 */
export function detectIterationLoop(
  iterationCount: number,
  context: string
): { warn: boolean; stop: boolean; suggestion: string | null } {
  if (iterationCount >= ERROR_THRESHOLDS.MAX_ITERATIONS) {
    const suggestion = `STOP: ${iterationCount} iterations without convergence. Use \`/rewind\` and try fundamentally different approach.`;

    logCheckpointEvent('iteration_warning', {
      error_count: iterationCount,
      suggestion,
      context: { description: context }
    });

    return { warn: true, stop: true, suggestion };
  }

  if (iterationCount >= ERROR_THRESHOLDS.ITERATION_WARNING) {
    const suggestion = `Warning: ${iterationCount} iterations. Consider \`/rewind\` if not making progress.`;

    logCheckpointEvent('iteration_warning', {
      error_count: iterationCount,
      suggestion,
      context: { description: context }
    });

    return { warn: true, stop: false, suggestion };
  }

  return { warn: false, stop: false, suggestion: null };
}
