/**
 * pre-tool-use-tdd.ts tests
 *
 * Tests TDD enforcement hook: phase-based file edit decisions,
 * fail-open behavior, state expiry/session handling.
 *
 * Note: ES import hoisting means process.env.PAI_DIR is NOT set before
 * module evaluation. We write state files directly to TEST_PAI_DIR
 * (bypassing the library) since the hook subprocess reads from that path.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { spawn } from "child_process";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";

const HOOK = join(import.meta.dir, "pre-tool-use-tdd.ts");

// Isolated PAI_DIR for subprocess — NOT for this process's library imports
const TEST_PAI_DIR = join(tmpdir(), `tdd-hook-test-${process.pid}`);
const STATE_FILE = join(TEST_PAI_DIR, "state", "tdd-mode.json");

// ─── Test Helpers ───────────────────────────────────────────────────────────

/** Write state directly to the path the subprocess will read */
function writeState(phase: "RED" | "GREEN" | "REFACTOR", overrides: Record<string, unknown> = {}) {
  const state = {
    active: true,
    feature: "test-feature",
    phase,
    testFiles: [],
    sessionId: "unknown", // wildcard — matches any session
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
  mkdirSync(join(TEST_PAI_DIR, "state"), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function clearState() {
  try {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  } catch {}
}

async function runHook(
  input: object | string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn("bun", ["run", HOOK], {
      cwd: import.meta.dir,
      env: {
        ...process.env,
        PAI_DIR: TEST_PAI_DIR,
      },
    });
    let stdout = "",
      stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    const str = typeof input === "string" ? input : JSON.stringify(input);
    proc.stdin.write(str);
    proc.stdin.end();
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({ stdout, stderr, exitCode: 124 });
    }, 10000);
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

function writeInput(filePath: string) {
  return { tool_name: "Write", tool_input: { file_path: filePath, content: "test" } };
}

function editInput(filePath: string) {
  return {
    tool_name: "Edit",
    tool_input: { file_path: filePath, old_string: "a", new_string: "b" },
  };
}

function parseDecision(stdout: string): {
  decision: string;
  reason?: string;
  context?: string;
} {
  const trimmed = stdout.trim();
  if (!trimmed) return { decision: "allow" };
  const parsed = JSON.parse(trimmed);
  const hso = parsed.hookSpecificOutput;
  return {
    decision: hso.permissionDecision,
    reason: hso.permissionDecisionReason,
    context: hso.additionalContext,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("pre-tool-use-tdd.ts", () => {
  beforeEach(() => {
    mkdirSync(join(TEST_PAI_DIR, "state"), { recursive: true });
    mkdirSync(join(TEST_PAI_DIR, "hooks"), { recursive: true });
    clearState();
  });

  afterEach(() => {
    clearState();
  });

  describe("no active TDD state (fast path)", () => {
    it("should allow Write to any file", async () => {
      const result = await runHook(writeInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to any file", async () => {
      const result = await runHook(editInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });
  });

  describe("RED phase", () => {
    beforeEach(() => writeState("RED"));

    it("should allow Write to test file", async () => {
      const result = await runHook(writeInput("/tmp/src/auth.test.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to spec file", async () => {
      const result = await runHook(editInput("/tmp/tests/e2e/login.spec.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to integration test file", async () => {
      const result = await runHook(editInput("/tmp/src/auth.integration.test.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should DENY Write to source file", async () => {
      const result = await runHook(writeInput("/tmp/src/auth.ts"));
      expect(result.exitCode).toBe(0);
      const { decision, reason } = parseDecision(result.stdout);
      expect(decision).toBe("deny");
      expect(reason).toContain("RED");
      expect(reason).toContain("auth.ts");
    });

    it("should DENY Edit to source file", async () => {
      const result = await runHook(editInput("/tmp/src/utils.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("deny");
    });

    it("should allow Write to bombadil spec", async () => {
      const result = await runHook(writeInput("/tmp/specs/nav.bombadil.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Write to draft spec", async () => {
      const result = await runHook(writeInput("/tmp/tests/e2e/login.draft.spec.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });
  });

  describe("GREEN phase", () => {
    beforeEach(() => writeState("GREEN"));

    it("should allow Write to source file", async () => {
      const result = await runHook(writeInput("/tmp/src/auth.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to source file", async () => {
      const result = await runHook(editInput("/tmp/src/utils.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow test file edit with advisory context", async () => {
      const result = await runHook(editInput("/tmp/src/auth.test.ts"));
      expect(result.exitCode).toBe(0);
      const { decision, context } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
      expect(context).toBeDefined();
      expect(context!).toContain("GREEN");
    });
  });

  describe("REFACTOR phase", () => {
    beforeEach(() => writeState("REFACTOR"));

    it("should allow Write to source file", async () => {
      const result = await runHook(writeInput("/tmp/src/auth.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to test file", async () => {
      const result = await runHook(editInput("/tmp/src/auth.test.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });
  });

  describe("state expiry and session handling", () => {
    it("should allow when state is expired", async () => {
      writeState("RED", {
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      const result = await runHook(writeInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow when session doesn't match", async () => {
      writeState("RED", { sessionId: "different-session-xyz" });
      const result = await runHook(writeInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });
  });

  describe("fail-open behavior", () => {
    it("should allow on malformed JSON input", async () => {
      const result = await runHook("not json at all {{{");
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow on empty input", async () => {
      const result = await runHook("");
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow when tool_input has no file_path", async () => {
      writeState("RED");
      const result = await runHook({ tool_name: "Write", tool_input: {} });
      expect(result.exitCode).toBe(0);
      const { decision } = parseDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should always exit 0 regardless of decision", async () => {
      writeState("RED");
      const result = await runHook(writeInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
    });
  });
});
