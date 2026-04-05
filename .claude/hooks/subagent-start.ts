#!/usr/bin/env bun
/**
 * SubagentStart Hook
 *
 * Fires when a subagent is spawned. Logs to subagent-tracking.jsonl
 * and increments activeSubagents in mode state if a mode is active.
 *
 * Input: { session_id, agent_id, agent_type, cwd, transcript_path }
 * Output: none (logging only)
 */

import { readFileSync } from "fs";
import { join } from "path";
import { STATE_DIR } from "./lib/pai-paths";
import { appendJsonl } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";

interface SubagentStartInput {
  session_id?: string;
  agent_id?: string;
  agent_type?: string;
  cwd?: string;
}

async function main() {
  try {
    const input = readFileSync(0, "utf-8");
    if (!input.trim()) process.exit(0);

    const data: SubagentStartInput = JSON.parse(input);

    const sessionId = data.session_id || process.env.CLAUDE_SESSION_ID || "unknown";
    const agentId = data.agent_id || "unknown";
    const agentType = data.agent_type || "unknown";

    // Log to tracking file
    appendJsonl(join(STATE_DIR, "subagent-tracking.jsonl"), {
      timestamp: getISOTimestamp(),
      event: "start",
      session_id: sessionId,
      agent_id: agentId,
      agent_type: agentType,
    });

    // Update mode state if active
    try {
      const { readModeState } = await import("./lib/mode-state");
      const modeState = readModeState();
      if (modeState) {
        const { existsSync, readFileSync: readFS, writeFileSync, renameSync } = await import("fs");
        const stateFile = join(STATE_DIR, "mode-state.json");
        if (existsSync(stateFile)) {
          const raw = JSON.parse(readFS(stateFile, "utf-8"));
          raw.activeSubagents = (raw.activeSubagents || 0) + 1;
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
