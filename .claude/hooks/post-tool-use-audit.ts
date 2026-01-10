#!/usr/bin/env bun

/**
 * post-tool-use-audit.ts
 *
 * PostToolUse hook - creates audit trail for tool usage.
 * Factor 5 Compliance: Unify Execution State
 *
 * Logs all tool invocations to thoughts/memory/tool-usage.jsonl
 */

import { join } from "path";
import { MEMORY_DIR } from './lib/pai-paths';
import { appendJsonl, truncate } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

interface ToolUseInput {
  tool_name: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  duration_ms?: number;
  session_id?: string;
}

function logToolUsage(data: ToolUseInput): void {
  const logFile = join(MEMORY_DIR, "tool-usage.jsonl");

  const entry = {
    timestamp: getISOTimestamp(),
    tool: data.tool_name,
    duration_ms: data.duration_ms,
    session_id: data.session_id || process.env.SESSION_ID || "unknown",
    input_keys: data.tool_input ? Object.keys(data.tool_input) : [],
    output_preview: truncate(data.tool_output, 200),
  };

  appendJsonl(logFile, entry);
}

async function main(): Promise<void> {
  try {
    const input = await Bun.stdin.text();
    if (!input.trim()) {
      process.exit(0);
    }

    const data: ToolUseInput = JSON.parse(input);

    // Skip logging for certain high-frequency, low-value tools
    const skipTools = ["TodoRead"]; // Add tools to skip if needed
    if (skipTools.includes(data.tool_name)) {
      process.exit(0);
    }

    logToolUsage(data);

  } catch (error) {
    // Fail silently - don't block tool execution
    console.error("Tool audit hook error:", error);
  }
}

main();
