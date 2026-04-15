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
import { appendJsonl, truncate, resolveSessionId } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HookInput {
  session_id?: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

// TDD enforcement applies only to behavioral source code. Docs, configs,
// data files, and build artifacts are not part of the test-first cycle.
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|svelte|py|rb|go|rs|java|kt|php)$/i;

function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.test(filePath);
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

function ask(message: string): void {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        userMessage: message,
      },
    })
  );
}

// ─── Logging ────────────────────────────────────────────────────────────────

function logDecision(
  filePath: string,
  phase: string,
  isTest: boolean,
  decision: "allow" | "deny" | "ask",
  reason: string,
  sessionId: string,
): void {
  try {
    appendJsonl(join(STATE_DIR, "tdd-enforcement.jsonl"), {
      timestamp: getISOTimestamp(),
      file_path: truncate(filePath, 200),
      phase,
      is_test_file: isTest,
      decision,
      reason,
      session_id: sessionId,
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

function main(): void {
  try {
    const input = readFileSync(0, "utf-8");
    const hookData: HookInput = JSON.parse(input);
    const sid = resolveSessionId(hookData as unknown as Record<string, unknown>);

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

    // Source-extension gate: TDD enforcement only applies to behavioral source.
    // Docs, configs, data files, and build artifacts are always allowed.
    // Filter to source paths; if none remain, allow the whole batch.
    const sourcePaths = filePaths.filter(isSourceFile);
    if (sourcePaths.length === 0) {
      return;
    }

    // Check each source file path
    let advisoryContext: string | undefined;

    for (const filePath of sourcePaths) {
      const isTest = isTestFile(filePath);

      if (state.phase === "RED") {
        if (!isTest) {
          // RED phase: source file edit → deny
          const reason = `TDD enforcement: phase is RED — write the failing test first. Cannot edit source file: ${filePath}`;
          logDecision(filePath, state.phase, isTest, "deny", reason, sid);
          deny(reason);
          return;
        }
        // RED phase + test file → allow (correct behavior)
        logDecision(filePath, state.phase, isTest, "allow", "test file edit during RED", sid);
      } else if (state.phase === "GREEN") {
        // GREEN: both allowed, but detect test shrinking (Kent Beck 2026:
        // agents delete tests to make them pass)
        if (isTest) {
          if (hookData.tool_name === "Edit") {
            const oldStr = (hookData.tool_input.old_string as string) || "";
            const newStr = (hookData.tool_input.new_string as string) || "";
            const oldLines = oldStr.split("\n").length;
            const newLines = newStr.split("\n").length;
            if (oldLines > newLines + 2) {
              logDecision(filePath, state.phase, isTest, "ask", "test shrinking detected during GREEN", sid);
              ask(`This edit removes ${oldLines - newLines} lines from a test file during GREEN phase. Verify you are not weakening tests to make them pass.\nFile: ${filePath}`);
              return;
            }
          }
          logDecision(filePath, state.phase, isTest, "allow", "test file edit during GREEN (advisory)", sid);
          advisoryContext = "TDD: Phase is GREEN. Minimal test changes only — focus on implementation.";
        } else {
          logDecision(filePath, state.phase, isTest, "allow", "source file edit during GREEN", sid);
        }
      } else {
        // REFACTOR: everything allowed
        logDecision(filePath, state.phase, isTest, "allow", `edit during REFACTOR`, sid);
      }
    }

    // All paths checked and approved — emit single output
    if (advisoryContext) {
      allow(advisoryContext);
    }
    return;
  } catch (error) {
    // Fail open — any error = allow
    console.error("TDD hook error:", error);
    return;
  }
}

main();
