/**
 * post-tool-use.ts tests
 *
 * Tests tool usage logging, JSONL output, and graceful error handling.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { join } from "path";
import {
  runHook as runHookBase,
  createTestPaiDir,
  getLastLogLine,
  getLogLineCount,
} from "./lib/test-macros";

const HOOK = join(import.meta.dir, "post-tool-use.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("post-tool-use-test");
const LOG_FILE = join(stateDir, "tool-usage.jsonl");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

describe("post-tool-use.ts", () => {
  describe("tool logging", () => {
    it("should log tool usage to JSONL file", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        tool_name: "TestToolColocated",
        tool_input: { file_path: "/tmp/test.txt" },
        was_error: false,
      });
      await new Promise((r) => setTimeout(r, 300));

      const after = getLogLineCount(LOG_FILE);
      expect(after).toBeGreaterThan(before);

      const last = getLastLogLine(LOG_FILE);
      expect(last).not.toBeNull();
      expect(last!.tool).toBe("TestToolColocated");
      expect(last!.error).toBe(false);
      expect(last!.timestamp).toBeDefined();
    });

    it("should record was_error=true for failed tools", async () => {
      await runHook({
        tool_name: "FailedTool",
        tool_input: { command: "false" },
        was_error: true,
      });
      await new Promise((r) => setTimeout(r, 300));

      const last = getLastLogLine(LOG_FILE);
      expect(last!.tool).toBe("FailedTool");
      expect(last!.error).toBe(true);
    });

    it("should record session_id from environment", async () => {
      await runHook(
        { tool_name: "SessionTest", tool_input: {}, was_error: false },
        { CLAUDE_SESSION_ID: "test-session-xyz" }
      );
      await new Promise((r) => setTimeout(r, 300));

      const last = getLastLogLine(LOG_FILE);
      expect(last!.session_id).toBe("test-session-xyz");
    });

    it("should fall back to SESSION_ID env var", async () => {
      await runHook(
        { tool_name: "SessionFallback", tool_input: {}, was_error: false },
        { SESSION_ID: "fallback-session-abc", CLAUDE_SESSION_ID: "" }
      );
      await new Promise((r) => setTimeout(r, 300));

      const last = getLastLogLine(LOG_FILE);
      expect(last!.session_id).toBeDefined();
    });
  });

  describe("error resilience", () => {
    it("should exit 0 with empty stdin", async () => {
      const result = await runHook("");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with malformed JSON", async () => {
      const result = await runHook("not json at all");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with missing fields", async () => {
      const result = await runHook({ unexpected: "data" });
      expect(result.exitCode).toBe(0);
    });
  });

  describe("output contract", () => {
    it("should produce no stdout (logging is a side-effect)", async () => {
      const result = await runHook({
        tool_name: "Read",
        tool_input: { file_path: "/tmp/x" },
      });
      expect(result.stdout.trim()).toBe("");
    });
  });
});
