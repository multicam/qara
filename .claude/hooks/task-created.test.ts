/**
 * task-created.ts tests
 *
 * Tests task creation logging, JSONL output, and graceful error handling.
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

const HOOK = join(import.meta.dir, "task-created.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("task-created-test");
const LOG_FILE = join(stateDir, "task-events.jsonl");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

describe("task-created.ts", () => {
  describe("task event logging", () => {
    it("should log task creation with task_id and subject", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        task_id: "task-42",
        subject: "Fix the login bug",
        session_id: "session-1",
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last).not.toBeNull();
      expect(last!.event).toBe("created");
      expect(last!.task_id).toBe("task-42");
      expect(last!.subject).toBe("Fix the login bug");
      expect(last!.session_id).toBe("session-1");
      expect(last!.timestamp).toBeDefined();
    });

    it("should accept id as alternative to task_id", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({ id: "alt-id-7", subject: "X", session_id: "s" });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.task_id).toBe("alt-id-7");
    });

    it("should truncate long subjects to 200 chars", async () => {
      const longSubject = "x".repeat(500);
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        task_id: "t1",
        subject: longSubject,
        session_id: "s",
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.subject.length).toBeLessThanOrEqual(200);
    });

    it('should use "unknown" when task_id missing', async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({ subject: "no id", session_id: "s" });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.task_id).toBe("unknown");
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

    it("should exit 0 with missing fields", async () => {
      const result = await runHook({ irrelevant: true });
      expect(result.exitCode).toBe(0);
    });
  });

  describe("output contract", () => {
    it("should produce no stdout (logging is a side-effect)", async () => {
      const result = await runHook({
        task_id: "t",
        subject: "s",
        session_id: "s",
      });
      expect(result.stdout.trim()).toBe("");
    });
  });
});
