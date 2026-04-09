#!/usr/bin/env bun
/**
 * StopFailure Hook
 *
 * Fires when a turn ends due to API errors (rate limits, auth failures, etc.).
 * Saves a checkpoint and logs the failure for introspection analysis.
 * Distinct from the normal Stop hook which handles successful turn endings.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { STATE_DIR, getSessionId } from "./lib/pai-paths";
import { appendJsonl } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";
import { saveCheckpoint } from "./lib/compact-checkpoint";

async function main() {
  try {
    const input = readFileSync(0, "utf-8");
    if (!input.trim()) process.exit(0);

    const parsed = JSON.parse(input);
    const error = parsed.error || parsed.stop_reason || "unknown";
    const errorStr = typeof error === "string" ? error : JSON.stringify(error);
    const sessionId = parsed.session_id || getSessionId();

    // Save checkpoint on failure — protects state from lost context
    try {
      saveCheckpoint(sessionId);
    } catch { /* checkpoint failure non-critical */ }

    appendJsonl(join(STATE_DIR, "stop-failures.jsonl"), {
      timestamp: getISOTimestamp(),
      error: errorStr.substring(0, 500),
      session_id: sessionId,
    });

    // Emit guidance
    process.stdout.write(JSON.stringify({
      result: `<system-reminder>SESSION INTERRUPTED: ${errorStr.substring(0, 200)}\n\nCheckpoint saved. State preserved for recovery on next session start.</system-reminder>`,
    }));
  } catch {
    // Never exit(1) from a hook
  }
  process.exit(0);
}

main();
