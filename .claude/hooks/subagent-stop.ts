#!/usr/bin/env bun
/**
 * SubagentStop Hook
 *
 * Fires when a subagent completes. Logs to subagent-tracking.jsonl
 * and decrements activeSubagents / appends to completedSubagents in mode state.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { STATE_DIR, getSessionId } from "./lib/pai-paths";
import { appendJsonl } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";
import { readModeState, updateActiveSubagents, appendCompletedSubagent } from "./lib/mode-state";

async function main() {
  try {
    const input = readFileSync(0, "utf-8");
    if (!input.trim()) process.exit(0);

    const data = JSON.parse(input);
    const sessionId = data.session_id || getSessionId();
    const agentId = data.agent_id || "unknown";
    const agentType = data.agent_type || "unknown";
    const resultSummary = (data.last_assistant_message || "").substring(0, 500);

    appendJsonl(join(STATE_DIR, "subagent-tracking.jsonl"), {
      timestamp: getISOTimestamp(),
      event: "stop",
      session_id: sessionId,
      agent_id: agentId,
      agent_type: agentType,
      result_length: (data.last_assistant_message || "").length,
      result_summary: resultSummary,
    });

    try {
      if (readModeState()) {
        updateActiveSubagents(-1);
        appendCompletedSubagent(`${agentType}:${agentId}`);
      }
    } catch { /* non-critical */ }
  } catch {
    // Never exit(1) from a hook
  }
  process.exit(0);
}

main();
