/**
 * Tests for scripts/search-logs.ts — session transcript search CLI.
 *
 * Creates a temporary state dir with mock JSONL data, then runs
 * the CLI as a subprocess with various filter combinations.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_STATE_DIR = join(tmpdir(), `search-logs-test-${process.pid}`);
const SCRIPT_PATH = join(import.meta.dir, "..", "..", "scripts", "search-logs.ts");

// Mock tool-usage data for 2026-04-07
const MOCK_ENTRIES = [
  { timestamp: "2026-04-07T09:00:00.000Z", tool: "Read", error: false, session_id: "s1", input_summary: "file: /src/app.ts", output_len: 500, error_detail: null },
  { timestamp: "2026-04-07T09:01:00.000Z", tool: "Grep", error: false, session_id: "s1", input_summary: "pattern: handleAuth path: /src", output_len: 200, error_detail: null },
  { timestamp: "2026-04-07T09:02:00.000Z", tool: "Edit", error: false, session_id: "s1", input_summary: "file: /src/app.ts", output_len: 100, error_detail: null },
  { timestamp: "2026-04-07T09:03:00.000Z", tool: "Bash", error: true, session_id: "s1", input_summary: "command: git add .", output_len: 50, error_detail: "fatal: not a git repo" },
  { timestamp: "2026-04-07T10:00:00.000Z", tool: "Read", error: false, session_id: "s2", input_summary: "file: /src/auth.ts", output_len: 800, error_detail: null },
  { timestamp: "2026-04-07T10:01:00.000Z", tool: "WebSearch", error: false, session_id: "s2", input_summary: "query: bun test runner docs", output_len: 3000, error_detail: null },
];

async function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", SCRIPT_PATH, ...args], {
    stdout: "pipe", stderr: "pipe",
    env: { ...process.env, PAI_DIR: TEST_STATE_DIR },
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

beforeAll(() => {
  mkdirSync(join(TEST_STATE_DIR, "state"), { recursive: true });
  const jsonl = MOCK_ENTRIES.map(e => JSON.stringify(e)).join("\n") + "\n";
  writeFileSync(join(TEST_STATE_DIR, "state", "tool-usage.jsonl"), jsonl);
});

afterAll(() => {
  rmSync(TEST_STATE_DIR, { recursive: true, force: true });
});

describe("search-logs CLI", () => {
  it("should show help with --help", async () => {
    const r = await runCLI(["--help"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("--query");
    expect(r.stdout).toContain("--from");
  });

  it("should search by keyword in input_summary", async () => {
    const r = await runCLI(["-q", "git add", "--from", "2026-04-07", "--format", "json"]);
    expect(r.exitCode).toBe(0);
    const results = JSON.parse(r.stdout);
    expect(results).toHaveLength(1);
    expect(results[0].tool).toBe("Bash");
    expect(results[0].input_summary).toContain("git add");
  });

  it("should filter by tool name", async () => {
    const r = await runCLI(["-t", "Read", "--from", "2026-04-07", "--format", "json"]);
    expect(r.exitCode).toBe(0);
    const results = JSON.parse(r.stdout);
    expect(results).toHaveLength(2);
    expect(results.every((e: any) => e.tool === "Read")).toBe(true);
  });

  it("should filter by session ID", async () => {
    const r = await runCLI(["-s", "s2", "--from", "2026-04-07", "--format", "json"]);
    expect(r.exitCode).toBe(0);
    const results = JSON.parse(r.stdout);
    expect(results).toHaveLength(2);
    expect(results.every((e: any) => e.session_id === "s2")).toBe(true);
  });

  it("should filter errors only", async () => {
    const r = await runCLI(["--errors", "--from", "2026-04-07", "--format", "json"]);
    expect(r.exitCode).toBe(0);
    const results = JSON.parse(r.stdout);
    expect(results).toHaveLength(1);
    expect(results[0].error).toBe(true);
  });

  it("should combine filters (tool + query)", async () => {
    const r = await runCLI(["-t", "Read", "-q", "auth", "--from", "2026-04-07", "--format", "json"]);
    expect(r.exitCode).toBe(0);
    const results = JSON.parse(r.stdout);
    expect(results).toHaveLength(1);
    expect(results[0].input_summary).toContain("auth");
  });

  it("should output count with --count", async () => {
    const r = await runCLI(["--count", "--from", "2026-04-07"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.trim()).toBe("6");
  });

  it("should respect --limit", async () => {
    const r = await runCLI(["-n", "2", "--from", "2026-04-07", "--format", "json"]);
    expect(r.exitCode).toBe(0);
    const results = JSON.parse(r.stdout);
    expect(results).toHaveLength(2);
  });

  it("should return empty for non-matching query", async () => {
    const r = await runCLI(["-q", "nonexistent_xyz", "--from", "2026-04-07", "--format", "json"]);
    expect(r.exitCode).toBe(0);
    const results = JSON.parse(r.stdout);
    expect(results).toHaveLength(0);
  });

  it("should default to table format", async () => {
    const r = await runCLI(["--from", "2026-04-07", "-n", "2"]);
    expect(r.exitCode).toBe(0);
    // Table should have header-like content
    expect(r.stdout).toContain("TOOL");
    expect(r.stdout).toContain("Read");
  });
});
