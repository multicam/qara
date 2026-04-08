#!/usr/bin/env bun
/**
 * Mode State Management
 *
 * Manages execution mode state for persistent modes (drive/cruise/turbo).
 * When a mode is active, the Stop hook reads this state to decide whether
 * to inject a continuation message or allow Claude to stop.
 *
 * State file: STATE_DIR/mode-state.json
 * TTL: 4 hours (modes run longer than TDD cycles)
 * Session-scoped: only enforced for the session that activated it
 *
 * Library usage:
 *   import { readModeState, writeModeState, incrementIteration, ... } from './mode-state';
 *
 * CLI usage:
 *   bun mode-state.ts activate --mode drive --task "..." --criteria "..." --skill path --max 20
 *   bun mode-state.ts status
 *   bun mode-state.ts clear
 */

import { existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { STATE_DIR, getSessionId, atomicWriteJson } from "./pai-paths";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ModeName = "drive" | "cruise" | "turbo";

export interface ExtensionEvent {
  timestamp: string;
  previousMax: number;
  newMax: number;
  reason: string;
}

export interface ModeState {
  active: boolean;
  mode: ModeName;
  sessionId: string;
  iteration: number;
  maxIterations: number;
  maxTokensBudget: number;
  tokensUsed: number;
  startedAt: string;
  expiresAt: string;
  taskContext: string;
  acceptanceCriteria: string;
  skillPath: string;
  prdPath: string | null;
  lastCompletedStory: string | null;
  activeSubagents: number;
  completedSubagents: string[];
  deactivationReason: string | null;
  extensionsUsed: number;
  maxExtensions: number;
  extensionSize: number;
  extensionHistory: ExtensionEvent[];
}

/** Per-mode defaults for extension hardening */
const EXTENSION_DEFAULTS: Record<ModeName, { maxExtensions: number; extensionSize: number }> = {
  drive:  { maxExtensions: 2, extensionSize: 10 },
  cruise: { maxExtensions: 1, extensionSize: 5 },
  turbo:  { maxExtensions: 1, extensionSize: 5 },
};

// ─── Constants ──────────────────────────────────────────────────────────────

const STATE_FILE = join(STATE_DIR, "mode-state.json");
const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const VALID_MODES: ModeName[] = ["drive", "cruise", "turbo"];

// ─── Core Functions ─────────────────────────────────────────────────────────

function atomicWriteState(state: ModeState): void {
  atomicWriteJson(STATE_FILE, state);
}

function readRaw(): ModeState | null {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const content = readFileSync(STATE_FILE, "utf-8");
    const state = JSON.parse(content) as ModeState;
    if (typeof state.mode !== "string" || typeof state.expiresAt !== "string") return null;
    if (!state.active) return null;
    return state;
  } catch {
    return null;
  }
}

function isValid(state: ModeState): boolean {
  const expires = new Date(state.expiresAt).getTime();
  if (Date.now() > expires) return false;

  const currentSession = getSessionId();
  if (state.sessionId !== currentSession && state.sessionId !== "unknown")
    return false;

  return true;
}

/**
 * Check if a mode state is active (not deactivated and valid).
 */
export function isModeActive(state: ModeState): boolean {
  if (state.deactivationReason !== null) return false;
  if (!state.active) return false;
  return isValid(state);
}

/**
 * Read mode state with full validation (session + TTL + deactivation check).
 * Returns null if inactive, expired, wrong session, deactivated, or missing.
 */
export function readModeState(): ModeState | null {
  const state = readRaw();
  if (!state) return null;
  if (!isModeActive(state)) return null;
  return state;
}

/**
 * Write a new mode state (activates a mode).
 */
export function writeModeState(params: {
  mode: ModeName;
  taskContext: string;
  acceptanceCriteria: string;
  skillPath: string;
  sessionId?: string;
  maxIterations?: number;
  maxTokensBudget?: number;
  prdPath?: string;
}): void {
  const now = new Date();
  const state: ModeState = {
    active: true,
    mode: params.mode,
    sessionId: params.sessionId || getSessionId(),
    iteration: 0,
    maxIterations: params.maxIterations ?? 50,
    maxTokensBudget: params.maxTokensBudget ?? 0,
    tokensUsed: 0,
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
    taskContext: params.taskContext,
    acceptanceCriteria: params.acceptanceCriteria,
    skillPath: params.skillPath,
    prdPath: params.prdPath ?? null,
    lastCompletedStory: null,
    activeSubagents: 0,
    completedSubagents: [],
    deactivationReason: null,
    extensionsUsed: 0,
    maxExtensions: EXTENSION_DEFAULTS[params.mode].maxExtensions,
    extensionSize: EXTENSION_DEFAULTS[params.mode].extensionSize,
    extensionHistory: [],
  };
  atomicWriteState(state);
}

/**
 * Increment iteration counter. Extends TTL from now.
 */
export function incrementIteration(): void {
  const state = readModeState();
  if (!state) {
    throw new Error("No active mode state to increment. Activate first.");
  }
  const now = new Date();
  state.iteration += 1;
  state.expiresAt = new Date(now.getTime() + TTL_MS).toISOString();
  atomicWriteState(state);
}

/**
 * Mark a story as just completed (triggers anti-slop pass in Stop hook).
 */
export function markStoryComplete(storyId: string): void {
  const state = readModeState();
  if (!state) {
    throw new Error("No active mode state. Activate first.");
  }
  state.lastCompletedStory = storyId;
  atomicWriteState(state);
}

/**
 * Deactivate with a reason. Preserves state data for archival/introspection.
 * State file remains but readModeState() will return null.
 */
export function deactivateWithReason(reason: string): void {
  const raw = readRaw();
  if (!raw) return;
  raw.deactivationReason = reason;
  atomicWriteState(raw);
}

