#!/usr/bin/env bun

/**
 * pre-compact-context.ts
 *
 * PreCompact hook - preserves critical context that should survive compaction.
 * Factor 9 Compliance: Compact Errors into Context
 *
 * Outputs context summary that gets included in the compacted context.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { MEMORY_DIR, PAI_DIR } from './lib/pai-paths';
import { getDateParts } from './lib/datetime-utils';

interface CompactInput {
  transcript_path?: string;
  session_id?: string;
}

function getRecentDecisions(): string[] {
  const decisionsFile = join(MEMORY_DIR, "decisions.jsonl");
  if (!existsSync(decisionsFile)) return [];

  try {
    const content = readFileSync(decisionsFile, "utf-8");
    const lines = content.trim().split("\n").slice(-5); // Last 5 decisions
    return lines.map(line => {
      const entry = JSON.parse(line);
      return `- ${entry.decision || entry.summary || "Decision recorded"}`;
    });
  } catch {
    return [];
  }
}

function getActiveApprovals(): string[] {
  const approvalsFile = join(MEMORY_DIR, "approvals.jsonl");
  if (!existsSync(approvalsFile)) return [];

  try {
    const content = readFileSync(approvalsFile, "utf-8");
    const lines = content.trim().split("\n").slice(-3); // Last 3 approvals
    return lines.map(line => {
      const entry = JSON.parse(line);
      return `- ${entry.operation}: ${entry.decision}`;
    });
  } catch {
    return [];
  }
}

function getSecurityAlerts(): string[] {
  const securityFile = join(MEMORY_DIR, "security-checks.jsonl");
  if (!existsSync(securityFile)) return [];

  try {
    const content = readFileSync(securityFile, "utf-8");
    const lines = content.trim().split("\n").slice(-3);
    const blocked = lines
      .map(line => JSON.parse(line))
      .filter(entry => entry.decision === "BLOCKED" || entry.decision === "REQUIRE_APPROVAL");
    return blocked.map(entry => `- ${entry.risk}: ${entry.decision}`);
  } catch {
    return [];
  }
}

/**
 * Get recent errors from events log for Factor 9 compliance
 * Summarizes errors so they survive context compaction
 */
function getRecentErrors(): string[] {
  const { year, month, day, yearMonth } = getDateParts();
  const dateStr = `${year}-${month}-${day}`;
  const eventsFile = join(PAI_DIR, "history", "raw-outputs", yearMonth, `${dateStr}_all-events.jsonl`);

  if (!existsSync(eventsFile)) return [];

  try {
    const content = readFileSync(eventsFile, "utf-8");
    const lines = content.trim().split("\n").slice(-100); // Check last 100 events

    const errors: string[] = [];
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        // Look for error indicators in PostToolUse events
        if (event.hook_event_type === "PostToolUse" && event.payload?.tool_result) {
          const result = event.payload.tool_result;
          if (typeof result === "string") {
            // Check for common error patterns
            if (result.includes("Error:") || result.includes("error:") ||
                result.includes("FAILED") || result.includes("failed") ||
                result.includes("Permission denied") || result.includes("not found")) {
              // Extract first line of error, truncate to 100 chars
              const errorLine = result.split("\n")[0].slice(0, 100);
              errors.push(`- ${event.payload.tool_name || "tool"}: ${errorLine}`);
            }
          }
        }
      } catch {
        // Skip malformed JSON lines
      }
    }

    // Return unique errors, last 5
    const uniqueErrors = [...new Set(errors)].slice(-5);
    return uniqueErrors;
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  try {
    // Read input
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }

    const decisions = getRecentDecisions();
    const approvals = getActiveApprovals();
    const securityAlerts = getSecurityAlerts();
    const recentErrors = getRecentErrors();

    // Output preserved context (this gets included in compacted context)
    const contextParts: string[] = [];

    if (decisions.length > 0) {
      contextParts.push("## Recent Decisions");
      contextParts.push(...decisions);
    }

    if (approvals.length > 0) {
      contextParts.push("\n## Recent Approvals");
      contextParts.push(...approvals);
    }

    if (securityAlerts.length > 0) {
      contextParts.push("\n## Security Alerts");
      contextParts.push(...securityAlerts);
    }

    // Factor 9: Compact Errors into Context
    if (recentErrors.length > 0) {
      contextParts.push("\n## Recent Errors (Factor 9)");
      contextParts.push("Errors encountered this session - avoid repeating:");
      contextParts.push(...recentErrors);
    }

    if (contextParts.length > 0) {
      console.log("## Session Context (Preserved Across Compaction)");
      console.log(contextParts.join("\n"));
    }

  } catch (error) {
    // Fail silently - don't block compaction
    console.error("PreCompact context hook error:", error);
  }
}

main();
