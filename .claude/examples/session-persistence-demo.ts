#!/usr/bin/env bun

/**
 * Session Persistence Demo
 *
 * Demonstrates the complete session lifecycle:
 * 1. Initialize session
 * 2. Log conversation, tasks, and checkpoints
 * 3. Create snapshot
 * 4. Pause session
 * 5. Resume session
 * 6. Export/import
 */

import {
  initializeSession,
  logConversationTurn,
  logTaskState,
  logCheckpoint,
  createStateSnapshot,
  pauseSession,
  resumeSession,
  exportSession,
  importSession,
  listSessions,
  loadSessionSnapshot,
  type SessionInfo
} from '../hooks/lib/session-persistence';

const SESSION_ID = `demo-${Date.now()}`;
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

function log(message: string, highlight: boolean = false) {
  const prefix = highlight ? colors.green : colors.cyan;
  console.log(`${prefix}${message}${colors.reset}`);
}

function step(step: number, description: string) {
  console.log(`\n${colors.bright}Step ${step}: ${description}${colors.reset}`);
}

async function main() {
  console.log(`${colors.bright}Session Persistence Demo${colors.reset}\n`);
  console.log(`Session ID: ${SESSION_ID}\n`);

  // Step 1: Initialize session
  step(1, 'Initialize session');
  initializeSession(SESSION_ID, {
    agent_type: 'demo-agent',
    metadata: {
      purpose: 'demonstration',
      feature: 'session-persistence'
    }
  });
  log('✓ Session initialized');

  // Step 2: Log conversation turns
  step(2, 'Log conversation turns');

  logConversationTurn(SESSION_ID, {
    turn_number: 1,
    user_prompt: 'Implement session persistence for Factor 6',
    assistant_response: 'I will create a comprehensive session persistence system...'
  });
  log('✓ Turn 1 logged');

  logConversationTurn(SESSION_ID, {
    turn_number: 2,
    user_prompt: 'Add CLI management tool',
    assistant_response: 'Creating session-manager CLI...',
    tool_calls: [
      {
        tool_use_id: 'tool-write-1',
        tool_name: 'Write',
        tool_input: { file_path: '/session-manager' },
        result: 'File created successfully',
        duration_ms: 125
      }
    ]
  });
  log('✓ Turn 2 logged with tool call');

  // Step 3: Log task lifecycle
  step(3, 'Log task lifecycle');

  logTaskState(SESSION_ID, 'task-1', 'created', {
    subject: 'Implement session persistence module',
    description: 'Create JSONL-based session storage system',
    status: 'pending'
  });
  log('✓ Task created');

  logTaskState(SESSION_ID, 'task-1', 'started', {
    status: 'in_progress'
  });
  log('✓ Task started');

  logTaskState(SESSION_ID, 'task-1', 'completed', {
    status: 'completed'
  });
  log('✓ Task completed');

  // Step 4: Log checkpoints
  step(4, 'Log checkpoints');

  logCheckpoint(SESSION_ID, 'checkpoint-1', 'manual', {
    description: 'Before implementing CLI',
    file_count: 3,
    operations: ['write']
  });
  log('✓ Manual checkpoint logged');

  logCheckpoint(SESSION_ID, 'checkpoint-2', 'pre_destructive', {
    description: 'Before cleanup operation',
    operations: ['file deletion']
  });
  log('✓ Pre-destructive checkpoint logged');

  // Step 5: Create snapshot
  step(5, 'Create state snapshot');
  createStateSnapshot(SESSION_ID);
  log('✓ Snapshot created');

  const snapshot = loadSessionSnapshot(SESSION_ID);
  if (snapshot) {
    log(`  - Conversation turns: ${snapshot.conversation_turns}`);
    log(`  - Active tasks: ${snapshot.active_tasks.length}`);
    log(`  - Checkpoints: ${snapshot.checkpoints_count}`);
  }

  // Step 6: Pause session
  step(6, 'Pause session');
  pauseSession(SESSION_ID);
  log('✓ Session paused');

  // Step 7: List sessions
  step(7, 'List all sessions');
  const sessions = listSessions();
  const demoSession = sessions.find(s => s.session_id === SESSION_ID);
  if (demoSession) {
    log(`✓ Found session: ${demoSession.session_id}`);
    log(`  Status: ${demoSession.status}`);
    log(`  Agent type: ${demoSession.agent_type || 'N/A'}`);
  }

  // Step 8: Resume session
  step(8, 'Resume session');
  const resumed = resumeSession(SESSION_ID);
  if (resumed) {
    log('✓ Session resumed');
    log(`  - Conversation turns: ${resumed.conversation_turns}`);
    log(`  - Active tasks: ${resumed.active_tasks.length}`);
  }

  // Step 9: Export session
  step(9, 'Export session');
  const exported = exportSession(SESSION_ID);
  log('✓ Session exported');
  log(`  - Session info: ${JSON.stringify(exported.session_info.session_id)}`);
  log(`  - Conversation entries: ${exported.conversation.length}`);
  log(`  - Task entries: ${exported.tasks.length}`);
  log(`  - Checkpoint entries: ${exported.checkpoints.length}`);

  // Step 10: Import to new session
  step(10, 'Import to new session');
  const NEW_SESSION_ID = `demo-imported-${Date.now()}`;
  importSession(NEW_SESSION_ID, exported);
  log(`✓ Session imported as ${NEW_SESSION_ID}`);

  const importedSnapshot = loadSessionSnapshot(NEW_SESSION_ID);
  if (importedSnapshot) {
    log(`  - Conversation turns: ${importedSnapshot.conversation_turns}`);
    log(`  - Checkpoints: ${importedSnapshot.checkpoints_count}`);
  }

  // Summary
  console.log(`\n${colors.bright}Demo Complete!${colors.reset}\n`);
  console.log(`Created sessions:`);
  console.log(`  - Original: ${SESSION_ID}`);
  console.log(`  - Imported: ${NEW_SESSION_ID}`);
  console.log(`\nNext steps:`);
  console.log(`  session-manager info ${SESSION_ID}`);
  console.log(`  session-manager list`);
  console.log(`  session-manager export ${SESSION_ID} > backup.json`);
}

main().catch(console.error);
