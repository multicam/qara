/**
 * Tests for capture-all-events.ts
 *
 * Integration tests that run the hook as a subprocess with various inputs.
 * This tests the real behavior including stdin parsing and event validation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'bun';

const TEST_DIR = '/tmp/capture-all-events-test';
const HOOK_PATH = join(import.meta.dir, 'capture-all-events.ts');

// Mock PAI_DIR for testing
const MOCK_PAI_DIR = join(TEST_DIR, 'pai');

/**
 * Run the hook with given input and environment
 */
async function runHook(
  input: Record<string, any>,
  env: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn({
    cmd: ['bun', 'run', HOOK_PATH],
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PAI_DIR: MOCK_PAI_DIR,
      ...env
    }
  });

  // Write input to stdin using Bun's FileSink API
  proc.stdin.write(JSON.stringify(input));
  proc.stdin.end();

  // Wait for completion
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  return { stdout, stderr, exitCode };
}

/**
 * Get today's events file path (matches hook logic)
 */
function getEventsFilePath(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const yearMonth = `${year}-${month}`;
  return join(MOCK_PAI_DIR, 'history', 'raw-outputs', yearMonth, `${year}-${month}-${day}_all-events.jsonl`);
}

/**
 * Read events from JSONL file
 */
function readEvents(): Record<string, any>[] {
  const path = getEventsFilePath();
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf-8');
  return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

describe('capture-all-events hook', () => {
  beforeEach(() => {
    // Clean up test directory before each test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    // Create required directories (pai-paths.ts validates these)
    mkdirSync(MOCK_PAI_DIR, { recursive: true });
    mkdirSync(join(MOCK_PAI_DIR, 'hooks'), { recursive: true });
    mkdirSync(join(MOCK_PAI_DIR, 'state'), { recursive: true });
    mkdirSync(join(MOCK_PAI_DIR, 'history', 'raw-outputs'), { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('event type inference', () => {
    it('should infer PreToolUse from tool_name and tool_input', async () => {
      const input = {
        session_id: 'test-session-1',
        tool_name: 'Read',
        tool_input: { file_path: '/tmp/test.txt' }
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      // PreToolUse should output approve (lowercase per CC schema)
      expect(result.stdout).toContain('"decision":"approve"');

      const events = readEvents();
      expect(events.length).toBe(1);
      expect(events[0].hook_event_type).toBe('PreToolUse');
    });

    it('should infer PostToolUse from tool_result', async () => {
      const input = {
        session_id: 'test-session-1',
        tool_result: 'File content here',
        tool_name: 'Read'
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      const events = readEvents();
      expect(events.length).toBe(1);
      expect(events[0].hook_event_type).toBe('PostToolUse');
    });

    it('should infer UserPromptSubmit from user_prompt', async () => {
      const input = {
        session_id: 'test-session-1',
        user_prompt: 'Hello, Claude!'
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      const events = readEvents();
      expect(events.length).toBe(1);
      expect(events[0].hook_event_type).toBe('UserPromptSubmit');
    });

    it('should infer Stop from stop_reason', async () => {
      const input = {
        session_id: 'test-session-1',
        stop_reason: 'end_turn'
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      const events = readEvents();
      expect(events.length).toBe(1);
      expect(events[0].hook_event_type).toBe('Stop');
    });

    it('should infer SubagentStop from subagent_type and subagent_result', async () => {
      const input = {
        session_id: 'test-session-1',
        subagent_type: 'Explore',
        subagent_result: 'Found 5 files'
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      const events = readEvents();
      expect(events.length).toBe(1);
      expect(events[0].hook_event_type).toBe('SubagentStop');
    });

    it('should infer PreCompact from transcript_summary', async () => {
      const input = {
        session_id: 'test-session-1',
        transcript_summary: 'User asked about X, Claude responded with Y'
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      const events = readEvents();
      expect(events.length).toBe(1);
      expect(events[0].hook_event_type).toBe('PreCompact');
    });

    it('should use explicit hook_event_name when provided', async () => {
      const input = {
        session_id: 'test-session-1',
        hook_event_name: 'SessionStart'
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      const events = readEvents();
      expect(events.length).toBe(1);
      expect(events[0].hook_event_type).toBe('SessionStart');
    });

    it('should skip events with unknown type', async () => {
      const input = {
        session_id: 'test-session-1',
        random_field: 'value'
        // No recognizable fields for inference
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      // Should not create an event file
      const events = readEvents();
      expect(events.length).toBe(0);
    });
  });

  describe('event validation', () => {
    it('should accept valid events', async () => {
      const input = {
        session_id: 'valid-session-123',
        user_prompt: 'Test prompt'
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      const events = readEvents();
      expect(events.length).toBe(1);
      expect(events[0].session_id).toBe('valid-session-123');
    });

    it('should reject events with invalid session_id length', async () => {
      // Session ID too short (< 3 chars)
      const input = {
        session_id: 'ab',
        user_prompt: 'Test'
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('session_id length out of bounds');

      const events = readEvents();
      expect(events.length).toBe(0);
    });

    it('should use default session_id when not provided', async () => {
      const input = {
        user_prompt: 'Test prompt'
      };

      const result = await runHook(input);
      expect(result.exitCode).toBe(0);

      const events = readEvents();
      expect(events.length).toBe(1);
      expect(events[0].session_id).toBe('main');
    });
  });

  describe('event structure', () => {
    it('should include all required fields', async () => {
      const input = {
        session_id: 'test-session',
        user_prompt: 'Hello'
      };

      await runHook(input);
      const events = readEvents();
      expect(events.length).toBe(1);

      const event = events[0];

      // Core identification
      expect(event.event_id).toBeDefined();
      expect(typeof event.event_id).toBe('string');
      expect(event.event_id.length).toBe(36); // UUID format

      expect(event.parent_event_id).toBeDefined(); // Can be null
      expect(event.source_app).toBeDefined();
      expect(event.session_id).toBe('test-session');
      expect(event.hook_event_type).toBe('UserPromptSubmit');
      expect(event.payload).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp_aedt).toBeDefined();

      // Hierarchy metadata
      expect(event.span_kind).toBe('internal');
    });

    it('should preserve original payload', async () => {
      const input = {
        session_id: 'test-session',
        tool_name: 'Bash',
        tool_input: {
          command: 'ls -la',
          timeout: 5000
        },
        custom_field: 'preserved'
      };

      await runHook(input);
      const events = readEvents();

      expect(events[0].payload.tool_name).toBe('Bash');
      expect(events[0].payload.tool_input.command).toBe('ls -la');
      expect(events[0].payload.custom_field).toBe('preserved');
    });
  });

  describe('span kind classification', () => {
    it('should classify PreToolUse as client span', async () => {
      const input = {
        session_id: 'test',
        tool_name: 'Read',
        tool_input: { file_path: '/test' }
      };

      await runHook(input);
      const events = readEvents();
      expect(events[0].span_kind).toBe('client');
    });

    it('should classify UserPromptSubmit as internal span', async () => {
      const input = {
        session_id: 'test',
        user_prompt: 'Hello'
      };

      await runHook(input);
      const events = readEvents();
      expect(events[0].span_kind).toBe('internal');
    });

    it('should classify SessionStart as root span', async () => {
      const input = {
        session_id: 'test',
        hook_event_name: 'SessionStart'
      };

      await runHook(input);
      const events = readEvents();
      expect(events[0].span_kind).toBe('root');
    });
  });

  describe('skill tracking', () => {
    it('should extract skill name from Skill tool', async () => {
      const input = {
        session_id: 'test',
        tool_name: 'Skill',
        tool_input: { skill: 'commit' }
      };

      await runHook(input);
      const events = readEvents();
      expect(events[0].skill_name).toBe('commit');
    });

    it('should extract subagent_type from Task tool', async () => {
      const input = {
        session_id: 'test',
        tool_name: 'Task',
        tool_input: { subagent_type: 'Explore', prompt: 'Find files' }
      };

      await runHook(input);
      const events = readEvents();
      expect(events[0].skill_name).toBe('Explore');
    });

    it('should mark EnterPlanMode as plan-mode skill', async () => {
      const input = {
        session_id: 'test',
        tool_name: 'EnterPlanMode',
        tool_input: {}
      };

      await runHook(input);
      const events = readEvents();
      expect(events[0].skill_name).toBe('plan-mode');
    });
  });

  describe('agent detection', () => {
    it('should use PAI_AGENT_NAME env when set', async () => {
      const input = {
        session_id: 'test',
        user_prompt: 'Hello'
      };

      await runHook(input, { PAI_AGENT_NAME: 'custom-agent' });
      const events = readEvents();
      expect(events[0].source_app).toBe('custom-agent');
    });

    it('should detect agent from Task tool subagent_type', async () => {
      const input = {
        session_id: 'test',
        tool_name: 'Task',
        tool_input: { subagent_type: 'designer' }
      };

      await runHook(input);
      const events = readEvents();
      expect(events[0].source_app).toBe('designer');
    });

    it('should reset agent on SubagentStop', async () => {
      // First, set agent via Task
      await runHook({
        session_id: 'agent-test',
        tool_name: 'Task',
        tool_input: { subagent_type: 'researcher' }
      });

      // Then trigger SubagentStop
      await runHook({
        session_id: 'agent-test',
        subagent_type: 'researcher',
        subagent_result: 'Done'
      });

      const events = readEvents();
      expect(events.length).toBe(2);
      // After SubagentStop, should reset to default
      expect(events[1].source_app).toBe('claude');
    });
  });

  describe('PreToolUse approval', () => {
    it('should output approve for PreToolUse events', async () => {
      const input = {
        session_id: 'test',
        tool_name: 'Read',
        tool_input: { file_path: '/test' }
      };

      const result = await runHook(input);
      expect(result.stdout).toContain('"decision":"approve"');
    });

    it('should not output approve for other event types', async () => {
      const input = {
        session_id: 'test',
        user_prompt: 'Hello'
      };

      const result = await runHook(input);
      expect(result.stdout).not.toContain('"decision":"approve"');
    });
  });

  describe('context tracking (CC 2.1.6)', () => {
    it('should extract context info when present', async () => {
      const input = {
        session_id: 'test',
        user_prompt: 'Hello',
        context: {
          used: 10000,
          remaining: 90000,
          used_percentage: 10,
          remaining_percentage: 90
        }
      };

      await runHook(input);
      const events = readEvents();

      expect(events[0].context_used).toBe(10000);
      expect(events[0].context_remaining).toBe(90000);
      expect(events[0].context_used_percentage).toBe(10);
      expect(events[0].context_remaining_percentage).toBe(90);
    });

    it('should handle missing context gracefully', async () => {
      const input = {
        session_id: 'test',
        user_prompt: 'Hello'
        // No context field
      };

      await runHook(input);
      const events = readEvents();

      expect(events[0].context_used).toBeUndefined();
      expect(events[0].context_remaining).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const proc = spawn({
        cmd: ['bun', 'run', HOOK_PATH],
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          PAI_DIR: MOCK_PAI_DIR
        }
      });

      proc.stdin.write('not valid json');
      proc.stdin.end();

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();

      // Should still exit cleanly and output approve (safety fallback)
      expect(exitCode).toBe(0);
      expect(stdout).toContain('"decision":"approve"');
    });

    it('should handle empty input gracefully', async () => {
      const proc = spawn({
        cmd: ['bun', 'run', HOOK_PATH],
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          PAI_DIR: MOCK_PAI_DIR
        }
      });

      proc.stdin.write('');
      proc.stdin.end();

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();

      // Should still exit cleanly
      expect(exitCode).toBe(0);
      expect(stdout).toContain('"decision":"approve"');
    });
  });

  describe('multiple events', () => {
    it('should append multiple events to same file', async () => {
      // First event
      await runHook({
        session_id: 'multi-test',
        user_prompt: 'First prompt'
      });

      // Second event
      await runHook({
        session_id: 'multi-test',
        tool_name: 'Read',
        tool_input: { file_path: '/test' }
      });

      // Third event
      await runHook({
        session_id: 'multi-test',
        tool_result: 'content'
      });

      const events = readEvents();
      expect(events.length).toBe(3);
      expect(events[0].hook_event_type).toBe('UserPromptSubmit');
      expect(events[1].hook_event_type).toBe('PreToolUse');
      expect(events[2].hook_event_type).toBe('PostToolUse');
    });
  });
});
