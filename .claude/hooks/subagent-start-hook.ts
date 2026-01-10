#!/usr/bin/env bun

/**
 * subagent-start-hook.ts
 *
 * SubagentStart event hook - triggered when a subagent begins.
 * Logs agent lifecycle for observability (12-Factor Agents compliance).
 */

import { join } from "path";
import { MEMORY_DIR } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

interface SubagentStartInput {
  agent_id?: string;
  agent_type?: string;
  description?: string;
  session_id?: string;
}

function logAgentStart(data: SubagentStartInput): void {
  const logFile = join(MEMORY_DIR, "agent-lifecycle.jsonl");

  const entry = {
    timestamp: getISOTimestamp(),
    event: "AGENT_START",
    agent_id: data.agent_id || "unknown",
    agent_type: data.agent_type || "unknown",
    description: data.description || "",
    session_id: data.session_id || process.env.SESSION_ID || "unknown",
  };

  appendJsonl(logFile, entry);
}

async function main(): Promise<void> {
  try {
    const input = await Bun.stdin.text();
    if (!input.trim()) {
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
