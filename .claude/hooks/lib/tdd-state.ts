#!/usr/bin/env bun
/**
 * TDD State Management
 *
 * Manages the stateful TDD mode file that the enforcement hook reads.
 * When a tdd-cycle is active, this tracks the current phase (RED/GREEN/REFACTOR)
 * so the PreToolUse hook can enforce discipline.
 *
 * State file: STATE_DIR/tdd-mode.json
 * TTL: 2 hours (crash resilience — stale state auto-expires)
 * Session-scoped: only enforced for the session that activated it
 *
 * Library usage:
 *   import { readTDDState, writeTDDState, updatePhase, clearTDDState } from './tdd-state';
 *
 * CLI usage (from workflows):
 *   bun tdd-state.ts activate --feature user-auth --phase RED
 *   bun tdd-state.ts phase GREEN
 *   bun tdd-state.ts clear
 *   bun tdd-state.ts status
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync } from "fs";
import { join, basename } from "path";
import { STATE_DIR, ensureDir } from "./pai-paths";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TDDPhase = "RED" | "GREEN" | "REFACTOR";

export interface TDDState {
  active: boolean;
  feature: string;
  phase: TDDPhase;
  sessionId: string;
  startedAt: string;
  expiresAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATE_FILE = join(STATE_DIR, "tdd-mode.json");
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Test file patterns — basename matching
const TEST_FILE_PATTERNS = [
  /\.test\.ts$/,
  /\.test\.js$/,
  /\.spec\.ts$/,
  /\.spec\.js$/,
  /\.integration\.test\.ts$/,
  /\.integration\.test\.js$/,
  /\.draft\.spec\.ts$/,
  /\.bombadil\.ts$/,
];

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Read TDD state without validation (for cleanup checks).
 * Returns the raw state or null if file doesn't exist or is unparseable.
 */
export function readTDDStateRaw(): TDDState | null {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const content = readFileSync(STATE_FILE, "utf-8");
    const state = JSON.parse(content) as TDDState;
    if (typeof state.phase !== "string" || typeof state.expiresAt !== "string") return null;
    if (!state.active) return null;
    return state;
  } catch {
    return null;
  }
}

/**
 * Read TDD state with full validation (session + TTL).
 * Returns null if inactive, expired, wrong session, or missing.
 */
export function readTDDState(): TDDState | null {
  const state = readTDDStateRaw();
  if (!state) return null;
  if (!isStateValid(state)) return null;
  return state;
}

/**
 * Atomic write: write to temp file then rename (POSIX atomic).
 * Prevents parallel hook invocations from reading partial JSON.
 */
function atomicWriteState(state: TDDState): void {
  ensureDir(STATE_DIR);
  const tmp = STATE_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, STATE_FILE);
}

/**
 * Write a new TDD state (activates TDD mode).
 * Auto-computes startedAt and expiresAt.
 */
export function writeTDDState(params: {
  feature: string;
  phase: TDDPhase;
  sessionId?: string;
}): void {
  const now = new Date();
  const state: TDDState = {
    active: true,
    feature: params.feature,
    phase: params.phase,
    sessionId:
      params.sessionId ||
      process.env.CLAUDE_SESSION_ID ||
      process.env.SESSION_ID ||
      "unknown",
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
  };
  atomicWriteState(state);
}

/**
 * Transition to a new phase (RED/GREEN/REFACTOR).
 * Preserves all other state fields. Extends TTL from now.
 * Uses validated read to prevent reviving expired/wrong-session state.
 */
export function updatePhase(phase: TDDPhase): void {
  const state = readTDDState();
  if (!state) {
    throw new Error("No active TDD state to update. Activate first (state may be expired or from another session).");
  }
  const now = new Date();
  state.phase = phase;
  state.expiresAt = new Date(now.getTime() + TTL_MS).toISOString();
  atomicWriteState(state);
}

/**
 * Clear TDD state (deactivates TDD mode).
 */
export function clearTDDState(): void {
  try {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  } catch {
    // Ignore — file may already be gone
  }
}

/**
 * Check if a file path is a test file.
 */
export function isTestFile(filePath: string): boolean {
  const name = basename(filePath);
  return TEST_FILE_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Validate state: checks TTL and session match.
 */
export function isStateValid(state: TDDState): boolean {
  // Check TTL
  const expires = new Date(state.expiresAt).getTime();
  if (Date.now() > expires) return false;

  // Check session
  const currentSession =
    process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || "unknown";
  if (state.sessionId !== currentSession && state.sessionId !== "unknown")
    return false;

  return true;
}

/**
 * Get the state file path (for testing).
 */
export function getStateFilePath(): string {
  return STATE_FILE;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const USAGE = `Usage:
  bun tdd-state.ts activate --feature <name> --phase <RED|GREEN|REFACTOR>
  bun tdd-state.ts phase <RED|GREEN|REFACTOR>
  bun tdd-state.ts clear
  bun tdd-state.ts status`;

function runCLI(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    return { exitCode: 0, stdout: USAGE, stderr: "" };
  }

  if (command === "activate") {
    let feature = "";
    let phase: TDDPhase = "RED";
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--feature" && args[i + 1]) {
        feature = args[++i];
      } else if (args[i] === "--phase" && args[i + 1]) {
        const p = args[++i].toUpperCase();
        if (p === "RED" || p === "GREEN" || p === "REFACTOR") phase = p;
      }
    }
    if (!feature) {
      return { exitCode: 1, stdout: "", stderr: "Error: --feature is required\n" + USAGE };
    }
    writeTDDState({ feature, phase });
    return { exitCode: 0, stdout: `TDD mode activated: ${feature} (${phase})`, stderr: "" };
  }

  if (command === "phase") {
    const p = (args[1] || "").toUpperCase();
    if (p !== "RED" && p !== "GREEN" && p !== "REFACTOR") {
      return { exitCode: 1, stdout: "", stderr: "Error: phase must be RED, GREEN, or REFACTOR" };
    }
    try {
      updatePhase(p);
      return { exitCode: 0, stdout: `TDD phase: ${p}`, stderr: "" };
    } catch (e) {
      return { exitCode: 1, stdout: "", stderr: (e as Error).message };
    }
  }

  if (command === "clear") {
    clearTDDState();
    return { exitCode: 0, stdout: "TDD mode cleared", stderr: "" };
  }

  if (command === "status") {
    const state = readTDDStateRaw();
    if (!state) {
      return { exitCode: 0, stdout: "TDD mode: inactive", stderr: "" };
    }
    const valid = isStateValid(state);
    const lines = [
      `TDD mode: ${valid ? "active" : "expired/stale"}`,
      `  Feature: ${state.feature}`,
      `  Phase: ${state.phase}`,
      `  Session: ${state.sessionId}`,
      `  Started: ${state.startedAt}`,
      `  Expires: ${state.expiresAt}`,
    ];
    return { exitCode: 0, stdout: lines.join("\n"), stderr: "" };
  }

  return { exitCode: 1, stdout: "", stderr: `Unknown command: ${command}\n${USAGE}` };
}

export { runCLI };

// Direct execution guard
const isDirectExecution =
  import.meta.path === Bun.main || process.argv[1]?.endsWith("tdd-state.ts");
if (isDirectExecution && !process.env.TDD_STATE_NO_CLI) {
  const result = runCLI(process.argv.slice(2));
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exit(result.exitCode);
}
