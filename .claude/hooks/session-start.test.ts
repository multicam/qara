/**
 * session-start.ts tests
 *
 * Tests subagent detection, debounce logic, CORE context loading,
 * and memory-budget warning (D13 — 70% threshold, protects against GitHub #39811).
 */

import { describe, it, expect } from "bun:test";
import { writeFileSync, unlinkSync, mkdirSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runHook as runHookBase } from "./lib/test-macros";
import { checkMemoryBudget } from "./session-start";

const HOOK = join(import.meta.dir, "session-start.ts");

function runHook(env?: Record<string, string>, stdin = "") {
  return runHookBase(HOOK, stdin, { env });
}

/** Run `fn` with a fresh fixture PAI_DIR that has `content` at its MEMORY.md; cleans up. */
function withMemoryFixture<T>(cwd: string, content: string | null, fn: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), "memtest-"));
  try {
    if (content !== null) {
      const slug = cwd.replace(/^\//, "").replace(/\//g, "-");
      const memDir = join(root, "projects", `-${slug}`, "memory");
      mkdirSync(memDir, { recursive: true });
      writeFileSync(join(memDir, "MEMORY.md"), content);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true });
  }
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

  describe("memory budget warning (D13, #39811 defense)", () => {
    const cwd = "/tmp/test/memwarn-project";

    it("returns null when MEMORY.md is absent", () => {
      withMemoryFixture(cwd, null, (root) => {
        expect(checkMemoryBudget(root, cwd)).toBeNull();
      });
    });

    it("returns null when well under 70% line budget", () => {
      withMemoryFixture(cwd, "entry\n".repeat(50), (root) => {
        expect(checkMemoryBudget(root, cwd)).toBeNull();
      });
    });

    it("returns null right at 69% line budget", () => {
      withMemoryFixture(cwd, "x\n".repeat(137), (root) => {
        expect(checkMemoryBudget(root, cwd)).toBeNull();
      });
    });

    it("warns at 70% line budget", () => {
      // "x\n".repeat(141) has 141 newlines → split('\n') yields 142 elements
      // (trailing empty after final \n). 142/200 = 71%, over threshold.
      withMemoryFixture(cwd, "x\n".repeat(141), (root) => {
        const out = checkMemoryBudget(root, cwd);
        expect(out).not.toBeNull();
        expect(out).toContain("<system-reminder>");
        expect(out).toContain("142/200 lines");
        expect(out).toContain("NEWEST entries first");
      });
    });

    it("warns at 90% line budget", () => {
      withMemoryFixture(cwd, "x\n".repeat(181), (root) => {
        // 181 lines + 1 trailing split = 182 lines seen by split('\n'); 182/200 = 91%
        const out = checkMemoryBudget(root, cwd);
        expect(out).toContain("% of budget");
      });
    });

    it("warns on byte budget even when line count is small", () => {
      const longLine = "x".repeat(700) + "\n"; // 701 bytes/line
      withMemoryFixture(cwd, longLine.repeat(30), (root) => { // 30 lines, ~21 KB = 84%
        const out = checkMemoryBudget(root, cwd);
        expect(out).not.toBeNull();
        expect(out).toContain("KB");
      });
    });

    it("returns null for relative cwd (safety guard)", () => {
      withMemoryFixture(cwd, "y\n".repeat(180), (root) => {
        expect(checkMemoryBudget(root, "relative/path")).toBeNull();
      });
    });

    it("includes DECISIONS.md pattern hint and archive advice", () => {
      withMemoryFixture(cwd, "z\n".repeat(150), (root) => {
        const out = checkMemoryBudget(root, cwd);
        expect(out).toContain("DECISIONS.md");
        expect(out).toContain("archive");
      });
    });
  });
});
