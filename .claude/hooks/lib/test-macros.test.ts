/**
 * test-macros.ts tests
 *
 * Validates shared hook test helpers: input builders, output parsers,
 * temp dir management, TDD state helpers, JSONL log helpers.
 *
 * Note: runHook() is tested indirectly by every hook test file that imports it.
 * Here we test the pure/deterministic helpers directly.
 */

import { describe, it, expect, afterEach } from "bun:test";
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  bashInput,
  writeInput,
  editInput,
  parseHookDecision,
  createTestPaiDir,
  writeMockTDDState,
  clearTDDState,
  getLastLogLine,
  getLogLineCount,
  waitForLogLineCount,
} from "./test-macros";

// ─── Input Builders ──────────────────────────────────────────────────────────

describe("input builders", () => {
  it("bashInput creates Bash tool input", () => {
    const input = bashInput("git status");
    expect(input).toEqual({
      tool_name: "Bash",
      tool_input: { command: "git status" },
    });
  });

  it("writeInput creates Write tool input", () => {
    const input = writeInput("/tmp/src/foo.ts");
    expect(input).toEqual({
      tool_name: "Write",
      tool_input: { file_path: "/tmp/src/foo.ts", content: "test" },
    });
  });

  it("editInput creates Edit tool input", () => {
    const input = editInput("/tmp/src/bar.ts");
    expect(input).toEqual({
      tool_name: "Edit",
      tool_input: {
        file_path: "/tmp/src/bar.ts",
        old_string: "a",
        new_string: "b",
      },
    });
  });
});

// ─── Output Parsers ──────────────────────────────────────────────────────────

describe("parseHookDecision", () => {
  it("returns allow for empty stdout", () => {
    expect(parseHookDecision("")).toEqual({ decision: "allow" });
    expect(parseHookDecision("  \n  ")).toEqual({ decision: "allow" });
  });

  it("parses allow decision", () => {
    const json = JSON.stringify({
      hookSpecificOutput: {
        permissionDecision: "allow",
        additionalContext: "All good",
      },
    });
    const result = parseHookDecision(json);
    expect(result.decision).toBe("allow");
    expect(result.context).toBe("All good");
  });

  it("parses deny decision with reason", () => {
    const json = JSON.stringify({
      hookSpecificOutput: {
        permissionDecision: "deny",
        permissionDecisionReason: "RED phase: no source edits",
        additionalContext: "TDD enforcement",
      },
    });
    const result = parseHookDecision(json);
    expect(result.decision).toBe("deny");
    expect(result.reason).toBe("RED phase: no source edits");
    expect(result.context).toBe("TDD enforcement");
  });

  it("parses ask decision", () => {
    const json = JSON.stringify({
      hookSpecificOutput: {
        permissionDecision: "ask",
        permissionDecisionReason: "Dangerous command",
      },
    });
    const result = parseHookDecision(json);
    expect(result.decision).toBe("ask");
    expect(result.reason).toBe("Dangerous command");
  });
});

// ─── PAI_DIR Management ──────────────────────────────────────────────────────

describe("createTestPaiDir", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("creates paiDir with state/ and hooks/ subdirectories", () => {
    const result = createTestPaiDir("macro-test");
    cleanup = result.cleanup;
    expect(existsSync(result.paiDir)).toBe(true);
    expect(existsSync(result.stateDir)).toBe(true);
    expect(existsSync(join(result.paiDir, "hooks"))).toBe(true);
  });

  it("cleanup removes the directory", () => {
    const result = createTestPaiDir("cleanup-test");
    const dir = result.paiDir;
    expect(existsSync(dir)).toBe(true);
    result.cleanup();
    expect(existsSync(dir)).toBe(false);
  });
});

// ─── TDD State Helpers ───────────────────────────────────────────────────────

