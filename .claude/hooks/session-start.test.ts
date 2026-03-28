/**
 * session-start.ts tests
 *
 * Tests subagent detection, debounce logic, and CORE context loading.
 */

import { describe, it, expect } from "bun:test";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runHook as runHookBase } from "./lib/test-macros";

const HOOK = join(import.meta.dir, "session-start.ts");

function runHook(env?: Record<string, string>, stdin = "") {
  return runHookBase(HOOK, stdin, { env });
}

describe("session-start.ts", () => {
  describe("subagent detection", () => {
    it("should skip when CLAUDE_AGENT_TYPE is set", async () => {
      const result = await runHook({
        CLAUDE_AGENT_TYPE: "subagent",
        CLAUDE_SESSION_ID: "subagent-test-" + Date.now(),
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain("<system-reminder>");
    });

    it("should skip when CLAUDE_PROJECT_DIR contains agents path", async () => {
      const result = await runHook({
        CLAUDE_PROJECT_DIR: "/home/user/.claude/agents/codebase-analyzer",
        CLAUDE_SESSION_ID: "subagent-test-" + Date.now(),
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain("<system-reminder>");
    });

    it("should NOT skip for normal sessions", async () => {
      const result = await runHook({
        CLAUDE_SESSION_ID: "normal-test-" + Date.now(),
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("<system-reminder>");
    });
  });

  describe("debounce", () => {
    it("should debounce rapid duplicate calls", async () => {
      const sessionId = "debounce-test-" + Date.now();
      const lockfile = join(tmpdir(), `pai-session-start-${sessionId}.lock`);

      try {
        const first = await runHook({ CLAUDE_SESSION_ID: sessionId });
        expect(first.stdout).toContain("<system-reminder>");

        const second = await runHook({ CLAUDE_SESSION_ID: sessionId });
        expect(second.stdout).not.toContain("<system-reminder>");
        expect(second.stderr).toContain("Debouncing");
      } finally {
        try {
          unlinkSync(lockfile);
        } catch {}
      }
    });

    it("should NOT debounce after window expires", async () => {
      const sessionId = "debounce-expired-" + Date.now();
      const lockfile = join(tmpdir(), `pai-session-start-${sessionId}.lock`);

      try {
        writeFileSync(lockfile, (Date.now() - 3000).toString());

        const result = await runHook({ CLAUDE_SESSION_ID: sessionId });
        expect(result.stdout).toContain("<system-reminder>");
      } finally {
        try {
          unlinkSync(lockfile);
        } catch {}
      }
    });
  });

  describe("CORE context loading", () => {
    it("should output SKILL.md content wrapped in system-reminder", async () => {
      const result = await runHook({
        CLAUDE_SESSION_ID: "context-test-" + Date.now(),
      });
      expect(result.stdout).toContain("<system-reminder>");
      expect(result.stdout).toContain("</system-reminder>");
      expect(result.stdout).toContain("Qara");
    });

    it("should handle missing SKILL.md gracefully", async () => {
      const result = await runHook({
        CLAUDE_SESSION_ID: "missing-skill-" + Date.now(),
        PAI_DIR: tmpdir(),
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("SKILL.md not found");
    });
  });

  describe("tab title", () => {
    it("should use DA env var for title", async () => {
      const result = await runHook({
        CLAUDE_SESSION_ID: "title-test-" + Date.now(),
        DA: "Qara",
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Qara Ready");
    });
  });
});
