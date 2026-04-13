#!/usr/bin/env bun
/**
 * StopFailure Hook
 *
 * Fires when a turn ends due to API errors (rate limits, auth failures, etc.).
 * Saves a checkpoint and logs the failure for introspection analysis.
 * Distinct from the normal Stop hook which handles successful turn endings.
 */

import { join } from "path";
import { STATE_DIR } from "./lib/pai-paths";
import { appendJsonl, parseStdin, resolveSessionId, truncate } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";
import { saveCheckpoint } from "./lib/compact-checkpoint";

function main() {
  try {
    const parsed = parseStdin();
    if (!parsed) process.exit(0);

    const error = parsed.error || parsed.stop_reason || "unknown";
    const errorStr = typeof error === "string" ? error : JSON.stringify(error);
    const sessionId = resolveSessionId(parsed);

    // Save checkpoint on failure — protects state from lost context
    try {
      saveCheckpoint(sessionId);
    } catch { /* checkpoint failure non-critical */ }

    appendJsonl(join(STATE_DIR, "stop-failures.jsonl"), {
      timestamp: getISOTimestamp(),
      error: truncate(errorStr, 500),
      session_id: sessionId,
    });

    // Emit guidance
    process.stdout.write(JSON.stringify({
      result: `<system-reminder>SESSION INTERRUPTED: ${truncate(errorStr, 200)}\n\nCheckpoint saved. State preserved for recovery on next session start.</system-reminder>`,
    }));
  } catch {
    // Never exit(1) from a hook
  }
  process.exit(0);
}

main();
