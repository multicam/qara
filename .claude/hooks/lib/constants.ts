/**
 * Constants for Claude Code Hooks
 * Migrated from Python: utils/constants.py
 */

import { join } from 'path';
import { mkdir } from 'fs/promises';

// Base directory for all logs
export const LOG_BASE_DIR = process.env.CLAUDE_HOOKS_LOG_DIR || 'logs';

/**
 * Get the log directory for a specific session.
 */
export function getSessionLogDir(sessionId: string): string {
  return join(LOG_BASE_DIR, sessionId);
}

/**
 * Ensure the log directory for a session exists.
 */
export async function ensureSessionLogDir(sessionId: string): Promise<string> {
  const logDir = getSessionLogDir(sessionId);
  await mkdir(logDir, { recursive: true });
  return logDir;
}
