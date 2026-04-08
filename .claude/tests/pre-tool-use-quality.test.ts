import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";

const HOOK_PATH = join(__dirname, "../hooks/pre-tool-use-quality.ts");
const TEST_SESSION_ID = `quality-test-${process.pid}`;
const TEST_STATE_DIR = join(tmpdir(), `quality-hook-test-${process.pid}`);
const TEST_SESSIONS_DIR = join(TEST_STATE_DIR, "sessions");
const TEST_LEDGER_DIR = join(TEST_SESSIONS_DIR, TEST_SESSION_ID);
const TEST_LEDGER_PATH = join(TEST_LEDGER_DIR, "files-read.txt");

function runHook(input: object, opts?: { sessionId?: string }): { stdout: string; exitCode: number } {
  const proc = Bun.spawnSync({
    cmd: ["bun", "run", HOOK_PATH],
    stdin: Buffer.from(JSON.stringify(input)),
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      HOME: process.env.HOME,
      CLAUDE_SESSION_ID: opts?.sessionId ?? TEST_SESSION_ID,
      SESSIONS_STATE_DIR: TEST_STATE_DIR,
    },
  });
  return {
    stdout: proc.stdout.toString().trim(),
    exitCode: proc.exitCode,
  };
}

/** Write a mock ledger with the given file paths as "already read" */
function seedLedger(paths: string[]): void {
  mkdirSync(TEST_LEDGER_DIR, { recursive: true });
  writeFileSync(TEST_LEDGER_PATH, paths.join('\n') + '\n');
}

