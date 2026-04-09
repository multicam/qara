#!/usr/bin/env bun
/**
 * TaskCreated Hook
 *
 * Fires when a task is created via TaskCreate.
 * Logs task creation events for delegation metrics and introspection.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { STATE_DIR, getSessionId } from "./lib/pai-paths";
import { appendJsonl } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";

async function main() {
  try {
    const input = readFileSync(0, "utf-8");
    if (!input.trim()) process.exit(0);

    const parsed = JSON.parse(input);
    const taskId = parsed.task_id || parsed.id || "unknown";
    const subject = parsed.subject || "";
    const sessionId = parsed.session_id || getSessionId();

    appendJsonl(join(STATE_DIR, "task-events.jsonl"), {
      timestamp: getISOTimestamp(),
      event: "created",
      task_id: taskId,
      subject: subject.substring(0, 200),
      session_id: sessionId,
    });
  } catch {
    // Never exit(1) from a hook
  }
  process.exit(0);
}

main();
