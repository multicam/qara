#!/usr/bin/env bun
/**
 * SubagentStart Hook
 *
 * Fires when a subagent is spawned. Logs to subagent-tracking.jsonl
 * and increments activeSubagents in mode state if a mode is active.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { STATE_DIR, getSessionId } from "./lib/pai-paths";
import { appendJsonl } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";
import { readModeState, updateActiveSubagents } from "./lib/mode-state";

async function main() {
  try {
    const input = readFileSync(0, "utf-8");
    if (!input.trim()) process.exit(0);

    const data = JSON.parse(input);
    const sessionId = data.session_id || getSessionId();
    const agentId = data.agent_id || "unknown";
    const agentType = data.agent_type || "unknown";

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
