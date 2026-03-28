/**
 * update-tab-titles.ts tests
 *
 * Tests prompt-based tab title generation and escape sequence output.
 */

import { describe, it, expect } from "bun:test";
import { join } from "path";
import { runHook as runHookBase } from "./lib/test-macros";

const HOOK = join(import.meta.dir, "update-tab-titles.ts");

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, { env });
}

function hookInput(prompt: string) {
  return {
    session_id: "test-123",
    transcript_path: "/tmp/fake",
    hook_event_name: "UserPromptSubmit",
    prompt,
  };
}

describe("update-tab-titles.ts", () => {
  describe("title generation", () => {
    it("should set tab title from prompt", async () => {
      const result = await runHook(hookInput("fix the authentication bug"));
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("\x1b]");
    });

    it("should include processing emoji in title", async () => {
      const result = await runHook(hookInput("refactor the login module"));
      expect(result.stderr).toContain("\u267b\ufe0f");
    });

    it("should use DA env var for agent name in title", async () => {
      const result = await runHook(hookInput("deploy to staging"), {
        DA: "Qara",
      });
      expect(result.stderr).toContain("Qara");
    });

    it('should default to "AI" when DA is not set', async () => {
      const result = await runHook(hookInput("run the tests"), { DA: "" });
      expect(result.stderr).toContain("AI");
    });
  });

  describe("edge cases", () => {
    it("should exit 0 with empty prompt", async () => {
      const result = await runHook(hookInput(""));
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with missing prompt field", async () => {
      const result = await runHook({
        session_id: "test-123",
        hook_event_name: "UserPromptSubmit",
      });
      expect(result.exitCode).toBe(0);
    });

    it("should handle very long prompts", async () => {
      const longPrompt = "x".repeat(10000);
      const result = await runHook(hookInput(longPrompt));
      expect(result.exitCode).toBe(0);
    });

    it("should handle prompts with special characters", async () => {
      const result = await runHook(
        hookInput('fix the "quoted" thing & <html> stuff')
      );
      expect(result.exitCode).toBe(0);
    });
  });

  describe("error resilience", () => {
    it("should exit 0 with empty stdin", async () => {
      const result = await runHook("");
      expect(result.exitCode).toBe(0);
    });

    it("should exit 0 with malformed JSON", async () => {
      const result = await runHook("{bad json");
      expect(result.exitCode).toBe(0);
    });
  });

  describe("output contract", () => {
    it("should produce no stdout (escape sequences go to stderr)", async () => {
      const result = await runHook(hookInput("test prompt"));
      expect(result.stdout.trim()).toBe("");
    });
  });
});
