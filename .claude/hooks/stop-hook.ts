#!/usr/bin/env bun

/**
 * stop-hook.ts
 *
 * Stop event hook - triggered when Qara completes a response.
 * Sets terminal tab title based on the assistant's last message.
 * Uses CC 2.1.x `last_assistant_message` field (no transcript parsing needed).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { generateTabTitle, setTerminalTabTitle } from './lib/tab-titles';
import { STATE_DIR } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

async function main() {
  try {
    const input = readFileSync(0, 'utf-8');
    if (!input.trim()) process.exit(0);

    const parsed = JSON.parse(input);
    const lastMessage = parsed.last_assistant_message;

    if (!lastMessage) process.exit(0);

    const title = generateTabTitle('', lastMessage);
    setTerminalTabTitle(title);

    // Persist session checkpoint for resume capability (Factor 6)
    appendJsonl(join(STATE_DIR, 'session-checkpoints.jsonl'), {
      timestamp: getISOTimestamp(),
      session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
      stop_reason: parsed.stop_reason || 'unknown',
      summary: title || lastMessage.substring(0, 200),
    });
  } catch {
    process.exit(0);
  }
}

main().catch(() => {});
