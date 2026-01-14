#!/usr/bin/env bun
/**
 * Test script for Agent Lens hierarchy tracking
 * Simulates a session with nested events and verifies parent-child relationships
 */

import {
  getParentEventId,
  updateSessionState,
  getSpanKind,
  extractSkillName,
  clearSessionState
} from './lib/session-hierarchy-tracker';

// Test session
const testSessionId = 'test-session-123';

// Clean up any previous test state
clearSessionState(testSessionId);

console.log('🧪 Testing Agent Lens Hierarchy Tracking\n');

// Simulate a session flow
const events = [
  {
    type: 'SessionStart',
    eventId: 'event-1',
    payload: {},
    expectedParent: null,
    expectedSpanKind: 'root'
  },
  {
    type: 'UserPromptSubmit',
    eventId: 'event-2',
    payload: { prompt: 'Read config file' },
    expectedParent: 'event-1',
    expectedSpanKind: 'internal'
  },
  {
    type: 'PreToolUse',
    eventId: 'event-3',
    payload: {
      tool_name: 'Read',
      tool_use_id: 'toolu_123',
      tool_input: { file_path: 'config.json' }
    },
    expectedParent: 'event-2',
    expectedSpanKind: 'client'
  },
  {
    type: 'PostToolUse',
    eventId: 'event-4',
    payload: {
      tool_name: 'Read',
      tool_use_id: 'toolu_123',
      tool_response: 'File contents...'
    },
    expectedParent: 'event-3',
    expectedSpanKind: 'client'
  },
  {
    type: 'PreToolUse',
    eventId: 'event-5',
    payload: {
      tool_name: 'Task',
      tool_use_id: 'toolu_456',
      task_id: 'task_789',
      tool_input: {
        subagent_type: 'researcher',
        prompt: 'Research topic'
      }
    },
    expectedParent: 'event-2',
    expectedSpanKind: 'client',
    expectedSkill: 'researcher'
  },
  {
    type: 'SubagentStop',
    eventId: 'event-6',
    payload: {
      task_id: 'task_789'
    },
    expectedParent: 'event-5',
    expectedSpanKind: 'internal'
  },
  {
    type: 'Stop',
    eventId: 'event-7',
    payload: {},
    expectedParent: 'event-2',
    expectedSpanKind: 'internal'
  },
  {
    type: 'SessionEnd',
    eventId: 'event-8',
    payload: {},
    expectedParent: 'event-1',
    expectedSpanKind: 'internal'
  }
];

// Track results
let passed = 0;
let failed = 0;

// Process each event in sequence
for (const event of events) {
  console.log(`\n--- Testing: ${event.type} (${event.eventId}) ---`);

  // Get parent
  const parent = getParentEventId(testSessionId, event.type, event.payload);
  console.log(`  Parent: ${parent || 'null'}`);
  console.log(`  Expected: ${event.expectedParent || 'null'}`);

  if (parent === event.expectedParent) {
    console.log(`  ✅ Parent matches`);
    passed++;
  } else {
    console.log(`  ❌ Parent mismatch!`);
    failed++;
  }

  // Get span kind
  const spanKind = getSpanKind(event.type);
  console.log(`  Span Kind: ${spanKind}`);
  console.log(`  Expected: ${event.expectedSpanKind}`);

  if (spanKind === event.expectedSpanKind) {
    console.log(`  ✅ Span kind matches`);
    passed++;
  } else {
    console.log(`  ❌ Span kind mismatch!`);
    failed++;
  }

  // Test skill extraction (if applicable)
  if ('expectedSkill' in event) {
    const skillName = extractSkillName(event.type, event.payload);
    console.log(`  Skill: ${skillName}`);
    console.log(`  Expected: ${event.expectedSkill}`);

    if (skillName === event.expectedSkill) {
      console.log(`  ✅ Skill extraction matches`);
      passed++;
    } else {
      console.log(`  ❌ Skill extraction mismatch!`);
      failed++;
    }
  }

  // Update state for next event
  updateSessionState(testSessionId, event.type, event.eventId, event.payload);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Test Results:`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   Total assertions: ${passed + failed}`);

if (failed === 0) {
  console.log(`\n🎉 All tests passed!`);
  process.exit(0);
} else {
  console.log(`\n💥 Some tests failed!`);
  process.exit(1);
}
