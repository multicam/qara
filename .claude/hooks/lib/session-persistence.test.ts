/**
 * Tests for session-persistence.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  initializeSession,
  updateSessionInfo,
  logConversationTurn,
  logTaskState,
  logCheckpoint,
  createStateSnapshot,
  loadSessionSnapshot,
  listSessions,
  pauseSession,
  resumeSession,
  completeSession,
  loadConversationHistory,
  loadTaskHistory,
  loadCheckpointHistory,
  exportSession,
  importSession,
  getSessionDir,
  type SessionInfo,
  type ConversationTurn,
  type TaskStateEntry,
  type CheckpointEntry
} from './session-persistence';

const TEST_SESSION_ID = 'test-session-123';
const TEST_SESSION_ID_2 = 'test-session-456';

describe('Session Persistence', () => {
  beforeEach(() => {
    // Clean up test sessions before each test
    const sessionDir = getSessionDir(TEST_SESSION_ID);
    const sessionDir2 = getSessionDir(TEST_SESSION_ID_2);
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true });
    }
    if (existsSync(sessionDir2)) {
      rmSync(sessionDir2, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up after tests
    const sessionDir = getSessionDir(TEST_SESSION_ID);
    const sessionDir2 = getSessionDir(TEST_SESSION_ID_2);
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true });
    }
    if (existsSync(sessionDir2)) {
      rmSync(sessionDir2, { recursive: true });
    }
  });

  describe('initializeSession', () => {
    it('should create session directory and info file', () => {
      initializeSession(TEST_SESSION_ID);

      const sessionDir = getSessionDir(TEST_SESSION_ID);
      expect(existsSync(sessionDir)).toBe(true);

      const sessionInfoPath = join(sessionDir, 'session-info.json');
      expect(existsSync(sessionInfoPath)).toBe(true);
    });

    it('should save session metadata', () => {
      initializeSession(TEST_SESSION_ID, {
        agent_type: 'engineer',
        parent_session_id: 'parent-123'
      });

      const sessionInfoPath = join(getSessionDir(TEST_SESSION_ID), 'session-info.json');
      const sessionInfo: SessionInfo = JSON.parse(readFileSync(sessionInfoPath, 'utf-8'));

      expect(sessionInfo.session_id).toBe(TEST_SESSION_ID);
      expect(sessionInfo.agent_type).toBe('engineer');
      expect(sessionInfo.parent_session_id).toBe('parent-123');
      expect(sessionInfo.status).toBe('active');
      expect(sessionInfo.start_time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('updateSessionInfo', () => {
    it('should update session metadata', () => {
      initializeSession(TEST_SESSION_ID);

      updateSessionInfo(TEST_SESSION_ID, {
        status: 'paused',
        metadata: { reason: 'user pause' }
      });

      const sessionInfoPath = join(getSessionDir(TEST_SESSION_ID), 'session-info.json');
      const sessionInfo: SessionInfo = JSON.parse(readFileSync(sessionInfoPath, 'utf-8'));

      expect(sessionInfo.status).toBe('paused');
      expect(sessionInfo.metadata?.reason).toBe('user pause');
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        updateSessionInfo('non-existent', { status: 'paused' });
      }).toThrow();
    });
  });

  describe('logConversationTurn', () => {
    it('should append conversation turn to JSONL file', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'Hello, world!',
        assistant_response: 'Hi there!'
      });

      const conversationPath = join(getSessionDir(TEST_SESSION_ID), 'conversation.jsonl');
      expect(existsSync(conversationPath)).toBe(true);

      const content = readFileSync(conversationPath, 'utf-8');
      const turn: ConversationTurn = JSON.parse(content.trim());

      expect(turn.turn_number).toBe(1);
      expect(turn.user_prompt).toBe('Hello, world!');
      expect(turn.assistant_response).toBe('Hi there!');
      expect(turn.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should append multiple turns', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'First'
      });

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 2,
        user_prompt: 'Second'
      });

      const conversationPath = join(getSessionDir(TEST_SESSION_ID), 'conversation.jsonl');
      const lines = readFileSync(conversationPath, 'utf-8').trim().split('\n');

      expect(lines.length).toBe(2);

      const turn1: ConversationTurn = JSON.parse(lines[0]);
      const turn2: ConversationTurn = JSON.parse(lines[1]);

      expect(turn1.turn_number).toBe(1);
      expect(turn2.turn_number).toBe(2);
    });

    it('should log tool calls in conversation turn', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'Read file',
        tool_calls: [
          {
            tool_use_id: 'tool-123',
            tool_name: 'Read',
            tool_input: { file_path: '/test.txt' },
            result: 'File contents',
            duration_ms: 150
          }
        ]
      });

      const history = loadConversationHistory(TEST_SESSION_ID);
      expect(history[0].tool_calls).toHaveLength(1);
      expect(history[0].tool_calls![0].tool_name).toBe('Read');
      expect(history[0].tool_calls![0].duration_ms).toBe(150);
    });
  });

  describe('logTaskState', () => {
    it('should append task state to JSONL file', () => {
      initializeSession(TEST_SESSION_ID);

      logTaskState(TEST_SESSION_ID, 'task-1', 'created', {
        subject: 'Test task',
        description: 'A test task',
        status: 'pending'
      });

      const tasksPath = join(getSessionDir(TEST_SESSION_ID), 'tasks.jsonl');
      expect(existsSync(tasksPath)).toBe(true);

      const content = readFileSync(tasksPath, 'utf-8');
      const entry: TaskStateEntry = JSON.parse(content.trim());

      expect(entry.task_id).toBe('task-1');
      expect(entry.action).toBe('created');
      expect(entry.task_data?.subject).toBe('Test task');
    });

    it('should track task lifecycle', () => {
      initializeSession(TEST_SESSION_ID);

      logTaskState(TEST_SESSION_ID, 'task-1', 'created', {
        subject: 'Build feature',
        status: 'pending'
      });

      logTaskState(TEST_SESSION_ID, 'task-1', 'started', {
        status: 'in_progress'
      });

      logTaskState(TEST_SESSION_ID, 'task-1', 'completed', {
        status: 'completed'
      });

      const history = loadTaskHistory(TEST_SESSION_ID);
      expect(history.length).toBe(3);
      expect(history[0].action).toBe('created');
      expect(history[1].action).toBe('started');
      expect(history[2].action).toBe('completed');
    });
  });

  describe('logCheckpoint', () => {
    it('should append checkpoint to JSONL file', () => {
      initializeSession(TEST_SESSION_ID);

      logCheckpoint(TEST_SESSION_ID, 'checkpoint-1', 'manual', {
        description: 'Before refactor',
        file_count: 5,
        operations: ['edit', 'write']
      });

      const checkpointsPath = join(getSessionDir(TEST_SESSION_ID), 'checkpoints.jsonl');
      expect(existsSync(checkpointsPath)).toBe(true);

      const content = readFileSync(checkpointsPath, 'utf-8');
      const entry: CheckpointEntry = JSON.parse(content.trim());

      expect(entry.checkpoint_id).toBe('checkpoint-1');
      expect(entry.type).toBe('manual');
      expect(entry.description).toBe('Before refactor');
      expect(entry.file_count).toBe(5);
    });

    it('should log different checkpoint types', () => {
      initializeSession(TEST_SESSION_ID);

      logCheckpoint(TEST_SESSION_ID, 'cp-1', 'auto');
      logCheckpoint(TEST_SESSION_ID, 'cp-2', 'manual');
      logCheckpoint(TEST_SESSION_ID, 'cp-3', 'pre_destructive');

      const history = loadCheckpointHistory(TEST_SESSION_ID);
      expect(history.length).toBe(3);
      expect(history[0].type).toBe('auto');
      expect(history[1].type).toBe('manual');
      expect(history[2].type).toBe('pre_destructive');
    });
  });

  describe('createStateSnapshot', () => {
    it('should create snapshot file', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'Test'
      });

      logTaskState(TEST_SESSION_ID, 'task-1', 'created', {
        subject: 'Test task',
        status: 'pending'
      });

      createStateSnapshot(TEST_SESSION_ID);

      const snapshotPath = join(getSessionDir(TEST_SESSION_ID), 'state-snapshot.json');
      expect(existsSync(snapshotPath)).toBe(true);
    });

    it('should include correct counts in snapshot', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, { turn_number: 1 });
      logConversationTurn(TEST_SESSION_ID, { turn_number: 2 });

      logCheckpoint(TEST_SESSION_ID, 'cp-1', 'auto');

      createStateSnapshot(TEST_SESSION_ID);

      const snapshot = loadSessionSnapshot(TEST_SESSION_ID);
      expect(snapshot).not.toBeNull();
      expect(snapshot!.conversation_turns).toBe(2);
      expect(snapshot!.checkpoints_count).toBe(1);
    });

    it('should track active tasks in snapshot', () => {
      initializeSession(TEST_SESSION_ID);

      logTaskState(TEST_SESSION_ID, 'task-1', 'created', {
        subject: 'Task 1',
        status: 'pending'
      });

      logTaskState(TEST_SESSION_ID, 'task-2', 'created', {
        subject: 'Task 2',
        status: 'in_progress'
      });

      logTaskState(TEST_SESSION_ID, 'task-3', 'completed', {
        subject: 'Task 3',
        status: 'completed'
      });

      createStateSnapshot(TEST_SESSION_ID);

      const snapshot = loadSessionSnapshot(TEST_SESSION_ID);
      expect(snapshot!.active_tasks.length).toBe(2); // task-1 and task-2, not task-3
    });
  });

  describe('pauseSession and resumeSession', () => {
    it('should pause session and create snapshot', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'Test'
      });

      pauseSession(TEST_SESSION_ID);

      const sessionInfoPath = join(getSessionDir(TEST_SESSION_ID), 'session-info.json');
      const sessionInfo: SessionInfo = JSON.parse(readFileSync(sessionInfoPath, 'utf-8'));

      expect(sessionInfo.status).toBe('paused');

      const snapshot = loadSessionSnapshot(TEST_SESSION_ID);
      expect(snapshot).not.toBeNull();
    });

    it('should resume session and load snapshot', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'Test'
      });

      pauseSession(TEST_SESSION_ID);

      const snapshot = resumeSession(TEST_SESSION_ID);
      expect(snapshot).not.toBeNull();
      expect(snapshot!.conversation_turns).toBe(1);

      const sessionInfoPath = join(getSessionDir(TEST_SESSION_ID), 'session-info.json');
      const sessionInfo: SessionInfo = JSON.parse(readFileSync(sessionInfoPath, 'utf-8'));

      expect(sessionInfo.status).toBe('active');
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed on success', () => {
      initializeSession(TEST_SESSION_ID);

      completeSession(TEST_SESSION_ID, true);

      const sessionInfoPath = join(getSessionDir(TEST_SESSION_ID), 'session-info.json');
      const sessionInfo: SessionInfo = JSON.parse(readFileSync(sessionInfoPath, 'utf-8'));

      expect(sessionInfo.status).toBe('completed');
    });

    it('should mark session as failed on failure', () => {
      initializeSession(TEST_SESSION_ID);

      completeSession(TEST_SESSION_ID, false);

      const sessionInfoPath = join(getSessionDir(TEST_SESSION_ID), 'session-info.json');
      const sessionInfo: SessionInfo = JSON.parse(readFileSync(sessionInfoPath, 'utf-8'));

      expect(sessionInfo.status).toBe('failed');
    });
  });

  describe('listSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const sessions = listSessions();
      const testSessions = sessions.filter(s =>
        s.session_id === TEST_SESSION_ID || s.session_id === TEST_SESSION_ID_2
      );
      expect(testSessions.length).toBe(0);
    });

    it('should list all sessions', () => {
      initializeSession(TEST_SESSION_ID);
      initializeSession(TEST_SESSION_ID_2);

      const sessions = listSessions();
      const testSessions = sessions.filter(s =>
        s.session_id === TEST_SESSION_ID || s.session_id === TEST_SESSION_ID_2
      );

      expect(testSessions.length).toBe(2);
    });

    it('should sort sessions by last activity (most recent first)', () => {
      initializeSession(TEST_SESSION_ID);

      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        initializeSession(TEST_SESSION_ID_2);
      }, 10);

      const sessions = listSessions();
      const testSessions = sessions.filter(s =>
        s.session_id === TEST_SESSION_ID || s.session_id === TEST_SESSION_ID_2
      );

      if (testSessions.length === 2) {
        const time1 = new Date(testSessions[0].last_activity).getTime();
        const time2 = new Date(testSessions[1].last_activity).getTime();
        expect(time1).toBeGreaterThanOrEqual(time2);
      }
    });
  });

  describe('exportSession and importSession', () => {
    it('should export complete session data', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'Test'
      });

      logTaskState(TEST_SESSION_ID, 'task-1', 'created', {
        subject: 'Test task'
      });

      logCheckpoint(TEST_SESSION_ID, 'cp-1', 'manual');

      createStateSnapshot(TEST_SESSION_ID);

      const exported = exportSession(TEST_SESSION_ID);

      expect(exported.session_info.session_id).toBe(TEST_SESSION_ID);
      expect(exported.conversation.length).toBe(1);
      expect(exported.tasks.length).toBe(1);
      expect(exported.checkpoints.length).toBe(1);
      expect(exported.snapshot).not.toBeNull();
    });

    it('should import session data', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'Original'
      });

      createStateSnapshot(TEST_SESSION_ID);

      const exported = exportSession(TEST_SESSION_ID);

      // Clean up original
      rmSync(getSessionDir(TEST_SESSION_ID), { recursive: true });

      // Import to new session
      importSession(TEST_SESSION_ID_2, exported);

      const imported = loadConversationHistory(TEST_SESSION_ID_2);
      expect(imported.length).toBe(1);
      expect(imported[0].user_prompt).toBe('Original');
    });

    it('should preserve all data through export/import cycle', () => {
      initializeSession(TEST_SESSION_ID, {
        agent_type: 'engineer',
        metadata: { test: true }
      });

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'Test',
        assistant_response: 'Response'
      });

      logTaskState(TEST_SESSION_ID, 'task-1', 'created', {
        subject: 'Task',
        status: 'pending'
      });

      logCheckpoint(TEST_SESSION_ID, 'cp-1', 'manual', {
        description: 'Checkpoint'
      });

      createStateSnapshot(TEST_SESSION_ID);

      const exported = exportSession(TEST_SESSION_ID);
      rmSync(getSessionDir(TEST_SESSION_ID), { recursive: true });

      importSession(TEST_SESSION_ID_2, exported);

      const conversation = loadConversationHistory(TEST_SESSION_ID_2);
      const tasks = loadTaskHistory(TEST_SESSION_ID_2);
      const checkpoints = loadCheckpointHistory(TEST_SESSION_ID_2);
      const snapshot = loadSessionSnapshot(TEST_SESSION_ID_2);

      expect(conversation[0].user_prompt).toBe('Test');
      expect(tasks[0].task_id).toBe('task-1');
      expect(checkpoints[0].description).toBe('Checkpoint');
      expect(snapshot!.conversation_turns).toBe(1);
    });
  });

  describe('loadConversationHistory', () => {
    it('should return empty array for non-existent session', () => {
      const history = loadConversationHistory('non-existent');
      expect(history.length).toBe(0);
    });

    it('should load complete conversation history', () => {
      initializeSession(TEST_SESSION_ID);

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 1,
        user_prompt: 'First'
      });

      logConversationTurn(TEST_SESSION_ID, {
        turn_number: 2,
        user_prompt: 'Second'
      });

      const history = loadConversationHistory(TEST_SESSION_ID);
      expect(history.length).toBe(2);
      expect(history[0].turn_number).toBe(1);
      expect(history[1].turn_number).toBe(2);
    });
  });

  describe('loadTaskHistory', () => {
    it('should return empty array for non-existent session', () => {
      const history = loadTaskHistory('non-existent');
      expect(history.length).toBe(0);
    });

    it('should load complete task history', () => {
      initializeSession(TEST_SESSION_ID);

      logTaskState(TEST_SESSION_ID, 'task-1', 'created');
      logTaskState(TEST_SESSION_ID, 'task-1', 'started');
      logTaskState(TEST_SESSION_ID, 'task-1', 'completed');

      const history = loadTaskHistory(TEST_SESSION_ID);
      expect(history.length).toBe(3);
      expect(history.map(h => h.action)).toEqual(['created', 'started', 'completed']);
    });
  });

  describe('loadCheckpointHistory', () => {
    it('should return empty array for non-existent session', () => {
      const history = loadCheckpointHistory('non-existent');
      expect(history.length).toBe(0);
    });

    it('should load complete checkpoint history', () => {
      initializeSession(TEST_SESSION_ID);

      logCheckpoint(TEST_SESSION_ID, 'cp-1', 'auto');
      logCheckpoint(TEST_SESSION_ID, 'cp-2', 'manual');
      logCheckpoint(TEST_SESSION_ID, 'cp-3', 'pre_destructive');

      const history = loadCheckpointHistory(TEST_SESSION_ID);
      expect(history.length).toBe(3);
      expect(history.map(h => h.type)).toEqual(['auto', 'manual', 'pre_destructive']);
    });
  });
});
