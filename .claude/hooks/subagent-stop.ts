#!/usr/bin/env bun
/**
 * SubagentStop Hook
 *
 * Fires when a subagent completes. Logs to subagent-tracking.jsonl
 * and decrements activeSubagents / appends to completedSubagents in mode state.
 *
 * Input: { session_id, agent_id, agent_type, last_assistant_message, agent_transcript_path }
 * Output: none (logging only)
 */

import { readFileSync } from "fs";
import { join } from "path";
import { STATE_DIR } from "./lib/pai-paths";
import { appendJsonl } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";

interface SubagentStopInput {
  session_id?: string;
  agent_id?: string;
  agent_type?: string;
  last_assistant_message?: string;
  agent_transcript_path?: string;
}

async function main() {
  try {
    const input = readFileSync(0, "utf-8");
    if (!input.trim()) process.exit(0);

    const data: SubagentStopInput = JSON.parse(input);

    const sessionId = data.session_id || process.env.CLAUDE_SESSION_ID || "unknown";
    const agentId = data.agent_id || "unknown";
    const agentType = data.agent_type || "unknown";
    const resultSummary = (data.last_assistant_message || "").substring(0, 500);

    // Log to tracking file
    appendJsonl(join(STATE_DIR, "subagent-tracking.jsonl"), {
      timestamp: getISOTimestamp(),
      event: "stop",
      session_id: sessionId,
      agent_id: agentId,
      agent_type: agentType,
      result_length: (data.last_assistant_message || "").length,
      result_summary: resultSummary,
    });

    // Update mode state if active
    try {
      const { existsSync, readFileSync: readFS, writeFileSync, renameSync } = await import("fs");
      const stateFile = join(STATE_DIR, "mode-state.json");
      if (existsSync(stateFile)) {
        const raw = JSON.parse(readFS(stateFile, "utf-8"));
        if (raw.active && raw.deactivationReason === null) {
          raw.activeSubagents = Math.max(0, (raw.activeSubagents || 0) - 1);
          if (!Array.isArray(raw.completedSubagents)) raw.completedSubagents = [];
          raw.completedSubagents.push(`${agentType}:${agentId}`);
          // Cap completedSubagents at 50 to avoid unbounded growth
          if (raw.completedSubagents.length > 50) {
            raw.completedSubagents = raw.completedSubagents.slice(-50);
          }
          const tmp = stateFile + ".tmp";
          writeFileSync(tmp, JSON.stringify(raw, null, 2));
          renameSync(tmp, stateFile);
        }
      }
    } catch {
      // Mode state update is non-critical
    }
  } catch {
    // Never exit(1) from a hook
  }
  process.exit(0);
}

main();
