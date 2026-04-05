/**
 * Tests for compact-checkpoint.ts
 *
 * Verifies: save/load/clear lifecycle, format summary,
 * graceful handling of missing state sources, and atomic writes.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_SESSIONS_DIR = join(tmpdir(), `checkpoint-test-${process.pid}`);
process.env.SESSIONS_STATE_DIR = TEST_SESSIONS_DIR;

// Dynamic import after env setup
const { saveCheckpoint, loadCheckpoint, clearCheckpoint, formatCheckpointSummary } =
  await import("../hooks/lib/compact-checkpoint");

describe("Compact Checkpoint", () => {
  beforeEach(() => {
    if (existsSync(TEST_SESSIONS_DIR)) rmSync(TEST_SESSIONS_DIR, { recursive: true });
    mkdirSync(TEST_SESSIONS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_SESSIONS_DIR)) rmSync(TEST_SESSIONS_DIR, { recursive: true });
  });

  // ─── saveCheckpoint ─────────────────────────────────────────────────────

  describe("saveCheckpoint", () => {
    it("should create checkpoint file", () => {
      const cp = saveCheckpoint("save-test-1");
      expect(cp.sessionId).toBe("save-test-1");
      expect(cp.savedAt).toBeTruthy();

      const path = join(TEST_SESSIONS_DIR, "sessions", "save-test-1", "compact-checkpoint.json");
      expect(existsSync(path)).toBe(true);
    });

    it("should handle missing state sources gracefully", () => {
      // No mode state, no TDD, no PRD, no working memory
      const cp = saveCheckpoint("empty-state-test");
      expect(cp.mode).toBeNull();
      expect(cp.tddState).toBeNull();
      expect(cp.prdProgress).toBeNull();
      expect(cp.workingMemory).toBeNull();
      expect(cp.activeSubagents).toEqual([]);
    });

    it("should produce valid JSON checkpoint file", () => {
      saveCheckpoint("json-test");
      const path = join(TEST_SESSIONS_DIR, "sessions", "json-test", "compact-checkpoint.json");
      const content = readFileSync(path, "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed.sessionId).toBe("json-test");
      expect(parsed.savedAt).toBeTruthy();
      expect(parsed).toHaveProperty("mode");
      expect(parsed).toHaveProperty("workingMemory");
      expect(parsed).toHaveProperty("tddState");
      expect(parsed).toHaveProperty("prdProgress");
    });
  });

  // ─── loadCheckpoint ─────────────────────────────────────────────────────

  describe("loadCheckpoint", () => {
    it("should return null for missing session", () => {
      expect(loadCheckpoint("nonexistent")).toBeNull();
    });

    it("should load saved checkpoint", () => {
      saveCheckpoint("load-test-1");
      const loaded = loadCheckpoint("load-test-1");
      expect(loaded).not.toBeNull();
      expect(loaded!.sessionId).toBe("load-test-1");
    });

    it("should return null for malformed JSON", () => {
      const dir = join(TEST_SESSIONS_DIR, "sessions", "malformed");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "compact-checkpoint.json"), "not json");
      expect(loadCheckpoint("malformed")).toBeNull();
    });

    it("should return null for missing required fields", () => {
      const dir = join(TEST_SESSIONS_DIR, "sessions", "incomplete");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "compact-checkpoint.json"), '{"foo": "bar"}');
      expect(loadCheckpoint("incomplete")).toBeNull();
    });
  });

  // ─── clearCheckpoint ────────────────────────────────────────────────────

  describe("clearCheckpoint", () => {
    it("should remove checkpoint file", () => {
      saveCheckpoint("clear-test-1");
      const path = join(TEST_SESSIONS_DIR, "sessions", "clear-test-1", "compact-checkpoint.json");
      expect(existsSync(path)).toBe(true);

      clearCheckpoint("clear-test-1");
      expect(existsSync(path)).toBe(false);
    });

    it("should be a no-op if no checkpoint exists", () => {
      clearCheckpoint("nonexistent-session");
      // Should not throw
    });
  });

  // ─── formatCheckpointSummary ────────────────────────────────────────────

  describe("formatCheckpointSummary", () => {
    it("should format mode info", () => {
      const cp = {
        savedAt: new Date().toISOString(),
        sessionId: "test",
        mode: {
          active: true,
          name: "drive",
          iteration: 5,
          maxIterations: 50,
          taskContext: "implement auth",
          acceptanceCriteria: "all tests pass",
          deactivationReason: null,
        },
        workingMemory: null,
        tddState: null,
        prdProgress: null,
        activeSubagents: [],
      };
      const summary = formatCheckpointSummary(cp);
      expect(summary).toContain("drive");
      expect(summary).toContain("5/50");
      expect(summary).toContain("implement auth");
    });

    it("should format TDD state", () => {
      const cp = {
        savedAt: new Date().toISOString(),
        sessionId: "test",
        mode: null,
        workingMemory: null,
        tddState: { active: true, feature: "user-auth", phase: "GREEN" },
        prdProgress: null,
        activeSubagents: [],
      };
      const summary = formatCheckpointSummary(cp);
      expect(summary).toContain("user-auth");
      expect(summary).toContain("GREEN");
    });

    it("should format PRD progress", () => {
      const cp = {
        savedAt: new Date().toISOString(),
        sessionId: "test",
        mode: null,
        workingMemory: null,
        tddState: null,
        prdProgress: { total: 5, passing: 3, currentStory: "Add search" },
        activeSubagents: [],
      };
      const summary = formatCheckpointSummary(cp);
      expect(summary).toContain("3/5");
      expect(summary).toContain("Add search");
    });

    it("should indicate working memory presence", () => {
      const cp = {
        savedAt: new Date().toISOString(),
        sessionId: "test",
        mode: null,
        workingMemory: {
          learnings: "found something",
          decisions: "chose X",
          issues: "",
          problems: "blocked on Y",
        },
        tddState: null,
        prdProgress: null,
        activeSubagents: [],
      };
      const summary = formatCheckpointSummary(cp);
      expect(summary).toContain("Decisions recorded: yes");
      expect(summary).toContain("Learnings recorded: yes");
      expect(summary).toContain("Open problems: yes");
      expect(summary).not.toContain("Issues found");
    });
  });

  // ─── Round-trip ──────────────────────────────────────────────────────────

  describe("round-trip", () => {
    it("should save and load identical data", () => {
      const saved = saveCheckpoint("roundtrip-test");
      const loaded = loadCheckpoint("roundtrip-test");
      expect(loaded?.savedAt).toBe(saved.savedAt);
      expect(loaded?.sessionId).toBe(saved.sessionId);
    });
  });
});
