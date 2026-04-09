/**
 * subagent-start.ts tests
 *
 * Tests subagent start logging and mode state integration.
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

const HOOK = join(import.meta.dir, "subagent-start.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("subagent-start-test");
const LOG_FILE = join(stateDir, "subagent-tracking.jsonl");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

describe("subagent-start.ts", () => {
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
    it("should log subagent start event", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        session_id: "test-session",
        agent_id: "a123",
        agent_type: "engineer",
      });
      const after = await waitForLogLineCount(LOG_FILE, before + 1);
      expect(after).toBeGreaterThan(before);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.event).toBe("start");
      expect(last!.agent_id).toBe("a123");
      expect(last!.agent_type).toBe("engineer");
      expect(last!.session_id).toBe("test-session");
      expect(last!.timestamp).toBeDefined();
    });

    it("should default unknown fields", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({});
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.agent_id).toBe("unknown");
      expect(last!.agent_type).toBe("unknown");
    });
  });

  describe("output contract", () => {
    it("should produce no stdout", async () => {
      const result = await runHook({
        agent_id: "a456",
        agent_type: "reviewer",
      });
      expect(result.stdout.trim()).toBe("");
    });
  });
});
