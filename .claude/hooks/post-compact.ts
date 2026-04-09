#!/usr/bin/env bun
/**
 * PostCompact Hook
 *
 * Fires after CC context compression completes.
 * Verifies checkpoint integrity saved by PreCompact and injects
 * recovery context so Claude can resume seamlessly.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { STATE_DIR, getSessionId } from "./lib/pai-paths";
import { appendJsonl } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";
import { loadCheckpoint, formatCheckpointSummary } from "./lib/compact-checkpoint";
import { readModeState } from "./lib/mode-state";

async function main() {
  try {
    const input = readFileSync(0, "utf-8");
    let sessionId = getSessionId();

    if (input.trim()) {
      try {
        const parsed = JSON.parse(input);
        if (parsed.session_id) sessionId = parsed.session_id;
      } catch { /* use env fallback */ }
    }

    // Load the checkpoint saved by PreCompact
    const checkpoint = loadCheckpoint(sessionId);

    // Log compaction event
    appendJsonl(join(STATE_DIR, "compaction-events.jsonl"), {
      timestamp: getISOTimestamp(),
      event: "post_compact",
      session_id: sessionId,
      checkpoint_found: !!checkpoint,
    });

    if (!checkpoint) {
      process.exit(0);
    }

    // Verify mode state consistency
    const currentMode = readModeState();
    const checkpointMode = checkpoint.mode?.name ?? null;
    const currentModeName = currentMode?.mode ?? null;

    if (checkpointMode !== currentModeName) {
      appendJsonl(join(STATE_DIR, "compaction-events.jsonl"), {
        timestamp: getISOTimestamp(),
        event: "checkpoint_mismatch",
        session_id: sessionId,
        checkpoint_mode: checkpointMode,
        current_mode: currentModeName,
      });
    }

    // Inject recovery context
    const summary = formatCheckpointSummary(checkpoint);
    process.stdout.write(JSON.stringify({
      result: `<system-reminder>CONTEXT COMPACTED — checkpoint verified.\n\n${summary}\n\nResume working from where you left off.</system-reminder>`,
    }));
  } catch (error) {
    console.error("PostCompact error:", error);
  }
  process.exit(0);
}

main();
