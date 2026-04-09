/**
 * post-tool-failure.ts tests
 *
 * Tests failure tracking, escalation threshold, and rate limit detection.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import {
  runHook as runHookBase,
  createTestPaiDir,
  getLastLogLine,
  getLogLineCount,
  waitForLogLineCount,
} from "./lib/test-macros";

const HOOK = join(import.meta.dir, "post-tool-failure.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("post-tool-failure-test");
const FAILURES_LOG = join(stateDir, "tool-failures.jsonl");
const TRACKING_FILE = join(stateDir, "tool-failure-tracking.json");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, {
    env: { PAI_DIR: paiDir, CLAUDE_SESSION_ID: "test-failure-session", ...env },
  });
}

describe("post-tool-failure.ts", () => {
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

  describe("failure logging", () => {
    it("should log tool failure to JSONL", async () => {
      const before = getLogLineCount(FAILURES_LOG);
      await runHook({
        tool_name: "Bash",
        error: "command not found: foobar",
      });
      await waitForLogLineCount(FAILURES_LOG, before + 1);

      const last = getLastLogLine(FAILURES_LOG);
      expect(last!.tool).toBe("Bash");
      expect(last!.error).toContain("command not found");
      expect(last!.consecutive).toBe(1);
    });

    it("should track consecutive failures for same tool", async () => {
      // Send 3 failures for the same tool
      for (let i = 0; i < 3; i++) {
        const before = getLogLineCount(FAILURES_LOG);
        await runHook({
          tool_name: "Edit",
          error: "old_string not found",
        });
        await waitForLogLineCount(FAILURES_LOG, before + 1);
      }

      const last = getLastLogLine(FAILURES_LOG);
      expect(last!.tool).toBe("Edit");
      expect(last!.consecutive).toBe(3);
    });

    it("should reset counter for different tool", async () => {
      const before = getLogLineCount(FAILURES_LOG);
      await runHook({
        tool_name: "Write",
        error: "permission denied",
      });
      await waitForLogLineCount(FAILURES_LOG, before + 1);

      const last = getLastLogLine(FAILURES_LOG);
      expect(last!.tool).toBe("Write");
      expect(last!.consecutive).toBe(1);
    });

    it("should persist tracking state", async () => {
      await runHook({
        tool_name: "Grep",
        error: "no matches",
      });

      expect(existsSync(TRACKING_FILE)).toBe(true);
      const tracking = JSON.parse(readFileSync(TRACKING_FILE, "utf-8"));
      expect(tracking.tool).toBe("Grep");
      expect(tracking.consecutiveFailures).toBe(1);
    });
  });

  describe("escalation", () => {
    it("should emit escalation at threshold (5+ consecutive)", async () => {
      // Reset by using a unique tool name
      for (let i = 0; i < 5; i++) {
        await runHook({
          tool_name: "EscalationTest",
          error: "same error repeating",
        });
      }

      // The 5th call should produce escalation output
      const result = await runHook({
        tool_name: "EscalationTest",
        error: "same error repeating",
      });
      expect(result.stdout).toContain("REPEATED FAILURE DETECTED");
      expect(result.stdout).toContain("EscalationTest");
    });
  });

  describe("rate limit detection", () => {
    it("should detect 429 rate limit errors immediately", async () => {
      const result = await runHook({
        tool_name: "WebFetch",
        error: "HTTP 429 Too Many Requests",
      });
      expect(result.stdout).toContain("RATE LIMIT DETECTED");
      expect(result.stdout).toContain("WebFetch");
    });

    it("should detect rate limit keyword variations", async () => {
      const result = await runHook({
        tool_name: "Bash",
        error: "Error: rate limit exceeded, please retry",
      });
      expect(result.stdout).toContain("RATE LIMIT DETECTED");
    });

    it("should save checkpoint on rate limit", async () => {
      await runHook(
        { tool_name: "API", error: "429 rate limit" },
        { CLAUDE_SESSION_ID: "rate-limit-session" }
      );

      const sessionsDir = join(paiDir, "state", "sessions", "rate-limit-session");
      const checkpointFile = join(sessionsDir, "compact-checkpoint.json");
      expect(existsSync(checkpointFile)).toBe(true);
    });
  });
});
