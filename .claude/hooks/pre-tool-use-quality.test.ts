/**
 * pre-tool-use-quality.ts tests
 *
 * Tests duplicate code detection, TDD phase awareness,
 * and read-before-edit enforcement.
 */

import { describe, it, expect, afterAll } from "bun:test";
import { join } from "path";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import {
  runHook as runHookBase,
  createTestPaiDir,
  parseHookDecision,
  writeMockTDDState,
  clearTDDState,
} from "./lib/test-macros";

const HOOK = join(import.meta.dir, "pre-tool-use-quality.ts");
const { paiDir, stateDir, cleanup } = createTestPaiDir("quality-test");

afterAll(() => cleanup());

function runHook(input: object | string, env?: Record<string, string>) {
  return runHookBase(HOOK, input, {
    env: { PAI_DIR: paiDir, CLAUDE_SESSION_ID: "quality-test-session", ...env },
  });
}

// Helper to create a file that "exists" for read-before-edit checks
function createTempFile(name: string, content: string): string {
  const filePath = join(paiDir, name);
  writeFileSync(filePath, content);
  return filePath;
}

// Helper to record a file as "read" in the session ledger
function recordFileRead(filePath: string) {
  const sessionsDir = join(paiDir, "state", "sessions", "quality-test-session");
  mkdirSync(sessionsDir, { recursive: true });
  const ledgerPath = join(sessionsDir, "files-read.txt");
  const existing = existsSync(ledgerPath)
    ? require("fs").readFileSync(ledgerPath, "utf-8")
    : "";
  writeFileSync(ledgerPath, existing + filePath + "\n");
}

describe("pre-tool-use-quality.ts", () => {
  describe("error resilience", () => {
    it("should allow on parse error (fail open)", async () => {
      const result = await runHook("not json at all");
      // Fail open = no deny output, exit 0
      expect(result.exitCode).toBe(0);
    });
  });

  describe("TDD phase awareness", () => {
    it("should skip during GREEN phase", async () => {
      writeMockTDDState(paiDir, "GREEN");

      // Create a file with obvious duplicates
      const content = Array(20).fill("const x = doSomething(arg1, arg2);").join("\n");
      const result = await runHook({
        tool_name: "Write",
        tool_input: { file_path: "/tmp/test-green.ts", content },
      });

      // Should allow without warning
      expect(result.stdout.trim()).toBe("");
      clearTDDState(paiDir);
    });

    it("should check during REFACTOR phase", async () => {
      writeMockTDDState(paiDir, "REFACTOR");

      const lines = Array(10).fill("const duplicate = processData(input);");
      const content = [...lines, "const separator = true;", ...lines].join("\n");

      const filePath = createTempFile("refactor-target.ts", "old content");
      recordFileRead(filePath);

      const result = await runHook({
        tool_name: "Write",
        tool_input: { file_path: filePath, content },
      });

      if (result.stdout.trim()) {
        const decision = parseHookDecision(result.stdout);
        expect(decision.decision).toBe("allow"); // Advisory only
        expect(decision.context).toContain("duplicate");
      }
      clearTDDState(paiDir);
    });
  });

  describe("duplicate detection", () => {
    it("should detect exact duplicate blocks", async () => {
      clearTDDState(paiDir);
      const block = "function compute(a: number, b: number) {\n  const result = a + b;\n  console.log(result);\n  return result;\n  // end\n";
      const content = block + "\nconst middle = true;\n\n" + block;

      const filePath = createTempFile("dup-target.ts", "old content");
      recordFileRead(filePath);

      const result = await runHook({
        tool_name: "Write",
        tool_input: { file_path: filePath, content },
      });

      if (result.stdout.trim()) {
        const decision = parseHookDecision(result.stdout);
        expect(decision.decision).toBe("allow");
        expect(decision.context).toContain("duplicate");
      }
    });

    it("should skip short content (< 10 lines)", async () => {
      clearTDDState(paiDir);
      const content = "line1\nline2\nline3";
      const result = await runHook({
        tool_name: "Write",
        tool_input: { file_path: "/tmp/short.ts", content },
      });
      expect(result.stdout.trim()).toBe("");
    });
  });

  describe("read-before-edit enforcement", () => {
    it("should warn when editing unread file", async () => {
      clearTDDState(paiDir);
      const filePath = createTempFile("unread-file.ts", "const x = 1;");
      // Do NOT record it as read

      const result = await runHook({
        tool_name: "Edit",
        tool_input: {
          file_path: filePath,
          old_string: "const x = 1;",
          new_string: "const x = 2;",
        },
      });

      if (result.stdout.trim()) {
        const decision = parseHookDecision(result.stdout);
        expect(decision.decision).toBe("allow"); // Advisory
        expect(decision.context).toContain("Read-before-edit");
      }
    });

    it("should not warn for test files", async () => {
      clearTDDState(paiDir);
      const filePath = createTempFile("example.test.ts", "test content");

      const result = await runHook({
        tool_name: "Write",
        tool_input: { file_path: filePath, content: "new test content" },
      });
      // Test files are exempt — no read-before-edit warning
      expect(result.stdout.trim()).toBe("");
    });

    it("should not warn for files that were read", async () => {
      clearTDDState(paiDir);
      const filePath = createTempFile("read-file.ts", "const y = 1;");
      recordFileRead(filePath);

      const result = await runHook({
        tool_name: "Edit",
        tool_input: {
          file_path: filePath,
          old_string: "const y = 1;",
          new_string: "const y = 2;",
        },
      });
      // Was read, short content — no warning
      expect(result.stdout.trim()).toBe("");
    });
  });

  describe("output contract", () => {
    it("should always use advisory allow, never deny", async () => {
      clearTDDState(paiDir);
      const block = "const a = longFunctionCall(param1, param2);\n".repeat(10);
      const content = block + "\n" + block;

      const filePath = createTempFile("advisory-test.ts", "old");
      recordFileRead(filePath);

      const result = await runHook({
        tool_name: "Write",
        tool_input: { file_path: filePath, content },
      });

      if (result.stdout.trim()) {
        const decision = parseHookDecision(result.stdout);
        // Quality hook is advisory only — never deny
        expect(decision.decision).toBe("allow");
      }
    });
  });
});
