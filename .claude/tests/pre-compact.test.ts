/**
 * Tests for pre-compact.ts hook.
 *
 * Subprocess-based — runs the actual hook script with piped stdin.
 * Verifies checkpoint creation and system-reminder output.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, existsSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_PAI_DIR = join(tmpdir(), `pre-compact-test-${process.pid}`);
const TEST_STATE_DIR = join(TEST_PAI_DIR, "state");
const TEST_SESSIONS_DIR = join(tmpdir(), `pre-compact-omx-${process.pid}`);
const HOOK_SCRIPT = join(import.meta.dir, "..", "hooks", "pre-compact.ts");

async function runHook(
  input: object | string,
  extraEnv: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", HOOK_SCRIPT], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      PAI_DIR: TEST_PAI_DIR,
      SESSIONS_STATE_DIR: TEST_SESSIONS_DIR,
      CLAUDE_SESSION_ID: "pre-compact-test-session",
      ...extraEnv,
    },
    cwd: join(import.meta.dir, "..", "hooks"),
  });
  const data = typeof input === "string" ? input : JSON.stringify(input);
  proc.stdin.write(data);
  proc.stdin.end();
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("PreCompact Hook", () => {
  beforeEach(() => {
    for (const dir of [TEST_PAI_DIR, TEST_SESSIONS_DIR]) {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
    }
    mkdirSync(TEST_STATE_DIR, { recursive: true });
    mkdirSync(join(TEST_PAI_DIR, "hooks"), { recursive: true });
  });

  afterEach(() => {
    for (const dir of [TEST_PAI_DIR, TEST_SESSIONS_DIR]) {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
    }
  });

  it("should always exit 0", async () => {
    const result = await runHook({ session_id: "test" });
    expect(result.exitCode).toBe(0);
  });

  it("should exit 0 on empty input", async () => {
    const result = await runHook("");
    expect(result.exitCode).toBe(0);
  });

  it("should create checkpoint file", async () => {
    await runHook({ session_id: "pre-compact-test-session" });
    const cpPath = join(
      TEST_SESSIONS_DIR,
      "sessions",
      "pre-compact-test-session",
      "compact-checkpoint.json"
    );
    expect(existsSync(cpPath)).toBe(true);
  });

  it("should not emit reminder when no meaningful state exists", async () => {
    const result = await runHook({ session_id: "pre-compact-test-session" });
    // No mode, TDD, PRD, or working memory = no output
    expect(result.stdout).toBe("");
  });

  it("should emit reminder when working memory exists", async () => {
    // Create working memory for the session
    const memDir = join(TEST_SESSIONS_DIR, "sessions", "pre-compact-test-session", "memory");
    mkdirSync(memDir, { recursive: true });
    writeFileSync(join(memDir, "decisions.md"), "# Decisions\n\n- use TDD\n");

    const result = await runHook({ session_id: "pre-compact-test-session" });
    expect(result.stdout).toContain("CHECKPOINT SAVED");
    expect(result.stdout).toContain("Decisions recorded: yes");
  });

  it("should exit 0 on malformed JSON input", async () => {
    const result = await runHook("not json at all");
    expect(result.exitCode).toBe(0);
  });
});
