#!/usr/bin/env bun
/**
 * Pre-Tool-Use TDD Enforcement Hook
 *
 * Enforces TDD discipline during active TDD cycles by controlling
 * when source files vs test files can be edited.
 *
 * - RED phase: only test files can be written/edited (deny source edits)
 * - GREEN phase: source files allowed (writing implementation)
 * - REFACTOR phase: both allowed (cleaning up)
 * - No active TDD state: everything allowed (fast path)
 *
 * Matcher: Write, Edit (registered in settings.json)
 * Fail-open: any error = allow
 */

import { readFileSync } from "fs";
import { join } from "path";
import { STATE_DIR } from "./lib/pai-paths";
import { readTDDState, isTestFile } from "./lib/tdd-state";
import { appendJsonl } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

// ─── Output helpers ─────────────────────────────────────────────────────────

function allow(context?: string): void {
  if (context) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          additionalContext: context,
        },
      })
    );
  }
  // No output = allow
}

function deny(reason: string): void {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
}

// ─── Logging ────────────────────────────────────────────────────────────────

function logDecision(
  filePath: string,
  phase: string,
  isTest: boolean,
  decision: "allow" | "deny",
  reason: string
): void {
  try {
    appendJsonl(join(STATE_DIR, "tdd-enforcement.jsonl"), {
      timestamp: getISOTimestamp(),
      file_path: filePath.substring(0, 200),
      phase,
      is_test_file: isTest,
      decision,
      reason,
      session_id:
        process.env.CLAUDE_SESSION_ID ||
        process.env.SESSION_ID ||
        "unknown",
    });
  } catch {
    // Non-critical — don't let logging failure affect enforcement
  }
}

// ─── Extract file paths from tool input ─────────────────────────────────────

function extractFilePaths(hookData: HookInput): string[] {
  const paths: string[] = [];

  // Write and Edit: single file_path
  if (hookData.tool_input.file_path) {
    paths.push(hookData.tool_input.file_path as string);
  }

  // MultiEdit: array of edits
  if (Array.isArray(hookData.tool_input.edits)) {
    for (const edit of hookData.tool_input.edits) {
      if (edit && typeof edit === "object" && "file_path" in edit) {
        paths.push((edit as { file_path: string }).file_path);
      }
    }
  }

  return paths;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    const input = readFileSync(0, "utf-8");
    const hookData: HookInput = JSON.parse(input);

    // Fast path: check TDD state before anything else
    const state = readTDDState();
    if (!state) {
      // No active TDD cycle — allow everything
      return;
    }

    const filePaths = extractFilePaths(hookData);
    if (filePaths.length === 0) {
      // No file paths found — allow (shouldn't happen for Write/Edit)
      return;
    }

    // Check each file path
    for (const filePath of filePaths) {
      const isTest = isTestFile(filePath);

      if (state.phase === "RED") {
        if (!isTest) {
          // RED phase: source file edit → deny
          const reason = `TDD enforcement: phase is RED — write the failing test first. Cannot edit source file: ${filePath}`;
          logDecision(filePath, state.phase, isTest, "deny", reason);
          deny(reason);
          return;
        }
        // RED phase + test file → allow (correct behavior)
        logDecision(filePath, state.phase, isTest, "allow", "test file edit during RED");
      } else if (state.phase === "GREEN") {
        // GREEN: both allowed, advisory context for test edits
        if (isTest) {
          logDecision(filePath, state.phase, isTest, "allow", "test file edit during GREEN (advisory)");
          allow("TDD: Phase is GREEN. Minimal test changes only — focus on implementation.");
        } else {
          logDecision(filePath, state.phase, isTest, "allow", "source file edit during GREEN");
        }
      } else {
        // REFACTOR: everything allowed
        logDecision(filePath, state.phase, isTest, "allow", `edit during REFACTOR`);
      }
    }

    // All paths checked and approved
    return;
  } catch (error) {
    // Fail open — any error = allow
    console.error("TDD hook error:", error);
    return;
  }
}

main();
