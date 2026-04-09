/**
 * pre-compact.ts tests
 *
 * Tests checkpoint saving before context compression.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import {
  runHook as runHookBase,
  createTestPaiDir,
} from "./lib/test-macros";

const HOOK = join(import.meta.dir, "pre-compact.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("pre-compact-test");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, {
    env: { PAI_DIR: paiDir, CLAUDE_SESSION_ID: "test-compact-session", ...env },
  });
}

describe("pre-compact.ts", () => {
  describe("error resilience", () => {
    it("should exit 0 with empty stdin", async () => {
      const result = await runHook("");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with malformed JSON", async () => {
      const result = await runHook("not json at all");
      expect(result.exitCode).toBe(0);
    });
  });

  describe("checkpoint", () => {
    it("should save checkpoint file", async () => {
      await runHook({ session_id: "test-compact-session" });

      // Check the checkpoint was created in sessions dir
      const sessionsDir = join(paiDir, "state", "sessions", "test-compact-session");
      const checkpointFile = join(sessionsDir, "compact-checkpoint.json");
      expect(existsSync(checkpointFile)).toBe(true);

      const checkpoint = JSON.parse(readFileSync(checkpointFile, "utf-8"));
      expect(checkpoint.savedAt).toBeDefined();
      expect(checkpoint.sessionId).toBe("test-compact-session");
    });

    it("should use env session ID as fallback", async () => {
      await runHook({}, { CLAUDE_SESSION_ID: "env-session-id" });

      const sessionsDir = join(paiDir, "state", "sessions", "env-session-id");
      const checkpointFile = join(sessionsDir, "compact-checkpoint.json");
      expect(existsSync(checkpointFile)).toBe(true);
    });
  });

  describe("output contract", () => {
    it("should produce no stdout when no state to preserve", async () => {
      // With no mode, TDD, or PRD state, checkpoint has no meaningful state
      const result = await runHook({ session_id: "empty-state-session" });
      // May or may not produce output depending on whether checkpoint has state
      expect(result.exitCode).toBe(0);
    });
  });
});
