/**
 * post-compact.ts tests
 *
 * Tests post-compact checkpoint load, recovery injection, compaction event
 * logging, and graceful error handling when no checkpoint exists.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { join } from "path";
import { mkdirSync, writeFileSync } from "fs";
import {
  runHook as runHookBase,
  createTestPaiDir,
  getLastLogLine,
  getLogLineCount,
  waitForLogLineCount,
} from "./lib/test-macros";

const HOOK = join(import.meta.dir, "post-compact.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("post-compact-test");
const LOG_FILE = join(stateDir, "compaction-events.jsonl");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

function writeFixtureCheckpoint(sessionId: string) {
  const sessionDir = join(stateDir, "sessions", sessionId);
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(
    join(sessionDir, "compact-checkpoint.json"),
    JSON.stringify({
      savedAt: new Date().toISOString(),
      sessionId,
      mode: null,
      workingMemory: null,
      tddState: null,
      prdProgress: null,
      activeSubagents: [],
    })
  );
}

describe("post-compact.ts", () => {
  describe("compaction event logging", () => {
    it("should log post_compact event when no checkpoint exists", async () => {
      const before = getLogLineCount(LOG_FILE);
      await runHook({ session_id: "no-checkpoint-session" });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last).not.toBeNull();
      expect(last!.event).toBe("post_compact");
      expect(last!.session_id).toBe("no-checkpoint-session");
      expect(last!.checkpoint_found).toBe(false);
    });

    it("should log checkpoint_found=true when fixture exists", async () => {
      writeFixtureCheckpoint("with-checkpoint-session");
      const before = getLogLineCount(LOG_FILE);
      await runHook({ session_id: "with-checkpoint-session" });
      await waitForLogLineCount(LOG_FILE, before + 1);

      const last = getLastLogLine(LOG_FILE);
      expect(last!.checkpoint_found).toBe(true);
    });
  });

  describe("recovery injection", () => {
    it("should emit system-reminder stdout when checkpoint exists", async () => {
      writeFixtureCheckpoint("recovery-session");
      const result = await runHook({ session_id: "recovery-session" });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("CONTEXT COMPACTED");
      const parsed = JSON.parse(result.stdout);
      expect(parsed.result).toBeDefined();
    });

    it("should produce no stdout when no checkpoint found", async () => {
      const result = await runHook({ session_id: "missing-cp-session" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("");
    });
  });

  describe("error resilience", () => {
    it("should exit 0 with empty stdin", async () => {
      const result = await runHook("");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with malformed JSON (falls back to env session)", async () => {
      const result = await runHook("not json");
      expect(result.exitCode).toBe(0);
    });
  });
});
