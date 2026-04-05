/**
 * Tests for subagent-start.ts and subagent-stop.ts hooks.
 *
 * Subprocess-based — runs the actual hook scripts with piped stdin.
 * Verifies JSONL logging and mode state updates.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_PAI_DIR = join(tmpdir(), `subagent-hook-test-${process.pid}`);
const TEST_STATE_DIR = join(TEST_PAI_DIR, "state");
const TRACKING_FILE = join(TEST_STATE_DIR, "subagent-tracking.jsonl");
const MODE_STATE_FILE = join(TEST_STATE_DIR, "mode-state.json");
const START_HOOK = join(import.meta.dir, "..", "hooks", "subagent-start.ts");
const STOP_HOOK = join(import.meta.dir, "..", "hooks", "subagent-stop.ts");

function writeModeState(overrides: Record<string, unknown> = {}): void {
  mkdirSync(TEST_STATE_DIR, { recursive: true });
  const state = {
    active: true,
    mode: "turbo",
    sessionId: "unknown",
    iteration: 0,
    maxIterations: 30,
    maxTokensBudget: 0,
    tokensUsed: 0,
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    taskContext: "test task",
    acceptanceCriteria: "test criteria",
    skillPath: "",
    prdPath: null,
    lastCompletedStory: null,
    activeSubagents: 0,
    completedSubagents: [],
    deactivationReason: null,
    ...overrides,
  };
  writeFileSync(MODE_STATE_FILE, JSON.stringify(state, null, 2));
}

function readTrackingEntries(): Array<Record<string, unknown>> {
  if (!existsSync(TRACKING_FILE)) return [];
  return readFileSync(TRACKING_FILE, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readModeStateFile(): Record<string, unknown> | null {
  if (!existsSync(MODE_STATE_FILE)) return null;
  return JSON.parse(readFileSync(MODE_STATE_FILE, "utf-8"));
}

async function runHook(
  hookPath: string,
  input: object
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", hookPath], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      PAI_DIR: TEST_PAI_DIR,
      CLAUDE_SESSION_ID: "test-session",
    },
    cwd: join(import.meta.dir, "..", "hooks"),
  });
  proc.stdin.write(JSON.stringify(input));
  proc.stdin.end();
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("Subagent Hooks", () => {
  beforeEach(() => {
    if (existsSync(TEST_PAI_DIR)) rmSync(TEST_PAI_DIR, { recursive: true });
    mkdirSync(TEST_STATE_DIR, { recursive: true });
    mkdirSync(join(TEST_PAI_DIR, "hooks"), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_PAI_DIR)) rmSync(TEST_PAI_DIR, { recursive: true });
  });

  // ─── SubagentStart ──────────────────────────────────────────────────────

  describe("subagent-start.ts", () => {
    it("should log start event to tracking file", async () => {
      await runHook(START_HOOK, {
        session_id: "test-session",
        agent_id: "agent-123",
        agent_type: "engineer",
      });
      const entries = readTrackingEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].event).toBe("start");
      expect(entries[0].agent_type).toBe("engineer");
      expect(entries[0].agent_id).toBe("agent-123");
    });

    it("should always exit 0", async () => {
      const result = await runHook(START_HOOK, {});
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 on empty input", async () => {
      const proc = Bun.spawn(["bun", "run", START_HOOK], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: TEST_PAI_DIR },
        cwd: join(import.meta.dir, "..", "hooks"),
      });
      proc.stdin.write("");
      proc.stdin.end();
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
    });

    it("should increment activeSubagents when mode is active", async () => {
      writeModeState({ activeSubagents: 2 });
      await runHook(START_HOOK, {
        agent_id: "agent-456",
        agent_type: "reviewer",
      });
      const state = readModeStateFile();
      expect(state?.activeSubagents).toBe(3);
    });
  });

  // ─── SubagentStop ───────────────────────────────────────────────────────

  describe("subagent-stop.ts", () => {
    it("should log stop event to tracking file", async () => {
      await runHook(STOP_HOOK, {
        session_id: "test-session",
        agent_id: "agent-789",
        agent_type: "codebase-analyzer",
        last_assistant_message: "Analysis complete: found 3 patterns",
      });
      const entries = readTrackingEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].event).toBe("stop");
      expect(entries[0].agent_type).toBe("codebase-analyzer");
      expect(entries[0].result_length).toBe(35);
    });

    it("should always exit 0", async () => {
      const result = await runHook(STOP_HOOK, {});
      expect(result.exitCode).toBe(0);
    });

    it("should decrement activeSubagents and append to completedSubagents", async () => {
      writeModeState({ activeSubagents: 3, completedSubagents: ["old:1"] });
      await runHook(STOP_HOOK, {
        agent_id: "agent-abc",
        agent_type: "engineer",
      });
      const state = readModeStateFile();
      expect(state?.activeSubagents).toBe(2);
      expect((state?.completedSubagents as string[]).length).toBe(2);
      expect((state?.completedSubagents as string[])[1]).toBe("engineer:agent-abc");
    });

    it("should not go below 0 for activeSubagents", async () => {
      writeModeState({ activeSubagents: 0 });
      await runHook(STOP_HOOK, {
        agent_id: "agent-x",
        agent_type: "reviewer",
      });
      const state = readModeStateFile();
      expect(state?.activeSubagents).toBe(0);
    });

    it("should truncate result_summary to 500 chars", async () => {
      const longMessage = "x".repeat(1000);
      await runHook(STOP_HOOK, {
        agent_id: "agent-long",
        agent_type: "architect",
        last_assistant_message: longMessage,
      });
      const entries = readTrackingEntries();
      expect(entries[0].result_summary).toHaveLength(500);
      expect(entries[0].result_length).toBe(1000);
    });
  });
});
