#!/usr/bin/env bun
/**
 * post-tool-failure.ts
 *
 * PostToolUseFailure hook: tracks consecutive tool failures and injects
 * escalation guidance when the same approach is failing repeatedly.
 *
 * At 5+ consecutive failures of the same tool: emits a system-reminder
 * telling Claude to stop retrying and try a different strategy.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { STATE_DIR, ensureDir } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

const FAILURE_STATE_FILE = join(STATE_DIR, 'tool-failure-tracking.json');
const ESCALATION_THRESHOLD = 5;

interface FailureTracking {
  tool: string;
  consecutiveFailures: number;
  lastError: string;
  updatedAt: string;
}

function readTracking(): FailureTracking | null {
  try {
    if (!existsSync(FAILURE_STATE_FILE)) return null;
    return JSON.parse(readFileSync(FAILURE_STATE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeTracking(tracking: FailureTracking): void {
  ensureDir(STATE_DIR);
  writeFileSync(FAILURE_STATE_FILE, JSON.stringify(tracking, null, 2));
}

async function main() {
  try {
    const input = readFileSync(0, 'utf-8');
    if (!input.trim()) process.exit(0);

    const parsed = JSON.parse(input);
    const toolName = parsed.tool_name || 'unknown';
    const error = parsed.error || parsed.tool_error || '';
    const errorStr = typeof error === 'string' ? error.substring(0, 500) : JSON.stringify(error).substring(0, 500);

    // Track consecutive failures
    const current = readTracking();
    let consecutive = 1;

    if (current && current.tool === toolName) {
      consecutive = current.consecutiveFailures + 1;
    }
    // Different tool = reset counter

    writeTracking({
      tool: toolName,
      consecutiveFailures: consecutive,
      lastError: errorStr,
      updatedAt: getISOTimestamp(),
    });

    // Log failure
    appendJsonl(join(STATE_DIR, 'tool-failures.jsonl'), {
      timestamp: getISOTimestamp(),
      tool: toolName,
      error: errorStr,
      consecutive,
      session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
    });

    // Escalate at threshold
    if (consecutive >= ESCALATION_THRESHOLD) {
      const result = JSON.stringify({
        result: `<system-reminder>REPEATED FAILURE DETECTED: ${toolName} has failed ${consecutive} times consecutively.\n\nLast error: ${errorStr}\n\nSTOP retrying the same approach. Read the error carefully. Try a fundamentally different strategy:\n- If a command fails: use a different command or approach\n- If a file operation fails: check the path exists and permissions\n- If a test fails: re-read the test to understand what it actually expects\n- If stuck: ask JM for guidance\n\nDo NOT retry the same failing operation.</system-reminder>`,
      });
      process.stdout.write(result);
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

main();