/**
 * Try to extend maxIterations (Ralph-style hardening).
 * Returns whether the extension was granted and the new max.
 * Uses per-mode defaults if extensionsUsed/maxExtensions not yet set (backward compat).
 */
export function extendIterations(reason: string): { extended: boolean; newMax: number } {
  const state = readRaw();
  if (!state || !state.active) return { extended: false, newMax: 0 };

  const defaults = EXTENSION_DEFAULTS[state.mode] || EXTENSION_DEFAULTS.drive;
  const maxExt = state.maxExtensions ?? defaults.maxExtensions;
  const extSize = state.extensionSize ?? defaults.extensionSize;
  const used = state.extensionsUsed ?? 0;

  if (used >= maxExt) return { extended: false, newMax: state.maxIterations };

  const previousMax = state.maxIterations;
  state.maxIterations += extSize;
  state.extensionsUsed = used + 1;
  if (!Array.isArray(state.extensionHistory)) state.extensionHistory = [];
  state.extensionHistory.push({
    timestamp: new Date().toISOString(),
    previousMax,
    newMax: state.maxIterations,
    reason,
  });
  atomicWriteState(state);
  return { extended: true, newMax: state.maxIterations };
}

/**
 * Adjust activeSubagents counter by delta (+1 or -1). Clamps to 0.
 */
export function updateActiveSubagents(delta: number): void {
  const raw = readRaw();
  if (!raw) return;
  raw.activeSubagents = Math.max(0, (raw.activeSubagents || 0) + delta);
  atomicWriteState(raw);
}

/**
 * Append a completed subagent ID. Caps at 50 entries.
 */
export function appendCompletedSubagent(id: string): void {
  const raw = readRaw();
  if (!raw) return;
  if (!Array.isArray(raw.completedSubagents)) raw.completedSubagents = [];
  raw.completedSubagents.push(id);
  if (raw.completedSubagents.length > 50) {
    raw.completedSubagents = raw.completedSubagents.slice(-50);
  }
  atomicWriteState(raw);
}

/**
 * Clear mode state entirely (removes file).
 */
export function clearModeState(): void {
  try {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  } catch {
    // Ignore — file may already be gone
  }
}

/**
 * Get the state file path (for testing).
 */
export function getStateFilePath(): string {
  return STATE_FILE;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const USAGE = `Usage:
  bun mode-state.ts activate --mode <drive|cruise|turbo> --task "..." --criteria "..." --skill <path> [--max N] [--budget N]
  bun mode-state.ts status
  bun mode-state.ts clear`;

function runCLI(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    return { exitCode: 0, stdout: USAGE, stderr: "" };
  }

  if (command === "activate") {
    let mode = "";
    let task = "";
    let criteria = "";
    let skill = "";
    let max = 50;
    let budget = 0;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--mode" && args[i + 1]) mode = args[++i].toLowerCase();
      else if (args[i] === "--task" && args[i + 1]) task = args[++i];
      else if (args[i] === "--criteria" && args[i + 1]) criteria = args[++i];
      else if (args[i] === "--skill" && args[i + 1]) skill = args[++i];
      else if (args[i] === "--max" && args[i + 1]) max = parseInt(args[++i], 10) || 50;
      else if (args[i] === "--budget" && args[i + 1]) budget = parseInt(args[++i], 10) || 0;
    }
    if (!mode || !VALID_MODES.includes(mode as ModeName)) {
      return { exitCode: 1, stdout: "", stderr: `Error: --mode must be one of: ${VALID_MODES.join(", ")}\n${USAGE}` };
    }
    if (!task) {
      return { exitCode: 1, stdout: "", stderr: `Error: --task is required\n${USAGE}` };
    }
    writeModeState({
      mode: mode as ModeName,
      taskContext: task,
      acceptanceCriteria: criteria || "task complete",
      skillPath: skill || "",
      maxIterations: max,
      maxTokensBudget: budget,
    });
    return { exitCode: 0, stdout: `Mode activated: ${mode} (max ${max} iterations)\n  Task: ${task}`, stderr: "" };
  }

  if (command === "status") {
    const raw = readRaw();
    if (!raw) {
      return { exitCode: 0, stdout: "Mode: inactive", stderr: "" };
    }
    const active = isModeActive(raw);
    const lines = [
      `Mode: ${raw.mode} (${active ? "active" : raw.deactivationReason || "expired"})`,
      `  Task: ${raw.taskContext}`,
      `  Criteria: ${raw.acceptanceCriteria}`,
      `  Iteration: ${raw.iteration}/${raw.maxIterations}`,
      `  Session: ${raw.sessionId}`,
      `  Started: ${raw.startedAt}`,
      `  Expires: ${raw.expiresAt}`,
    ];
    if (raw.tokensUsed > 0) lines.push(`  Tokens: ${raw.tokensUsed}/${raw.maxTokensBudget || "unlimited"}`);
    if (raw.deactivationReason) lines.push(`  Deactivated: ${raw.deactivationReason}`);
    return { exitCode: 0, stdout: lines.join("\n"), stderr: "" };
  }

  if (command === "clear") {
    clearModeState();
    return { exitCode: 0, stdout: "Mode state cleared", stderr: "" };
  }

  return { exitCode: 1, stdout: "", stderr: `Unknown command: ${command}\n${USAGE}` };
}

export { runCLI };

// Direct execution guard
const isDirectExecution =
  import.meta.path === Bun.main || process.argv[1]?.endsWith("mode-state.ts");
if (isDirectExecution && !process.env.MODE_STATE_NO_CLI) {
  const result = runCLI(process.argv.slice(2));
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exit(result.exitCode);
}
