#!/usr/bin/env bun

/**
 * subagent-start-hook.ts
 *
 * SubagentStart event hook - triggered when a subagent begins.
 * Logs agent lifecycle for observability (12-Factor Agents compliance).
 */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface SubagentStartInput {
  agent_id?: string;
  agent_type?: string;
  description?: string;
  session_id?: string;
}

function logAgentStart(data: SubagentStartInput): void {
  const logDir = join(homedir(), "qara", "thoughts", "memory");
  const logFile = join(logDir, "agent-lifecycle.jsonl");

  // Ensure directory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    event: "AGENT_START",
    agent_id: data.agent_id || "unknown",
    agent_type: data.agent_type || "unknown",
    description: data.description || "",
    session_id: data.session_id || process.env.SESSION_ID || "unknown",
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

    const data: SubagentStartInput = JSON.parse(input);
    logAgentStart(data);

    // Output for observability
    console.error(`[SubagentStart] ${data.agent_type || "unknown"}: ${data.description || ""}`);

  } catch (error) {
    // Fail silently - don't block agent execution
    console.error("SubagentStart hook error:", error);
  }
}

main();
