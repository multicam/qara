#!/usr/bin/env bun
/**
 * Pre-Tool-Use Security Hook
 *
 * Detects dangerous patterns in Bash commands before execution.
 * Outputs JSON: { decision, additionalContext? }
 *
 * Factor 7 Compliance: Contact Humans with Tool Calls
 * CC 2.1.9 Feature: additionalContext injection
 */

import { readFileSync, existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { MEMORY_DIR } from './lib/pai-paths';
import { appendJsonl } from './lib/jsonl-utils';
import { getISOTimestamp } from './lib/datetime-utils';
import { logCheckpointEvent } from './lib/checkpoint-utils';

// Checkpoint tracking
const CHECKPOINT_STATE_FILE = join(process.env.PAI_DIR || process.env.HOME + '/qara', 'state/last-checkpoint.json');
const HIGH_RISK_OPERATIONS = [
  'git reset --hard',
  'git push --force',
  'git push -f',
  'rm -rf',
  'DROP TABLE',
  'DROP DATABASE',
  'ALTER TABLE',
  'DELETE FROM',
  'TRUNCATE',
  'mkfs',
  'dd if=',
  'chmod -R 777',
  'kubectl delete',
  'docker system prune',
];

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

// Patterns that are always blocked (in deny list already, but double-check)
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

async function getLastCheckpointAge(): Promise<number> {
  try {
    if (!existsSync(CHECKPOINT_STATE_FILE)) {
      return Infinity;
    }
    const data = JSON.parse(await readFile(CHECKPOINT_STATE_FILE, 'utf-8'));
    return Date.now() - data.timestamp;
  } catch {
    return Infinity;
  }
}

async function checkCheckpointHint(command: string): Promise<void> {
  // Check for high-risk operations
  const isHighRisk = HIGH_RISK_OPERATIONS.some(op => command.includes(op));

  if (isHighRisk) {
    const ageSec = Math.floor((await getLastCheckpointAge()) / 1000);

    if (ageSec > 300) { // 5 minutes
      console.error('\n💡 CHECKPOINT SUGGESTION:');
      console.error('   This is a high-risk operation.');
      console.error(`   Last checkpoint: ${ageSec > 3600 ? 'over 1 hour ago' : ageSec === Infinity ? 'never' : `${Math.floor(ageSec / 60)} minutes ago`}`);
      console.error('   Recommend: Create a checkpoint before proceeding\n');
    }
  }
}

function logApprovalRequest(
  operation: string,
  pattern: string,
  risk: string,
  decision: string
): void {
  const logFile = join(MEMORY_DIR, "security-checks.jsonl");

  const entry = {
    timestamp: getISOTimestamp(),
    operation: operation.substring(0, 200),
    pattern_matched: pattern,
    risk,
    decision,
    session_id: process.env.SESSION_ID || "unknown",
  };

  appendJsonl(logFile, entry);
}

function checkCommand(command: string): { status: string; risk?: string; pattern?: string } {
  // Check always-blocked patterns first
  for (const pattern of ALWAYS_BLOCKED) {
    if (pattern.test(command)) {
      return { status: "BLOCKED", risk: "Always blocked pattern", pattern: pattern.source };
    }
  }

  // Check dangerous patterns
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
 * CC 2.1.9 additionalContext feature
 */
function generateAdditionalContext(command: string, checkpointAgeMs: number): string | undefined {
  const hints: string[] = [];
  const checkpointAgeMins = Math.floor(checkpointAgeMs / 60000);

  // Git operations context
  if (/git\s+(push|reset|rebase|merge|checkout|branch\s+-[dD])/.test(command)) {
    if (checkpointAgeMs > 300000) { // 5 min
      hints.push(`⚠️ Git operation detected. Last checkpoint: ${checkpointAgeMins > 60 ? 'over 1 hour ago' : checkpointAgeMins === Infinity ? 'never' : `${checkpointAgeMins}m ago`}. Consider /checkpoint first.`);
    }
    if (/git\s+push/.test(command) && !/--force|-f/.test(command)) {
      hints.push('Remember: Verify branch and remote before pushing.');
    }
    if (/git\s+reset/.test(command)) {
      hints.push('git reset modifies history. Ensure no uncommitted work will be lost.');
    }
  }

  // Database operations context
  if (/DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE/i.test(command)) {
    hints.push('⚠️ Database modification detected. Ensure you have a backup or are in a dev environment.');
  }

  // File deletion context
  if (/rm\s+(-[rfRF]+\s+)?/.test(command)) {
    hints.push('Verify target paths before deletion. Consider --dry-run or ls first if unsure.');
  }

  // Docker/k8s context
  if (/kubectl\s+delete|docker\s+(rm|rmi|system\s+prune)/.test(command)) {
    hints.push('Container/orchestration deletion. Verify namespace and resource names.');
  }

  // Credential-related operations
  if (/\.env|SECRET|API_KEY|TOKEN|PASSWORD/i.test(command)) {
    hints.push('Credential-related operation. Never commit secrets to git.');
  }

  return hints.length > 0 ? hints.join(' ') : undefined;
}

/**
 * Output hook result in CC 2.1.9 JSON format with additionalContext
 *
 * CC 2.1.9 expects: { continue: boolean, additionalContext?: string, reason?: string }
 * - continue: true = allow tool execution, false = block
 * - additionalContext: injected into model context (Factor 3 compliance)
 * - reason: explanation when blocking
 */
function outputResult(decision: string, additionalContext?: string, reason?: string): void {
  const shouldContinue = decision === "APPROVED";

  const result: { continue: boolean; additionalContext?: string; reason?: string } = {
    continue: shouldContinue
  };

  if (additionalContext) {
    result.additionalContext = additionalContext;
  }

  // Add reason when blocking or requiring approval
  if (!shouldContinue && reason) {
    result.reason = `${decision}: ${reason}`;
  }

  console.log(JSON.stringify(result));
}

async function main(): Promise<void> {
  try {
    // Read hook input from stdin
    const input = readFileSync(0, "utf-8");
    const hookData: HookInput = JSON.parse(input);

    // Only check Bash commands
    if (hookData.tool_name !== "Bash") {
      outputResult("APPROVED");
      return;
    }

    const command = hookData.tool_input.command as string;
    if (!command) {
      outputResult("APPROVED");
      return;
    }

    // Get checkpoint age for context generation
    const checkpointAgeMs = await getLastCheckpointAge();

    // Check if checkpoint hint should be shown (stderr)
    await checkCheckpointHint(command);

    const result = checkCommand(command);

    // Log the check
    logApprovalRequest(
      command,
      result.pattern || "none",
      result.risk || "none",
      result.status
    );

    // Log checkpoint event for destructive operations (Factor 6)
    if (result.status !== "APPROVED") {
      logCheckpointEvent('pre_destructive', {
        operation: result.risk || 'unknown',
        context: { command: command.substring(0, 200), decision: result.status }
      });
    }

    // Generate contextual hints for the model (CC 2.1.9 additionalContext)
    const additionalContext = generateAdditionalContext(command, checkpointAgeMs);

    // Output JSON result with additionalContext
    outputResult(result.status, additionalContext, result.risk);

  } catch (error) {
    // On error, fail open but log
    console.error("Security hook error:", error);
    outputResult("APPROVED");
  }
}

main();
