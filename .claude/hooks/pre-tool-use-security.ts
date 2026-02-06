#!/home/jean-marc/.bun/bin/bun
/**
 * Pre-Tool-Use Security Hook
 *
 * Detects dangerous patterns in Bash commands before execution.
 * Outputs JSON per CC hook protocol: { continue: boolean, reason?: string, additionalContext?: string }
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { STATE_DIR } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';

// Checkpoint tracking
const CHECKPOINT_STATE_FILE = join(STATE_DIR, 'last-checkpoint.json');

// Dangerous patterns that require human approval
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; risk: string; severity: "block" | "approve" }> = [
  // Filesystem destruction
  { pattern: /rm\s+(-[rfRF]+\s+)*[\/~]/, risk: "recursive delete from root/home", severity: "block" },
  { pattern: /rm\s+-rf\s+\$/, risk: "recursive delete with variable expansion", severity: "approve" },
  { pattern: /rm\s+-rf\s+\.\./, risk: "recursive delete parent directory", severity: "block" },

  // Git force operations
  { pattern: /git\s+push.*--force/, risk: "force push (rewrites history)", severity: "approve" },
  { pattern: /git\s+push.*-f\b/, risk: "force push shorthand", severity: "approve" },
  { pattern: /git\s+reset\s+--hard/, risk: "hard reset (loses uncommitted changes)", severity: "approve" },
  { pattern: /git\s+clean\s+-fd/, risk: "remove untracked files and directories", severity: "approve" },

  // Database destruction
  { pattern: /DROP\s+(DATABASE|TABLE|INDEX)/i, risk: "database object deletion", severity: "approve" },
  { pattern: /TRUNCATE\s+TABLE/i, risk: "table truncation", severity: "approve" },
  { pattern: /DELETE\s+FROM\s+\w+\s*(;|$)/i, risk: "delete without WHERE clause", severity: "approve" },

  // System security
  { pattern: /chmod\s+777/, risk: "world-writable permissions", severity: "approve" },
  { pattern: /chmod\s+-R\s+777/, risk: "recursive world-writable", severity: "block" },
  { pattern: /chown\s+-R\s+root/, risk: "recursive ownership change to root", severity: "approve" },

  // Remote code execution
  { pattern: /curl.*\|\s*(ba)?sh/, risk: "pipe curl to shell", severity: "block" },
  { pattern: /wget.*\|\s*(ba)?sh/, risk: "pipe wget to shell", severity: "block" },
  { pattern: /eval\s*\(/, risk: "eval execution", severity: "approve" },

  // Credential exposure
  { pattern: /echo.*API_KEY.*>/, risk: "writing API key to file", severity: "approve" },
  { pattern: /cat.*\.env/, risk: "reading environment file", severity: "approve" },
  { pattern: /export\s+.*SECRET/, risk: "exporting secrets", severity: "approve" },

  // Production operations
  { pattern: /kubectl.*-n\s*prod/, risk: "kubectl in production namespace", severity: "approve" },
  { pattern: /docker\s+rm\s+-f/, risk: "force remove docker container", severity: "approve" },
  { pattern: /systemctl\s+(stop|restart|disable)/, risk: "system service control", severity: "approve" },
];

// Patterns that are always blocked
const ALWAYS_BLOCKED: RegExp[] = [
  /rm\s+-rf\s+\/\s*$/,
  /rm\s+-rf\s+\/\*\s*$/,
  /dd\s+if=.*of=\/dev\/sd[a-z]/,
  /mkfs\.\w+\s+\/dev\/sd[a-z]/,
  />\s*\/dev\/sd[a-z]/,
];

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

function getLastCheckpointAge(): number {
  try {
    if (!existsSync(CHECKPOINT_STATE_FILE)) return Infinity;
    const data = JSON.parse(readFileSync(CHECKPOINT_STATE_FILE, 'utf-8'));
    return Date.now() - data.timestamp;
  } catch {
    return Infinity;
  }
}

function logSecurityCheck(
  operation: string,
  pattern: string,
  risk: string,
  decision: string
): void {
  try {
    const logFile = join(STATE_DIR, "security-checks.jsonl");
    appendJsonl(logFile, {
      timestamp: getISOTimestamp(),
      operation: operation.substring(0, 200),
      pattern_matched: pattern,
      risk,
      decision,
      session_id: process.env.SESSION_ID || "unknown",
    });
  } catch {
    // Non-critical — don't let logging failure block execution
  }
}

function checkCommand(command: string): { status: string; risk?: string; pattern?: string } {
  for (const pattern of ALWAYS_BLOCKED) {
    if (pattern.test(command)) {
      return { status: "BLOCKED", risk: "Always blocked pattern", pattern: pattern.source };
    }
  }

  for (const { pattern, risk, severity } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      const status = severity === "block" ? "BLOCKED" : "REQUIRE_APPROVAL";
      return { status, risk, pattern: pattern.source };
    }
  }

  return { status: "APPROVED" };
}

/**
 * Generate contextual hints for the model based on command type
 */
function generateAdditionalContext(command: string, checkpointAgeMs: number): string | undefined {
  const hints: string[] = [];
  const checkpointAgeMins = Math.floor(checkpointAgeMs / 60000);

  if (/git\s+(push|reset|rebase|merge|checkout|branch\s+-[dD])/.test(command)) {
    if (checkpointAgeMs > 300000) {
      hints.push(`Last checkpoint: ${checkpointAgeMins > 60 ? 'over 1 hour ago' : checkpointAgeMins === Infinity ? 'never' : `${checkpointAgeMins}m ago`}.`);
    }
    if (/git\s+push/.test(command) && !/--force|-f/.test(command)) {
      hints.push('Verify branch and remote before pushing.');
    }
    if (/git\s+reset/.test(command)) {
      hints.push('git reset modifies history. Ensure no uncommitted work will be lost.');
    }
  }

  if (/DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE/i.test(command)) {
    hints.push('Database modification detected. Ensure you have a backup or are in a dev environment.');
  }

  if (/kubectl\s+delete|docker\s+(rm|rmi|system\s+prune)/.test(command)) {
    hints.push('Container/orchestration deletion. Verify namespace and resource names.');
  }

  if (/\.env|SECRET|API_KEY|TOKEN|PASSWORD/i.test(command)) {
    hints.push('Credential-related operation. Never commit secrets to git.');
  }

  return hints.length > 0 ? hints.join(' ') : undefined;
}

function outputResult(decision: string, additionalContext?: string, reason?: string): void {
  const shouldContinue = decision === "APPROVED";
  const result: { continue: boolean; additionalContext?: string; reason?: string } = {
    continue: shouldContinue
  };

  if (additionalContext) result.additionalContext = additionalContext;
  if (!shouldContinue && reason) result.reason = `${decision}: ${reason}`;

  console.log(JSON.stringify(result));
}

async function main(): Promise<void> {
  try {
    const input = readFileSync(0, "utf-8");
    const hookData: HookInput = JSON.parse(input);

    if (hookData.tool_name !== "Bash") {
      outputResult("APPROVED");
      return;
    }

    const command = hookData.tool_input.command as string;
    if (!command) {
      outputResult("APPROVED");
      return;
    }

    const checkpointAgeMs = getLastCheckpointAge();
    const result = checkCommand(command);

    logSecurityCheck(
      command,
      result.pattern || "none",
      result.risk || "none",
      result.status
    );

    const additionalContext = generateAdditionalContext(command, checkpointAgeMs);
    outputResult(result.status, additionalContext, result.risk);

  } catch (error) {
    // On error, fail open
    console.error("Security hook error:", error);
    outputResult("APPROVED");
  }
}

main();
