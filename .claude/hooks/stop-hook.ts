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
import { appendJsonl, truncate, resolveSessionId } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';
import { classifyTopic } from './lib/trace-utils';
import { readModeState, isModeActive, incrementIteration, deactivateWithReason, extendIterations } from './lib/mode-state';
import type { ModeState } from './lib/mode-state';
import { formatMemoryForInjection } from './lib/working-memory';

function emitContinuation(modeState: ModeState, sessionId: string): void {
  let skillContent = '';
  if (modeState.skillPath && existsSync(modeState.skillPath)) {
    skillContent = readFileSync(modeState.skillPath, 'utf-8');
  }

  let antislopNote = '';
  if (modeState.lastCompletedStory) {
    antislopNote = `\n\nMANDATORY SIMPLIFICATION PASS: Before starting the next story, run the simplify workflow on all code changes from story "${modeState.lastCompletedStory}". Only proceed to the next story after simplification is complete.`;
  }

  const extensionNote = (modeState.extensionsUsed ?? 0) > 0
    ? `\nEXTENSION ${modeState.extensionsUsed}/${modeState.maxExtensions}: Iterations extended — focus on completing verification.`
    : '';

  let memorySection = '';
  try {
    const mem = formatMemoryForInjection(sessionId);
    if (mem) memorySection = `\n\n${mem}`;
  } catch { /* non-critical */ }

  const prdNote = modeState.prdPath ? `\nPRD: ${modeState.prdPath}` : '';
  const planNote = modeState.planPath ? `\nPlan: ${modeState.planPath}` : '';

  const continuation = JSON.stringify({
    result: `<system-reminder>MODE CONTINUATION — ${modeState.mode} iteration ${modeState.iteration + 1}/${modeState.maxIterations}${extensionNote}\n\nTask: ${modeState.taskContext}\nCriteria: ${modeState.acceptanceCriteria}${prdNote}${planNote}${antislopNote}${memorySection}\n\n${skillContent}\n\nCONTINUE WORKING.</system-reminder>`,
  });
  process.stdout.write(continuation);

  appendJsonl(join(STATE_DIR, 'mode-changes.jsonl'), {
    timestamp: getISOTimestamp(),
    event: 'continuation',
    mode: modeState.mode,
    iteration: modeState.iteration + 1,
  });
}

async function main() {
  try {
    const input = readFileSync(0, 'utf-8');
    if (!input.trim()) process.exit(0);

    const parsed = JSON.parse(input);
    const sid = resolveSessionId(parsed);
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
      session_id: sid,
      stop_reason: stopReason,
      summary: title || truncate(lastMessage, 200),
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
        // Safety valve: max token budget → deactivate (no extension)
        if (modeState.maxTokensBudget > 0 && modeState.tokensUsed >= modeState.maxTokensBudget) {
          deactivateWithReason('max-tokens');
          appendJsonl(join(STATE_DIR, 'mode-changes.jsonl'), {
            timestamp: getISOTimestamp(),
            event: 'deactivated',
            mode: modeState.mode,
            reason: 'max-tokens',
            tokensUsed: modeState.tokensUsed,
          });
        } else if (modeState.iteration >= modeState.maxIterations) {
          // Ralph-style hardening: try to extend before deactivating.
          // Note: deactivationReason is always null here (readModeState filters
          // deactivated states), so extension gating relies solely on maxExtensions
          // cap inside extendIterations().
          const { extended, newMax } = extendIterations('max-iterations-reached');

          if (!extended) {
            deactivateWithReason('max-iterations');
            appendJsonl(join(STATE_DIR, 'mode-changes.jsonl'), {
              timestamp: getISOTimestamp(),
              event: 'deactivated',
              mode: modeState.mode,
              reason: 'max-iterations',
              iterations: modeState.iteration,
            });
          } else {
            // Extension granted — log and fall through to continuation
            appendJsonl(join(STATE_DIR, 'mode-changes.jsonl'), {
              timestamp: getISOTimestamp(),
              event: 'extended',
              mode: modeState.mode,
              reason: 'max-iterations-reached',
              newMax,
            });
            // Re-read state after extension bumped maxIterations
            const updated = readModeState();
            if (updated) {
              incrementIteration();
              emitContinuation(updated, sid);
            }
          }
        } else {
          // Normal continuation: increment iteration, inject skill content
          incrementIteration();
          emitContinuation(modeState, sid);
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
