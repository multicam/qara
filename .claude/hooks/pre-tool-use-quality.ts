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

import { readFileSync } from "fs";
import { readTDDState } from "./lib/tdd-state";

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

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

function findDuplicateBlocks(content: string, minLines: number = 5): string[] {
  const lines = content.split("\n");
  const duplicates: string[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i <= lines.length - minLines; i++) {
    const block = lines.slice(i, i + minLines).join("\n").trim();
    // Skip empty/whitespace-only blocks
    if (block.replace(/\s/g, "").length < 20) continue;

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

function main(): void {
  try {
    const input = readFileSync(0, "utf-8");
    const hookData: HookInput = JSON.parse(input);

    // TDD-phase aware: skip during GREEN (focus on making tests pass)
    const tddState = readTDDState();
    if (tddState?.phase === "GREEN") return;

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
