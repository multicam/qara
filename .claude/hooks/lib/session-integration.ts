/**
 * Session Integration - Bridge between hooks and session persistence
 *
 * Automatically tracks session state from hook events.
 * Integrates with checkpoint-utils, session-hierarchy-tracker, and Agent Lens.
 *
 * This module provides automatic session persistence without requiring
 * manual tracking in each hook.
 */

import {
  initializeSession,
  updateSessionInfo,
  logConversationTurn,
  logTaskState,
  logCheckpoint,
  createStateSnapshot,
  type SessionInfo,
  type ConversationTurn,
  type ToolCall
} from './session-persistence';

/**
 * Extract session ID from environment or hook data
 */
export function getSessionId(hookData?: any): string {
  return (
    hookData?.session_id ||
    process.env.CLAUDE_SESSION_ID ||
    process.env.SESSION_ID ||
    `session-${Date.now()}`
  );
}

/**
 * Handle SessionStart hook event
 */
export function onSessionStart(hookData: any): void {
  const sessionId = getSessionId(hookData);

  const options: Partial<SessionInfo> = {
    agent_type: process.env.CLAUDE_AGENT_TYPE || process.env.DA,
    parent_session_id: process.env.PARENT_SESSION_ID,
    metadata: {
      project_dir: process.env.CLAUDE_PROJECT_DIR,
      cwd: process.cwd(),
      hook_version: hookData.version
    }
  };

  try {
    initializeSession(sessionId, options);
  } catch (error) {
    // Session may already exist, update instead
    try {
      updateSessionInfo(sessionId, options);
    } catch {
      // Ignore errors on session start
    }
  }
}

/**
 * Handle UserPromptSubmit hook event
 */
export function onUserPromptSubmit(hookData: any): void {
  const sessionId = getSessionId(hookData);
  const turnNumber = hookData.turn_number || 0;
  const userPrompt = hookData.prompt || hookData.user_prompt;

  if (!userPrompt) {
    return;
  }

  try {
    logConversationTurn(sessionId, {
      turn_number: turnNumber,
      user_prompt: userPrompt,
      context_info: hookData.context
    });
  } catch (error) {
    console.error('Failed to log user prompt:', error);
  }
}

/**
 * Handle Stop hook event (assistant response)
 */
export function onStop(hookData: any): void {
  const sessionId = getSessionId(hookData);
  const turnNumber = hookData.turn_number || 0;
  const response = hookData.response || hookData.text;

  if (!response) {
    return;
  }

  try {
    // Log as a new turn or update the last turn
    logConversationTurn(sessionId, {
      turn_number: turnNumber,
      assistant_response: response,
      context_info: hookData.context
    });
  } catch (error) {
    console.error('Failed to log assistant response:', error);
  }
}

/**
 * Handle PreToolUse hook event
 */
export function onPreToolUse(hookData: any): void {
  const sessionId = getSessionId(hookData);
  const toolName = hookData.tool_name;
  const toolUseId = hookData.tool_use_id;

  // Track task tool calls
  if (toolName === 'Task' || toolName === 'TaskCreate') {
    const taskData = hookData.tool_input;
    const taskId = taskData?.task_id || toolUseId;

    try {
      logTaskState(sessionId, taskId, 'created', {
        subject: taskData?.subject,
        description: taskData?.description,
        status: 'pending',
        metadata: taskData?.metadata
      });
    } catch (error) {
      console.error('Failed to log task creation:', error);
    }
  }

  // Track checkpoint creation
  if (toolName === 'Checkpoint' || hookData.is_checkpoint) {
    try {
      logCheckpoint(sessionId, toolUseId, 'auto', {
        description: hookData.description || 'Auto checkpoint',
        operations: [toolName]
      });
    } catch (error) {
      console.error('Failed to log checkpoint:', error);
    }
  }
}

/**
 * Handle PostToolUse hook event
 */
