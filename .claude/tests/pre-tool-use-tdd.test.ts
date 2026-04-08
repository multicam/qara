/**
 * Tests for pre-tool-use-tdd.ts
 *
 * Dedicated enforcement hook tests: deny source in RED, allow in GREEN/REFACTOR,
 * fast-path no state, MultiEdit array handling, fail-open on errors.
 *
 * Subprocess-based — runs the actual hook script with piped stdin.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_PAI_DIR = join(tmpdir(), `tdd-hook-test-${process.pid}`);
const TEST_STATE_DIR = join(TEST_PAI_DIR, "state");
const TDD_STATE_FILE = join(TEST_STATE_DIR, "tdd-mode.json");
const HOOK_SCRIPT = join(import.meta.dir, "..", "hooks", "pre-tool-use-tdd.ts");

function writeTDDState(phase: "RED" | "GREEN" | "REFACTOR"): void {
  mkdirSync(TEST_STATE_DIR, { recursive: true });
  writeFileSync(
    TDD_STATE_FILE,
    JSON.stringify({
      active: true,
      feature: "test-feature",
      phase,
      sessionId: "unknown", // wildcard matches any session
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    })
  );
}

function clearTDDState(): void {
  try {
    if (existsSync(TDD_STATE_FILE)) {
      const { unlinkSync } = require("fs");
      unlinkSync(TDD_STATE_FILE);
    }
  } catch {}
}

async function runHook(input: object): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
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

function parseDecision(stdout: string): { decision: string; reason?: string; context?: string } {
  if (!stdout) return { decision: "allow" }; // No output = allow
  try {
    const parsed = JSON.parse(stdout);
    const hook = parsed.hookSpecificOutput;
    return {
      decision: hook?.permissionDecision || "allow",
      reason: hook?.permissionDecisionReason,
      context: hook?.additionalContext,
    };
  } catch {
    return { decision: "allow" };
  }
}

describe("Pre-Tool-Use TDD Enforcement Hook", () => {
  beforeEach(() => {
    mkdirSync(TEST_STATE_DIR, { recursive: true });
    mkdirSync(join(TEST_PAI_DIR, "hooks"), { recursive: true });
    clearTDDState();
  });

  afterEach(() => {
    clearTDDState();
  });

  // ─── Fast Path (No TDD State) ───────────────────────────────────────────

  describe("no active TDD state", () => {
    it("should allow Write to source file", async () => {
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/src/auth.ts" } });
      expect(result.exitCode).toBe(0);
      expect(parseDecision(result.stdout).decision).toBe("allow");
    });

    it("should allow Edit to source file", async () => {
      const result = await runHook({ tool_name: "Edit", tool_input: { file_path: "/src/auth.ts" } });
      expect(result.exitCode).toBe(0);
      expect(parseDecision(result.stdout).decision).toBe("allow");
    });

    it("should allow Write to test file", async () => {
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/src/auth.test.ts" } });
      expect(result.exitCode).toBe(0);
      expect(parseDecision(result.stdout).decision).toBe("allow");
    });
  });

  // ─── RED Phase ───────────────────────────────────────────────────────────

  describe("RED phase", () => {
    beforeEach(() => writeTDDState("RED"));

    it("should DENY Write to source file", async () => {
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/src/auth.ts" } });
      const decision = parseDecision(result.stdout);
      expect(decision.decision).toBe("deny");
      expect(decision.reason).toContain("RED");
    });

    it("should DENY Edit to source file", async () => {
      const result = await runHook({ tool_name: "Edit", tool_input: { file_path: "/src/auth.ts" } });
      const decision = parseDecision(result.stdout);
      expect(decision.decision).toBe("deny");
    });

    it("should ALLOW Write to test file", async () => {
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/src/auth.test.ts" } });
      expect(parseDecision(result.stdout).decision).toBe("allow");
    });

    it("should ALLOW Write to spec file", async () => {
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/tests/e2e/auth.spec.ts" } });
      expect(parseDecision(result.stdout).decision).toBe("allow");
    });

    it("should DENY MultiEdit with source file in array", async () => {
      const result = await runHook({
        tool_name: "MultiEdit",
        tool_input: {
          edits: [
            { file_path: "/src/auth.ts", old_string: "a", new_string: "b" },
          ],
        },
      });
      const decision = parseDecision(result.stdout);
      expect(decision.decision).toBe("deny");
    });

    it("should ALLOW MultiEdit with only test files", async () => {
      const result = await runHook({
        tool_name: "MultiEdit",
        tool_input: {
          edits: [
            { file_path: "/src/auth.test.ts", old_string: "a", new_string: "b" },
            { file_path: "/src/utils.test.ts", old_string: "c", new_string: "d" },
          ],
        },
      });
      expect(parseDecision(result.stdout).decision).toBe("allow");
    });
  });

  // ─── GREEN Phase ─────────────────────────────────────────────────────────

  describe("GREEN phase", () => {
    beforeEach(() => writeTDDState("GREEN"));

    it("should ALLOW Write to source file", async () => {
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/src/auth.ts" } });
      expect(parseDecision(result.stdout).decision).toBe("allow");
    });

    it("should ALLOW Write to test file with advisory", async () => {
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/src/auth.test.ts" } });
      const decision = parseDecision(result.stdout);
      expect(decision.decision).toBe("allow");
      expect(decision.context).toContain("GREEN");
    });

    it("should ASK when Edit shrinks a test file", async () => {
      const result = await runHook({
        tool_name: "Edit",
        tool_input: {
          file_path: "/src/auth.test.ts",
          old_string: "line1\nline2\nline3\nline4\nline5\nline6",
          new_string: "line1\nline2",
        },
      });
      const decision = parseDecision(result.stdout);
      expect(decision.decision).toBe("ask");
    });

    it("should ALLOW small Edit to test file without ask", async () => {
      const result = await runHook({
        tool_name: "Edit",
        tool_input: {
          file_path: "/src/auth.test.ts",
          old_string: "line1\nline2\nline3",
          new_string: "line1\nline2",
        },
      });
      const decision = parseDecision(result.stdout);
      // Net deletion of 1 line (below threshold of 3) — should allow with advisory, not ask
      expect(decision.decision).toBe("allow");
    });
  });

  // ─── REFACTOR Phase ──────────────────────────────────────────────────────

  describe("REFACTOR phase", () => {
    beforeEach(() => writeTDDState("REFACTOR"));

    it("should ALLOW Write to source file", async () => {
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/src/auth.ts" } });
      expect(parseDecision(result.stdout).decision).toBe("allow");
    });

    it("should ALLOW Write to test file", async () => {
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/src/auth.test.ts" } });
      expect(parseDecision(result.stdout).decision).toBe("allow");
    });
  });

  // ─── Error Handling (Fail-Open) ──────────────────────────────────────────

  describe("fail-open behavior", () => {
    it("should allow on malformed JSON input", async () => {
      const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
        stdin: "pipe", stdout: "pipe", stderr: "pipe",
        env: { ...process.env, PAI_DIR: TEST_PAI_DIR },
        cwd: join(import.meta.dir, "..", "hooks"),
      });
      proc.stdin.write("not json");
      proc.stdin.end();
      const stdout = await new Response(proc.stdout).text();
      expect(parseDecision(stdout.trim()).decision).toBe("allow");
    });

    it("should always exit 0", async () => {
      writeTDDState("RED");
      const result = await runHook({ tool_name: "Write", tool_input: { file_path: "/src/auth.ts" } });
      expect(result.exitCode).toBe(0);
    });
  });
});
