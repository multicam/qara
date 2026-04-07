#!/usr/bin/env bun
/**
 * Post-Tool-Use Hook
 *
 * Logs tool execution results for audit trail and debugging.
 * Tracks tool usage patterns and errors.
 */

import { join } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { STATE_DIR, getSessionsDir, ensureDir, getSessionId } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';
import { extractInputSummary, extractErrorDetail } from './lib/trace-utils';

interface PostToolInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: string;
  was_error?: boolean;
}

async function main(): Promise<void> {
  const hookStart = Date.now();
  try {
    const input = readFileSync(0, 'utf-8');
    if (!input.trim()) return;

    const hookData: PostToolInput = JSON.parse(input);
    const { tool_name, tool_input, tool_output, was_error } = hookData;

    const logFile = join(STATE_DIR, 'tool-usage.jsonl');

    appendJsonl(logFile, {
      timestamp: getISOTimestamp(),
      tool: tool_name,
      error: was_error || false,
      session_id: getSessionId(),
      input_summary: extractInputSummary(tool_name, tool_input || {}),
      output_len: typeof tool_output === 'string' ? tool_output.length : 0,
      error_detail: (was_error && tool_output) ? extractErrorDetail(tool_output) : null,
      duration_ms: Date.now() - hookStart,
    });

    // Maintain session read ledger for read-before-edit enforcement (#42796)
    if (tool_name === 'Read' && !was_error) {
      const filePath = (tool_input || {}).file_path as string;
      if (filePath) {
        try {
          const sessionDir = join(getSessionsDir(), getSessionId());
          ensureDir(sessionDir);
          const ledgerPath = join(sessionDir, 'files-read.json');
          const existing: string[] = existsSync(ledgerPath)
            ? JSON.parse(readFileSync(ledgerPath, 'utf-8'))
            : [];
          const asSet = new Set(existing);
          asSet.add(filePath);
          writeFileSync(ledgerPath, JSON.stringify([...asSet]));
        } catch { /* non-critical — don't block on ledger failure */ }
      }
    }
  } catch {
    // Non-critical — don't let logging failure affect execution
  }
}

main();
