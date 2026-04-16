#!/usr/bin/env bun
/**
 * PreCompact Hook
 *
 * Fires before CC compresses the context window. Saves a checkpoint
 * of all runtime state so it can be recovered after compression or crash.
 *
 * Output: system-reminder confirming state was preserved.
 */

import { saveCheckpoint, formatCheckpointSummary } from "./lib/compact-checkpoint";
import { parseStdin, resolveSessionId } from "./lib/jsonl-utils";
import { getSessionId } from "./lib/pai-paths";

async function main() {
  try {
    const parsed = parseStdin();
    const sessionId = parsed ? resolveSessionId(parsed) : getSessionId();

    const checkpoint = saveCheckpoint(sessionId);

    const delegationAdvice =
      "DELEGATION DISCIPLINE: Context is being compressed — intermediate results have accumulated. " +
      "For remaining work, delegate subtasks to typed subagents (always specify subagent_type, never use general-purpose). " +
      "Pass model: 'sonnet' or 'haiku' when spawning Explore agents. " +
      "Less tokens for fluff, more tokens for thinking.";

    const memoryFlush =
      "CONTEXT PRESERVATION: Before this conversation is compressed, save any important " +
      "context that would be lost. Use the Write tool to persist key decisions (and WHY), " +
      "gotchas discovered, and current task state to memory files. " +
      "Target: auto-memory for durable knowledge, working-memory for session-scoped findings. " +
      "Do NOT save: file contents, code snippets, things derivable from code.";

    // Only emit reminder if there was meaningful state to preserve
    const hasState = checkpoint.mode || checkpoint.tddState || checkpoint.prdProgress || checkpoint.workingMemory;
    if (hasState) {
      const summary = formatCheckpointSummary(checkpoint);
      process.stdout.write(JSON.stringify({
        result: `<system-reminder>CHECKPOINT SAVED before context compression.\n\n${summary}\n\n${delegationAdvice}\n\n${memoryFlush}\n\nYour working memory and mode state have been preserved. Continue working.</system-reminder>`,
      }));
    } else {
      // No checkpoint state — still emit delegation advice + memory flush
      process.stdout.write(JSON.stringify({
        result: `<system-reminder>${delegationAdvice}\n\n${memoryFlush}</system-reminder>`,
      }));
    }
  } catch (error) {
    console.error("PreCompact checkpoint error:", error);
    // Never exit(1)
  }
  process.exit(0);
}

main();
