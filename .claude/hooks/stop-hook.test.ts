/**
 * stop-hook.ts tests
 *
 * Tests last_assistant_message extraction and tab title setting.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  runHook as runHookBase,
  createTestPaiDir,
} from "./lib/test-macros";

const HOOK = join(import.meta.dir, "stop-hook.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("stop-hook-test");
const CHECKPOINT_FILE = join(stateDir, "session-checkpoints.jsonl");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

describe("stop-hook.ts", () => {
  describe("stdin handling", () => {
    it("should exit 0 with empty stdin", async () => {
      const result = await runHook("");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with malformed JSON", async () => {
      const result = await runHook("not json");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with missing last_assistant_message", async () => {
      const result = await runHook({
        stop_reason: "end_turn",
        transcript_path: "/tmp/foo.jsonl",
      });
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with empty last_assistant_message", async () => {
      const result = await runHook({ last_assistant_message: "" });
      expect(result.exitCode).toBe(0);
    });
  });

  describe("tab title from last_assistant_message", () => {
    it("should set tab title from assistant message", async () => {
      const result = await runHook({
        last_assistant_message: "I fixed the login bug in auth.ts",
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("\x1b]");
    });

    it("should handle long assistant messages", async () => {
      const result = await runHook({
        last_assistant_message:
          "I have completed the refactoring of the authentication module. Here is a summary of all changes made across 12 files including tests and documentation updates.",
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("\x1b]");
    });

    it("should handle short assistant messages", async () => {
      const result = await runHook({
        last_assistant_message: "Done.",
      });
      expect(result.exitCode).toBe(0);
    });

    it("should handle message with markdown formatting", async () => {
      const result = await runHook({
        last_assistant_message:
          "**Fixed** the `authentication` bug in [auth.ts](file)",
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("\x1b]");
    });

    it("should include stop_hook_active field without issues", async () => {
      const result = await runHook({
        last_assistant_message: "Deployed the new feature to staging",
        stop_hook_active: false,
        session_id: "abc123",
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("\x1b]");
    });
  });

  describe("session checkpoint persistence", () => {
    it("should write checkpoint to JSONL on valid message", async () => {
      await runHook({
        last_assistant_message: "Refactored the auth module",
        stop_reason: "end_turn",
      });
      await new Promise((r) => setTimeout(r, 300));

      expect(existsSync(CHECKPOINT_FILE)).toBe(true);
      const lines = readFileSync(CHECKPOINT_FILE, "utf-8").trim().split("\n");
      const last = JSON.parse(lines[lines.length - 1]);
      expect(last.timestamp).toBeDefined();
      expect(last.stop_reason).toBe("end_turn");
      expect(last.summary).toBeDefined();
    });

    it("should record session_id from environment", async () => {
      await runHook(
        { last_assistant_message: "Fixed the login bug" },
        { CLAUDE_SESSION_ID: "checkpoint-test-session" }
      );
      await new Promise((r) => setTimeout(r, 300));

      const lines = readFileSync(CHECKPOINT_FILE, "utf-8").trim().split("\n");
      const last = JSON.parse(lines[lines.length - 1]);
      expect(last.session_id).toBe("checkpoint-test-session");
    });

    it("should not write checkpoint when no last_assistant_message", async () => {
      const before = existsSync(CHECKPOINT_FILE)
        ? readFileSync(CHECKPOINT_FILE, "utf-8").trim().split("\n").length
        : 0;
      await runHook({ stop_reason: "end_turn" });
      await new Promise((r) => setTimeout(r, 300));

      const after = existsSync(CHECKPOINT_FILE)
        ? readFileSync(CHECKPOINT_FILE, "utf-8").trim().split("\n").length
        : 0;
      expect(after).toBe(before);
    });
  });
});
