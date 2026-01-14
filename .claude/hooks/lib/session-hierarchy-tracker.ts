/**
 * Session Hierarchy Tracker for Agent Lens
 *
 * Tracks parent-child relationships between events within a session.
 * Enables span hierarchy visualization in the Agent Lens dashboard.
 *
 * Key concepts:
 * - SessionStart is the root of the hierarchy
 * - UserPromptSubmit creates a new context for tool calls
 * - PreToolUse/PostToolUse are paired by tool_use_id
 * - SubagentStop links back to the Task PreToolUse that spawned it
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PAI_DIR } from './pai-paths';

interface SessionState {
  sessionStartEventId: string | null;
  lastUserPromptEventId: string | null;
  lastStopEventId: string | null;
  preToolUseMap: Record<string, string>; // tool_use_id → event_id
  taskToolMap: Record<string, string>;   // task_id → event_id (for SubagentStop linking)
  createdAt: number;
  lastAccessAt: number;
}

// In-memory state cache (cleared on process exit - hooks are short-lived)
const stateCache = new Map<string, SessionState>();

const STATE_FILE_PATH = join(PAI_DIR, 'state', 'session-hierarchy.json');

/**
 * Get state file path (for external access if needed)
 */
export function getStateFilePath(): string {
  return STATE_FILE_PATH;
}

/**
 * Load session state from disk
 * Falls back to empty state if not found
 */
function loadSessionState(sessionId: string): SessionState {
  // Check cache first
  if (stateCache.has(sessionId)) {
    return stateCache.get(sessionId)!;
  }

  // Try to load from disk
  try {
    if (existsSync(STATE_FILE_PATH)) {
      const allStates = JSON.parse(readFileSync(STATE_FILE_PATH, 'utf-8'));
      if (allStates[sessionId]) {
        const state = allStates[sessionId];
        stateCache.set(sessionId, state);
        return state;
      }
    }
  } catch (error) {
    // Ignore errors, return default state
  }

  // Return default state
  const defaultState: SessionState = {
    sessionStartEventId: null,
    lastUserPromptEventId: null,
    lastStopEventId: null,
    preToolUseMap: {},
    taskToolMap: {},
    createdAt: Date.now(),
    lastAccessAt: Date.now()
  };

  stateCache.set(sessionId, defaultState);
  return defaultState;
}

/**
 * Save session state to disk
 */
