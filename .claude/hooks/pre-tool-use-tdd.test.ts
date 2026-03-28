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
import {
  runHook as runHookBase,
  writeInput,
  editInput,
  parseHookDecision,
  createTestPaiDir,
  writeMockTDDState,
  clearTDDState,
} from "./lib/test-macros";

const HOOK = join(import.meta.dir, "pre-tool-use-tdd.ts");

let TEST_PAI_DIR: string;
let cleanup: () => void;

function runHook(input: object | string) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: TEST_PAI_DIR } });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("pre-tool-use-tdd.ts", () => {
  beforeEach(() => {
    const ctx = createTestPaiDir("tdd-hook-test");
    TEST_PAI_DIR = ctx.paiDir;
    cleanup = ctx.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  describe("no active TDD state (fast path)", () => {
    it("should allow Write to any file", async () => {
      const result = await runHook(writeInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to any file", async () => {
      const result = await runHook(editInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });
  });

  describe("RED phase", () => {
    beforeEach(() => writeMockTDDState(TEST_PAI_DIR, "RED"));

    it("should allow Write to test file", async () => {
      const result = await runHook(writeInput("/tmp/src/auth.test.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to spec file", async () => {
      const result = await runHook(editInput("/tmp/tests/e2e/login.spec.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to integration test file", async () => {
      const result = await runHook(editInput("/tmp/src/auth.integration.test.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should DENY Write to source file", async () => {
      const result = await runHook(writeInput("/tmp/src/auth.ts"));
      expect(result.exitCode).toBe(0);
      const { decision, reason } = parseHookDecision(result.stdout);
      expect(decision).toBe("deny");
      expect(reason).toContain("RED");
      expect(reason).toContain("auth.ts");
    });

    it("should DENY Edit to source file", async () => {
      const result = await runHook(editInput("/tmp/src/utils.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("deny");
    });

    it("should allow Write to bombadil spec", async () => {
      const result = await runHook(writeInput("/tmp/specs/nav.bombadil.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Write to draft spec", async () => {
      const result = await runHook(writeInput("/tmp/tests/e2e/login.draft.spec.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });
  });

  describe("GREEN phase", () => {
    beforeEach(() => writeMockTDDState(TEST_PAI_DIR, "GREEN"));

    it("should allow Write to source file", async () => {
      const result = await runHook(writeInput("/tmp/src/auth.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to source file", async () => {
      const result = await runHook(editInput("/tmp/src/utils.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow test file edit with advisory context", async () => {
      const result = await runHook(editInput("/tmp/src/auth.test.ts"));
      expect(result.exitCode).toBe(0);
      const { decision, context } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
      expect(context).toBeDefined();
      expect(context!).toContain("GREEN");
    });
  });

  describe("REFACTOR phase", () => {
    beforeEach(() => writeMockTDDState(TEST_PAI_DIR, "REFACTOR"));

    it("should allow Write to source file", async () => {
      const result = await runHook(writeInput("/tmp/src/auth.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow Edit to test file", async () => {
      const result = await runHook(editInput("/tmp/src/auth.test.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });
  });

  describe("state expiry and session handling", () => {
    it("should allow when state is expired", async () => {
      writeMockTDDState(TEST_PAI_DIR, "RED", {
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      const result = await runHook(writeInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow when session doesn't match", async () => {
      writeMockTDDState(TEST_PAI_DIR, "RED", { sessionId: "different-session-xyz" });
      const result = await runHook(writeInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });
  });

  describe("fail-open behavior", () => {
    it("should allow on malformed JSON input", async () => {
      const result = await runHook("not json at all {{{");
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow on empty input", async () => {
      const result = await runHook("");
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should allow when tool_input has no file_path", async () => {
      writeMockTDDState(TEST_PAI_DIR, "RED");
      const result = await runHook({ tool_name: "Write", tool_input: {} });
      expect(result.exitCode).toBe(0);
      const { decision } = parseHookDecision(result.stdout);
      expect(decision).toBe("allow");
    });

    it("should always exit 0 regardless of decision", async () => {
      writeMockTDDState(TEST_PAI_DIR, "RED");
      const result = await runHook(writeInput("/tmp/src/foo.ts"));
      expect(result.exitCode).toBe(0);
    });
  });
});
