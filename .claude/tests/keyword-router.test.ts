/**
 * Tests for keyword-router.ts
 *
 * Tests keyword detection, sanitization, context-window filtering,
 * mode activation/deactivation, and edge cases.
 *
 * Uses test-macros.ts runHook() for subprocess-based testing.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Isolated PAI_DIR
const TEST_PAI_DIR = join(tmpdir(), `keyword-router-test-${process.pid}`);
const TEST_STATE_DIR = join(TEST_PAI_DIR, "state");
const TEST_HOOKS_DIR = join(TEST_PAI_DIR, "hooks");
const TEST_SKILLS_DIR = join(TEST_PAI_DIR, "skills");
const MODE_STATE_FILE = join(TEST_STATE_DIR, "mode-state.json");

// The hook script path (actual source, not test copy)
const HOOK_SCRIPT = join(import.meta.dir, "..", "hooks", "keyword-router.ts");

// Helper: run the hook as subprocess with given input
async function runRouter(input: object): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      PAI_DIR: TEST_PAI_DIR,
      MODE_STATE_NO_CLI: "1",
      CLAUDE_SESSION_ID: "test-session",
    },
    cwd: join(import.meta.dir, "..", "hooks"),
  });

  const inputStr = JSON.stringify(input);
  proc.stdin.write(inputStr);
  proc.stdin.end();

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

// Helper: create a minimal skill SKILL.md
function createSkill(name: string, content: string): void {
  const dir = join(TEST_SKILLS_DIR, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), content);
}

describe("Keyword Router", () => {
  beforeEach(() => {
    mkdirSync(TEST_STATE_DIR, { recursive: true });
    mkdirSync(TEST_HOOKS_DIR, { recursive: true });
    mkdirSync(TEST_SKILLS_DIR, { recursive: true });
    // Create test skills
    createSkill("drive", "# Drive Mode\nPRD-driven iteration loop.");
    createSkill("cruise", "# Cruise Mode\nPhased autonomous execution.");
    createSkill("turbo", "# Turbo Mode\nParallel agent dispatch.");
    // Clean mode state
    if (existsSync(MODE_STATE_FILE)) rmSync(MODE_STATE_FILE);
  });

  afterEach(() => {
    if (existsSync(MODE_STATE_FILE)) rmSync(MODE_STATE_FILE);
  });

  // ─── Basic Keyword Detection ─────────────────────────────────────────────

  describe("keyword detection", () => {
    it("should detect 'drive' keyword and inject skill", async () => {
      const result = await runRouter({ prompt: "drive: implement user auth" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Drive Mode");
      expect(result.stdout).toContain("system-reminder");
    });

    it("should detect 'cruise' keyword", async () => {
      const result = await runRouter({ prompt: "cruise: explore the codebase" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Cruise Mode");
    });

    it("should detect 'turbo' keyword", async () => {
      const result = await runRouter({ prompt: "turbo: refactor all modules" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Turbo Mode");
    });

    it("should produce no output for unmatched prompts", async () => {
      const result = await runRouter({ prompt: "fix the bug in auth.ts" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should detect 'stop mode' keyword", async () => {
      // First activate a mode
      await runRouter({ prompt: "drive: start work" });
      // Then stop it
      const result = await runRouter({ prompt: "stop mode" });
      expect(result.exitCode).toBe(0);
      // Mode state should be cleared
      expect(existsSync(MODE_STATE_FILE)).toBe(false);
    });
  });

  // ─── Sanitization ────────────────────────────────────────────────────────

  describe("sanitization", () => {
    it("should not match keywords inside URLs", async () => {
      const result = await runRouter({ prompt: "check https://example.com/drive/api" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should not match keywords inside code blocks", async () => {
      const result = await runRouter({ prompt: "look at this:\n```\nconst mode = 'drive';\n```" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should not match keywords inside file paths", async () => {
      const result = await runRouter({ prompt: "read /home/user/drive/config.ts" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should not match keywords inside quoted strings", async () => {
      const result = await runRouter({ prompt: 'the variable is called "drive_mode"' });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });
  });

  // ─── Context Window (Informational vs Actionable) ────────────────────────

  describe("context window", () => {
    it("should skip informational mentions with 'what is'", async () => {
      const result = await runRouter({ prompt: "what is drive mode and how does it work?" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should skip informational mentions with 'explain'", async () => {
      const result = await runRouter({ prompt: "explain how cruise mode operates" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should skip informational mentions with 'how does'", async () => {
      const result = await runRouter({ prompt: "how does turbo mode work internally?" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should match actionable drive command", async () => {
      const result = await runRouter({ prompt: "drive: build the new feature" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Drive Mode");
    });
  });

  // ─── Mode Activation ────────────────────────────────────────────────────

  describe("mode activation", () => {
    it("should create mode-state.json when activating drive", async () => {
      await runRouter({ prompt: "drive: implement feature X" });
      expect(existsSync(MODE_STATE_FILE)).toBe(true);
      const state = JSON.parse(readFileSync(MODE_STATE_FILE, "utf-8"));
      expect(state.mode).toBe("drive");
      expect(state.active).toBe(true);
      expect(state.taskContext).toContain("implement feature X");
    });

    it("should set maxIterations from route defaults", async () => {
      await runRouter({ prompt: "cruise: explore things" });
      const state = JSON.parse(readFileSync(MODE_STATE_FILE, "utf-8"));
      expect(state.maxIterations).toBe(20); // cruise default
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle empty prompt gracefully", async () => {
      const result = await runRouter({ prompt: "" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should handle missing prompt field", async () => {
      const result = await runRouter({ session_id: "test" });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
    });

    it("should handle malformed JSON input", async () => {
      const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: TEST_PAI_DIR, MODE_STATE_NO_CLI: "1" },
        cwd: join(import.meta.dir, "..", "hooks"),
      });
      proc.stdin.write("not json");
      proc.stdin.end();
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0); // Must never exit(1)
    });

    it("should handle empty input", async () => {
      const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: TEST_PAI_DIR, MODE_STATE_NO_CLI: "1" },
        cwd: join(import.meta.dir, "..", "hooks"),
      });
      proc.stdin.write("");
      proc.stdin.end();
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
    });

    it("should use first match when multiple keywords present", async () => {
      const result = await runRouter({ prompt: "drive: use turbo mode for this" });
      expect(result.exitCode).toBe(0);
      // "drive" appears first, should win
      expect(result.stdout).toContain("Drive Mode");
    });
  });
});