function saveSessionState(sessionId: string, state: SessionState): void {
  try {
    // Update cache
    state.lastAccessAt = Date.now();
    stateCache.set(sessionId, state);

    // Load all states
    let allStates: Record<string, SessionState> = {};
    if (existsSync(STATE_FILE_PATH)) {
      allStates = JSON.parse(readFileSync(STATE_FILE_PATH, 'utf-8'));
    }

    // Update this session
    allStates[sessionId] = state;

    // Clean up old sessions (keep last 100)
    const entries = Object.entries(allStates);
    if (entries.length > 100) {
      const sorted = entries.sort((a, b) => b[1].lastAccessAt - a[1].lastAccessAt);
      allStates = Object.fromEntries(sorted.slice(0, 100));
    }

    // Write back
    writeFileSync(STATE_FILE_PATH, JSON.stringify(allStates, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save session state:', error);
    // Don't block on save errors
  }
}

/**
 * Determine parent event ID based on hook event type and current session state
 */
export function getParentEventId(
  sessionId: string,
  hookEventType: string,
  payload: any
): string | null {
  const state = loadSessionState(sessionId);

  switch (hookEventType) {
    case 'SessionStart':
      // Root event - no parent
      return null;

    case 'UserPromptSubmit':
      // Child of SessionStart
      return state.sessionStartEventId;

    case 'PreToolUse':
      // Child of last UserPromptSubmit (or last Stop if continuing)
      return state.lastUserPromptEventId || state.lastStopEventId;

    case 'PostToolUse':
      // Child of matching PreToolUse (paired by tool_use_id)
      const toolUseId = payload.tool_use_id;
      if (toolUseId && state.preToolUseMap[toolUseId]) {
        return state.preToolUseMap[toolUseId];
      }
      // Fallback: child of last UserPromptSubmit
      return state.lastUserPromptEventId;

    case 'Stop':
      // Child of last UserPromptSubmit
      return state.lastUserPromptEventId;

    case 'SubagentStop':
      // Child of the Task PreToolUse that spawned this agent
      // Attempt to find by task_id in payload
      const taskId = payload.task_id;
      if (taskId && state.taskToolMap[taskId]) {
        return state.taskToolMap[taskId];
      }
      // Fallback: child of last UserPromptSubmit
      return state.lastUserPromptEventId;

    case 'SessionEnd':
      // Child of SessionStart (final event in session)
      return state.sessionStartEventId;

    case 'PreCompact':
      // Child of last UserPromptSubmit
      return state.lastUserPromptEventId;

    case 'Notification':
      // Child of last UserPromptSubmit
      return state.lastUserPromptEventId;

    default:
      // Unknown event type - default to last UserPromptSubmit
      return state.lastUserPromptEventId;
  }
}

/**
 * Get OpenTelemetry span kind for event type
 */
export function getSpanKind(hookEventType: string): string {
  switch (hookEventType) {
    case 'SessionStart':
      return 'root';

    case 'PreToolUse':
    case 'PostToolUse':
      return 'client'; // Claude calling external tools

    case 'UserPromptSubmit':
    case 'Stop':
    case 'SubagentStop':
    case 'SessionEnd':
    case 'PreCompact':
    case 'Notification':
      return 'internal'; // Internal agent operations

    default:
      return 'internal';
  }
}

/**
 * Update session state after capturing an event
 */
export function updateSessionState(
  sessionId: string,
  hookEventType: string,
  eventId: string,
  payload: any
): void {
  const state = loadSessionState(sessionId);

  switch (hookEventType) {
    case 'SessionStart':
      state.sessionStartEventId = eventId;
      break;

    case 'UserPromptSubmit':
      state.lastUserPromptEventId = eventId;
      break;

    case 'PreToolUse':
      const toolUseId = payload.tool_use_id;
      if (toolUseId) {
        state.preToolUseMap[toolUseId] = eventId;
      }

      // If this is a Task tool, track it for SubagentStop linking
      if (payload.tool_name === 'Task') {
        const taskId = payload.task_id || toolUseId; // Use task_id if available, fallback to tool_use_id
        if (taskId) {
          state.taskToolMap[taskId] = eventId;
        }
      }
      break;

    case 'Stop':
      state.lastStopEventId = eventId;
      break;

    case 'SessionEnd':
      // Clean up state after session ends
      saveSessionState(sessionId, state);
      stateCache.delete(sessionId);
      return; // Don't save again
  }

  saveSessionState(sessionId, state);
}

/**
 * Clean up state for a specific session (for testing or manual cleanup)
 */
export function clearSessionState(sessionId: string): void {
  stateCache.delete(sessionId);

  try {
    if (existsSync(STATE_FILE_PATH)) {
      const allStates = JSON.parse(readFileSync(STATE_FILE_PATH, 'utf-8'));
      delete allStates[sessionId];
      writeFileSync(STATE_FILE_PATH, JSON.stringify(allStates, null, 2), 'utf-8');
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Extract skill name from event payload
 */
export function extractSkillName(hookEventType: string, payload: any): string | undefined {
  // Direct Skill tool invocation
  if (payload?.tool_name === 'Skill') {
    return payload.tool_input?.skill;
  }

  // Task tool with subagent_type (specialized agents)
  if (payload?.tool_name === 'Task') {
    return payload.tool_input?.subagent_type;
  }

  // EnterPlanMode is effectively activating the plan skill
  if (payload?.tool_name === 'EnterPlanMode') {
    return 'plan-mode';
  }

  return undefined;
}

/**
 * Extract context info from CC 2.1.6 context object
 */
export function extractContextInfo(hookData: any): {
  context_used?: number;
  context_remaining?: number;
  context_used_percentage?: number;
  context_remaining_percentage?: number;
} {
  const context = hookData.context;
  if (!context) return {};

  return {
    context_used: context.used,
    context_remaining: context.remaining,
    context_used_percentage: context.used_percentage,
    context_remaining_percentage: context.remaining_percentage
  };
}

/**
 * Estimate token count from payload (rough heuristic)
 * Returns undefined if cannot estimate
 */
export function estimateTokens(hookEventType: string, payload: any): number | undefined {
  // For now, return undefined - proper token counting requires model-specific tokenizer
  // Future enhancement: integrate with tiktoken or similar
  return undefined;
}

/**
 * Estimate cost based on model and token count
 * Returns undefined if cannot estimate
 */
export function estimateCost(
  modelName: string | undefined,
  tokens: number | undefined
): number | undefined {
  if (!modelName || !tokens) return undefined;

  // Model pricing (per 1M tokens)
  const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-5-20250929[1m]': { input: 3.00, output: 15.00 },
    'claude-opus-4-5-20251101': { input: 15.00, output: 75.00 },
    'claude-haiku-4-5': { input: 0.80, output: 4.00 }
  };

  const pricing = MODEL_PRICING[modelName];
  if (!pricing) return undefined;

  // Assume 70% input, 30% output (rough heuristic)
  const inputTokens = tokens * 0.7;
  const outputTokens = tokens * 0.3;

  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}
