#!/usr/bin/env bun

/**
 * subagent-start-hook.ts
 *
 * SubagentStart event hook - triggered when a subagent begins.
 * Enhanced with:
 * - Parent-child agent relationship tracking
 * - State initialization for resume capability
 * - Agent-type specific environment setup
 * - Performance timing for observability
 *
 * Part of 12-Factor Agents compliance (Factor 10: Small Focused Agents)
 */

import { join } from "path";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { MEMORY_DIR, STATE_DIR, ensureDir } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

interface SubagentStartInput {
  agent_id?: string;
  agent_type?: string;
  description?: string;
  session_id?: string;
  parent_agent_id?: string;
  prompt?: string;
}

interface AgentState {
  agent_id: string;
  agent_type: string;
  description: string;
  session_id: string;
  parent_agent_id: string | null;
  start_time: string;
  start_timestamp_ms: number;
  status: "running" | "completed" | "failed";
}

/**
 * Record agent lifecycle event to JSONL log
 */
function logAgentStart(data: SubagentStartInput): void {
  const logFile = join(MEMORY_DIR, "agent-lifecycle.jsonl");
  ensureDir(MEMORY_DIR);

  const entry = {
    timestamp: getISOTimestamp(),
    event: "AGENT_START",
    agent_id: data.agent_id || "unknown",
    agent_type: data.agent_type || "unknown",
    description: data.description || "",
    session_id: data.session_id || process.env.SESSION_ID || "unknown",
    parent_agent_id: data.parent_agent_id || null,
  };

  appendJsonl(logFile, entry);
}

/**
 * Initialize agent state file for resume capability
 * This enables Factor 6: Launch/Pause/Resume
 */
function initializeAgentState(data: SubagentStartInput): void {
  const agentId = data.agent_id || "unknown";
  const stateFile = join(STATE_DIR, "agents", `${agentId}.json`);

  ensureDir(join(STATE_DIR, "agents"));

  const state: AgentState = {
    agent_id: agentId,
    agent_type: data.agent_type || "unknown",
    description: data.description || "",
    session_id: data.session_id || process.env.SESSION_ID || "unknown",
    parent_agent_id: data.parent_agent_id || null,
    start_time: getISOTimestamp(),
    start_timestamp_ms: Date.now(),
    status: "running",
  };

  writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

/**
 * Record parent-child agent relationships
 * Enables hierarchical delegation tracking
 */
function recordAgentRelationship(data: SubagentStartInput): void {
  if (!data.parent_agent_id) return;

  const relationshipsFile = join(STATE_DIR, "agent-relationships.jsonl");
  ensureDir(STATE_DIR);

  const entry = {
    timestamp: getISOTimestamp(),
    parent_agent_id: data.parent_agent_id,
    child_agent_id: data.agent_id || "unknown",
    agent_type: data.agent_type || "unknown",
    description: data.description || "",
  };

  appendJsonl(relationshipsFile, entry);
}

/**
 * Set agent-type specific environment variables
 * Provides context optimization hints
 */
function setupAgentEnvironment(data: SubagentStartInput): void {
  const agentType = data.agent_type || "unknown";

  // Set current agent context for child processes
  process.env.CURRENT_AGENT_TYPE = agentType;
  process.env.CURRENT_AGENT_ID = data.agent_id || "unknown";

  // Agent-type specific optimizations
  switch (agentType) {
    case "codebase-locator":
    case "thoughts-locator":
      // Read-only agents - disable write operations for safety
      process.env.AGENT_READ_ONLY = "true";
      break;

    case "codebase-analyzer":
    case "thoughts-analyzer":
      // Analysis agents - increase context budget
      process.env.AGENT_CONTEXT_MODE = "deep";
      break;

    case "spotcheck":
      // Verification agents - need full recent context
      process.env.AGENT_CONTEXT_MODE = "full";
      break;

    default:
      // Standard agents
      process.env.AGENT_CONTEXT_MODE = "normal";
  }
}

/**
 * Display agent start notification
 * Provides visual feedback for delegation
 */
function displayAgentStartNotification(data: SubagentStartInput): void {
  const agentType = data.agent_type || "unknown";
  const description = data.description || "";
  const isChild = data.parent_agent_id ? "↳" : "→";

  console.error(`[SubagentStart] ${isChild} ${agentType}: ${description.substring(0, 80)}${description.length > 80 ? "..." : ""}`);
}

async function main(): Promise<void> {
  try {
    const input = await Bun.stdin.text();
    if (!input.trim()) {
      process.exit(0);
    }

    const data: SubagentStartInput = JSON.parse(input);

    // Execute all initialization steps
    logAgentStart(data);
    initializeAgentState(data);
    recordAgentRelationship(data);
    setupAgentEnvironment(data);
    displayAgentStartNotification(data);

  } catch (error) {
    // Fail silently - don't block agent execution
    console.error("SubagentStart hook error:", error);
  }
}

main();
