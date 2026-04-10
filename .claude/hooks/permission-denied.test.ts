/**
 * permission-denied.ts tests
 *
 * Tests denied-permission logging, JSONL output, and graceful error handling.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { join } from "path";
import {
  runHook as runHookBase,
  createTestPaiDir,
  getLastLogLine,
  getLogLineCount,
  waitForLogLineCount,
} from "./lib/test-macros";

const HOOK = join(import.meta.dir, "permission-denied.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("permission-denied-test");
const LOG_FILE = join(stateDir, "permission-denied.jsonl");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

describe("permission-denied.ts", () => {
  describe("denial logging", () => {
    it("should log Bash denial with command summary", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        tool_name: "Bash",
        tool_input: { command: "rm -rf /important" },
        session_id: "session-1",
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last).not.toBeNull();
      expect(last!.tool).toBe("Bash");
      expect(last!.summary).toBe("rm -rf /important");
      expect(last!.session_id).toBe("session-1");
      expect(last!.timestamp).toBeDefined();
    });

    it("should log file-op denial with file_path", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        tool_name: "Write",
        tool_input: { file_path: "/etc/shadow" },
        session_id: "session-2",
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.tool).toBe("Write");
      expect(last!.summary).toBe("/etc/shadow");
    });

    it("should truncate long Bash commands to 200 chars", async () => {
      const longCmd = "echo " + "x".repeat(500);
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        tool_name: "Bash",
        tool_input: { command: longCmd },
        session_id: "session-3",
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.summary.length).toBeLessThanOrEqual(200);
    });

    it('should use "unknown" when tool_name missing', async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({ tool_input: {}, session_id: "s4" });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.tool).toBe("unknown");
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
      const result = await runHook({ random: "data" });
      expect(result.exitCode).toBe(0);
    });
  });

  describe("output contract", () => {
    it("should produce no stdout (logging is a side-effect)", async () => {
      const result = await runHook({
        tool_name: "Bash",
        tool_input: { command: "ls" },
        session_id: "s",
      });
      expect(result.stdout.trim()).toBe("");
    });
  });
});
