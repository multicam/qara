/**
 * Tests for mode-state.ts
 *
 * Tests the execution mode state machine: activate/deactivate lifecycle,
 * TTL/session validation, iteration tracking, token budget, deactivation
 * reasons, and CLI subcommands.
 *
 * Follows tdd-state.test.ts patterns: isolated PAI_DIR, env before import.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Set up isolated PAI_DIR before importing mode-state
const TEST_PAI_DIR = join(tmpdir(), `mode-state-test-${process.pid}`);
process.env.PAI_DIR = TEST_PAI_DIR;
process.env.MODE_STATE_NO_CLI = "1";

import {
  readModeState,
  writeModeState,
  isModeActive,
  incrementIteration,
  markStoryComplete,
  deactivateWithReason,
  extendIterations,
  clearModeState,
  getStateFilePath,
  runCLI,
  type ModeState,
  type ModeName,
} from "../hooks/lib/mode-state";

// Helper: write raw state for edge-case testing
function writeRawState(overrides: Partial<ModeState>): void {
  const full: ModeState = {
    active: true,
    mode: "drive",
    sessionId: process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || "unknown",
    iteration: 0,
    maxIterations: 50,
    maxTokensBudget: 0,
    tokensUsed: 0,
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    taskContext: "test task",
    acceptanceCriteria: "tests pass",
    skillPath: "/tmp/test-skill.md",
    prdPath: null,
    lastCompletedStory: null,
    activeSubagents: 0,
    completedSubagents: [],
    deactivationReason: null,
    extensionsUsed: 0,
    maxExtensions: 2,
    extensionSize: 10,
    extensionHistory: [],
    ...overrides,
  };
  const stateFile = getStateFilePath();
  const dir = join(stateFile, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify(full, null, 2));
}

describe("Mode State Management", () => {
  beforeEach(() => {
    const stateDir = join(TEST_PAI_DIR, "state");
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(join(TEST_PAI_DIR, "hooks"), { recursive: true });
    clearModeState();
  });

  afterEach(() => {
    clearModeState();
  });

  // ─── Roundtrip ───────────────────────────────────────────────────────────

  describe("writeModeState + readModeState roundtrip", () => {
    it("should write and read back state correctly", () => {
      writeModeState({
        mode: "drive",
        taskContext: "implement auth",
        acceptanceCriteria: "all tests pass",
        skillPath: "/tmp/drive.md",
      });
      const state = readModeState();
      expect(state).not.toBeNull();
      expect(state!.active).toBe(true);
      expect(state!.mode).toBe("drive");
      expect(state!.taskContext).toBe("implement auth");
      expect(state!.acceptanceCriteria).toBe("all tests pass");
      expect(state!.iteration).toBe(0);
      expect(state!.maxIterations).toBe(50);
    });

    it("should auto-compute timestamps", () => {
      const before = Date.now();
      writeModeState({
        mode: "cruise",
        taskContext: "test",
        acceptanceCriteria: "done",
        skillPath: "/tmp/cruise.md",
      });
      const state = readModeState();
      const started = new Date(state!.startedAt).getTime();
      const expires = new Date(state!.expiresAt).getTime();
      expect(started).toBeGreaterThanOrEqual(before);
      expect(started).toBeLessThanOrEqual(Date.now());
      // TTL should be 4 hours
      expect(expires - started).toBe(4 * 60 * 60 * 1000);
    });

    it("should accept custom maxIterations and maxTokensBudget", () => {
      writeModeState({
        mode: "turbo",
        taskContext: "parallel work",
        acceptanceCriteria: "all done",
        skillPath: "/tmp/turbo.md",
        maxIterations: 20,
        maxTokensBudget: 500000,
      });
      const state = readModeState();
      expect(state!.maxIterations).toBe(20);
      expect(state!.maxTokensBudget).toBe(500000);
    });

    it("should return null when no state exists", () => {
      expect(readModeState()).toBeNull();
    });
  });

  // ─── Validation ──────────────────────────────────────────────────────────

  describe("isModeActive + validation", () => {
    it("should return false for expired state", () => {
      writeRawState({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      expect(readModeState()).toBeNull();
    });

    it("should return false for different session", () => {
      writeRawState({
        sessionId: "other-session-id",
      });
      expect(readModeState()).toBeNull();
    });

    it("should match 'unknown' session as wildcard", () => {
      writeRawState({
        sessionId: "unknown",
      });
      const state = readModeState();
      expect(state).not.toBeNull();
    });

    it("should return false for inactive state", () => {
      writeRawState({ active: false });
      expect(readModeState()).toBeNull();
    });

    it("should return false for deactivated state", () => {
      writeRawState({ deactivationReason: "complete" });
      expect(readModeState()).toBeNull();
    });

    it("isModeActive returns true for valid active state", () => {
      writeRawState({});
      const raw = JSON.parse(readFileSync(getStateFilePath(), "utf-8"));
      expect(isModeActive(raw)).toBe(true);
    });

    it("isModeActive returns false for deactivated state", () => {
      writeRawState({ deactivationReason: "cancelled" });
      const raw = JSON.parse(readFileSync(getStateFilePath(), "utf-8"));
      expect(isModeActive(raw)).toBe(false);
    });
  });

  // ─── Iteration ───────────────────────────────────────────────────────────

  describe("incrementIteration", () => {
    it("should increment iteration count", () => {
      writeModeState({
        mode: "drive",
        taskContext: "test",
        acceptanceCriteria: "done",
        skillPath: "/tmp/d.md",
      });
      incrementIteration();
      const state = readModeState();
      expect(state!.iteration).toBe(1);
    });

    it("should extend TTL on increment", () => {
      writeModeState({
        mode: "drive",
        taskContext: "test",
        acceptanceCriteria: "done",
        skillPath: "/tmp/d.md",
      });
      const before = new Date(readModeState()!.expiresAt).getTime();
      // Small delay to ensure time difference
      incrementIteration();
      const after = new Date(readModeState()!.expiresAt).getTime();
      expect(after).toBeGreaterThanOrEqual(before);
    });

    it("should throw when no active state", () => {
      expect(() => incrementIteration()).toThrow();
    });
  });

  // ─── Story Completion ────────────────────────────────────────────────────

  describe("markStoryComplete", () => {
    it("should set lastCompletedStory", () => {
      writeModeState({
        mode: "drive",
        taskContext: "test",
        acceptanceCriteria: "done",
        skillPath: "/tmp/d.md",
      });
      markStoryComplete("story-1");
      const state = readModeState();
      expect(state!.lastCompletedStory).toBe("story-1");
    });

    it("should throw when no active state", () => {
      expect(() => markStoryComplete("story-1")).toThrow();
    });
  });

  // ─── Deactivation ───────────────────────────────────────────────────────

  describe("deactivateWithReason", () => {
    it("should set deactivationReason and make state inactive for reads", () => {
      writeModeState({
        mode: "drive",
        taskContext: "test",
        acceptanceCriteria: "done",
        skillPath: "/tmp/d.md",
      });
      deactivateWithReason("complete");
      // readModeState should return null (deactivated)
      expect(readModeState()).toBeNull();
      // But raw file should still exist with reason
      const raw = JSON.parse(readFileSync(getStateFilePath(), "utf-8"));
      expect(raw.deactivationReason).toBe("complete");
    });

    it("should preserve state data for archival", () => {
      writeModeState({
        mode: "drive",
        taskContext: "important work",
        acceptanceCriteria: "done",
        skillPath: "/tmp/d.md",
      });
      incrementIteration();
      incrementIteration();
      deactivateWithReason("max-iterations");
      const raw = JSON.parse(readFileSync(getStateFilePath(), "utf-8"));
      expect(raw.iteration).toBe(2);
      expect(raw.taskContext).toBe("important work");
      expect(raw.deactivationReason).toBe("max-iterations");
    });
  });

  // ─── Token Budget ────────────────────────────────────────────────────────

  describe("token budget", () => {
    it("should track tokensUsed", () => {
      writeModeState({
        mode: "drive",
        taskContext: "test",
        acceptanceCriteria: "done",
        skillPath: "/tmp/d.md",
        maxTokensBudget: 100000,
      });
      // Simulate token usage by writing directly
      writeRawState({
        tokensUsed: 50000,
        maxTokensBudget: 100000,
      });
      const state = readModeState();
      expect(state!.tokensUsed).toBe(50000);
      expect(state!.maxTokensBudget).toBe(100000);
    });

    it("should default maxTokensBudget to 0 (unlimited)", () => {
      writeModeState({
        mode: "drive",
        taskContext: "test",
        acceptanceCriteria: "done",
        skillPath: "/tmp/d.md",
      });
      const state = readModeState();
      expect(state!.maxTokensBudget).toBe(0);
    });
  });

  // ─── Clear ───────────────────────────────────────────────────────────────

  describe("clearModeState", () => {
    it("should remove state file", () => {
      writeModeState({
        mode: "drive",
        taskContext: "test",
        acceptanceCriteria: "done",
        skillPath: "/tmp/d.md",
      });
      expect(existsSync(getStateFilePath())).toBe(true);
      clearModeState();
      expect(existsSync(getStateFilePath())).toBe(false);
    });

    it("should be safe to call when no state exists", () => {
      clearModeState(); // Should not throw
      clearModeState(); // Double clear should not throw
    });
  });

  // ─── CLI ─────────────────────────────────────────────────────────────────

  describe("CLI", () => {
    it("should show usage on --help", () => {
      const result = runCLI(["--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });

    it("should activate mode", () => {
      const result = runCLI(["activate", "--mode", "drive", "--task", "build auth", "--criteria", "tests pass", "--skill", "/tmp/d.md"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("drive");
      const state = readModeState();
      expect(state).not.toBeNull();
      expect(state!.mode).toBe("drive");
      expect(state!.taskContext).toBe("build auth");
    });

    it("should require --mode for activate", () => {
      const result = runCLI(["activate", "--task", "test"]);
      expect(result.exitCode).toBe(1);
    });

    it("should show status", () => {
      writeModeState({
        mode: "cruise",
        taskContext: "exploring",
        acceptanceCriteria: "done",
        skillPath: "/tmp/c.md",
      });
      const result = runCLI(["status"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("cruise");
      expect(result.stdout).toContain("exploring");
    });

    it("should show inactive when no state", () => {
      const result = runCLI(["status"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("inactive");
    });

    it("should clear state", () => {
      writeModeState({
        mode: "drive",
        taskContext: "test",
        acceptanceCriteria: "done",
        skillPath: "/tmp/d.md",
      });
      const result = runCLI(["clear"]);
      expect(result.exitCode).toBe(0);
      expect(readModeState()).toBeNull();
    });

    it("should accept case-insensitive mode names", () => {
      const result = runCLI(["activate", "--mode", "DRIVE", "--task", "test", "--criteria", "done", "--skill", "/tmp/d.md"]);
      expect(result.exitCode).toBe(0);
      expect(readModeState()!.mode).toBe("drive");
    });

    it("should reject invalid mode names", () => {
      const result = runCLI(["activate", "--mode", "invalid", "--task", "test", "--criteria", "done", "--skill", "/tmp/d.md"]);
      expect(result.exitCode).toBe(1);
    });

    it("should accept --max flag", () => {
      runCLI(["activate", "--mode", "drive", "--task", "test", "--criteria", "done", "--skill", "/tmp/d.md", "--max", "25"]);
      expect(readModeState()!.maxIterations).toBe(25);
    });
  });

  // ─── extendIterations (Ralph-style hardening) ─────────────────────────────

  describe("extendIterations", () => {
    function activateDrive(maxIterations = 50) {
      writeModeState({ mode: "drive", taskContext: "test", acceptanceCriteria: "done", skillPath: "/tmp/d.md", maxIterations });
    }

    it("should extend maxIterations when extensions available", () => {
      activateDrive();
      const result = extendIterations("verification-failing");
      expect(result.extended).toBe(true);
      expect(result.newMax).toBe(60); // 50 + default extensionSize 10
      const state = readModeState();
      expect(state!.maxIterations).toBe(60);
      expect(state!.extensionsUsed).toBe(1);
    });

    it("should refuse extension when maxExtensions exhausted", () => {
      activateDrive();
      extendIterations("try-1");
      extendIterations("try-2");
      const result = extendIterations("try-3"); // drive maxExtensions=2
      expect(result.extended).toBe(false);
      expect(result.newMax).toBe(70); // stays at 50+10+10
    });

    it("should log extension in extensionHistory", () => {
      activateDrive();
      extendIterations("verification-failing");
      const raw = JSON.parse(readFileSync(getStateFilePath(), "utf-8"));
      expect(raw.extensionHistory).toHaveLength(1);
      expect(raw.extensionHistory[0].previousMax).toBe(50);
      expect(raw.extensionHistory[0].newMax).toBe(60);
      expect(raw.extensionHistory[0].reason).toBe("verification-failing");
    });

    it("should return extended=false when no active mode", () => {
      const result = extendIterations("no-mode");
      expect(result.extended).toBe(false);
      expect(result.newMax).toBe(0);
    });

    it("should use mode-specific defaults (cruise: maxExtensions=1, extensionSize=5)", () => {
      writeModeState({ mode: "cruise", taskContext: "test", acceptanceCriteria: "done", skillPath: "/tmp/c.md", maxIterations: 20 });
      expect(extendIterations("try-1")).toEqual(expect.objectContaining({ extended: true, newMax: 25 }));
      expect(extendIterations("try-2")).toEqual(expect.objectContaining({ extended: false }));
    });
  });
});
