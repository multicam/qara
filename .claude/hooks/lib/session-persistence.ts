/**
 * Session Persistence Utilities (Factor 6: Launch, Pause, Resume)
 *
 * Provides file-based session serialization for pause/resume capability.
 * Sessions are saved to state/sessions/{session_id}/ with JSONL format for append-friendly logging.
 *
 * Key Features:
 * - Session state serialization/deserialization
 * - Conversation context tracking
 * - Active task persistence
 * - Checkpoint integration
 * - JSONL format for efficient appending
 * - Atomic writes for data safety
 *
 * 12-Factor Agent Compliance:
 * - Factor 5: Unify Execution State - Externalized session state
 * - Factor 6: Launch/Pause/Resume - Full session persistence
 * - Factor 12: Stateless Reducer - No in-memory dependencies
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { STATE_DIR, ensureDir } from './pai-paths';
import { appendJsonl } from './jsonl-utils';
import { getISOTimestamp } from './datetime-utils';

/**
 * Directory structure:
 * state/sessions/{session_id}/
 * ├── session-info.json       # Session metadata
 * ├── conversation.jsonl      # Conversation history (append-only)
 * ├── tasks.jsonl            # Task updates (append-only)
 * ├── checkpoints.jsonl      # Checkpoint events (append-only)
 * └── state-snapshot.json    # Latest state snapshot
 */
const SESSIONS_DIR = join(STATE_DIR, 'sessions');

// Session metadata
export interface SessionInfo {
  session_id: string;
  start_time: string;
  last_activity: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  agent_type?: string;
  parent_session_id?: string;
  metadata?: Record<string, unknown>;
}

// Conversation turn entry
export interface ConversationTurn {
  timestamp: string;
  turn_number: number;
  user_prompt?: string;
  assistant_response?: string;
  tool_calls?: ToolCall[];
  context_info?: ContextInfo;
}

// Tool call information
export interface ToolCall {
  tool_use_id: string;
  tool_name: string;
  tool_input?: Record<string, unknown>;
  result?: string;
  error?: string;
  duration_ms?: number;
}

// Context window information
export interface ContextInfo {
  used?: number;
  remaining?: number;
  used_percentage?: number;
  remaining_percentage?: number;
}

// Task state entry
export interface TaskStateEntry {
  timestamp: string;
  task_id: string;
  action: 'created' | 'started' | 'completed' | 'failed' | 'updated';
  task_data?: {
    subject?: string;
    description?: string;
    status?: string;
    owner?: string;
    metadata?: Record<string, unknown>;
  };
}

// Checkpoint entry
export interface CheckpointEntry {
  timestamp: string;
  checkpoint_id: string;
  type: 'auto' | 'manual' | 'pre_destructive';
  description?: string;
  file_count?: number;
  operations?: string[];
}

// Complete session state snapshot
export interface SessionSnapshot {
  timestamp: string;
  session_info: SessionInfo;
  active_tasks: Array<{ task_id: string; status: string; subject: string }>;
  conversation_turns: number;
  checkpoints_count: number;
  last_error?: string;
  context_state?: ContextInfo;
}

/**
 * Get session directory path
 */
export function getSessionDir(sessionId: string): string {
  return join(SESSIONS_DIR, sessionId);
}

/**
 * Initialize a new session
 */
export function initializeSession(
  sessionId: string,
  options?: Partial<SessionInfo>
): void {
  const sessionDir = getSessionDir(sessionId);
  ensureDir(sessionDir);

  const sessionInfo: SessionInfo = {
    session_id: sessionId,
    start_time: getISOTimestamp(),
    last_activity: getISOTimestamp(),
    status: 'active',
    ...options
  };

  const sessionInfoPath = join(sessionDir, 'session-info.json');
  writeFileSync(sessionInfoPath, JSON.stringify(sessionInfo, null, 2));
}

/**
 * Update session metadata
 */
export function updateSessionInfo(
  sessionId: string,
  updates: Partial<SessionInfo>
): void {
  const sessionDir = getSessionDir(sessionId);
  const sessionInfoPath = join(sessionDir, 'session-info.json');

  if (!existsSync(sessionInfoPath)) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const sessionInfo: SessionInfo = JSON.parse(
    readFileSync(sessionInfoPath, 'utf-8')
  );

  const updated: SessionInfo = {
    ...sessionInfo,
    ...updates,
    last_activity: getISOTimestamp()
  };

  writeFileSync(sessionInfoPath, JSON.stringify(updated, null, 2));
}

/**
 * Log a conversation turn
 */
export function logConversationTurn(
  sessionId: string,
  turn: Omit<ConversationTurn, 'timestamp'>
): void {
  const sessionDir = getSessionDir(sessionId);
  ensureDir(sessionDir);

  const conversationPath = join(sessionDir, 'conversation.jsonl');
  const entry: ConversationTurn = {
    timestamp: getISOTimestamp(),
    ...turn
  };

  appendJsonl(conversationPath, entry);
  updateSessionInfo(sessionId, { last_activity: getISOTimestamp() });
}

