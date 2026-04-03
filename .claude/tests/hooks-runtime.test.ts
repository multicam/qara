/**
 * Hooks Runtime Tests
 *
 * End-to-end tests for all hooks: spawns each hook with mock stdin,
 * checks exit codes, validates output format, and verifies behavior.
 *
 * Run with: bun test ./.claude/tests/hooks-runtime.test.ts
 */

import { describe, it, expect } from 'bun:test';
import { unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  runHook as runHookBase,
  createTestPaiDir,
  getLastLogLine,
  getLogLineCount,
  waitForLogLineCount,
} from '../hooks/lib/test-macros';

const HOOKS_DIR = join(import.meta.dir, '..', 'hooks');

// Helper: run a hook with JSON stdin and capture output
async function runHook(
  hookFile: string,
  input: object | string,
  env?: Record<string, string>
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return runHookBase(join(HOOKS_DIR, hookFile), input, { env });
}

// =============================================================================
// POST-TOOL-USE HOOK
// =============================================================================

describe('post-tool-use.ts', () => {
  it('should exit 0 with valid tool input', async () => {
    const result = await runHook('post-tool-use.ts', {
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.txt' },
      was_error: false,
    });
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with empty stdin', async () => {
    const result = await runHook('post-tool-use.ts', '');
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with malformed JSON (swallows errors)', async () => {
    const result = await runHook('post-tool-use.ts', 'not json at all');
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with error tool result', async () => {
    const result = await runHook('post-tool-use.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'false' },
      was_error: true,
    });
    expect(result.exitCode).toBe(0);
  });

  it('should log to tool-usage.jsonl', async () => {
    const { paiDir, stateDir, cleanup } = createTestPaiDir('hooks-runtime-post-tool');
    const logFile = join(stateDir, 'tool-usage.jsonl');
    try {
      const beforeLines = getLogLineCount(logFile);

      await runHook(
        'post-tool-use.ts',
        {
          tool_name: 'TestTool',
          tool_input: {},
          was_error: false,
        },
        { PAI_DIR: paiDir }
      );

      const afterLines = await waitForLogLineCount(logFile, beforeLines + 1);
      expect(afterLines).toBeGreaterThan(beforeLines);

      const last = getLastLogLine(logFile);
      expect(last).not.toBeNull();
      expect(last!.tool).toBe('TestTool');
      expect(last!.error).toBe(false);
      expect(last!.timestamp).toBeDefined();
    } finally {
      cleanup();
    }
  });

  it('should produce no stdout output', async () => {
    const result = await runHook('post-tool-use.ts', {
      tool_name: 'Read',
      tool_input: {},
    });
    expect(result.stdout.trim()).toBe('');
  });
});

// =============================================================================
// STOP HOOK
// =============================================================================

