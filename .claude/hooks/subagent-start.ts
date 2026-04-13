#!/usr/bin/env bun
/**
 * SubagentStart Hook
 *
 * Fires when a subagent is spawned. Logs to subagent-tracking.jsonl
 * and increments activeSubagents in mode state if a mode is active.
 */

import { join } from "path";
import { STATE_DIR } from "./lib/pai-paths";
import { appendJsonl, parseStdin, resolveSessionId } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";
import { readModeState, updateActiveSubagents } from "./lib/mode-state";

function main() {
  try {
    const data = parseStdin();
    if (!data) process.exit(0);

    const sessionId = resolveSessionId(data);
    const agentId = (data.agent_id as string) || "unknown";
    const agentType = (data.agent_type as string) || "unknown";

    appendJsonl(join(STATE_DIR, "subagent-tracking.jsonl"), {
      timestamp: getISOTimestamp(),
      event: "start",
      session_id: sessionId,
      agent_id: agentId,
      agent_type: agentType,
    });

    // Monitor: flag untyped spawns for introspection. Stderr only, not enforcement.
    if (agentType === "unknown" || agentType === "general-purpose") {
      console.error(`[subagent-start] WARN: untyped agent spawn (${agentType}). Should use typed subagent_type.`);
    }

    try {
      if (readModeState()) updateActiveSubagents(1);
    } catch { /* non-critical */ }
  } catch {
    // Never exit(1) from a hook
  }
  process.exit(0);
}

main();
