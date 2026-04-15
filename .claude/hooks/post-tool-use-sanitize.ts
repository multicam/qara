#!/usr/bin/env bun
/**
 * post-tool-use-sanitize.ts
 *
 * PostToolUse hook for external-content tools (WebFetch, WebSearch, and
 * optionally MCP document-fetchers). Detects runtime-reserved tags in
 * tool output and emits a loud `additionalContext` warning so the model
 * treats the output strictly as external data, not as authoritative
 * system context.
 *
 * Why not strip/rewrite: Claude Code's PostToolUse can only mutate MCP
 * tool output (`updatedMCPToolOutput`), never built-in tools like
 * WebFetch or WebSearch. The strongest available defense for built-ins
 * is a post-hoc warning + audit log.
 *
 * Matcher: WebFetch, WebSearch (registered in settings.json).
 *
 * Qara hook rules observed:
 *   - Reads stdin via readFileSync(0, 'utf-8')
 *   - Never exit(1) — fail-open on any error
 *   - chmod +x at install time
 */

import { readFileSync } from "fs";
import { join } from "path";
import { STATE_DIR, getSessionId } from "./lib/pai-paths";
import { appendJsonl } from "./lib/jsonl-utils";
import { getISOTimestamp } from "./lib/datetime-utils";
import {
  detectReservedTags,
  buildWarning,
} from "./lib/tool-output-sanitizer-lib";

interface PostToolInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: string;
  was_error?: boolean;
}

function summarizeInput(
  toolName: string,
  toolInput: Record<string, unknown>
): string {
  if (toolName === "WebFetch") {
    const url = toolInput?.url;
    return typeof url === "string" ? `url=${url.slice(0, 180)}` : "url=?";
  }
  if (toolName === "WebSearch") {
    const q = toolInput?.query;
    return typeof q === "string" ? `query=${q.slice(0, 120)}` : "query=?";
  }
  return "";
}

function main(): void {
  try {
    const raw = readFileSync(0, "utf-8");
    if (!raw.trim()) return;

    const data: PostToolInput = JSON.parse(raw);
    if (data.was_error) return; // error output is already suspect; don't scan
    const output =
      typeof data.tool_output === "string" ? data.tool_output : "";
    if (!output) return;

    const result = detectReservedTags(output);
    if (!result.suspicious) return;

    const inputSummary = summarizeInput(data.tool_name, data.tool_input || {});

    // Audit log
    try {
      const logFile = join(STATE_DIR, "tool-injection-attempts.jsonl");
      appendJsonl(logFile, {
        timestamp: getISOTimestamp(),
        session_id: getSessionId(),
        tool: data.tool_name,
        input_summary: inputSummary,
        detections: result.detections.map((d) => ({
          tag: d.tag,
          index: d.index,
          sample: d.sample.slice(0, 120),
        })),
        output_length: output.length,
      });
    } catch {
      // Non-critical — never break on logging failure
    }

    const warning = buildWarning({
      toolName: data.tool_name,
      inputSummary,
      detections: result.detections,
    });

    // Emit the strongest signal PostToolUse supports for built-in tools:
    // a hookSpecificOutput.additionalContext appended to the tool result.
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: warning,
        },
      })
    );
  } catch {
    // Fail open — hook failures must never break tool execution.
  }
}

main();
