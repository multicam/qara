#!/usr/bin/env bun

/**
 * stop-hook.ts
 *
 * Stop event hook - triggered when Qara completes a response.
 * 1. Sets terminal tab title based on the assistant's last message
 * 2. Persists session checkpoint for resume capability
 * 3. Mode continuation: if an execution mode is active, injects continuation
 *    message to prevent Claude from stopping until task is complete
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateTabTitle, setTerminalTabTitle } from './lib/tab-titles';
import { STATE_DIR } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';
import { classifyTopic } from './lib/trace-utils';
import { readModeState, isModeActive, incrementIteration, deactivateWithReason } from './lib/mode-state';
import type { ModeState } from './lib/mode-state';
import { formatMemoryForInjection } from './lib/working-memory';

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

    // ─── Mode Continuation ─────────────────────────────────────────────
    // If an execution mode is active, inject continuation to keep working.
    // Safety valves: max iterations, max token budget, deactivation reason.
    try {
      const modeState = readModeState();
      if (modeState && isModeActive(modeState)) {
        // Check safety valves
        if (modeState.iteration >= modeState.maxIterations) {
          deactivateWithReason('max-iterations');
          appendJsonl(join(STATE_DIR, 'mode-changes.jsonl'), {
            timestamp: getISOTimestamp(),
            event: 'deactivated',
            mode: modeState.mode,
            reason: 'max-iterations',
            iterations: modeState.iteration,
          });
        } else if (modeState.maxTokensBudget > 0 && modeState.tokensUsed >= modeState.maxTokensBudget) {
          deactivateWithReason('max-tokens');
          appendJsonl(join(STATE_DIR, 'mode-changes.jsonl'), {
            timestamp: getISOTimestamp(),
            event: 'deactivated',
            mode: modeState.mode,
            reason: 'max-tokens',
            tokensUsed: modeState.tokensUsed,
          });
        } else {
          // Continue: increment iteration, inject skill content
          incrementIteration();

          let skillContent = '';
          if (modeState.skillPath && existsSync(modeState.skillPath)) {
            skillContent = readFileSync(modeState.skillPath, 'utf-8');
          }

          // Build anti-slop instruction if story just completed
          let antislopNote = '';
          if (modeState.lastCompletedStory) {
            antislopNote = `\n\nMANDATORY SIMPLIFICATION PASS: Before starting the next story, run the simplify workflow on all code changes from story "${modeState.lastCompletedStory}". Only proceed to the next story after simplification is complete.`;
          }

          // Inject working memory so critical context survives compression
          let memorySection = '';
          try {
            const mem = formatMemoryForInjection();
            if (mem) memorySection = `\n\n${mem}`;
          } catch { /* non-critical */ }

          const continuation = JSON.stringify({
            result: `<system-reminder>MODE CONTINUATION — ${modeState.mode} iteration ${modeState.iteration + 1}/${modeState.maxIterations}\n\nTask: ${modeState.taskContext}\nCriteria: ${modeState.acceptanceCriteria}${antislopNote}${memorySection}\n\n${skillContent}\n\nCONTINUE WORKING.</system-reminder>`,
          });
          process.stdout.write(continuation);

          appendJsonl(join(STATE_DIR, 'mode-changes.jsonl'), {
            timestamp: getISOTimestamp(),
            event: 'continuation',
            mode: modeState.mode,
            iteration: modeState.iteration + 1,
          });
        }
      }
    } catch {
      // Mode continuation failure must not block normal stop behavior
    }
  } catch {
    process.exit(0);
  }
}

main().catch(() => {});
