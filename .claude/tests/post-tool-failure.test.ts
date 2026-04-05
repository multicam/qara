/**
 * Tests for post-tool-failure.ts
 *
 * Tests consecutive failure tracking, escalation at threshold,
 * counter reset on different tool, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_PAI_DIR = join(tmpdir(), `post-tool-failure-test-${process.pid}`);
const TEST_STATE_DIR = join(TEST_PAI_DIR, "state");
const TRACKING_FILE = join(TEST_STATE_DIR, "tool-failure-tracking.json");
const HOOK_SCRIPT = join(import.meta.dir, "..", "hooks", "post-tool-failure.ts");

async function runHook(input: object): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, PAI_DIR: TEST_PAI_DIR, CLAUDE_SESSION_ID: "test" },
    cwd: join(import.meta.dir, "..", "hooks"),
  });
  proc.stdin.write(JSON.stringify(input));
  proc.stdin.end();
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("PostToolUseFailure Hook", () => {
  beforeEach(() => {
    mkdirSync(TEST_STATE_DIR, { recursive: true });
    mkdirSync(join(TEST_PAI_DIR, "hooks"), { recursive: true });
    if (existsSync(TRACKING_FILE)) rmSync(TRACKING_FILE);
  });

  afterEach(() => {
    if (existsSync(TRACKING_FILE)) rmSync(TRACKING_FILE);
  });

  it("should track first failure without escalation", async () => {
    const result = await runHook({ tool_name: "Bash", error: "command failed" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(""); // No escalation on first failure
    const tracking = JSON.parse(readFileSync(TRACKING_FILE, "utf-8"));
    expect(tracking.consecutiveFailures).toBe(1);
    expect(tracking.tool).toBe("Bash");
  });

  it("should increment consecutive failures for same tool", async () => {
    await runHook({ tool_name: "Bash", error: "fail 1" });
    await runHook({ tool_name: "Bash", error: "fail 2" });
    await runHook({ tool_name: "Bash", error: "fail 3" });
    const tracking = JSON.parse(readFileSync(TRACKING_FILE, "utf-8"));
    expect(tracking.consecutiveFailures).toBe(3);
  });

  it("should reset counter on different tool", async () => {
    await runHook({ tool_name: "Bash", error: "fail 1" });
    await runHook({ tool_name: "Bash", error: "fail 2" });
    await runHook({ tool_name: "Read", error: "not found" });
    const tracking = JSON.parse(readFileSync(TRACKING_FILE, "utf-8"));
    expect(tracking.consecutiveFailures).toBe(1);
    expect(tracking.tool).toBe("Read");
  });

  it("should escalate at 5 consecutive failures", async () => {
    for (let i = 0; i < 4; i++) {
      const r = await runHook({ tool_name: "Bash", error: `fail ${i}` });
      expect(r.stdout).toBe(""); // No escalation yet
    }
    const result = await runHook({ tool_name: "Bash", error: "fail 5" });
    expect(result.stdout).toContain("REPEATED FAILURE DETECTED");
    expect(result.stdout).toContain("system-reminder");
    expect(result.stdout).toContain("Bash");
  });

  it("should always exit 0", async () => {
    const result = await runHook({ tool_name: "Bash", error: "test" });
    expect(result.exitCode).toBe(0);
  });

  it("should handle empty input gracefully", async () => {
    const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
      stdin: "pipe", stdout: "pipe", stderr: "pipe",
      env: { ...process.env, PAI_DIR: TEST_PAI_DIR },
      cwd: join(import.meta.dir, "..", "hooks"),
    });
    proc.stdin.write("");
    proc.stdin.end();
    expect(await proc.exited).toBe(0);
  });

  it("should handle malformed JSON gracefully", async () => {
    const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
      stdin: "pipe", stdout: "pipe", stderr: "pipe",
      env: { ...process.env, PAI_DIR: TEST_PAI_DIR },
      cwd: join(import.meta.dir, "..", "hooks"),
    });
    proc.stdin.write("not json");
    proc.stdin.end();
    expect(await proc.exited).toBe(0);
  });
});