describe("TDD state helpers", () => {
  let paiDir: string;
  let cleanupFn: () => void;

  afterEach(() => cleanupFn?.());

  it("writeMockTDDState creates valid state file", () => {
    const ctx = createTestPaiDir("tdd-state-test");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;

    writeMockTDDState(paiDir, "RED");
    const stateFile = join(paiDir, "state", "tdd-mode.json");
    expect(existsSync(stateFile)).toBe(true);

    const state = JSON.parse(readFileSync(stateFile, "utf-8"));
    expect(state.active).toBe(true);
    expect(state.phase).toBe("RED");
    expect(state.feature).toBe("test-feature");
    expect(state.sessionId).toBe("unknown");
  });

  it("writeMockTDDState accepts overrides", () => {
    const ctx = createTestPaiDir("tdd-override-test");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;

    writeMockTDDState(paiDir, "GREEN", { feature: "custom-feature", sessionId: "sess-123" });
    const state = JSON.parse(readFileSync(join(paiDir, "state", "tdd-mode.json"), "utf-8"));
    expect(state.phase).toBe("GREEN");
    expect(state.feature).toBe("custom-feature");
    expect(state.sessionId).toBe("sess-123");
  });

  it("clearTDDState removes the state file", () => {
    const ctx = createTestPaiDir("tdd-clear-test");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;

    writeMockTDDState(paiDir, "REFACTOR");
    const stateFile = join(paiDir, "state", "tdd-mode.json");
    expect(existsSync(stateFile)).toBe(true);

    clearTDDState(paiDir);
    expect(existsSync(stateFile)).toBe(false);
  });

  it("clearTDDState is safe when no state file exists", () => {
    const ctx = createTestPaiDir("tdd-clear-safe");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;
    expect(() => clearTDDState(paiDir)).not.toThrow();
  });
});

// ─── JSONL Log Helpers ───────────────────────────────────────────────────────

describe("JSONL log helpers", () => {
  let paiDir: string;
  let cleanupFn: () => void;

  afterEach(() => cleanupFn?.());

  it("getLogLineCount returns 0 for missing file", () => {
    expect(getLogLineCount("/tmp/nonexistent-log-file.jsonl")).toBe(0);
  });

  it("getLogLineCount returns 0 for empty file", () => {
    const ctx = createTestPaiDir("jsonl-empty-count");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;

    const logFile = join(ctx.stateDir, "empty.jsonl");
    writeFileSync(logFile, "");
    expect(getLogLineCount(logFile)).toBe(0);
  });

  it("getLastLogLine returns null for missing file", () => {
    expect(getLastLogLine("/tmp/nonexistent-log-file.jsonl")).toBeNull();
  });

  it("getLastLogLine returns null for empty file", () => {
    const ctx = createTestPaiDir("jsonl-empty-last");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;

    const logFile = join(ctx.stateDir, "empty.jsonl");
    writeFileSync(logFile, "");
    expect(getLastLogLine(logFile)).toBeNull();
  });

  it("getLogLineCount counts lines correctly", () => {
    const ctx = createTestPaiDir("jsonl-count");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;

    const logFile = join(ctx.stateDir, "test.jsonl");
    writeFileSync(
      logFile,
      '{"a":1}\n{"b":2}\n{"c":3}\n'
    );
    expect(getLogLineCount(logFile)).toBe(3);
  });

  it("getLastLogLine returns last entry", () => {
    const ctx = createTestPaiDir("jsonl-last");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;

    const logFile = join(ctx.stateDir, "test.jsonl");
    writeFileSync(
      logFile,
      '{"tool":"Read"}\n{"tool":"Write"}\n{"tool":"Edit"}\n'
    );
    const last = getLastLogLine(logFile);
    expect(last).toEqual({ tool: "Edit" });
  });

  it("waitForLogLineCount waits for async log writes", async () => {
    const ctx = createTestPaiDir("jsonl-wait");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;

    const logFile = join(ctx.stateDir, "async.jsonl");
    setTimeout(() => {
      writeFileSync(logFile, '{"tool":"Write"}\n');
    }, 20);

    await expect(
      waitForLogLineCount(logFile, 1, { timeout: 500, interval: 10 })
    ).resolves.toBe(1);
  });

  it("waitForLogLineCount returns current count after timeout", async () => {
    const ctx = createTestPaiDir("jsonl-timeout");
    paiDir = ctx.paiDir;
    cleanupFn = ctx.cleanup;

    const logFile = join(ctx.stateDir, "timeout.jsonl");
    writeFileSync(logFile, '{"tool":"Read"}\n');

    await expect(
      waitForLogLineCount(logFile, 2, { timeout: 30, interval: 10 })
    ).resolves.toBe(1);
  });
});
