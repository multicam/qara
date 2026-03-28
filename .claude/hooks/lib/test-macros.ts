/**
 * Shared test macros for hook testing.
 *
 * Extracted from duplicated helpers across 7 hook test files.
 * Provides: hook subprocess runner, input builders, output parsers,
 * temp PAI_DIR management, TDD state helpers, JSONL log helpers.
 */

import { spawn } from "child_process";
import {
  mkdirSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  readFileSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HookResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface HookDecision {
  decision: string;
  reason?: string;
  context?: string;
}

// ─── Core: Hook Subprocess Runner ────────────────────────────────────────────

/**
 * Spawn a hook script as a subprocess with stdin input.
 *
 * @param script - Absolute path to the hook .ts file
 * @param input - Object (JSON-serialized) or raw string piped to stdin
 * @param opts.env - Extra env vars merged with process.env
 * @param opts.timeout - Kill timeout in ms (default: 10000)
 */
export async function runHook(
  script: string,
  input: object | string,
  opts?: { env?: Record<string, string>; timeout?: number }
): Promise<HookResult> {
  const timeout = opts?.timeout ?? 10000;
  return new Promise((resolve) => {
    const proc = spawn("bun", ["run", script], {
      cwd: join(script, ".."),
      env: { ...process.env, ...opts?.env },
    });
    let stdout = "",
      stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    const str = typeof input === "string" ? input : JSON.stringify(input);
    proc.stdin.write(str);
    proc.stdin.end();
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({ stdout, stderr, exitCode: 124 });
    }, timeout);
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

// ─── Input Builders ──────────────────────────────────────────────────────────

export function bashInput(command: string) {
  return { tool_name: "Bash", tool_input: { command } };
}

export function writeInput(filePath: string) {
  return {
    tool_name: "Write",
    tool_input: { file_path: filePath, content: "test" },
  };
}

export function editInput(filePath: string) {
  return {
    tool_name: "Edit",
    tool_input: { file_path: filePath, old_string: "a", new_string: "b" },
  };
}

// ─── Output Parsers ──────────────────────────────────────────────────────────

/**
 * Parse CC hook permission decision from stdout JSON.
 * Returns { decision: 'allow' } for empty output (hook produced no decision = allow).
 */
export function parseHookDecision(stdout: string): HookDecision {
  const trimmed = stdout.trim();
  if (!trimmed) return { decision: "allow" };
  const parsed = JSON.parse(trimmed);
  const hso = parsed.hookSpecificOutput;
  return {
    decision: hso.permissionDecision,
    reason: hso.permissionDecisionReason,
    context: hso.additionalContext,
  };
}

// ─── PAI_DIR Management ──────────────────────────────────────────────────────

/**
 * Create an isolated temporary PAI_DIR with state/ subdirectory.
 * Returns paiDir path, stateDir path, and cleanup function.
 */
export function createTestPaiDir(
  prefix = "hook-test"
): { paiDir: string; stateDir: string; cleanup: () => void } {
  const paiDir = join(tmpdir(), `${prefix}-${process.pid}-${Date.now()}`);
  const stateDir = join(paiDir, "state");
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(join(paiDir, "hooks"), { recursive: true });
  return {
    paiDir,
    stateDir,
    cleanup: () => {
      try {
        rmSync(paiDir, { recursive: true, force: true });
      } catch {}
    },
  };
}

// ─── TDD State Helpers ───────────────────────────────────────────────────────

/**
 * Write a mock TDD state file to the given PAI_DIR.
 * Uses "unknown" sessionId by default (wildcard — matches any session).
 */
export function writeMockTDDState(
  paiDir: string,
  phase: "RED" | "GREEN" | "REFACTOR",
  overrides: Record<string, unknown> = {}
): void {
  const state = {
    active: true,
    feature: "test-feature",
    phase,
    testFiles: [],
    sessionId: "unknown",
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
  const stateDir = join(paiDir, "state");
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, "tdd-mode.json"), JSON.stringify(state, null, 2));
}

/**
 * Remove the TDD state file from the given PAI_DIR.
 */
export function clearTDDState(paiDir: string): void {
  const stateFile = join(paiDir, "state", "tdd-mode.json");
  try {
    if (existsSync(stateFile)) unlinkSync(stateFile);
  } catch {}
}

// ─── JSONL Log Helpers ───────────────────────────────────────────────────────

/**
 * Read the last line of a JSONL log file as a parsed object.
 */
export function getLastLogLine(
  logFile: string
): Record<string, unknown> | null {
  if (!existsSync(logFile)) return null;
  const lines = readFileSync(logFile, "utf-8").trim().split("\n");
  return JSON.parse(lines[lines.length - 1]);
}

/**
 * Count lines in a JSONL log file.
 */
export function getLogLineCount(logFile: string): number {
  if (!existsSync(logFile)) return 0;
  return readFileSync(logFile, "utf-8").trim().split("\n").length;
}