describe('stop-hook.ts', () => {
  it('should exit 0 with valid transcript path', async () => {
    // Create a fake transcript file
    const transcriptPath = join(tmpdir(), `test-transcript-${Date.now()}.jsonl`);
    const entry = JSON.stringify({
      type: 'user',
      message: { content: 'fix the bug in login' },
    });
    mkdirSync(join(tmpdir()), { recursive: true });
    require('fs').writeFileSync(transcriptPath, entry + '\n');

    try {
      const result = await runHook('stop-hook.ts', {
        transcript_path: transcriptPath,
        stop_reason: 'end_turn',
      });
      expect(result.exitCode).toBe(0);
    } finally {
      try { unlinkSync(transcriptPath); } catch {}
    }
  });

  it('should exit 0 with empty stdin', async () => {
    const result = await runHook('stop-hook.ts', '');
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with missing transcript_path', async () => {
    const result = await runHook('stop-hook.ts', { stop_reason: 'end_turn' });
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with nonexistent transcript', async () => {
    const result = await runHook('stop-hook.ts', {
      transcript_path: '/tmp/nonexistent-transcript-' + Date.now() + '.jsonl',
    });
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with malformed JSON', async () => {
    const result = await runHook('stop-hook.ts', 'garbage');
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// UPDATE-TAB-TITLES HOOK
// =============================================================================

describe('update-tab-titles.ts', () => {
  it('should exit 0 with valid prompt', async () => {
    const result = await runHook('update-tab-titles.ts', {
      session_id: 'test-123',
      transcript_path: '/tmp/fake',
      hook_event_name: 'UserPromptSubmit',
      prompt: 'fix the authentication bug',
    });
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with empty prompt', async () => {
    const result = await runHook('update-tab-titles.ts', {
      session_id: 'test-123',
      transcript_path: '/tmp/fake',
      hook_event_name: 'UserPromptSubmit',
      prompt: '',
    });
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with missing prompt', async () => {
    const result = await runHook('update-tab-titles.ts', {
      session_id: 'test-123',
      hook_event_name: 'UserPromptSubmit',
    });
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with empty stdin', async () => {
    const result = await runHook('update-tab-titles.ts', '');
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 with malformed JSON', async () => {
    const result = await runHook('update-tab-titles.ts', '{bad json');
    expect(result.exitCode).toBe(0);
  });

  it('should write tab title escape sequences to stderr', async () => {
    const result = await runHook('update-tab-titles.ts', {
      session_id: 'test-123',
      transcript_path: '/tmp/fake',
      hook_event_name: 'UserPromptSubmit',
      prompt: 'debug the login page',
    });
    // Tab title escape sequences go to stderr
    // \x1b]0; or \x1b]2; are the escape sequences
    expect(result.stderr).toContain('\x1b]');
  });
});

// =============================================================================
// SESSION-START HOOK
// =============================================================================

describe('session-start.ts', () => {
  it('should exit 0 for subagent sessions', async () => {
    const result = await runHook('session-start.ts', '', {
      CLAUDE_AGENT_TYPE: 'subagent',
    });
    expect(result.exitCode).toBe(0);
    // Should not output system-reminder for subagents
    expect(result.stdout).not.toContain('<system-reminder>');
  });

  it('should output system-reminder for normal sessions', async () => {
    const result = await runHook('session-start.ts', '', {
      // Ensure no subagent markers
      CLAUDE_SESSION_ID: 'test-session-' + Date.now(),
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('<system-reminder>');
    expect(result.stdout).toContain('</system-reminder>');
  });

  it('should exit 0 even without stdin', async () => {
    const result = await runHook('session-start.ts', '');
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// PRE-TOOL-USE SECURITY (additional regression tests)
// =============================================================================

describe('pre-tool-use-security.ts (regressions)', () => {
  it('should block rm -rf / even when chained with &&', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf / && echo done' },
    });
    const output = JSON.parse(result.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('should block rm -rf / when chained with ;', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /; ls' },
    });
    const output = JSON.parse(result.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('should NOT flag "evaluate" as eval', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'echo "evaluate this expression"' },
    });
    // Should be approved (no output = allow)
    const stdout = result.stdout.trim();
    if (stdout) {
      const output = JSON.parse(stdout);
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    }
    // If no output, that's also allow
    expect(result.exitCode).toBe(0);
  });

  it('should flag actual eval command', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'eval "dangerous code"' },
    });
    const output = JSON.parse(result.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('ask');
  });

  it('should block dd to disk device', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'dd if=/dev/zero of=/dev/sda bs=1M' },
    });
    const output = JSON.parse(result.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('should block mkfs on disk device', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'mkfs.ext4 /dev/sda' },
    });
    const output = JSON.parse(result.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('should flag chmod -R 777 as blocked', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'chmod -R 777 /var/www' },
    });
    const output = JSON.parse(result.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('should flag DELETE FROM without WHERE', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'psql -c "DELETE FROM users;"' },
    });
    const output = JSON.parse(result.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('ask');
  });

  it('should approve safe git operations', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'git add . && git commit -m "test"' },
    });
    // Safe git = approved (no output or allow output)
    expect(result.exitCode).toBe(0);
  });

  it('should flag git reset --hard', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'git reset --hard HEAD~1' },
    });
    const output = JSON.parse(result.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('ask');
  });

  it('should add credential context for .env operations', async () => {
    const result = await runHook('pre-tool-use-security.ts', {
      tool_name: 'Bash',
      tool_input: { command: 'cat .env' },
    });
    const output = JSON.parse(result.stdout.trim());
    // Should flag credential operation
    expect(output.hookSpecificOutput.permissionDecision).toBe('ask');
  });
});

// =============================================================================
// CROSS-HOOK: All hooks handle bad PAI_DIR gracefully
// =============================================================================

describe('All hooks survive bad PAI_DIR', () => {
  const hookFiles = [
    'post-tool-use.ts',
    'pre-tool-use-security.ts',
  ];

  for (const hookFile of hookFiles) {
    it(`${hookFile} should exit 0 even with nonexistent PAI_DIR`, async () => {
      const result = await runHook(hookFile, {
        tool_name: 'Read',
        tool_input: {},
      }, {
        PAI_DIR: '/tmp/nonexistent-pai-' + Date.now(),
      });
      // Should not crash — warn + continue
      expect(result.exitCode).toBe(0);
    });
  }
});