describe("pre-tool-use-quality hook", () => {
  test("hook file exists and is executable", () => {
    const stat = Bun.file(HOOK_PATH);
    expect(stat.size).toBeGreaterThan(0);
  });

  test("exits 0 on valid input with no duplicates", () => {
    const result = runHook({
      tool_name: "Write",
      tool_input: {
        file_path: "/tmp/test.ts",
        content: "const a = 1;\nconst b = 2;\nconst c = 3;\n",
      },
    });
    expect(result.exitCode).toBe(0);
  });

  test("exits 0 on short content (< 10 lines)", () => {
    const result = runHook({
      tool_name: "Write",
      tool_input: {
        file_path: "/tmp/test.ts",
        content: "line1\nline2\nline3\n",
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("detects duplicate 5-line blocks in Write content", () => {
    const block = "function doWork() {\n  const x = 1;\n  const y = 2;\n  return x + y;\n}\n";
    const content = `// File start\n${block}\n// Middle\n${block}\n// End\n`;
    const result = runHook({
      tool_name: "Write",
      tool_input: {
        file_path: "/tmp/test.ts",
        content,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(parsed.hookSpecificOutput.additionalContext).toContain("duplicate");
  });

  test("does not flag non-duplicate content", () => {
    const content = Array.from({ length: 20 }, (_, i) =>
      `const var${i} = ${i}; // unique line ${i}`
    ).join("\n");
    const result = runHook({
      tool_name: "Write",
      tool_input: {
        file_path: "/tmp/test.ts",
        content,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("handles Edit tool with duplicate blocks in new_string", () => {
    const block = "  if (a) {\n    doSomething();\n    logResult();\n    cleanup();\n    return;\n  }\n";
    const result = runHook({
      tool_name: "Edit",
      tool_input: {
        file_path: "/tmp/test.ts",
        old_string: "placeholder",
        new_string: `${block}\n// gap\n${block}`,
      },
    });
    expect(result.exitCode).toBe(0);
    // Block is 6 lines x2 + gap = 13 lines (>10), duplicate detected
    if (result.stdout) {
      const parsed = JSON.parse(result.stdout);
      expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
    }
  });

  test("exits 0 silently on malformed input (fail-open)", () => {
    const result = runHook({ garbage: true });
    expect(result.exitCode).toBe(0);
  });

  test("exits 0 silently on empty stdin", () => {
    const proc = Bun.spawnSync({
      cmd: ["bun", "run", HOOK_PATH],
      stdin: Buffer.from(""),
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(proc.exitCode).toBe(0);
  });

  test("never outputs deny decision", () => {
    const block = "function dup() {\n  const x = 1;\n  const y = 2;\n  return x + y;\n}\n";
    const content = `${block}\n${block}\n${block}`;
    const result = runHook({
      tool_name: "Write",
      tool_input: { file_path: "/tmp/test.ts", content },
    });
    expect(result.exitCode).toBe(0);
    if (result.stdout) {
      const parsed = JSON.parse(result.stdout);
      expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
    }
  });

  test("handles MultiEdit tool (checks combined new_strings)", () => {
    const result = runHook({
      tool_name: "MultiEdit",
      tool_input: {
        edits: [
          { file_path: "/tmp/a.ts", old_string: "x", new_string: "const a = 1;" },
          { file_path: "/tmp/b.ts", old_string: "y", new_string: "const b = 2;" },
        ],
      },
    });
    expect(result.exitCode).toBe(0);
  });

  test("does not flag overlapping blocks (2 lines apart)", () => {
    // 7 identical lines create overlapping 5-line windows but not a true duplicate
    const content = Array.from({ length: 7 }, () => "  const x = doSomething();").join("\n")
      + "\n" + Array.from({ length: 5 }, (_, i) => `const unique${i} = ${i};`).join("\n");
    const result = runHook({
      tool_name: "Write",
      tool_input: { file_path: "/tmp/test.ts", content },
    });
    expect(result.exitCode).toBe(0);
    // Overlapping windows should not produce a duplicate warning
  });
});

describe("read-before-edit enforcement (#42796)", () => {
  const editInput = (filePath: string) => ({
    tool_name: "Edit" as const,
    tool_input: { file_path: filePath, old_string: "x", new_string: "y" },
  });

  function expectDecision(result: { stdout: string; exitCode: number }, expected: "warn" | "no-warn") {
    expect(result.exitCode).toBe(0);
    if (expected === "warn") {
      const parsed = JSON.parse(result.stdout);
      expect(parsed.hookSpecificOutput.permissionDecision).toBe("allow");
      expect(parsed.hookSpecificOutput.additionalContext).toContain("Read-before-edit");
    } else if (result.stdout) {
      const parsed = JSON.parse(result.stdout);
      // Should not have read-before-edit warning
      if (parsed.hookSpecificOutput?.additionalContext) {
        expect(parsed.hookSpecificOutput.additionalContext).not.toContain("Read-before-edit");
      }
    }
  }

  beforeEach(() => {
    mkdirSync(TEST_LEDGER_DIR, { recursive: true });
    if (existsSync(TEST_LEDGER_PATH)) rmSync(TEST_LEDGER_PATH);
  });

  afterEach(() => {
    if (existsSync(TEST_STATE_DIR)) rmSync(TEST_STATE_DIR, { recursive: true });
  });

  test("warns when editing an existing file that was NOT read", () => {
    expectDecision(runHook(editInput(HOOK_PATH)), "warn");
  });

  test("allows editing a file that WAS read (in ledger)", () => {
    seedLedger([HOOK_PATH]);
    expectDecision(runHook(editInput(HOOK_PATH)), "no-warn");
  });

  test("allows writing a NEW file (non-existent path)", () => {
    const result = runHook({
      tool_name: "Write",
      tool_input: { file_path: "/tmp/brand-new-file-that-does-not-exist.ts", content: "hello" },
    });
    expectDecision(result, "no-warn");
  });

  test("exempts test files from read-before-edit", () => {
    expectDecision(runHook(editInput(join(__dirname, "pre-tool-use-quality.test.ts"))), "no-warn");
  });

  test("fails open on corrupt ledger", () => {
    mkdirSync(TEST_LEDGER_DIR, { recursive: true });
    writeFileSync(TEST_LEDGER_PATH, "not valid json{{{");
    expect(runHook(editInput(HOOK_PATH)).exitCode).toBe(0);
  });
});
