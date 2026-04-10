/**
 * stop-failure.ts tests
 *
 * Tests failure logging, JSONL output, stdout contract, and graceful error handling.
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

const HOOK = join(import.meta.dir, "stop-failure.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("stop-failure-test");
const LOG_FILE = join(stateDir, "stop-failures.jsonl");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

describe("stop-failure.ts", () => {
  describe("failure logging", () => {
    it("should log error string to JSONL", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        error: "rate_limit_error",
        session_id: "session-1",
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last).not.toBeNull();
      expect(last!.error).toBe("rate_limit_error");
      expect(last!.session_id).toBe("session-1");
      expect(last!.timestamp).toBeDefined();
    });

    it("should stringify object errors", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        error: { type: "auth", message: "token expired" },
        session_id: "s",
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.error).toContain("auth");
    });

    it("should fall back to stop_reason when error missing", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        stop_reason: "tool_use",
        session_id: "s",
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.error).toBe("tool_use");
    });

    it("should truncate long errors to 500 chars", async () => {
      const longError = "x".repeat(1000);
      const before = getLogLineCount(LOG_FILE);
      await runHook({ error: longError, session_id: "s" });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.error.length).toBeLessThanOrEqual(500);
    });
  });

  describe("stdout contract", () => {
    it("should emit system-reminder guidance", async () => {
      const result = await runHook({
        error: "rate_limit",
        session_id: "s",
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("SESSION INTERRUPTED");
      expect(result.stdout).toContain("rate_limit");
    });

    it("should return valid JSON with result field", async () => {
      const result = await runHook({ error: "oops", session_id: "s" });
      const parsed = JSON.parse(result.stdout);
      expect(parsed.result).toBeDefined();
      expect(typeof parsed.result).toBe("string");
    });
  });

  describe("error resilience", () => {
    it("should exit 0 with empty stdin", async () => {
      const result = await runHook("");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with malformed JSON", async () => {
      const result = await runHook("not json");
      expect(result.exitCode).toBe(0);
    });
  });
});
