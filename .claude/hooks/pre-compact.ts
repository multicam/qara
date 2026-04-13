#!/usr/bin/env bun
/**
 * PreCompact Hook
 *
 * Fires before CC compresses the context window. Saves a checkpoint
 * of all runtime state so it can be recovered after compression or crash.
 *
 * Output: system-reminder confirming state was preserved.
 */

import { readFileSync } from "fs";
import { saveCheckpoint, formatCheckpointSummary } from "./lib/compact-checkpoint";
import { getSessionId } from "./lib/pai-paths";

async function main() {
  try {
    // PreCompact provides: session_id, transcript_path
    const input = readFileSync(0, "utf-8");
    let sessionId = getSessionId();

    if (input.trim()) {
      try {
        const parsed = JSON.parse(input);
        if (parsed.session_id) sessionId = parsed.session_id;
      } catch { /* use env fallback */ }
    }

    const checkpoint = saveCheckpoint(sessionId);

    const delegationAdvice =
      "DELEGATION DISCIPLINE: Context is being compressed — intermediate results have accumulated. " +
      "For remaining work, delegate subtasks to typed subagents (always specify subagent_type, never use general-purpose). " +
      "Pass model: 'sonnet' or 'haiku' when spawning Explore agents. " +
      "Less tokens for fluff, more tokens for thinking.";

    // Only emit reminder if there was meaningful state to preserve
    const hasState = checkpoint.mode || checkpoint.tddState || checkpoint.prdProgress || checkpoint.workingMemory;
    if (hasState) {
      const summary = formatCheckpointSummary(checkpoint);
      process.stdout.write(JSON.stringify({
        result: `<system-reminder>CHECKPOINT SAVED before context compression.\n\n${summary}\n\n${delegationAdvice}\n\nYour working memory and mode state have been preserved. Continue working.</system-reminder>`,
      }));
    } else {
      // No checkpoint state — still emit delegation advice
      process.stdout.write(JSON.stringify({
        result: `<system-reminder>${delegationAdvice}</system-reminder>`,
      }));
    }
  } catch (error) {
    console.error("PreCompact checkpoint error:", error);
    // Never exit(1)
  }
  process.exit(0);
}

main();
