#!/usr/bin/env bun
/**
 * Post-Tool-Use Hook
 *
 * Logs tool execution results for audit trail and debugging.
 * Tracks tool usage patterns and errors.
 */

import { join } from 'path';
import { readFileSync } from 'fs';
import { STATE_DIR } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

interface PostToolInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: string;
  was_error?: boolean;
}

async function main(): Promise<void> {
  try {
    const input = readFileSync(0, 'utf-8');
    if (!input.trim()) return;

    const hookData: PostToolInput = JSON.parse(input);
    const { tool_name, was_error } = hookData;

    const logFile = join(STATE_DIR, 'tool-usage.jsonl');

    appendJsonl(logFile, {
      timestamp: getISOTimestamp(),
      tool: tool_name,
      error: was_error || false,
      session_id: process.env.SESSION_ID || process.env.CLAUDE_SESSION_ID || 'unknown',
    });
  } catch {
    // Non-critical — don't let logging failure affect execution
  }
}

main();
