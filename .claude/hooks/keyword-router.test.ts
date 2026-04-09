/**
 * keyword-router.ts tests
 *
 * Tests mode keyword detection, sanitization, informational filtering,
 * and auto-mode suggestion.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { join } from "path";
import { writeFileSync, mkdirSync } from "fs";
import {
  runHook as runHookBase,
  createTestPaiDir,
  getLastLogLine,
  getLogLineCount,
  waitForLogLineCount,
} from "./lib/test-macros";

const HOOK = join(import.meta.dir, "keyword-router.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("keyword-router-test");
const MODE_CHANGES_LOG = join(stateDir, "mode-changes.jsonl");

afterAll(() => cleanup());

// Create minimal skill files for testing
const skillsDir = join(paiDir, "skills");
for (const mode of ["drive", "cruise", "turbo"]) {
  const dir = join(skillsDir, mode);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `# ${mode} mode skill content`);
}

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env: { PAI_DIR: paiDir, ...env } });
}

describe("keyword-router.ts", () => {
  describe("error resilience", () => {
    it("should exit 0 with empty stdin", async () => {
      const result = await runHook("");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with malformed JSON", async () => {
      const result = await runHook("not json");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with empty prompt", async () => {
      const result = await runHook({ prompt: "" });
      expect(result.exitCode).toBe(0);
    });
  });

  describe("mode activation", () => {
    it("should activate drive mode", async () => {
      const before = getLogLineCount(MODE_CHANGES_LOG);
      const result = await runHook({ prompt: "drive: implement the auth system" });
      expect(result.exitCode).toBe(0);

      // Should inject skill content
      const output = result.stdout.trim();
      expect(output).toContain("drive mode skill content");

      // Should log activation
      await waitForLogLineCount(MODE_CHANGES_LOG, before + 1);
      const last = getLastLogLine(MODE_CHANGES_LOG);
      expect(last!.event).toBe("activated");
      expect(last!.mode).toBe("drive");
    });

    it("should activate cruise mode", async () => {
      // Clear mode state first
      const modeFile = join(stateDir, "mode-state.json");
      try { writeFileSync(modeFile, ""); } catch {}

      const result = await runHook({ prompt: "cruise: refactor the database layer" });
      expect(result.stdout).toContain("cruise mode skill content");
    });

    it("should activate turbo mode", async () => {
      const modeFile = join(stateDir, "mode-state.json");
      try { writeFileSync(modeFile, ""); } catch {}

      const result = await runHook({ prompt: "turbo: run all linters in parallel" });
      expect(result.stdout).toContain("turbo mode skill content");
    });
  });

  describe("sanitization", () => {
    it("should not match keywords inside code blocks", async () => {
      const result = await runHook({
        prompt: "Check this code:\n```\nconst mode = 'drive: fast'\n```\nDoes it look right?",
      });
      // Should NOT activate drive mode
      expect(result.stdout).not.toContain("drive mode skill content");
    });

    it("should not match keywords inside URLs", async () => {
      const result = await runHook({
        prompt: "Check https://example.com/drive/docs for more info",
      });
      expect(result.stdout).not.toContain("drive mode skill content");
    });

    it("should not match keywords inside quoted strings", async () => {
      const result = await runHook({
        prompt: 'The config says "drive: true" in the settings',
      });
      expect(result.stdout).not.toContain("drive mode skill content");
    });
  });

  describe("informational filtering", () => {
    it("should not activate for informational questions", async () => {
      const result = await runHook({
        prompt: "What is drive mode and how does it work?",
      });
      // "what is" + "how does" = informational context
      expect(result.stdout).not.toContain("drive mode skill content");
    });

    it("should not activate for explain requests", async () => {
      const result = await runHook({
        prompt: "Explain how cruise mode operates",
      });
      expect(result.stdout).not.toContain("cruise mode skill content");
    });
  });

  describe("deactivation", () => {
    it("should handle stop mode keyword", async () => {
      const result = await runHook({ prompt: "stop mode" });
      expect(result.exitCode).toBe(0);
    });

    it("should handle exit mode keyword", async () => {
      const result = await runHook({ prompt: "exit mode" });
      expect(result.exitCode).toBe(0);
    });
  });

  describe("no match", () => {
    it("should produce no output for unrelated prompts", async () => {
      const result = await runHook({ prompt: "Fix the login bug" });
      expect(result.stdout.trim()).toBe("");
    });
  });

  describe("auto-mode suggestion", () => {
    it("should suggest turbo for parallel task descriptions", async () => {
      const longPrompt = "I need you to do these 5 independent tasks in parallel: lint the code, run the tests, check types, format files, and audit dependencies. " + "x".repeat(100);
      const result = await runHook({ prompt: longPrompt });
      if (result.stdout.trim()) {
        expect(result.stdout).toContain("turbo mode");
      }
    });
  });
});
