#!/usr/bin/env bun
/**
 * PermissionDenied Hook
 *
 * Fires when the auto-mode classifier or user denies a tool call.
 * Logs denied permissions for introspection analysis and security auditing.
 */

import { join } from "path";
import { STATE_DIR } from "./lib/pai-paths";
import { appendJsonl, parseStdin, resolveSessionId, truncate } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";

function main() {
  try {
    const parsed = parseStdin();
    if (!parsed) process.exit(0);

    const toolName = (parsed.tool_name as string) || "unknown";
    const toolInput = (parsed.tool_input as Record<string, string>) || {};

    // Extract command summary for Bash, file path for file ops
    let summary = "";
    if (toolName === "Bash") {
      summary = truncate(toolInput.command, 200);
    } else if (toolInput.file_path) {
      summary = toolInput.file_path;
    }

    appendJsonl(join(STATE_DIR, "permission-denied.jsonl"), {
      timestamp: getISOTimestamp(),
      tool: toolName,
      summary,
      session_id: resolveSessionId(parsed),
    });
  } catch {
    // Never exit(1) from a hook
  }
  process.exit(0);
}

main();
