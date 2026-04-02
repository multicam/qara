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
import { classifyTopic } from './lib/trace-utils';

async function main() {
  try {
    const input = readFileSync(0, 'utf-8');
    if (!input.trim()) process.exit(0);

    const parsed = JSON.parse(input);
    const lastMessage = parsed.last_assistant_message;

    if (!lastMessage) process.exit(0);

    // CC Stop event provides: last_assistant_message, transcript_path, session_id
    // stop_reason is NOT in the Stop event payload (CC limitation).
    // Infer from message content: tool_use if message ends with tool call patterns,
    // end_turn otherwise. This is a heuristic, not authoritative.
    let stopReason = parsed.stop_reason || 'end_turn';
    if (!parsed.stop_reason) {
      if (/\btool_use\b/.test(lastMessage.slice(-200))) stopReason = 'tool_use';
    }

    const title = generateTabTitle('', lastMessage);
    setTerminalTabTitle(title);

    // Persist session checkpoint for resume capability (Factor 6)
    appendJsonl(join(STATE_DIR, 'session-checkpoints.jsonl'), {
      timestamp: getISOTimestamp(),
      session_id: process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || 'unknown',
      stop_reason: stopReason,
      summary: title || lastMessage.substring(0, 200),
      message_len: lastMessage.length,
      has_code_blocks: /```/.test(lastMessage),
      topic_hint: classifyTopic(lastMessage),
      transcript_path: process.env.CLAUDE_TRANSCRIPT_PATH || '',
      project_dir: process.env.CLAUDE_PROJECT_DIR || '',
    });
  } catch {
    process.exit(0);
  }
}

main().catch(() => {});
