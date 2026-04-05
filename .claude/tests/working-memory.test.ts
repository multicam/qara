/**
 * Tests for working-memory.ts
 *
 * Verifies: append operations, read all memory, format for injection,
 * archive, empty state, and session isolation.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// We need to set SESSIONS_STATE_DIR before importing the module
const TEST_SESSIONS_DIR = join(tmpdir(), `working-memory-test-${process.pid}`);
process.env.SESSIONS_STATE_DIR = TEST_SESSIONS_DIR;
process.env.CLAUDE_SESSION_ID = "test-session-wm";

// Dynamic import after env setup
const {
  getMemoryDir,
  appendLearning,
  appendDecision,
  appendIssue,
  appendProblem,
  readAllMemory,
  formatMemoryForInjection,
  archiveMemory,
} = await import("../hooks/lib/working-memory");

describe("Working Memory", () => {
  beforeEach(() => {
    // Clean slate
    if (existsSync(TEST_SESSIONS_DIR)) {
      rmSync(TEST_SESSIONS_DIR, { recursive: true });
    }
    mkdirSync(TEST_SESSIONS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_SESSIONS_DIR)) {
      rmSync(TEST_SESSIONS_DIR, { recursive: true });
    }
  });

  // ─── getMemoryDir ────────────────────────────────────────────────────────

  describe("getMemoryDir", () => {
    it("should create memory directory", () => {
      const dir = getMemoryDir("test-123");
      expect(existsSync(dir)).toBe(true);
      expect(dir).toContain("test-123");
      expect(dir).toEndWith("/memory");
    });

    it("should use session ID from env if not provided", () => {
      const dir = getMemoryDir();
      expect(dir).toContain("test-session-wm");
    });
  });

  // ─── Append operations ───────────────────────────────────────────────────

  describe("append operations", () => {
    it("should create learning file with header on first append", () => {
      appendLearning("discovered X", "append-test-1");
      const dir = getMemoryDir("append-test-1");
      const content = readFileSync(join(dir, "learnings.md"), "utf-8");
      expect(content).toContain("# Learnings");
      expect(content).toContain("discovered X");
      expect(content).toContain("AEST");
    });

    it("should append to existing file", () => {
      appendDecision("chose approach A", "append-test-2");
      appendDecision("chose approach B", "append-test-2");
      const dir = getMemoryDir("append-test-2");
      const content = readFileSync(join(dir, "decisions.md"), "utf-8");
      expect(content).toContain("chose approach A");
      expect(content).toContain("chose approach B");
      // Header only once
      expect(content.split("# Decisions").length).toBe(2);
    });

    it("should create issue file", () => {
      appendIssue("found bug in auth", "append-test-3");
      const dir = getMemoryDir("append-test-3");
      expect(existsSync(join(dir, "issues.md"))).toBe(true);
    });

    it("should create problem file", () => {
      appendProblem("blocked on external API", "append-test-4");
      const dir = getMemoryDir("append-test-4");
      expect(existsSync(join(dir, "problems.md"))).toBe(true);
    });
  });

  // ─── readAllMemory ──────────────────────────────────────────────────────

  describe("readAllMemory", () => {
    it("should return empty strings for missing files", () => {
      const memory = readAllMemory("empty-session");
      expect(memory.learning).toBe("");
      expect(memory.decision).toBe("");
      expect(memory.issue).toBe("");
      expect(memory.problem).toBe("");
    });

    it("should return content for existing files", () => {
      appendLearning("fact A", "read-test-1");
      appendDecision("decision B", "read-test-1");
      const memory = readAllMemory("read-test-1");
      expect(memory.learning).toContain("fact A");
      expect(memory.decision).toContain("decision B");
      expect(memory.issue).toBe("");
      expect(memory.problem).toBe("");
    });
  });

  // ─── formatMemoryForInjection ───────────────────────────────────────────

  describe("formatMemoryForInjection", () => {
    it("should return empty string when no memory exists", () => {
      const result = formatMemoryForInjection("no-memory-session");
      expect(result).toBe("");
    });

    it("should format all memory categories", () => {
      appendDecision("use TDD", "format-test-1");
      appendLearning("API is rate-limited", "format-test-1");
      appendProblem("CI flaky", "format-test-1");
      appendIssue("missing test coverage", "format-test-1");

      const result = formatMemoryForInjection("format-test-1");
      expect(result).toContain("WORKING MEMORY");
      expect(result).toContain("DECISIONS:");
      expect(result).toContain("LEARNINGS:");
      expect(result).toContain("OPEN PROBLEMS:");
      expect(result).toContain("ISSUES:");
      expect(result).toContain("use TDD");
      expect(result).toContain("API is rate-limited");
    });

    it("should only include sections with content", () => {
      appendLearning("only this", "format-test-2");
      const result = formatMemoryForInjection("format-test-2");
      expect(result).toContain("LEARNINGS:");
      expect(result).not.toContain("DECISIONS:");
      expect(result).not.toContain("OPEN PROBLEMS:");
    });
  });

  // ─── archiveMemory ──────────────────────────────────────────────────────

  describe("archiveMemory", () => {
    it("should move memory to archive subdirectory", () => {
      appendLearning("something", "archive-test-1");
      const memDir = getMemoryDir("archive-test-1");
      expect(existsSync(join(memDir, "learnings.md"))).toBe(true);

      archiveMemory("archive-test-1");

      // Memory dir should no longer exist
      expect(existsSync(memDir)).toBe(false);

      // Archive dir should exist
      const archiveDir = join(TEST_SESSIONS_DIR, "sessions", "archive-test-1", "archive");
      expect(existsSync(archiveDir)).toBe(true);
    });

    it("should be a no-op if no memory exists", () => {
      // Should not throw
      archiveMemory("nonexistent-session");
    });
  });

  // ─── Session isolation ───────────────────────────────────────────────────

  describe("session isolation", () => {
    it("should keep memory separate between sessions", () => {
      appendLearning("session A data", "session-a");
      appendLearning("session B data", "session-b");

      const memA = readAllMemory("session-a");
      const memB = readAllMemory("session-b");

      expect(memA.learning).toContain("session A data");
      expect(memA.learning).not.toContain("session B data");
      expect(memB.learning).toContain("session B data");
      expect(memB.learning).not.toContain("session A data");
    });
  });
});
