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
import { homedir } from "os";

interface CompactInput {
  transcript_path?: string;
  session_id?: string;
}

function getRecentDecisions(): string[] {
  const decisionsFile = join(homedir(), "qara", "thoughts", "memory", "decisions.jsonl");
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
  const approvalsFile = join(homedir(), "qara", "thoughts", "memory", "approvals.jsonl");
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
  const securityFile = join(homedir(), "qara", "thoughts", "memory", "security-checks.jsonl");
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
