/**
 * subagent-stop.ts tests
 *
 * Tests subagent stop logging, result truncation, and mode state integration.
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

const HOOK = join(import.meta.dir, "subagent-stop.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("subagent-stop-test");
const LOG_FILE = join(stateDir, "subagent-tracking.jsonl");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

describe("subagent-stop.ts", () => {
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

  describe("logging", () => {
    it("should log subagent stop event", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        session_id: "test-session",
        agent_id: "a789",
        agent_type: "codebase-analyzer",
        last_assistant_message: "Found 3 matching files",
      });
      const after = await waitForLogLineCount(LOG_FILE, before + 1);
      expect(after).toBeGreaterThan(before);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.event).toBe("stop");
      expect(last!.agent_id).toBe("a789");
      expect(last!.agent_type).toBe("codebase-analyzer");
      expect(last!.result_length).toBe(22);
      expect(last!.result_summary).toBe("Found 3 matching files");
    });

    it("should truncate long result summaries to 500 chars", async () => {
      const longMessage = "x".repeat(1000);
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        agent_id: "a999",
        agent_type: "researcher",
        last_assistant_message: longMessage,
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.result_length).toBe(1000);
      expect((last!.result_summary as string).length).toBe(500);
    });

    it("should handle missing message gracefully", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({ agent_id: "a000", agent_type: "critic" });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.result_length).toBe(0);
      expect(last!.result_summary).toBe("");
    });
  });

  describe("output contract", () => {
    it("should produce no stdout", async () => {
      const result = await runHook({
        agent_id: "a111",
        agent_type: "verifier",
        last_assistant_message: "All tests pass",
      });
      expect(result.stdout.trim()).toBe("");
    });
  });
});
