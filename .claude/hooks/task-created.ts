#!/usr/bin/env bun
/**
 * TaskCreated Hook
 *
 * Fires when a task is created via TaskCreate.
 * Logs task creation events for delegation metrics and introspection.
 */

import { join } from "path";
import { STATE_DIR } from "./lib/pai-paths";
import { appendJsonl, parseStdin, resolveSessionId, truncate } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";

function main() {
  try {
    const parsed = parseStdin();
    if (!parsed) process.exit(0);

    appendJsonl(join(STATE_DIR, "task-events.jsonl"), {
      timestamp: getISOTimestamp(),
      event: "created",
      task_id: (parsed.task_id as string) || (parsed.id as string) || "unknown",
      subject: truncate(parsed.subject as string, 200),
      session_id: resolveSessionId(parsed),
    });
  } catch {
    // Never exit(1) from a hook
  }
  process.exit(0);
}

main();
