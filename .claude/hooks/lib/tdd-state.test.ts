/**
 * Tests for tdd-state.ts
 *
 * Tests the TDD state management library: read/write/update/clear,
 * file pattern matching, TTL/session validation, and CLI subcommands.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Set up isolated STATE_DIR before importing tdd-state
const TEST_STATE_DIR = join(tmpdir(), `tdd-state-test-${process.pid}`);
const TEST_PAI_DIR = join(tmpdir(), `tdd-pai-test-${process.pid}`);

// Must set env before import so pai-paths resolves to test dir
process.env.PAI_DIR = TEST_PAI_DIR;

import {
  readTDDState,
  readTDDStateRaw,
  writeTDDState,
  updatePhase,
  clearTDDState,
  isTestFile,
  isStateValid,
  getStateFilePath,
  runCLI,
  type TDDState,
  type TDDPhase,
} from "./tdd-state";

// Helper: write a raw state file directly (bypass writeTDDState for edge cases)
function writeRawState(state: Partial<TDDState>): void {
  const full: TDDState = {
    active: true,
    feature: "test-feature",
    phase: "RED",
    sessionId: process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || "unknown",
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    ...state,
  };
  const stateFile = getStateFilePath();
  const dir = join(stateFile, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify(full, null, 2));
}

describe("TDD State Management", () => {
  beforeEach(() => {
    // Ensure clean state dir exists
    const stateDir = join(TEST_PAI_DIR, "state");
    mkdirSync(stateDir, { recursive: true });
    // Also create hooks dir so pai-paths validation doesn't warn
    mkdirSync(join(TEST_PAI_DIR, "hooks"), { recursive: true });
    // Clear any existing state
    clearTDDState();
  });

  afterEach(() => {
    clearTDDState();
  });

  describe("writeTDDState + readTDDState roundtrip", () => {
    it("should write and read back state correctly", () => {
      writeTDDState({ feature: "user-auth", phase: "RED" });
      const state = readTDDState();
      expect(state).not.toBeNull();
      expect(state!.active).toBe(true);
      expect(state!.feature).toBe("user-auth");
      expect(state!.phase).toBe("RED");
      expect(state!.startedAt).toBeDefined();
      expect(state!.expiresAt).toBeDefined();
    });

    it("should auto-compute timestamps", () => {
      const before = Date.now();
      writeTDDState({ feature: "test", phase: "GREEN" });
      const after = Date.now();
      const state = readTDDStateRaw()!;

      const started = new Date(state.startedAt).getTime();
      const expires = new Date(state.expiresAt).getTime();

      expect(started).toBeGreaterThanOrEqual(before);
      expect(started).toBeLessThanOrEqual(after);
      // TTL is 2 hours
      expect(expires - started).toBe(2 * 60 * 60 * 1000);
    });

    it("should use CLAUDE_SESSION_ID for session", () => {
      const oldSession = process.env.CLAUDE_SESSION_ID;
      process.env.CLAUDE_SESSION_ID = "test-session-123";
      writeTDDState({ feature: "test", phase: "RED" });
      const state = readTDDStateRaw()!;
      expect(state.sessionId).toBe("test-session-123");
      if (oldSession) process.env.CLAUDE_SESSION_ID = oldSession;
      else delete process.env.CLAUDE_SESSION_ID;
    });

    it("should accept explicit sessionId", () => {
      writeTDDState({ feature: "test", phase: "RED", sessionId: "explicit-id" });
      const state = readTDDStateRaw()!;
      expect(state.sessionId).toBe("explicit-id");
    });

    it("should store feature and phase", () => {
      writeTDDState({ feature: "auth", phase: "GREEN" });
      const state = readTDDState()!;
      expect(state.feature).toBe("auth");
      expect(state.phase).toBe("GREEN");
    });
  });

  describe("readTDDState (validated)", () => {
    it("should return null when no state file exists", () => {
      expect(readTDDState()).toBeNull();
    });

    it("should return null when state is expired", () => {
      writeRawState({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      expect(readTDDState()).toBeNull();
    });

    it("should return null when session doesn't match", () => {
      writeRawState({ sessionId: "different-session-xyz" });
      expect(readTDDState()).toBeNull();
    });

    it("should return state when session is 'unknown' (wildcard)", () => {
      writeRawState({ sessionId: "unknown" });
      expect(readTDDState()).not.toBeNull();
    });
  });

  describe("readTDDStateRaw", () => {
    it("should return null when file doesn't exist", () => {
      expect(readTDDStateRaw()).toBeNull();
    });

    it("should return state even if expired", () => {
      writeRawState({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      expect(readTDDStateRaw()).not.toBeNull();
    });

    it("should return null for malformed JSON", () => {
      const stateFile = getStateFilePath();
      writeFileSync(stateFile, "not json at all");
      expect(readTDDStateRaw()).toBeNull();
    });

    it("should return null when active is false", () => {
      writeRawState({ active: false });
      expect(readTDDStateRaw()).toBeNull();
    });
  });

  describe("updatePhase", () => {
    it("should transition phase from RED to GREEN", () => {
      writeTDDState({ feature: "auth", phase: "RED" });
      updatePhase("GREEN");
      const state = readTDDStateRaw()!;
      expect(state.phase).toBe("GREEN");
      expect(state.feature).toBe("auth"); // preserved
    });

    it("should transition phase from GREEN to REFACTOR", () => {
      writeTDDState({ feature: "auth", phase: "GREEN" });
      updatePhase("REFACTOR");
      expect(readTDDStateRaw()!.phase).toBe("REFACTOR");
    });

    it("should extend TTL on phase update", () => {
      writeTDDState({ feature: "auth", phase: "RED" });
      const before = new Date(readTDDStateRaw()!.expiresAt).getTime();
      // Small delay to ensure timestamp difference
      updatePhase("GREEN");
      const after = new Date(readTDDStateRaw()!.expiresAt).getTime();
      expect(after).toBeGreaterThanOrEqual(before);
    });

    it("should throw when no active state exists", () => {
      expect(() => updatePhase("GREEN")).toThrow(
        "No active TDD state to update"
      );
    });
  });

  describe("clearTDDState", () => {
    it("should remove the state file", () => {
      writeTDDState({ feature: "test", phase: "RED" });
      expect(readTDDStateRaw()).not.toBeNull();
      clearTDDState();
      expect(readTDDStateRaw()).toBeNull();
    });

    it("should not throw when file doesn't exist", () => {
      expect(() => clearTDDState()).not.toThrow();
    });
  });

  describe("isTestFile", () => {
    const testCases: [string, boolean][] = [
      ["foo.test.ts", true],
      ["foo.test.js", true],
      ["foo.spec.ts", true],
      ["foo.spec.js", true],
      ["foo.integration.test.ts", true],
      ["foo.integration.test.js", true],
      ["foo.draft.spec.ts", true],
      ["foo.bombadil.ts", true],
      // Source files — NOT test files
      ["foo.ts", false],
      ["foo.js", false],
      ["index.ts", false],
      ["utils.ts", false],
      ["test-helper.ts", false],
      ["test.config.ts", false],
      // With paths
      ["src/auth/login.test.ts", true],
      ["src/auth/login.ts", false],
      ["tests/e2e/checkout.spec.ts", true],
      ["tests/e2e/checkout.draft.spec.ts", true],
      ["specs/auth.bombadil.ts", true],
    ];

    for (const [file, expected] of testCases) {
      it(`${file} → ${expected}`, () => {
        expect(isTestFile(file)).toBe(expected);
      });
    }
  });

  describe("isStateValid", () => {
    it("should return true for valid state", () => {
      const state: TDDState = {
        active: true,
        feature: "test",
        phase: "RED",
        sessionId: process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || "unknown",
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };
      expect(isStateValid(state)).toBe(true);
    });

    it("should return false when TTL expired", () => {
      const state: TDDState = {
        active: true,
        feature: "test",
        phase: "RED",
        sessionId: "unknown",
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      expect(isStateValid(state)).toBe(false);
    });

    it("should return false when session doesn't match", () => {
      const state: TDDState = {
        active: true,
        feature: "test",
        phase: "RED",
        sessionId: "other-session-abc",
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };
      expect(isStateValid(state)).toBe(false);
    });

    it("should return true when sessionId is 'unknown' (wildcard)", () => {
      const state: TDDState = {
        active: true,
        feature: "test",
        phase: "RED",
        sessionId: "unknown",
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };
      expect(isStateValid(state)).toBe(true);
    });
  });

  describe("CLI: runCLI", () => {
    it("should show help with --help", () => {
      const result = runCLI(["--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });

    it("should show help with no args", () => {
      const result = runCLI([]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });

    it("should activate TDD mode", () => {
      const result = runCLI(["activate", "--feature", "auth", "--phase", "RED"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("activated");
      expect(readTDDStateRaw()!.feature).toBe("auth");
    });

    it("should error on activate without --feature", () => {
      const result = runCLI(["activate", "--phase", "RED"]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("--feature is required");
    });

    it("should update phase", () => {
      writeTDDState({ feature: "test", phase: "RED" });
      const result = runCLI(["phase", "GREEN"]);
      expect(result.exitCode).toBe(0);
      expect(readTDDStateRaw()!.phase).toBe("GREEN");
    });

    it("should error on invalid phase", () => {
      const result = runCLI(["phase", "BLUE"]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("RED, GREEN, or REFACTOR");
    });

    it("should error on phase with no active state", () => {
      const result = runCLI(["phase", "GREEN"]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No active TDD state");
    });

    it("should clear state", () => {
      writeTDDState({ feature: "test", phase: "RED" });
      const result = runCLI(["clear"]);
      expect(result.exitCode).toBe(0);
      expect(readTDDStateRaw()).toBeNull();
    });

    it("should show status when active", () => {
      writeTDDState({ feature: "auth", phase: "GREEN" });
      const result = runCLI(["status"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("active");
      expect(result.stdout).toContain("auth");
      expect(result.stdout).toContain("GREEN");
    });

    it("should show status when inactive", () => {
      const result = runCLI(["status"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("inactive");
    });

    it("should error on unknown command", () => {
      const result = runCLI(["frobnicate"]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Unknown command");
    });

    it("should handle case-insensitive phase", () => {
      const result = runCLI(["activate", "--feature", "test", "--phase", "red"]);
      expect(result.exitCode).toBe(0);
      expect(readTDDStateRaw()!.phase).toBe("RED");
    });
  });
});
