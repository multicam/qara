#!/usr/bin/env bun
/**
 * PermissionDenied Hook
 *
 * Fires when the auto-mode classifier or user denies a tool call.
 * Logs denied permissions for introspection analysis and security auditing.
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
    const toolName = parsed.tool_name || "unknown";
    const toolInput = parsed.tool_input || {};
    const sessionId = parsed.session_id || getSessionId();

    // Extract command summary for Bash, file path for file ops
    let summary = "";
    if (toolName === "Bash") {
      summary = (toolInput.command || "").substring(0, 200);
    } else if (toolInput.file_path) {
      summary = toolInput.file_path;
    }

    appendJsonl(join(STATE_DIR, "permission-denied.jsonl"), {
      timestamp: getISOTimestamp(),
      tool: toolName,
      summary,
      session_id: sessionId,
    });
  } catch {
    // Never exit(1) from a hook
  }
  process.exit(0);
}

main();