/**
 * Log a task state change
 */
export function logTaskState(
  sessionId: string,
  taskId: string,
  action: TaskStateEntry['action'],
  taskData?: TaskStateEntry['task_data']
): void {
  const sessionDir = getSessionDir(sessionId);
  ensureDir(sessionDir);

  const tasksPath = join(sessionDir, 'tasks.jsonl');
  const entry: TaskStateEntry = {
    timestamp: getISOTimestamp(),
    task_id: taskId,
    action,
    task_data: taskData
  };

  appendJsonl(tasksPath, entry);
  updateSessionInfo(sessionId, { last_activity: getISOTimestamp() });
}

/**
 * Log a checkpoint
 */
export function logCheckpoint(
  sessionId: string,
  checkpointId: string,
  type: CheckpointEntry['type'],
  options?: {
    description?: string;
    file_count?: number;
    operations?: string[];
  }
): void {
  const sessionDir = getSessionDir(sessionId);
  ensureDir(sessionDir);

  const checkpointsPath = join(sessionDir, 'checkpoints.jsonl');
  const entry: CheckpointEntry = {
    timestamp: getISOTimestamp(),
    checkpoint_id: checkpointId,
    type,
    ...options
  };

  appendJsonl(checkpointsPath, entry);
  updateSessionInfo(sessionId, { last_activity: getISOTimestamp() });
}

/**
 * Create a complete state snapshot
 */
export function createStateSnapshot(sessionId: string): void {
  const sessionDir = getSessionDir(sessionId);

  if (!existsSync(sessionDir)) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Load session info
  const sessionInfoPath = join(sessionDir, 'session-info.json');
  const sessionInfo: SessionInfo = existsSync(sessionInfoPath)
    ? JSON.parse(readFileSync(sessionInfoPath, 'utf-8'))
    : { session_id: sessionId, start_time: '', last_activity: '', status: 'active' };

  // Count conversation turns
  const conversationPath = join(sessionDir, 'conversation.jsonl');
  const conversationTurns = existsSync(conversationPath)
    ? readFileSync(conversationPath, 'utf-8').trim().split('\n').filter(Boolean).length
    : 0;

  // Count checkpoints
  const checkpointsPath = join(sessionDir, 'checkpoints.jsonl');
  const checkpointsCount = existsSync(checkpointsPath)
    ? readFileSync(checkpointsPath, 'utf-8').trim().split('\n').filter(Boolean).length
    : 0;

  // Extract active tasks from tasks log
  const tasksPath = join(sessionDir, 'tasks.jsonl');
  const activeTasks: Array<{ task_id: string; status: string; subject: string }> = [];

  if (existsSync(tasksPath)) {
    const taskLines = readFileSync(tasksPath, 'utf-8').trim().split('\n').filter(Boolean);
    const taskMap = new Map<string, TaskStateEntry>();

    // Build task state from log
    for (const line of taskLines) {
      const entry: TaskStateEntry = JSON.parse(line);
      taskMap.set(entry.task_id, entry);
    }

    // Extract active tasks
    for (const [taskId, entry] of taskMap.entries()) {
      if (
        entry.action !== 'completed' &&
        entry.action !== 'failed' &&
        entry.task_data
      ) {
        activeTasks.push({
          task_id: taskId,
          status: entry.task_data.status || 'unknown',
          subject: entry.task_data.subject || 'Untitled'
        });
      }
    }
  }

  const snapshot: SessionSnapshot = {
    timestamp: getISOTimestamp(),
    session_info: sessionInfo,
    active_tasks: activeTasks,
    conversation_turns: conversationTurns,
    checkpoints_count: checkpointsCount
  };

  const snapshotPath = join(sessionDir, 'state-snapshot.json');
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
}

/**
 * Load session snapshot
 */
export function loadSessionSnapshot(sessionId: string): SessionSnapshot | null {
  const sessionDir = getSessionDir(sessionId);
  const snapshotPath = join(sessionDir, 'state-snapshot.json');

  if (!existsSync(snapshotPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(snapshotPath, 'utf-8'));
  } catch (error) {
    console.error(`Failed to load session snapshot: ${error}`);
    return null;
  }
}

/**
 * List all sessions
 */
