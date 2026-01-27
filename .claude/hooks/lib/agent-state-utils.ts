/**
 * agent-state-utils.ts
 *
 * Shared utilities for agent state management.
 * Enables Factor 6: Launch/Pause/Resume for PAI agents.
 *
 * @module agent-state-utils
 */

import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { STATE_DIR, ensureDir } from './pai-paths';

/**
 * Agent state structure
 */
export interface AgentState {
  agent_id: string;
  agent_type: string;
  description: string;
  session_id: string;
  parent_agent_id: string | null;
  start_time: string;
  start_timestamp_ms: number;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  // Completion fields (added by stop hook)
  end_time?: string;
  end_timestamp_ms?: number;
  duration_ms?: number;
  output_summary?: string;
}

/**
 * Get the path to an agent's state file
 */
function getAgentStatePath(agentId: string): string {
  return join(STATE_DIR, 'agents', `${agentId}.json`);
}

/**
 * Read agent state from disk
 *
 * @param agentId - The agent ID to look up
 * @returns The agent state or null if not found
 */
export function getAgentState(agentId: string): AgentState | null {
  const statePath = getAgentStatePath(agentId);

  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const content = readFileSync(statePath, 'utf-8');
    return JSON.parse(content) as AgentState;
  } catch {
    console.error(`Failed to read agent state for ${agentId}`);
    return null;
  }
}

/**
 * Update agent state on disk
 *
 * @param agentId - The agent ID to update
 * @param updates - Partial state updates to merge
 * @returns The updated state or null if agent not found
 */
export function updateAgentState(
  agentId: string,
  updates: Partial<AgentState>
): AgentState | null {
  const currentState = getAgentState(agentId);

  if (!currentState) {
    console.error(`Cannot update agent state: agent ${agentId} not found`);
    return null;
  }

  const updatedState: AgentState = {
    ...currentState,
    ...updates,
  };

  const statePath = getAgentStatePath(agentId);
  ensureDir(join(STATE_DIR, 'agents'));

  try {
    writeFileSync(statePath, JSON.stringify(updatedState, null, 2));
    return updatedState;
  } catch {
    console.error(`Failed to write agent state for ${agentId}`);
    return null;
  }
}

/**
 * Options for finding resumable agents
 */
export interface FindResumableOptions {
  /** Session ID to filter by */
  sessionId?: string;
  /** Topic/description keyword to match */
  topic?: string;
  /** Maximum age in milliseconds for stale detection (default: 5 minutes) */
  staleThresholdMs?: number;
}

/**
 * Find agents that can potentially be resumed
 *
 * Looks for agents with:
 * - status="running" but stale start_time (likely orphaned)
 * - Matching session_id (if provided)
 * - Description containing topic keyword (if provided)
 *
 * @param options - Filter options
 * @returns Array of resumable agent states
 */
export function findResumableAgents(
  options: FindResumableOptions = {}
): AgentState[] {
  const { sessionId, topic, staleThresholdMs = 5 * 60 * 1000 } = options;

  const agentsDir = join(STATE_DIR, 'agents');

  if (!existsSync(agentsDir)) {
    return [];
  }

  const now = Date.now();
  const resumable: AgentState[] = [];

  try {
    const files = readdirSync(agentsDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const filePath = join(agentsDir, file);

      try {
        const content = readFileSync(filePath, 'utf-8');
        const state = JSON.parse(content) as AgentState;

        // Check if agent is stale and running
        if (state.status === 'running') {
          const age = now - state.start_timestamp_ms;

          if (age > staleThresholdMs) {
            // Session ID filter
            if (sessionId && state.session_id !== sessionId) {
              continue;
            }

            // Topic filter (case-insensitive partial match)
            if (
              topic &&
              !state.description.toLowerCase().includes(topic.toLowerCase())
            ) {
              continue;
            }

            resumable.push(state);
          }
        }
      } catch {
        // Skip malformed state files
        continue;
      }
    }
  } catch {
    console.error('Failed to read agents directory');
    return [];
  }

  // Sort by start time (most recent first)
  return resumable.sort((a, b) => b.start_timestamp_ms - a.start_timestamp_ms);
}

/**
 * Mark an agent as completed with summary
 *
 * Convenience function that updates status and records completion metadata
 *
 * @param agentId - The agent ID to complete
 * @param output - The agent's output (will be truncated to 500 chars for summary)
 * @param status - Final status (default: 'completed')
 */
export function completeAgent(
  agentId: string,
  output: string,
  status: 'completed' | 'failed' | 'timeout' = 'completed'
): AgentState | null {
  const state = getAgentState(agentId);

  if (!state) {
    return null;
  }

  const endTimestamp = Date.now();
  const outputSummary = output.slice(0, 500);

  return updateAgentState(agentId, {
    status,
    end_time: new Date().toISOString(),
    end_timestamp_ms: endTimestamp,
    duration_ms: endTimestamp - state.start_timestamp_ms,
    output_summary: outputSummary,
  });
}

/**
 * List all agents with a specific status
 *
 * @param status - The status to filter by
 * @returns Array of agent states with that status
 */
export function listAgentsByStatus(status: AgentState['status']): AgentState[] {
  const agentsDir = join(STATE_DIR, 'agents');

  if (!existsSync(agentsDir)) {
    return [];
  }

  const agents: AgentState[] = [];

  try {
    const files = readdirSync(agentsDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const filePath = join(agentsDir, file);

      try {
        const content = readFileSync(filePath, 'utf-8');
        const state = JSON.parse(content) as AgentState;

        if (state.status === status) {
          agents.push(state);
        }
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }

  return agents;
}
