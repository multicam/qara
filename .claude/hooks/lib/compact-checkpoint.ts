/**
 * Compact Checkpoint — State snapshot before context compression.
 *
 * Captures all runtime state (mode, working memory, TDD, PRD progress)
 * into a single JSON file. The PreCompact hook calls saveCheckpoint()
 * before CC compresses the context window. Session-start can recover
 * from crashes by loading the latest checkpoint.
 *
 * Storage: STATE_DIR/sessions/{sessionId}/compact-checkpoint.json
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { getSessionsDir, atomicWriteJson } from "./pai-paths";

function checkpointPath(sessionId: string): string {
  const dir = join(getSessionsDir(), sessionId);
  mkdirSync(dir, { recursive: true });
  return join(dir, "compact-checkpoint.json");
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CompactCheckpoint {
  savedAt: string;
  sessionId: string;
  mode: {
    active: boolean;
    name: string;
    iteration: number;
    maxIterations: number;
    taskContext: string;
    acceptanceCriteria: string;
    deactivationReason: string | null;
  } | null;
  workingMemory: {
    learnings: string;
    decisions: string;
    issues: string;
    problems: string;
  } | null;
  tddState: {
    active: boolean;
    feature: string;
    phase: string;
  } | null;
  prdProgress: {
    total: number;
    passing: number;
    currentStory: string | null;
  } | null;
  activeSubagents: string[];
}

// ─── Save ──────────────────────────────────────────────────────────────────

/**
 * Capture a snapshot of all runtime state sources.
 * Each source is read independently — one failure doesn't block the rest.
 */
export function saveCheckpoint(sessionId: string): CompactCheckpoint {
  const checkpoint: CompactCheckpoint = {
    savedAt: new Date().toISOString(),
    sessionId,
    mode: null,
    workingMemory: null,
    tddState: null,
    prdProgress: null,
    activeSubagents: [],
  };

  // Mode state
  try {
    const { readModeState } = require("./mode-state");
    const ms = readModeState();
    if (ms) {
      checkpoint.mode = {
        active: true,
        name: ms.mode,
        iteration: ms.iteration,
        maxIterations: ms.maxIterations,
        taskContext: ms.taskContext,
        acceptanceCriteria: ms.acceptanceCriteria,
        deactivationReason: ms.deactivationReason,
      };
      checkpoint.activeSubagents = (ms.completedSubagents || []).slice(-10);
    }
  } catch { /* non-critical */ }

  // Working memory
  try {
    const { readAllMemory } = require("./working-memory");
    const mem = readAllMemory(sessionId);
    if (mem.learning || mem.decision || mem.issue || mem.problem) {
      checkpoint.workingMemory = {
        learnings: mem.learning,
        decisions: mem.decision,
        issues: mem.issue,
        problems: mem.problem,
      };
    }
  } catch { /* non-critical */ }

  // TDD state
  try {
    const { readTDDState } = require("./tdd-state");
    const tdd = readTDDState();
    if (tdd) {
      checkpoint.tddState = {
        active: true,
        feature: tdd.feature,
        phase: tdd.phase,
      };
    }
  } catch { /* non-critical */ }

  // PRD progress
  try {
    const { readPRD, getIncompleteStories } = require("./prd-utils");
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const prd = readPRD(projectDir);
    if (prd) {
      const incomplete = getIncompleteStories(prd);
      checkpoint.prdProgress = {
        total: prd.stories.length,
        passing: prd.stories.length - incomplete.length,
        currentStory: incomplete.length > 0 ? incomplete[0].title : null,
      };
    }
  } catch { /* non-critical */ }

  atomicWriteJson(checkpointPath(sessionId), checkpoint);

  return checkpoint;
}

// ─── Load ──────────────────────────────────────────────────────────────────

/**
 * Load a checkpoint for a session. Returns null if not found or invalid.
 */
export function loadCheckpoint(sessionId: string): CompactCheckpoint | null {
  try {
    const path = join(getSessionsDir(), sessionId, "compact-checkpoint.json");
    if (!existsSync(path)) return null;
    const content = readFileSync(path, "utf-8");
    const checkpoint = JSON.parse(content) as CompactCheckpoint;
    if (!checkpoint.savedAt || !checkpoint.sessionId) return null;
    return checkpoint;
  } catch {
    return null;
  }
}

// ─── Clear ─────────────────────────────────────────────────────────────────

/**
 * Remove checkpoint file for a session.
 */
export function clearCheckpoint(sessionId: string): void {
  try {
    const path = join(getSessionsDir(), sessionId, "compact-checkpoint.json");
    if (existsSync(path)) unlinkSync(path);
  } catch { /* ignore */ }
}

// ─── Summary ───────────────────────────────────────────────────────────────

/**
 * Format a checkpoint into a human-readable summary for system-reminder injection.
 */
export function formatCheckpointSummary(cp: CompactCheckpoint): string {
  const lines: string[] = ["STATE RECOVERED FROM CHECKPOINT:"];

  if (cp.mode) {
    lines.push(`Mode: ${cp.mode.name} (iteration ${cp.mode.iteration}/${cp.mode.maxIterations})`);
    lines.push(`Task: ${cp.mode.taskContext}`);
    lines.push(`Criteria: ${cp.mode.acceptanceCriteria}`);
  }

  if (cp.tddState) {
    lines.push(`TDD: ${cp.tddState.feature} in ${cp.tddState.phase} phase`);
  }

  if (cp.prdProgress) {
    lines.push(`PRD: ${cp.prdProgress.passing}/${cp.prdProgress.total} stories passing`);
    if (cp.prdProgress.currentStory) {
      lines.push(`Next story: ${cp.prdProgress.currentStory}`);
    }
  }

  if (cp.workingMemory) {
    if (cp.workingMemory.decisions) lines.push(`Decisions recorded: yes`);
    if (cp.workingMemory.learnings) lines.push(`Learnings recorded: yes`);
    if (cp.workingMemory.problems) lines.push(`Open problems: yes`);
    if (cp.workingMemory.issues) lines.push(`Issues found: yes`);
  }

  return lines.join("\n");
}
