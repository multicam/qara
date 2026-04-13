#!/usr/bin/env bun
/**
 * SubagentStop Hook
 *
 * Fires when a subagent completes. Logs to subagent-tracking.jsonl
 * and decrements activeSubagents / appends to completedSubagents in mode state.
 */

import { join } from "path";
import { STATE_DIR } from "./lib/pai-paths";
import { appendJsonl, parseStdin, resolveSessionId, truncate } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";
import { readModeState, updateActiveSubagents, appendCompletedSubagent } from "./lib/mode-state";

function main() {
  try {
    const data = parseStdin();
    if (!data) process.exit(0);

    const sessionId = resolveSessionId(data);
    const agentId = (data.agent_id as string) || "unknown";
    const agentType = (data.agent_type as string) || "unknown";
    const rawMessage = (data.last_assistant_message as string) || "";
    const resultSummary = truncate(rawMessage, 500);

    appendJsonl(join(STATE_DIR, "subagent-tracking.jsonl"), {
      timestamp: getISOTimestamp(),
      event: "stop",
      session_id: sessionId,
      agent_id: agentId,
      agent_type: agentType,
      result_length: rawMessage.length,
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
