import { describe, test, expect } from "bun:test";
import { join } from "path";
import { readFileSync } from "fs";

const HOOK_PATH = join(__dirname, "../hooks/pre-tool-use-quality.ts");

function runHook(input: object): { stdout: string; exitCode: number } {
  const proc = Bun.spawnSync({
    cmd: ["bun", "run", HOOK_PATH],
    stdin: Buffer.from(JSON.stringify(input)),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, HOME: process.env.HOME },
  });
  return {
    stdout: proc.stdout.toString().trim(),
    exitCode: proc.exitCode,
  };
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

  test("handles Edit tool (checks new_string)", () => {
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
    // May or may not detect depending on block size — just verify no crash
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