export function listSessions(): SessionInfo[] {
  if (!existsSync(SESSIONS_DIR)) {
    return [];
  }

  const sessionDirs = readdirSync(SESSIONS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const sessions: SessionInfo[] = [];

  for (const sessionId of sessionDirs) {
    const sessionInfoPath = join(SESSIONS_DIR, sessionId, 'session-info.json');
    if (existsSync(sessionInfoPath)) {
      try {
        const sessionInfo = JSON.parse(readFileSync(sessionInfoPath, 'utf-8'));
        sessions.push(sessionInfo);
      } catch {
        // Skip invalid session files
      }
    }
  }

  // Sort by last activity (most recent first)
  return sessions.sort((a, b) =>
    new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
  );
}

/**
 * Pause a session
 */
export function pauseSession(sessionId: string): void {
  createStateSnapshot(sessionId);
  updateSessionInfo(sessionId, { status: 'paused' });
}

/**
 * Resume a session
 */
export function resumeSession(sessionId: string): SessionSnapshot | null {
  const snapshot = loadSessionSnapshot(sessionId);
  if (snapshot) {
    updateSessionInfo(sessionId, { status: 'active' });
  }
  return snapshot;
}

/**
 * Complete a session
 */
export function completeSession(sessionId: string, success: boolean = true): void {
  createStateSnapshot(sessionId);
  updateSessionInfo(sessionId, {
    status: success ? 'completed' : 'failed'
  });
}

/**
 * Load full conversation history
 */
export function loadConversationHistory(sessionId: string): ConversationTurn[] {
  const conversationPath = join(getSessionDir(sessionId), 'conversation.jsonl');

  if (!existsSync(conversationPath)) {
    return [];
  }

  try {
    const lines = readFileSync(conversationPath, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  } catch (error) {
    console.error(`Failed to load conversation history: ${error}`);
    return [];
  }
}

/**
 * Load task history
 */
export function loadTaskHistory(sessionId: string): TaskStateEntry[] {
  const tasksPath = join(getSessionDir(sessionId), 'tasks.jsonl');

  if (!existsSync(tasksPath)) {
    return [];
  }

  try {
    const lines = readFileSync(tasksPath, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  } catch (error) {
    console.error(`Failed to load task history: ${error}`);
    return [];
  }
}

/**
 * Load checkpoint history
 */
export function loadCheckpointHistory(sessionId: string): CheckpointEntry[] {
  const checkpointsPath = join(getSessionDir(sessionId), 'checkpoints.jsonl');

  if (!existsSync(checkpointsPath)) {
    return [];
  }

  try {
    const lines = readFileSync(checkpointsPath, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  } catch (error) {
    console.error(`Failed to load checkpoint history: ${error}`);
    return [];
  }
}

/**
 * Clean up old sessions (keep last N sessions or sessions newer than X days)
 */
export function cleanupOldSessions(
  options: {
    keepCount?: number;
    keepDays?: number;
  } = {}
): number {
  const { keepCount = 50, keepDays = 30 } = options;
  const sessions = listSessions();

  if (sessions.length <= keepCount) {
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - keepDays);

  let deletedCount = 0;

  // Keep most recent keepCount sessions
  const toDelete = sessions.slice(keepCount);

  for (const session of toDelete) {
    // Also check if session is older than keepDays
    const lastActivity = new Date(session.last_activity);
    if (lastActivity < cutoffDate) {
      const sessionDir = getSessionDir(session.session_id);
      try {
        // Use rm -rf to delete directory
        const { execSync } = require('child_process');
        execSync(`rm -rf "${sessionDir}"`);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete session ${session.session_id}: ${error}`);
      }
    }
  }

  return deletedCount;
}

/**
 * Export session to a portable format (for backup or transfer)
 */
export function exportSession(sessionId: string): {
  session_info: SessionInfo;
  conversation: ConversationTurn[];
  tasks: TaskStateEntry[];
  checkpoints: CheckpointEntry[];
  snapshot: SessionSnapshot | null;
} {
  return {
    session_info: JSON.parse(
      readFileSync(join(getSessionDir(sessionId), 'session-info.json'), 'utf-8')
    ),
    conversation: loadConversationHistory(sessionId),
    tasks: loadTaskHistory(sessionId),
    checkpoints: loadCheckpointHistory(sessionId),
    snapshot: loadSessionSnapshot(sessionId)
  };
}

/**
 * Import session from exported format
 */
export function importSession(
  sessionId: string,
  data: ReturnType<typeof exportSession>
): void {
  const sessionDir = getSessionDir(sessionId);
  ensureDir(sessionDir);

  // Write session info
  writeFileSync(
    join(sessionDir, 'session-info.json'),
    JSON.stringify(data.session_info, null, 2)
  );

  // Write conversation history
  if (data.conversation.length > 0) {
    const conversationPath = join(sessionDir, 'conversation.jsonl');
    for (const turn of data.conversation) {
      appendJsonl(conversationPath, turn);
    }
  }

  // Write task history
  if (data.tasks.length > 0) {
    const tasksPath = join(sessionDir, 'tasks.jsonl');
    for (const task of data.tasks) {
      appendJsonl(tasksPath, task);
    }
  }

  // Write checkpoint history
  if (data.checkpoints.length > 0) {
    const checkpointsPath = join(sessionDir, 'checkpoints.jsonl');
    for (const checkpoint of data.checkpoints) {
      appendJsonl(checkpointsPath, checkpoint);
    }
  }

  // Write snapshot if available
  if (data.snapshot) {
    writeFileSync(
      join(sessionDir, 'state-snapshot.json'),
      JSON.stringify(data.snapshot, null, 2)
    );
  }
}
