/**
 * config-change.ts tests
 *
 * Tests config change logging, JSONL output, and graceful error handling.
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

const HOOK = join(import.meta.dir, "config-change.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("config-change-test");
const LOG_FILE = join(stateDir, "config-changes.jsonl");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

describe("config-change.ts", () => {
  describe("config change logging", () => {
    it("should log config change to JSONL file", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        config_source: "settings.json",
        session_id: "test-session-1",
      });
      const after = await waitForLogLineCount(LOG_FILE, before + 1);
      expect(after).toBeGreaterThan(before);

      const last = getLastLogLine(LOG_FILE);
      expect(last).not.toBeNull();
      expect(last!.source).toBe("settings.json");
      expect(last!.timestamp).toBeDefined();
    });

    it("should record session_id from input", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({
        config_source: "mcp.json",
        session_id: "explicit-session-id",
      });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.session_id).toBe("explicit-session-id");
    });

    it("should fall back to CLAUDE_SESSION_ID env var", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook(
        { config_source: "settings.json" },
        { CLAUDE_SESSION_ID: "env-session-xyz" }
      );
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.session_id).toBe("env-session-xyz");
    });

    it('should use "unknown" for missing source', async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({ session_id: "test" });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.source).toBe("unknown");
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
        config_source: "test",
        session_id: "test",
      });
      expect(result.stdout.trim()).toBe("");
    });
  });
});
