#!/usr/bin/env bun

/**
 * post-tool-use-audit.ts
 *
 * PostToolUse hook - creates audit trail for tool usage.
 * Factor 5 Compliance: Unify Execution State
 *
 * Logs all tool invocations to thoughts/memory/tool-usage.jsonl
 */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface ToolUseInput {
  tool_name: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  duration_ms?: number;
  session_id?: string;
}

function logToolUsage(data: ToolUseInput): void {
  const logDir = join(homedir(), "qara", "thoughts", "memory");
  const logFile = join(logDir, "tool-usage.jsonl");

  // Ensure directory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  // Truncate large inputs/outputs for storage efficiency
  const truncate = (str: string | undefined, maxLen: number = 500): string => {
    if (!str) return "";
    return str.length > maxLen ? str.substring(0, maxLen) + "...[truncated]" : str;
  };

  const entry = {
    timestamp: new Date().toISOString(),
    tool: data.tool_name,
    duration_ms: data.duration_ms,
    session_id: data.session_id || process.env.SESSION_ID || "unknown",
    // Only log key info, not full input/output (for privacy and size)
    input_keys: data.tool_input ? Object.keys(data.tool_input) : [],
    output_preview: truncate(data.tool_output, 200),
  };

  appendFileSync(logFile, JSON.stringify(entry) + "\n");
}

async function main(): Promise<void> {
  try {
    // Read input from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString("utf-8").trim();

    if (!input) {
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
