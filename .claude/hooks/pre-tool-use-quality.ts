#!/usr/bin/env bun
/**
 * Pre-Tool-Use Quality Hook
 *
 * Advisory duplicate code detection on Write/Edit.
 * Detects exact duplicate blocks (≥5 lines) within the same file.
 *
 * - TDD-phase aware: skips during GREEN phase (getting tests to pass first)
 * - Advisory only: warns via additionalContext, never denies
 * - Fail-open: any error = silent allow
 *
 * Matcher: Write, Edit (registered in settings.json)
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getSessionsDir, getSessionId } from "./lib/pai-paths";
import { readTDDState } from "./lib/tdd-state";

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

const MIN_DUPLICATE_LINES = 5;
const MIN_BLOCK_CONTENT_LENGTH = 20;
const MAX_FILE_LINES = 2000;

function warn(context: string): void {
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

function findDuplicateBlocks(content: string, minLines: number = MIN_DUPLICATE_LINES): string[] {
  const lines = content.split("\n");
  if (lines.length > MAX_FILE_LINES) return [];
  const duplicates: string[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i <= lines.length - minLines; i++) {
    const block = lines.slice(i, i + minLines).join("\n").trim();
    if (block.replace(/\s/g, "").length < MIN_BLOCK_CONTENT_LENGTH) continue;

    const prev = seen.get(block);
    if (prev !== undefined && i - prev >= minLines) {
      duplicates.push(
        `Lines ${prev + 1}-${prev + minLines} duplicated at lines ${i + 1}-${i + minLines}`
      );
      // Skip ahead to avoid reporting overlapping duplicates
      i += minLines - 1;
    } else if (prev === undefined) {
      seen.set(block, i);
    }
  }

  return duplicates;
}

/** Check if a file path is exempt from read-before-edit enforcement */
function isReadExempt(filePath: string): boolean {
  // Test files — often written from scratch
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath)) return true;
  // Generated/config files
  if (/\.(gitkeep|lock)$/.test(filePath)) return true;
  if (filePath.endsWith('package-lock.json')) return true;
  return false;
}

function main(): void {
  try {
    const input = readFileSync(0, "utf-8");
    const hookData: HookInput = JSON.parse(input);

    // TDD-phase aware: skip during GREEN (focus on making tests pass)
    const tddState = readTDDState();
    if (tddState?.phase === "GREEN") return;

    // Read-before-edit enforcement (anthropics/claude-code#42796)
    // Checks if the target file was Read in this session before being edited.
    // Decision: "ask" (not block) — forces conscious override, not hard denial.
    const filePath = hookData.tool_input.file_path as string | undefined;
    if (filePath && existsSync(filePath) && !isReadExempt(filePath)) {
      try {
        const ledgerPath = join(getSessionsDir(), getSessionId(), 'files-read.json');
        let wasRead = true; // fail open
        if (existsSync(ledgerPath)) {
          const files = new Set<string>(JSON.parse(readFileSync(ledgerPath, 'utf-8')));
          wasRead = files.has(filePath);
        } else {
          wasRead = false; // no ledger = nothing has been read yet
        }
        if (!wasRead) {
          console.log(JSON.stringify({
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "ask",
              userMessage: `This file has not been Read in this session. Read it first to understand context before editing.\nFile: ${filePath}`,
            },
          }));
          return;
        }
      } catch {
        // fail open — don't block edits if ledger read fails
      }
    }

    // Extract content to check
    let content: string | undefined;

    if (hookData.tool_name === "Write") {
      content = hookData.tool_input.content as string | undefined;
    } else if (hookData.tool_name === "Edit") {
      content = hookData.tool_input.new_string as string | undefined;
    } else if (hookData.tool_name === "MultiEdit") {
      const edits = hookData.tool_input.edits as Array<{ new_string?: string }> | undefined;
      if (edits) {
        content = edits.map((e) => e.new_string || "").join("\n");
      }
    }

    if (!content || content.split("\n").length < 10) return;

    const duplicates = findDuplicateBlocks(content);

    if (duplicates.length > 0) {
      warn(
        `Quality: duplicate code blocks detected in this file. ${duplicates.join("; ")}. Consider extracting to avoid copy-paste duplication.`
      );
    }
  } catch {
    // Fail open
  }
}

main();