export function onPostToolUse(hookData: any): void {
  const sessionId = getSessionId(hookData);
  const toolName = hookData.tool_name;
  const toolUseId = hookData.tool_use_id;

  // Track task updates
  if (toolName === 'TaskUpdate') {
    const taskData = hookData.tool_input;
    const taskId = taskData?.task_id || toolUseId;

    try {
      const action = taskData?.status === 'completed' ? 'completed' :
                     taskData?.status === 'failed' ? 'failed' : 'updated';

      logTaskState(sessionId, taskId, action, {
        subject: taskData?.subject,
        status: taskData?.status,
        metadata: taskData?.metadata
      });
    } catch (error) {
      console.error('Failed to log task update:', error);
    }
  }

  // Track tool execution in conversation
  const turnNumber = hookData.turn_number || 0;

  try {
    const toolCall: ToolCall = {
      tool_use_id: toolUseId,
      tool_name: toolName,
      tool_input: hookData.tool_input,
      result: hookData.result,
      error: hookData.error,
      duration_ms: hookData.duration_ms
    };

    // Append to conversation with tool calls
    logConversationTurn(sessionId, {
      turn_number: turnNumber,
      tool_calls: [toolCall]
    });
  } catch (error) {
    console.error('Failed to log tool call:', error);
  }
}

/**
 * Handle SessionEnd hook event
 */
export function onSessionEnd(hookData: any): void {
  const sessionId = getSessionId(hookData);

  try {
    // Create final snapshot
    createStateSnapshot(sessionId);

    // Mark session as completed
    updateSessionInfo(sessionId, {
      status: 'completed'
    });
  } catch (error) {
    console.error('Failed to finalize session:', error);

    // Try to at least mark it as failed
    try {
      updateSessionInfo(sessionId, {
        status: 'failed'
      });
    } catch {
      // Ignore
    }
  }
}

/**
 * Handle checkpoint events from checkpoint-utils
 */
export function onCheckpointEvent(
  sessionId: string,
  checkpointType: 'auto' | 'manual' | 'pre_destructive',
  operation: string,
  description?: string
): void {
  try {
    const checkpointId = `checkpoint-${Date.now()}`;

    logCheckpoint(sessionId, checkpointId, checkpointType, {
      description: description || operation,
      operations: [operation]
    });
  } catch (error) {
    console.error('Failed to log checkpoint event:', error);
  }
}

/**
 * Periodic snapshot creation (call from background task)
 */
export function createPeriodicSnapshot(sessionId: string): void {
  try {
    createStateSnapshot(sessionId);
  } catch (error) {
    console.error('Failed to create periodic snapshot:', error);
  }
}

/**
 * Enhanced checkpoint logging that integrates with session persistence
 */
export function logDestructiveOperation(
  sessionId: string,
  operation: string,
  command: string
): void {
  try {
    const checkpointId = `checkpoint-${Date.now()}`;

    logCheckpoint(sessionId, checkpointId, 'pre_destructive', {
      description: `Before ${operation}: ${command.substring(0, 100)}`,
      operations: [operation]
    });

    // Also create a full snapshot before destructive operations
    createStateSnapshot(sessionId);
  } catch (error) {
    console.error('Failed to log destructive operation:', error);
  }
}

/**
 * Export all session integration handlers for use in hooks
 */
export const sessionHandlers = {
  SessionStart: onSessionStart,
  UserPromptSubmit: onUserPromptSubmit,
  Stop: onStop,
  PreToolUse: onPreToolUse,
  PostToolUse: onPostToolUse,
  SessionEnd: onSessionEnd,
  Checkpoint: onCheckpointEvent,
  PeriodicSnapshot: createPeriodicSnapshot,
  DestructiveOperation: logDestructiveOperation
};

/**
 * Convenience function to route hook events to appropriate handlers
 */
export function routeHookEvent(eventType: string, hookData: any): void {
  const handler = sessionHandlers[eventType as keyof typeof sessionHandlers];

  if (handler && typeof handler === 'function') {
    try {
      handler(hookData);
    } catch (error) {
      console.error(`Failed to handle ${eventType} event:`, error);
    }
  }
}
